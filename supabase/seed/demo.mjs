/**
 * ReCome · Demo completa (solo desarrollo)
 *
 * Deja el sistema poblado de punta a punta:
 *   1. ejecuta `datos-prueba.mjs` para crear los 7 comercios y sus ofertas;
 *   2. crea las cuentas de cliente de `clientes.mjs` y la cuenta de admin;
 *   3. genera reservas reales con las RPC del sistema (stock, límites,
 *      confirmación, entrega, cancelación y vencimiento);
 *   4. reparte el historial en fechas pasadas para que se vea natural.
 *
 * Uso:
 *   node supabase/seed/demo.mjs
 *   node supabase/seed/demo.mjs --reset          # borra y recrea las reservas demo
 *   node supabase/seed/demo.mjs --skip-catalogo  # no vuelve a sembrar comercios/ofertas
 *
 * Es idempotente: si un cliente demo ya tiene reservas, se omite (salvo
 * `--reset`). No borra reservas de otras cuentas.
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_SECRET_KEY      (salta RLS; no la compartas)
 *
 * Contraseña de las cuentas: RECOME_SEED_PASSWORD
 * (por defecto "ReCome2026!"). Son datos de demostración: no los uses en
 * producción ni los dejes en un entorno público.
 */

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { businesses } from "./comercios.mjs";
import { clientes } from "./clientes.mjs";
import {
  api,
  env,
  PUBLISHABLE_KEY,
  requireCredentials,
  rpcAs,
  signIn,
} from "./cliente.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const PASSWORD = env.RECOME_SEED_PASSWORD ?? "ReCome2026!";
const ADMIN_EMAIL = "admin@recome.test";
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Argumentos
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(
    "Uso: node supabase/seed/demo.mjs [--reset] [--skip-catalogo]\n" +
      "  --reset          borra las reservas demo y las vuelve a crear\n" +
      "  --skip-catalogo  no ejecuta datos-prueba.mjs",
  );
  process.exit(0);
}

const knownArgs = new Set(["--reset", "--skip-catalogo", "--help", "-h"]);
const unknownArgs = args.filter((arg) => !knownArgs.has(arg));
if (unknownArgs.length > 0) {
  console.error(`Argumento no reconocido: ${unknownArgs.join(", ")}`);
  process.exit(1);
}

const RESET = args.includes("--reset");
const SKIP_CATALOG = args.includes("--skip-catalogo");

requireCredentials();

if (!PUBLISHABLE_KEY) {
  console.error(
    "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local: se necesita para iniciar sesión con las cuentas de prueba.",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function runSeed(name) {
  execFileSync(process.execPath, [resolve(here, name)], {
    stdio: "inherit",
    cwd: resolve(here, "../.."),
  });
}

function formatDate(date) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Lima",
  }).format(date);
}

async function listUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const batch = await api(`/auth/v1/admin/users?page=${page}&per_page=200`);
    const rows = batch?.users ?? [];
    users.push(...rows);
    if (rows.length < 200) break;
    page += 1;
  }

  return users;
}

async function ensureUser({ email, fullName, phone }, cache) {
  if (!cache.loaded) {
    cache.users = await listUsers();
    cache.loaded = true;
  }

  const existing = cache.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );
  if (existing) return { id: existing.id, created: false };

  const created = await api("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone: phone ?? null },
    }),
  });

  cache.users.push({ id: created.id, email });
  return { id: created.id, created: true };
}

/** Crea (o reutiliza) la cuenta de administrador y garantiza el rol ADMIN. */
async function ensureAdmin(cache) {
  const admin = await ensureUser(
    { email: ADMIN_EMAIL, fullName: "Administrador ReCome", phone: null },
    cache,
  );

  const profiles = await api(
    `/rest/v1/profiles?select=id,role&id=eq.${admin.id}`,
  );
  const profile = profiles[0];

  if (!profile) {
    await api("/rest/v1/profiles", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: admin.id,
        full_name: "Administrador ReCome",
        email: ADMIN_EMAIL,
        role: "ADMIN",
      }),
    });
    return { ...admin, promoted: true };
  }

  if (profile.role !== "ADMIN") {
    await api(`/rest/v1/profiles?id=eq.${admin.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ role: "ADMIN" }),
    });
    return { ...admin, promoted: true };
  }

  return { ...admin, promoted: false };
}

async function eligibleOffers() {
  const now = encodeURIComponent(new Date().toISOString());
  // Solo ofertas con el recojo aún por empezar: así una reserva demo se puede
  // cancelar con la regla real del cliente (antes de `pickup_start`).
  return api(
    `/rest/v1/offers?select=id,title,business_id,available_quantity,pickup_start,pickup_end` +
      `&status=eq.ACTIVE&archived_at=is.null&pickup_end=gt.${now}` +
      `&pickup_start=gt.${now}&available_quantity=gt.0&order=pickup_end.asc`,
  );
}

/**
 * Borra solo las reservas de las cuentas demo. Antes devuelve el stock de las
 * que seguían activas. Los eventos caen en cascada con la reserva.
 */
async function resetDemoReservations(clientIds) {
  if (clientIds.length === 0) return { deleted: 0, restored: 0 };

  const list = clientIds.join(",");
  const rows = await api(
    `/rest/v1/reservations?select=id,offer_id,quantity,status&customer_id=in.(${list})`,
  );

  const active = rows.filter(
    (row) => row.status === "PENDING" || row.status === "CONFIRMED",
  );
  const perOffer = new Map();

  for (const row of active) {
    perOffer.set(
      row.offer_id,
      (perOffer.get(row.offer_id) ?? 0) + row.quantity,
    );
  }

  for (const [offerId, quantity] of perOffer) {
    const offer = await api(
      `/rest/v1/offers?select=available_quantity,initial_quantity,title&id=eq.${offerId}`,
    );
    const current = offer[0];
    if (!current) continue;

    const next = Math.min(
      current.available_quantity + quantity,
      current.initial_quantity,
    );
    await api(`/rest/v1/offers?id=eq.${offerId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ available_quantity: next }),
    });
  }

  if (rows.length > 0) {
    await api(`/rest/v1/reservations?customer_id=in.(${list})`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
  }

  return { deleted: rows.length, restored: active.length };
}

// ---------------------------------------------------------------------------
// 1. Catálogo de comercios y ofertas
// ---------------------------------------------------------------------------
if (!SKIP_CATALOG) {
  console.log("\n▸ Sembrando comercios y ofertas…\n");
  runSeed("datos-prueba.mjs");
}

// ---------------------------------------------------------------------------
// 2. Cuentas de cliente y administrador
// ---------------------------------------------------------------------------
console.log("\n▸ Creando cuentas de cliente y administrador…\n");

const userCache = { loaded: false, users: [] };
const clientRecords = [];
const errors = [];

for (const client of clientes) {
  const user = await ensureUser(client, userCache);
  clientRecords.push({ ...client, id: user.id, created: user.created });
}

const admin = await ensureAdmin(userCache);
const clientIds = clientRecords.map((client) => client.id);
const clientIdList = clientIds.join(",");

// ---------------------------------------------------------------------------
// 3. Reinicio opcional de las reservas demo
// ---------------------------------------------------------------------------
let resetSummary = null;
if (RESET) {
  resetSummary = await resetDemoReservations(clientIds);
  console.log(
    `  Reinicio: ${resetSummary.deleted} reservas borradas, ` +
      `${resetSummary.restored} activas devueltas al stock.`,
  );
}

// ---------------------------------------------------------------------------
// 4. Qué clientes necesitan reservas
// ---------------------------------------------------------------------------
const existingRows = await api(
  `/rest/v1/reservations?select=customer_id&customer_id=in.(${clientIdList})`,
);
const existingByCustomer = new Map();
for (const row of existingRows) {
  existingByCustomer.set(
    row.customer_id,
    (existingByCustomer.get(row.customer_id) ?? 0) + 1,
  );
}

const pendingClients = clientRecords.filter(
  (client) => (existingByCustomer.get(client.id) ?? 0) === 0,
);

if (pendingClients.length === 0) {
  console.log(
    "\nTodos los clientes demo ya tienen reservas. Usa --reset para recrearlas.",
  );
  await printFinalSummary();
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 5. Ofertas disponibles y cuentas de comercio
// ---------------------------------------------------------------------------
const approvedBusinesses = await api(
  "/rest/v1/businesses?select=id,name&approval_status=eq.APPROVED",
);
const emailByName = new Map(businesses.map((item) => [item.name, item.email]));
const emailByBusinessId = new Map();

for (const business of approvedBusinesses) {
  const email = emailByName.get(business.name);
  if (email) emailByBusinessId.set(business.id, email);
}

let offers = (await eligibleOffers()).filter((offer) =>
  emailByBusinessId.has(offer.business_id),
);

if (offers.length < 4) {
  if (existingRows.length > 0) {
    console.error(
      "\nHay pocas ofertas activas y ya existen reservas demo. " +
        "Ejecuta `node supabase/seed/demo.mjs --reset` para regenerar todo.",
    );
    process.exit(1);
  }

  console.log(
    "\n▸ Hay pocas ofertas vigentes; renovando fechas con ofertas-vigentes.mjs…\n",
  );
  runSeed("ofertas-vigentes.mjs");
  offers = (await eligibleOffers()).filter((offer) =>
    emailByBusinessId.has(offer.business_id),
  );
}

if (offers.length === 0) {
  console.error(
    "\nNo hay ofertas activas de los comercios de prueba. " +
      "Revisa el estado del catálogo en Supabase.",
  );
  process.exit(1);
}

const businessTokens = new Map();

async function tokenFor(businessId) {
  if (!businessTokens.has(businessId)) {
    const email = emailByBusinessId.get(businessId);
    if (!email) {
      throw new Error(`Sin cuenta de prueba para el comercio ${businessId}.`);
    }
    businessTokens.set(businessId, await signIn(email, PASSWORD));
  }

  return businessTokens.get(businessId);
}

// ---------------------------------------------------------------------------
// 6. Crear reservas
// ---------------------------------------------------------------------------
console.log("\n▸ Generando reservas e historial…\n");

let offerCursor = 0;
const records = [];
const counts = {
  PENDING: 0,
  CONFIRMED: 0,
  DELIVERED: 0,
  CANCELLED: 0,
  EXPIRED: 0,
};
const expiredIds = [];

function takeOffer(quantity) {
  for (let attempt = 0; attempt < offers.length; attempt += 1) {
    const offer = offers[offerCursor % offers.length];
    offerCursor += 1;

    if (offer.available_quantity >= quantity) {
      offer.available_quantity -= quantity;
      return offer;
    }
  }

  return null;
}

async function createReservation(intent, clientToken, index) {
  const quantity = Math.min(Math.max(intent.quantity, 1), 10);
  const offer = takeOffer(quantity);

  if (!offer) {
    throw new Error("No queda stock suficiente en las ofertas de prueba.");
  }

  const created = await rpcAs(
    "create_reservation",
    { p_offer_id: offer.id, p_quantity: quantity },
    clientToken,
  );

  const record = {
    id: created.id,
    type: intent.type,
    daysAgo: intent.daysAgo,
    minutesAgo: 45 + ((index * 53) % 240),
  };

  if (intent.type === "CONFIRMED" || intent.type === "DELIVERED") {
    const ownerToken = await tokenFor(offer.business_id);
    await rpcAs(
      "confirm_reservation",
      { p_reservation_id: created.id },
      ownerToken,
    );
  }

  if (intent.type === "DELIVERED") {
    const ownerToken = await tokenFor(offer.business_id);
    const result = await rpcAs(
      "deliver_reservation",
      { p_reservation_id: created.id, p_code: created.pickup_code },
      ownerToken,
    );

    if (!result?.ok) {
      throw new Error(
        `No se pudo entregar la reserva: ${result?.error ?? "error desconocido"}`,
      );
    }
  }

  if (intent.type === "CANCELLED") {
    await rpcAs(
      "cancel_reservation",
      { p_reservation_id: created.id },
      clientToken,
    );
  }

  if (intent.type === "EXPIRED") {
    await api(`/rest/v1/reservations?id=eq.${created.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      }),
    });
    expiredIds.push(created.id);
  }

  records.push(record);
  counts[intent.type] += 1;

  return record;
}

for (const [clientIndex, client] of pendingClients.entries()) {
  if ((existingByCustomer.get(client.id) ?? 0) > 0) {
    console.log(`  · ${client.fullName}: ya tenía reservas, se omite.`);
    continue;
  }

  const clientToken = await signIn(client.email, PASSWORD);
  let index = clientIndex * 10;

  for (const intent of client.plan) {
    try {
      await createReservation(intent, clientToken, index);
      index += 1;
    } catch (error) {
      errors.push(`${client.fullName} (${intent.type}): ${error.message}`);
      console.error(`  ✗ ${client.fullName} (${intent.type}): ${error.message}`);
    }
  }

  console.log(
    `  · ${client.fullName}: ${client.plan.length} reservas planificadas.`,
  );
}

// ---------------------------------------------------------------------------
// 7. Vencer las reservas marcadas como EXPIRED
// ---------------------------------------------------------------------------
if (expiredIds.length > 0) {
  const expired = await api("/rest/v1/rpc/expire_reservations", {
    method: "POST",
    body: "{}",
  });
  console.log(`\n  Vencimiento: ${expired} reservas marcadas como EXPIRED.`);
}

// ---------------------------------------------------------------------------
// 8. Repartir el historial en fechas pasadas
// ---------------------------------------------------------------------------
const EVENT_OFFSET_MINUTES = {
  CREATED: 0,
  CONFIRMED: 25,
  DELIVERED: 150,
  CANCELLED: 15,
  EXPIRED: 300,
};

for (const record of records) {
  const baseMs =
    Date.now() - record.daysAgo * DAY_MS - record.minutesAgo * 60 * 1000;
  const base = new Date(baseMs);

  const patch = { created_at: base.toISOString() };
  if (record.type === "EXPIRED") {
    patch.expires_at = new Date(baseMs + 12 * 60 * 60 * 1000).toISOString();
  }

  await api(`/rest/v1/reservations?id=eq.${record.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });

  const events = await api(
    `/rest/v1/reservation_events?select=id,event&reservation_id=eq.${record.id}`,
  );
  const ordered = [...events].sort(
    (a, b) =>
      (EVENT_OFFSET_MINUTES[a.event] ?? 0) -
      (EVENT_OFFSET_MINUTES[b.event] ?? 0),
  );

  for (const [eventIndex, event] of ordered.entries()) {
    const offset =
      (EVENT_OFFSET_MINUTES[event.event] ?? eventIndex * 5) + eventIndex;
    await api(`/rest/v1/reservation_events?id=eq.${event.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        created_at: new Date(baseMs + offset * 60 * 1000).toISOString(),
      }),
    });
  }
}

// ---------------------------------------------------------------------------
// 9. Resumen
// ---------------------------------------------------------------------------
async function printFinalSummary() {
  const [reservationCount, profileCount, offerCount] = await Promise.all([
    api("/rest/v1/reservations?select=id"),
    api("/rest/v1/profiles?select=id"),
    api("/rest/v1/offers?select=id"),
  ]);

  console.log("\n" + "─".repeat(64));
  console.log("Demo lista");
  console.log("─".repeat(64));
  console.log(`Perfiles:     ${profileCount.length}`);
  console.log(`Ofertas:      ${offerCount.length}`);
  console.log(`Reservas:     ${reservationCount.length}`);
  console.log("");
  console.log(`Cliente demo: ${clientes[0].email} (y ${clientes.length - 1} más)`);
  console.log(`Admin demo:   ${ADMIN_EMAIL}`);
  console.log(`Contraseña:   ${PASSWORD}`);
  console.log("");
  console.log(
    "Puedes entrar en /login y abrir /cliente/reservas, /negocio/reservas,\n" +
      "/negocio/entregas y /admin/reservas para ver los datos.",
  );
  if (resetSummary) {
    console.log(
      `\nReinicio: ${resetSummary.deleted} reservas demo borradas y ${resetSummary.restored} activas devueltas al stock.`,
    );
  }
  if (errors.length > 0) {
    console.log(`\n${errors.length} reservas no se pudieron crear:`);
    for (const error of errors) console.log(`  - ${error}`);
    process.exitCode = 1;
  }
  console.log("");
}

const finalRows = await api(
  `/rest/v1/reservations?select=customer_id&customer_id=in.(${clientIdList})`,
);
const finalByCustomer = new Map();
for (const row of finalRows) {
  finalByCustomer.set(
    row.customer_id,
    (finalByCustomer.get(row.customer_id) ?? 0) + 1,
  );
}

const summaryRows = clientRecords.map((client) => ({
  cliente: client.fullName,
  correo: client.email,
  estado: client.created ? "cuenta creada" : "cuenta existente",
  reservas: finalByCustomer.get(client.id) ?? 0,
}));

if (records.length > 0) {
  console.log("");
  console.table(summaryRows);
  console.log("Reservas creadas en esta ejecución:");
  console.table(counts);
  console.log(
    `Historial desde ${formatDate(new Date(Date.now() - 10 * DAY_MS))} hasta hoy.`,
  );
  console.log(
    `Admin: ${ADMIN_EMAIL} (${admin.promoted ? "rol ADMIN asignado" : "ya era ADMIN"}).`,
  );
}

await printFinalSummary();
