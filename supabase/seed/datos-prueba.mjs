/**
 * ReCome · Datos de prueba (solo desarrollo)
 *
 * Crea 7 comercios de Cusco, cada uno con su cuenta de propietario
 * (rol BUSINESS) y sus ofertas activas. Es idempotente: si vuelve a
 * ejecutarse, omite lo que ya existe.
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

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

function loadEnv(file) {
  const out = {};
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/);
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, "").trim();
      if (value) out[match[1]] = value;
    }
  } catch {
    // Sin archivo: se usan las variables del entorno.
  }
  return out;
}

const env = { ...loadEnv(resolve(root, ".env.local")), ...process.env };
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = env.SUPABASE_SECRET_KEY;
const PASSWORD = env.RECOME_SEED_PASSWORD ?? "ReCome2026!";

if (!URL_BASE || !SECRET) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local.",
  );
  process.exit(1);
}

const headers = {
  apikey: SECRET,
  Authorization: `Bearer ${SECRET}`,
  "Content-Type": "application/json",
};

async function api(path, options = {}) {
  const response = await fetch(`${URL_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  });

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const detail =
      body?.message ?? body?.error_description ?? body?.error ?? text;
    throw new Error(`${options.method ?? "GET"} ${path} → ${response.status}: ${detail}`);
  }

  return body;
}

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

const weekdays = (open, close) =>
  [1, 2, 3, 4, 5, 6, 7].map((day) => ({ day, open, close }));

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------
const businesses = [
  {
    name: "Panadería El Trigal",
    email: "eltrigal@recome.test",
    owner: "Rosa Quispe Huamán",
    type: "BAKERY",
    description:
      "Panadería de barrio con horno de leña. Vendemos el pan que sobra del día a precio reducido.",
    address: "Av. Garcilaso de la Vega 1234",
    district: "Wanchaq",
    phone: "984112233",
    latitude: -13.5224,
    longitude: -71.9689,
    opening_hours: weekdays("05:30", "21:00"),
    category: "panaderia",
    offers: [
      { title: "Canasta de panes del día", original: 12, price: 7, stock: 15, window: ["18:00", "21:00"], description: "Surtido de pan francés, yema y pan de campo horneados hoy." },
      { title: "Empanadas de queso (x3)", original: 10, price: 6, stock: 12, window: ["18:00", "21:00"], description: "Empanadas de queso andino recién horneadas." },
      { title: "Porción de torta de chocolate", original: 9, price: 5, stock: 8, window: ["17:00", "20:30"], description: "Bizcocho húmedo de cacao con ganache." },
    ],
  },
  {
    name: "Pastelería Doña Chela",
    email: "donachela@recome.test",
    owner: "Graciela Mendoza Farfán",
    type: "PASTRY",
    description:
      "Pastelería tradicional cusqueña. Tortas, alfajores y postres hechos en casa.",
    address: "Calle Plateros 348",
    district: "Cusco",
    phone: "984223344",
    latitude: -13.5167,
    longitude: -71.9785,
    opening_hours: weekdays("09:00", "20:30"),
    category: "pasteleria",
    offers: [
      { title: "Torta de tres leches", original: 55, price: 35, stock: 3, window: ["17:00", "20:00"], description: "Torta entera de 24 cm, para 8 porciones." },
      { title: "Alfajores artesanales (x6)", original: 18, price: 11, stock: 10, window: ["16:00", "20:00"], description: "Alfajores de manjar blanco con azúcar impalpable." },
      { title: "Cheesecake de maracuyá", original: 60, price: 38, stock: 4, window: ["17:30", "20:30"], description: "Cheesecake horneado con salsa de maracuyá." },
    ],
  },
  {
    name: "Café Qorikancha",
    email: "qorikancha@recome.test",
    owner: "Luis Alberto Ccoa Ttito",
    type: "CAFE",
    description:
      "Café de especialidad a dos cuadras del Qorikancha. Granos de La Convención.",
    address: "Av. El Sol 456",
    district: "Cusco",
    phone: "984334455",
    latitude: -13.5202,
    longitude: -71.9752,
    opening_hours: weekdays("07:00", "21:00"),
    category: "cafeteria",
    offers: [
      { title: "Café pasado + croissant", original: 14, price: 8, stock: 20, window: ["16:00", "20:00"], description: "Café de 12 oz y croissant de mantequilla del día." },
      { title: "Jugo de naranja 1 L", original: 12, price: 6, stock: 10, window: ["15:00", "19:00"], description: "Jugo natural exprimido en el local." },
      { title: "Sánguche de pollo deshilachado", original: 13, price: 8, stock: 12, window: ["16:00", "20:00"], description: "Pan ciabatta con pollo, lechuga y mayonesa de ají." },
    ],
  },
  {
    name: "Heladería Salkantay",
    email: "salkantay@recome.test",
    owner: "María Elena Puma Vargas",
    type: "ICE_CREAM",
    description:
      "Helados artesanales con frutas de la región: lúcuma, chirimoya y aguaymanto.",
    address: "Calle Tandapata 210, San Blas",
    district: "Cusco",
    phone: "984445566",
    latitude: -13.5143,
    longitude: -71.9736,
    opening_hours: weekdays("11:00", "21:30"),
    category: "heladeria",
    offers: [
      { title: "Pote de helado 1 L", original: 32, price: 19, stock: 6, window: ["18:00", "21:00"], description: "Elige hasta dos sabores. Pote sellado para llevar." },
      { title: "Copa doble de helado", original: 12, price: 7, stock: 15, window: ["17:00", "21:00"], description: "Dos bolas con topping de fruta fresca." },
    ],
  },
  {
    name: "Restaurante Tupananchis",
    email: "tupananchis@recome.test",
    owner: "Julio César Auccapuma Rojas",
    type: "RESTAURANT",
    description:
      "Comida casera cusqueña. Menú del día y platos para llevar.",
    address: "Av. Velasco Astete 890",
    district: "San Jerónimo",
    phone: "984556677",
    latitude: -13.5439,
    longitude: -71.9361,
    opening_hours: weekdays("11:30", "20:00"),
    category: "comida-preparada",
    offers: [
      { title: "Menú del día para llevar", original: 18, price: 11, stock: 25, window: ["14:00", "17:00"], description: "Sopa, segundo y refresco. Empaque incluido." },
      { title: "Sopa de quinua 1 L", original: 12, price: 7, stock: 10, window: ["14:00", "18:00"], description: "Sopa de quinua con verduras y hierbas andinas." },
      { title: "Pollo a la brasa (1/4)", original: 22, price: 14, stock: 18, window: ["17:00", "20:00"], description: "Cuarto de pollo con papas y ensalada." },
    ],
  },
  {
    name: "Panificadora Los Andes",
    email: "losandes@recome.test",
    owner: "Eloy Huamán Cárdenas",
    type: "BAKERY",
    description:
      "Panificadora del barrio de Santiago. Pan integral, bizcochos y masas dulces.",
    address: "Av. Huayruropata 1450",
    district: "Santiago",
    phone: "984667788",
    latitude: -13.5278,
    longitude: -71.9604,
    opening_hours: weekdays("06:00", "21:00"),
    category: "panaderia",
    offers: [
      { title: "Pan de molde integral", original: 14, price: 8, stock: 10, window: ["18:00", "21:00"], description: "Molde de 600 g con harina integral y linaza." },
      { title: "Bizcochos andinos (x10)", original: 15, price: 9, stock: 12, window: ["17:00", "20:30"], description: "Bizcochos de manteca con harina de trigo local." },
    ],
  },
  {
    name: "Dulcería Manzanapata",
    email: "manzanapata@recome.test",
    owner: "Ana Lucía Béjar Yupanqui",
    type: "PASTRY",
    description:
      "Dulces cusqueños tradicionales: turrón, mazamorra y rosquitas.",
    address: "Calle Santa Ana 320",
    district: "Cusco",
    phone: "984778899",
    latitude: -13.5148,
    longitude: -71.9816,
    opening_hours: weekdays("10:00", "21:00"),
    category: "pasteleria",
    offers: [
      { title: "Turrón de Doña Pepa (porción)", original: 10, price: 6, stock: 20, window: ["16:00", "20:00"], description: "Porción generosa con miel de chancaca." },
      { title: "Mazamorra morada 1 L", original: 12, price: 7, stock: 8, window: ["16:00", "20:00"], description: "Mazamorra con frutas secas, lista para servir." },
      { title: "Rosquitas de manteca (x12)", original: 14, price: 8, stock: 10, window: ["17:00", "21:00"], description: "Rosquitas horneadas del día." },
    ],
  },
];

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
