/**
 * ReCome · Renovar la vigencia de las ofertas de prueba (solo desarrollo)
 *
 * Toma las ofertas del catálogo de prueba (`comercios.mjs`) y las reparte
 * entre varias fechas próximas, de modo que el catálogo público siempre
 * tenga ofertas activas para probar.
 *
 * Uso:
 *   node supabase/seed/ofertas-vigentes.mjs
 *   node supabase/seed/ofertas-vigentes.mjs 2026-11-15 2026-11-16 2026-11-17
 *
 * Sin argumentos usa los próximos 3 días (hora de Perú). Con argumentos usa
 * exactamente esas fechas, en orden.
 *
 * Qué hace con cada oferta del catálogo:
 *   - si ya existe (mismo comercio y mismo título) actualiza precios, stock,
 *     descripción, fechas de recojo y la vuelve a publicar;
 *   - si no existe, la crea.
 *
 * Ojo: es un script de demostración. Reactiva ofertas pausadas o archivadas
 * y reinicia el stock. No lo ejecutes sobre datos reales.
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY      (salta RLS; no la compartas)
 */

import { businesses } from "./comercios.mjs";
import { api, encode, requireCredentials } from "./cliente.mjs";

requireCredentials();

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Fechas: Perú es UTC-5 todo el año, sin horario de verano.
// ---------------------------------------------------------------------------
function limaIsoDate(date) {
  return new Date(date.getTime() - LIMA_OFFSET_MS).toISOString().slice(0, 10);
}

function nextLimaDays(count) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() + index + 1);
    return limaIsoDate(day);
  });
}

function parseDays(args) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(
      "Uso: node supabase/seed/ofertas-vigentes.mjs [AAAA-MM-DD ...]",
    );
    console.log(
      "Sin fechas usa los próximos 3 días. Ejemplo:\n" +
        "  node supabase/seed/ofertas-vigentes.mjs 2026-11-15 2026-11-16 2026-11-17",
    );
    process.exit(0);
  }

  const dates = args.filter((arg) => !arg.startsWith("-"));
  if (dates.length === 0) return nextLimaDays(3);

  for (const date of dates) {
    if (!DATE_PATTERN.test(date) || Number.isNaN(Date.parse(date))) {
      console.error(`Fecha inválida: "${date}". Usa el formato AAAA-MM-DD.`);
      process.exit(1);
    }
  }

  return [...new Set(dates)].sort();
}

const days = parseDays(process.argv.slice(2));

if (days.length === 0) {
  console.error("No hay fechas para generar ofertas.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Datos de referencia
// ---------------------------------------------------------------------------
const categories = await api("/rest/v1/categories?select=id,slug");
const categoryId = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

const approved = await api(
  "/rest/v1/businesses?select=id,name,approval_status&approval_status=eq.APPROVED",
);
const businessByName = new Map(approved.map((row) => [row.name, row]));

function windowIso(day, [start, end]) {
  return {
    pickup_start: `${day}T${start}:00-05:00`,
    pickup_end: `${day}T${end}:00-05:00`,
    // La comida vence al terminar el día de recojo.
    expiration_at: `${day}T23:59:00-05:00`,
  };
}

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------
const summary = [];
let created = 0;
let updated = 0;
let skipped = 0;

for (const [businessIndex, item] of businesses.entries()) {
  const business = businessByName.get(item.name);
  if (!business) {
    console.warn(`· ${item.name}: no existe o no está aprobado, se omite.`);
    skipped += item.offers.length;
    continue;
  }

  const category = categoryId[item.category];
  if (!category) {
    throw new Error(`No existe la categoría "${item.category}"`);
  }

  const existing = await api(
    `/rest/v1/offers?select=id,title&business_id=eq.${business.id}`,
  );
  const byTitle = new Map(existing.map((row) => [row.title, row.id]));

  for (const [offerIndex, offer] of item.offers.entries()) {
    // Reparte las ofertas entre los días disponibles, rotando por comercio.
    const day = days[(offerIndex + businessIndex) % days.length];
    const window = windowIso(day, offer.window);

    const payload = {
      category_id: category,
      title: offer.title,
      description: offer.description,
      original_price: offer.original,
      discounted_price: offer.price,
      initial_quantity: offer.stock,
      available_quantity: offer.stock,
      pickup_start: window.pickup_start,
      pickup_end: window.pickup_end,
      expiration_at: window.expiration_at,
      status: "ACTIVE",
      archived_at: null,
    };

    const id = byTitle.get(offer.title);

    if (id) {
      await api(`/rest/v1/offers?id=eq.${id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(payload),
      });
      updated += 1;
    } else {
      await api("/rest/v1/offers", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ ...payload, business_id: business.id }),
      });
      created += 1;
    }

    summary.push({
      comercio: item.name,
      oferta: offer.title,
      recojo: `${day} ${offer.window[0]}–${offer.window[1]}`,
      stock: offer.stock,
      accion: id ? "actualizada" : "creada",
    });
  }
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------
const active = await api(
  `/rest/v1/offers?select=id,business_id,pickup_end&status=eq.ACTIVE&archived_at=is.null&pickup_end=gt.${encode(new Date().toISOString())}`,
);

const perDay = Object.fromEntries(days.map((day) => [day, 0]));
for (const row of active) {
  const day = limaIsoDate(new Date(row.pickup_end));
  if (day in perDay) perDay[day] += 1;
}

console.log("");
console.table(summary);
console.log("");
console.log(`Ofertas creadas:     ${created}`);
console.log(`Ofertas actualizadas: ${updated}`);
console.log(`Ofertas omitidas:    ${skipped}`);
console.log(`Días usados:         ${days.join(", ")}`);
console.log("");
console.log("Ofertas activas por día de recojo:");
console.table(perDay);
console.log(`Total de ofertas activas ahora: ${active.length}`);
