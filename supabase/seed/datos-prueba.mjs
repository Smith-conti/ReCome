/**
 * ReCome · Datos de prueba (solo desarrollo)
 *
 * Crea 7 comercios de Cusco, cada uno con su cuenta de propietario
 * (rol BUSINESS) y sus ofertas activas. Es idempotente: si vuelve a
 * ejecutarse, omite lo que ya existe. Para renovar las fechas de recojo
 * de las ofertas ya creadas, usa `ofertas-vigentes.mjs`.
 *
 * Uso:
 *   node supabase/seed/datos-prueba.mjs
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY      (salta RLS; no la compartas)
 *
 * Contraseña de las cuentas de prueba: RECOME_SEED_PASSWORD
 * (por defecto "ReCome2026!"). Cámbiala antes de desplegar.
 *
 * Para borrar todo lo creado, ejecuta supabase/seed/limpiar-datos-prueba.sql
 * en el SQL Editor.
 */

import { businesses } from "./comercios.mjs";
import { api, env, requireCredentials } from "./cliente.mjs";

requireCredentials();

const PASSWORD = env.RECOME_SEED_PASSWORD ?? "ReCome2026!";

// ---------------------------------------------------------------------------
// Horarios: Perú es UTC-5 todo el año, sin horario de verano.
// ---------------------------------------------------------------------------
function limaNow() {
  return new Date(Date.now() - 5 * 60 * 60 * 1000);
}

function pickupWindow(start, end) {
  const now = limaNow();
  const [eh, em] = end.split(":").map(Number);
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  const day = new Date(now);
  if (nowMinutes >= eh * 60 + em) {
    day.setUTCDate(day.getUTCDate() + 1);
  }

  const date = day.toISOString().slice(0, 10);
  return {
    pickup_start: `${date}T${start}:00-05:00`,
    pickup_end: `${date}T${end}:00-05:00`,
  };
}

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------
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

async function ensureUser({ email, owner }, cache) {
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
      user_metadata: { full_name: owner, role: "BUSINESS" },
    }),
  });

  cache.users.push({ id: created.id, email });
  return { id: created.id, created: true };
}

const categories = await api("/rest/v1/categories?select=id,slug,name");
const categoryId = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

let createdBusinesses = 0;
let createdOffers = 0;
const summary = [];
const userCache = { loaded: false, users: [] };

for (const item of businesses) {
  const user = await ensureUser(item, userCache);
  if (!categoryId[item.category]) {
    throw new Error(`No existe la categoría "${item.category}"`);
  }

  const found = await api(
    `/rest/v1/businesses?select=id,slug&owner_id=eq.${user.id}`,
  );

  let business = found[0];
  if (!business) {
    const inserted = await api("/rest/v1/businesses", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        owner_id: user.id,
        name: item.name,
        description: item.description,
        type: item.type,
        address: item.address,
        district: item.district,
        city: "Cusco",
        phone: item.phone,
        email: item.email,
        latitude: item.latitude,
        longitude: item.longitude,
        opening_hours: item.opening_hours,
        approval_status: "APPROVED",
        approved_at: new Date().toISOString(),
      }),
    });
    business = inserted[0];
    createdBusinesses += 1;
  }

  const existingOffers = await api(
    `/rest/v1/offers?select=title&business_id=eq.${business.id}`,
  );
  const existingTitles = new Set(existingOffers.map((row) => row.title));

  for (const offer of item.offers) {
    if (existingTitles.has(offer.title)) continue;

    const window = pickupWindow(...offer.window);

    await api("/rest/v1/offers", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        business_id: business.id,
        category_id: categoryId[item.category],
        title: offer.title,
        description: offer.description,
        original_price: offer.original,
        discounted_price: offer.price,
        initial_quantity: offer.stock,
        available_quantity: offer.stock,
        pickup_start: window.pickup_start,
        pickup_end: window.pickup_end,
        status: "ACTIVE",
      }),
    });
    createdOffers += 1;
  }

  summary.push({
    comercio: item.name,
    distrito: item.district,
    correo: item.email,
    ofertas: item.offers.length,
    cuenta: user.created ? "creada" : "existente",
    negocio: found.length > 0 ? "existente" : "creado",
  });
}

const [businessCount, offerCount] = await Promise.all([
  api("/rest/v1/businesses?select=id"),
  api("/rest/v1/offers?select=id"),
]);

console.log("");
console.table(summary);
console.log("");
console.log(`Comercios creados ahora: ${createdBusinesses}`);
console.log(`Ofertas creadas ahora:   ${createdOffers}`);
console.log(`Total de comercios:      ${businessCount.length}`);
console.log(`Total de ofertas:        ${offerCount.length}`);
console.log("");
console.log(`Contraseña de las cuentas de prueba: ${PASSWORD}`);
