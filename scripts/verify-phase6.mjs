/** Verificación funcional real de las fases 3–6 con datos temporales propios.
 * Uso: node scripts/verify-phase6.mjs --run-remote
 * Requiere las variables de .env.local. No ejecuta seeds ni modifica cuentas existentes.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { env, requireCredentials } from "../supabase/seed/cliente.mjs";

if (!process.argv.includes("--run-remote")) {
  console.log("Uso: node scripts/verify-phase6.mjs --run-remote (crea y limpia datos temporales en Supabase)");
  process.exit(0);
}
requireCredentials();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(key, "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, env.SUPABASE_SECRET_KEY, options);
const anonymous = createClient(url, key, options);
const run = randomUUID();
const password = `Rc-${randomUUID()}-9a`;
const users = [];
const offerIds = [];
let businessId;
let imagePath;
let checks = 0;

function ok(condition, label) {
  assert.ok(condition, label);
  checks++;
  console.log(`OK ${checks}: ${label}`);
}
async function value(request) {
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data;
}
async function account(role) {
  const email = `verify-${run}-${users.length}@recome.test`;
  const data = await value(service.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: "Verificación temporal ReCome", role },
  }));
  users.push(data.user.id);
  const client = createClient(url, key, options);
  await value(client.auth.signInWithPassword({ email, password }));
  const profile = await value(client.from("profiles").select("role").eq("id", data.user.id).single());
  ok(profile.role === role, `Registro, sesión y perfil ${role}`);
  return { client, id: data.user.id };
}
async function offer(owner, category, label) {
  const id = randomUUID();
  await value(owner.from("offers").insert({
    id, business_id: businessId, category_id: category,
    title: `Verificación ${label} ${run}`, description: "Datos temporales de verificación funcional.",
    original_price: 20, discounted_price: 8, initial_quantity: 10,
    available_quantity: 10, status: "DRAFT",
    pickup_start: new Date(Date.now() + 3600000).toISOString(),
    pickup_end: new Date(Date.now() + 7200000).toISOString(),
  }));
  offerIds.push(id);
  await value(owner.rpc("set_offer_status", { p_offer_id: id, p_status: "ACTIVE" }));
  return id;
}
async function stock(id) {
  return (await value(service.from("offers").select("available_quantity").eq("id", id).single())).available_quantity;
}
async function reserve(client, id, quantity = 1) {
  return value(client.rpc("create_reservation", { p_offer_id: id, p_quantity: quantity }));
}

try {
  const owner = await account("BUSINESS");
  const customer = await account("CLIENT");
  const stranger = await account("CLIENT");
  ok(Boolean((await customer.client.from("profiles").update({ role: "ADMIN" }).eq("id", customer.id)).error), "El cliente no puede elevar su rol");
  const admin = createClient(url, key, options);
  await value(admin.auth.signInWithPassword({ email: "admin@recome.test", password: env.RECOME_SEED_PASSWORD ?? "ReCome2026!" }));
  const category = (await value(service.from("categories").select("id").eq("is_active", true).limit(1)))[0]?.id;
  assert.ok(category, "Debe existir una categoría activa");
  businessId = randomUUID();
  await value(owner.client.from("businesses").insert({
    id: businessId, owner_id: owner.id, name: `Verificación ${run}`, type: "BAKERY",
    address: "Dirección temporal de prueba", district: "Cusco", phone: "999999999",
  }));
  ok((await value(service.from("businesses").select("approval_status").eq("id", businessId).single())).approval_status === "PENDING", "Alta de comercio en revisión mediante RLS");
  await value(admin.rpc("approve_business", { p_business_id: businessId }));
  ok((await value(service.from("businesses").select("approval_status").eq("id", businessId).single())).approval_status === "APPROVED", "Aprobación administrativa real");

  const id = await offer(owner.client, category, "reservas");
  ok((await value(anonymous.from("offers").select("id").eq("id", id))).length === 1, "Oferta publicada visible en catálogo público");
  const first = await reserve(customer.client, id, 2);
  ok(first.status === "PENDING" && first.quantity === 2 && Number(first.total_price) === 16, "Reserva con precio y total calculados en servidor");
  ok(/^[AC-HJ-NP-Z2-79]{6}$/.test(first.pickup_code), "Código de recojo válido de seis caracteres");
  ok(await stock(id) === 8, "Reserva descuenta stock");
  ok(Boolean((await customer.client.rpc("create_reservation", { p_offer_id: id, p_quantity: 9 })).error) && await stock(id) === 8, "Stock insuficiente no crea reserva ni altera existencias");
  ok((await value(stranger.client.from("reservations").select("id").eq("id", first.id))).length === 0, "Otro cliente no puede leer la reserva");
  ok(Boolean((await stranger.client.rpc("confirm_reservation", { p_reservation_id: first.id })).error), "Otro cliente no puede confirmar entregas");
  const confirmed = await value(owner.client.rpc("confirm_reservation", { p_reservation_id: first.id }));
  ok(confirmed.status === "CONFIRMED", "Comercio confirma la reserva");
  const wrong = await value(owner.client.rpc("deliver_reservation", { p_reservation_id: first.id, p_code: "ZZZZZZ" === first.pickup_code ? "AAAAAA" : "ZZZZZZ" }));
  ok(wrong.error === "invalid_code" && wrong.failed_attempts === 1, "Código incorrecto registra un intento fallido");
  const delivered = await value(owner.client.rpc("deliver_reservation", { p_reservation_id: first.id, p_code: first.pickup_code }));
  ok(delivered.ok === true, "Entrega con código correcto");
  const repeated = await value(owner.client.rpc("deliver_reservation", { p_reservation_id: first.id, p_code: first.pickup_code }));
  ok(repeated.already_delivered === true && await stock(id) === 8, "Entrega idempotente");
  const events = await value(customer.client.from("reservation_events").select("event").eq("reservation_id", first.id));
  ok(["CREATED", "CONFIRMED", "DELIVERED"].every(e => events.filter(row => row.event === e).length === 1), "Historial de creación, confirmación y entrega sin duplicados");

  const cancelled = await reserve(customer.client, id);
  await value(customer.client.rpc("cancel_reservation", { p_reservation_id: cancelled.id }));
  const secondCancellation = await customer.client.rpc("cancel_reservation", { p_reservation_id: cancelled.id });
  ok(Boolean(secondCancellation.error) && await stock(id) === 8, "Cancelación repetida rechazada sin duplicar la devolución de stock");
  await value(owner.client.rpc("set_offer_status", { p_offer_id: id, p_status: "PAUSED" }));
  ok((await value(anonymous.from("offers").select("id").eq("id", id))).length === 0, "Oferta pausada oculta al público");
  ok((await value(customer.client.from("offers").select("title").eq("id", id))).length === 1, "Historial conserva la oferta inactiva del cliente (fase6.sql)");
  ok((await value(stranger.client.from("offers").select("id").eq("id", id))).length === 0, "La política de historial no expone ofertas a otros clientes");
  ok(Boolean((await customer.client.rpc("create_reservation", { p_offer_id: id, p_quantity: 1 })).error), "Oferta pausada no admite nuevas reservas");

  const expiryId = await offer(owner.client, category, "vencimientos");
  const expired = await reserve(customer.client, expiryId, 3);
  await value(service.from("reservations").update({ expires_at: new Date(Date.now() - 60000).toISOString() }).eq("id", expired.id));
  ok(Boolean((await customer.client.rpc("expire_reservations")).error), "Vencimiento reservado al servidor");
  ok(Boolean((await anonymous.rpc("expire_reservations")).error), "Visitante anónimo no puede ejecutar vencimientos");
  await value(service.rpc("expire_reservations"));
  await value(service.rpc("expire_reservations"));
  ok((await value(service.from("reservations").select("status").eq("id", expired.id).single())).status === "EXPIRED" && await stock(expiryId) === 10, "Vencimiento idempotente devuelve stock");
  ok((await value(customer.client.from("reservation_events").select("event").eq("reservation_id", expired.id).eq("event", "EXPIRED"))).length === 1, "Un único evento de vencimiento");

  imagePath = `${businessId}/verify-${run}.png`;
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII=", "base64");
  await value(owner.client.storage.from("offer-images").upload(imagePath, png, { contentType: "image/png" }));
  ok(true, "Storage acepta la imagen del propietario");
  const foreignPath = `${businessId}/forbidden-${run}.png`;
  const forbiddenUpload = await stranger.client.storage.from("offer-images").upload(foreignPath, png, { contentType: "image/png" });
  if (!forbiddenUpload.error) {
    await value(service.storage.from("offer-images").remove([foreignPath]));
  }
  ok(Boolean(forbiddenUpload.error), "Storage rechaza imágenes de otro usuario");
  await value(owner.client.rpc("archive_offer", { p_offer_id: id }));
  ok(Boolean((await value(service.from("offers").select("archived_at").eq("id", id).single())).archived_at), "Archivado conserva las reservas asociadas");
  await value(admin.rpc("suspend_business", { p_business_id: businessId, p_reason: "Prueba funcional temporal" }));
  ok((await value(service.from("businesses").select("approval_status").eq("id", businessId).single())).approval_status === "SUSPENDED", "Suspensión administrativa del comercio");
  await value(admin.rpc("approve_business", { p_business_id: businessId }));
  ok((await value(service.from("businesses").select("approval_status").eq("id", businessId).single())).approval_status === "APPROVED", "Reactivación administrativa del comercio");
  await value(customer.client.auth.signOut());
  ok((await customer.client.auth.getSession()).data.session === null, "Cierre de sesión");
  console.log(`Resultado: ${checks} comprobaciones funcionales correctas.`);
} catch (error) {
  console.error(`FALLO: ${error.message}`);
  process.exitCode = 1;
} finally {
  // Solo identificadores creados por esta ejecución. Nunca limpiar por correo o prefijo.
  try {
    if (imagePath) await value(service.storage.from("offer-images").remove([imagePath]));
    if (businessId) {
      await value(service.from("reservations").delete().eq("business_id", businessId));
      await value(service.from("offers").delete().eq("business_id", businessId));
      await value(service.from("audit_logs").delete().eq("entity_id", businessId));
      await value(service.from("businesses").delete().eq("id", businessId));
    }
    for (const id of users) await value(service.auth.admin.deleteUser(id));
    console.log("Limpieza de datos temporales: OK.");
  } catch (error) {
    console.error(`FALLO DE LIMPIEZA (ejecución ${run}): ${error.message}`);
    process.exitCode = 1;
  }
}
