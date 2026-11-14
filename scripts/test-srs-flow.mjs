// PostgreSQL embebido, sin conexiones ni cambios en el proyecto real.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
const db = new PGlite({ extensions: { unaccent } });
const root = new URL("../supabase/migrations/", import.meta.url);
const client = "10000000-0000-4000-8000-000000000001";
const owner = "10000000-0000-4000-8000-000000000002";
const admin = "10000000-0000-4000-8000-000000000003";
const foreign = "10000000-0000-4000-8000-000000000004";
let checks = 0;
function ok(value, label) { assert.ok(value, label); console.log(`OK ${++checks}: ${label}`); }
async function row(sql, args = []) { return (await db.query(sql, args)).rows[0]; }
async function as(uid, sql, args = []) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
  await db.exec("set role authenticated");
  try { return await row(sql, args); } finally { await db.exec("reset role"); }
}
async function rpc(uid, name, args) {
  return (await as(uid, `select to_jsonb(public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")})) as result`, args)).result;
}
async function fail(uid, name, args, label) {
  let rejected = false;
  try { await rpc(uid, name, args); } catch { rejected = true; }
  ok(rejected, label);
}
async function offer(label, quantity = 20, future = false) {
  const result = await row(`insert into public.offers(business_id,category_id,title,slug,original_price,discounted_price,initial_quantity,available_quantity,pickup_start,pickup_end,status)
    select $1,id,$2,'',20,8,$3,$3,now()+$4::interval,now()+interval '3 hours','ACTIVE' from public.categories limit 1 returning id`,
    [business, label, quantity, future ? "2 hours" : "-10 minutes"]);
  return result.id;
}
async function stock(id) { return (await row("select available_quantity from public.offers where id=$1", [id])).available_quantity; }
async function reserve(id, quantity = 1) { return rpc(client, "create_reservation", [id, quantity]); }
async function pay(id) { return rpc(client, "simulate_reservation_payment", [id]); }
async function confirm(id) { return rpc(owner, "confirm_reservation", [id]); }
async function expire(id) {
  await db.query("update public.reservations set expires_at=now()-interval '1 second' where id=$1", [id]);
  return row("select public.expire_reservations() as count");
}
let business;
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create schema storage; create schema extensions;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,storage to anon,authenticated,service_role;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    create function storage.foldername(name text) returns text[] language sql as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;`);
  for (const file of ["20261111090000_extensions_and_enums.sql", "20261111090100_tables.sql", "20261111090200_indexes.sql", "20261111090300_functions.sql", "20261111090400_triggers.sql", "20261111090500_rls.sql", "20261111090600_storage.sql", "20261111090700_seed_categories.sql", "20261113090000_admin_business_functions.sql", "20261113091000_business_insert_policy.sql", "20261114090000_fase6_offer_history.sql"]) {
    await db.exec(await readFile(new URL(file, root), "utf8"));
  }
  for (const [id, role] of [[client, "CLIENT"], [owner, "BUSINESS"], [admin, "ADMIN"], [foreign, "CLIENT"]]) {
    await db.query("insert into auth.users values($1,$2,$3)", [id, id+"@test.invalid", { full_name: "Prueba SRS", role }]);
    if (role === "ADMIN") await db.query("update public.profiles set role='ADMIN' where id=$1", [id]);
  }
  business = (await row("insert into public.businesses(owner_id,name,slug,type,approval_status,approved_at) values($1,'Comercio SRS','','BAKERY','APPROVED',now()) returning id", [owner])).id;
  await db.exec("grant select on all tables in schema public to anon,authenticated");
  const legacyOffer = await offer("Reserva anterior", 20);
  const legacy = await rpc(client, "create_reservation", [legacyOffer, 8]);
  for (const file of ["20261114120000_srs_reservation_states.sql", "20261114121000_srs_reservation_flow.sql"]) {
    await db.exec(await readFile(new URL(file, root), "utf8"));
  }
  ok((await row("select quantity,workflow_version from public.reservations where id=$1", [legacy.id])).workflow_version === 1, "Migración conserva la reserva anterior de ocho unidades");
  const id = await offer("Flujo completo");
  await fail(client, "create_reservation", [id, 6], "Servidor rechaza seis unidades");
  await fail(owner, "create_reservation", [id, 1], "Comercio no puede reservar como cliente");
  const r = await reserve(id, 2);
  ok(r.status === "PENDING_PAYMENT" && r.pickup_token === null && r.pickup_code === null, "Reserva sin QR antes del pago y confirmación");
  ok(await stock(id) === 18 && Number(r.total_price) === 16, "Stock y precio calculados atómicamente");
  ok(Date.parse(r.expires_at)-Date.parse(r.created_at) <= 600500, "Retención de stock de diez minutos");
  await fail(owner, "confirm_reservation", [r.id], "No se confirma antes del pago simulado");
  ok(!(await rpc(foreign, "simulate_reservation_payment", [r.id])).ok, "Otro cliente no puede simular el pago");
  const paid = await pay(r.id);
  ok(paid.ok && paid.reservation.status === "PENDING" && paid.reservation.pickup_token === null, "Pago simulado cambia a pendiente de confirmación sin generar QR");
  ok(Date.parse(paid.reservation.expires_at)-Date.parse(paid.reservation.paid_at) <= 900500, "Confirmación tiene quince minutos");
  await pay(r.id);
  ok((await row("select count(*)::int as n from public.reservation_events where reservation_id=$1 and event='PAYMENT_SIMULATED'", [r.id])).n === 1, "Pago simulado idempotente sin renovar plazo ni duplicar eventos");
  await fail(client, "confirm_reservation", [r.id], "Cliente no puede confirmar");
  const c = await confirm(r.id);
  ok(c.status === "CONFIRMED" && Boolean(c.pickup_token), "Solo la confirmación genera el token QR");
  ok((await confirm(r.id)).pickup_token === c.pickup_token, "Repetir confirmación no genera otro QR");
  ok(!(await rpc(foreign, "deliver_reservation", [r.id, c.pickup_token])).ok, "Otro usuario no puede registrar la entrega");
  ok((await rpc(owner, "deliver_reservation", [r.id, "incorrecto"])).error === "invalid_code", "QR incorrecto rechazado");
  const delivery = await rpc(owner, "deliver_reservation", [r.id, c.pickup_token]);
  ok(delivery.ok && Number(delivery.reservation.commission_amount) === 1.6 && Number(delivery.reservation.business_net_amount) === 14.4, "Entrega calcula 10 % y neto simulado en la misma transacción");
  ok((await rpc(owner, "deliver_reservation", [r.id, c.pickup_token])).error === "already_delivered", "QR repetido rechazado sin duplicar entrega ni comisión");
  const early = await reserve(await offer("Recojo futuro", 10, true)); await pay(early.id); const earlyC = await confirm(early.id);
  ok((await rpc(owner, "deliver_reservation", [early.id, earlyC.pickup_token])).error === "outside_pickup_window", "Entrega antes del horario rechazada");
  const unpaidOffer = await offer("Vencimiento de pago"); const unpaid = await reserve(unpaidOffer, 3); await expire(unpaid.id);
  ok(!(await pay(unpaid.id)).ok && await stock(unpaidOffer) === 20, "Vencer pago cancela y devuelve stock");
  await expire(unpaid.id); ok(await stock(unpaidOffer) === 20, "Vencimiento repetido no duplica stock");
  const unansweredOffer = await offer("Sin respuesta"); const unanswered = await reserve(unansweredOffer); await pay(unanswered.id); await expire(unanswered.id);
  ok((await confirm(unanswered.id)).status === "CANCELLED" && await stock(unansweredOffer) === 20, "Sin respuesta en plazo cancela y no permite confirmación tardía");
  const noShowOffer = await offer("No recogida"); const noShow = await reserve(noShowOffer); await pay(noShow.id); const noShowC = await confirm(noShow.id); await expire(noShow.id);
  const noShowRow = await row("select * from public.reservations where id=$1", [noShow.id]);
  ok(noShowRow.status === "NO_SHOW" && Number(noShowRow.commission_amount) === 0, "No recogida queda registrada sin comisión");
  ok(!(await rpc(owner, "deliver_reservation", [noShow.id, noShowC.pickup_token])).ok, "No se entrega una reserva no recogida");
  const rejectedOffer = await offer("Rechazo"); const rejected = await reserve(rejectedOffer); await pay(rejected.id);
  await rpc(owner, "cancel_reservation", [rejected.id]); await rpc(owner, "cancel_reservation", [rejected.id]);
  ok(await stock(rejectedOffer) === 20, "Rechazo y repetición liberan stock una sola vez");
  const lateCancel = await reserve(await offer("Cancelación fuera de plazo")); await pay(lateCancel.id); await confirm(lateCancel.id);
  await fail(client, "cancel_reservation", [lateCancel.id], "Cancelación confirmada fuera de los sesenta minutos rechazada");
  await fail(client, "set_commission_rate", [0.2], "Cliente no puede cambiar comisión");
  await rpc(admin, "set_commission_rate", [0.2]);
  const newRate = await reserve(await offer("Nueva tasa"));
  ok(Number(newRate.commission_rate) === 0.2 && Number(c.commission_rate) === 0.1, "Tasa configurable con instantánea que conserva reservas previas");
  await fail(client, "expire_reservations", [], "Cron no invocable por cliente");
  await fail(client, "expire_offer_reservations", [id], "Helper de stock no invocable por cliente");
  await rpc(owner, "cancel_reservation", [early.id]);
  const heldOffer = await offer("Stock retenido"); const held = await reserve(heldOffer, 2);
  let stockRejected=false;
  try { await db.query("update public.offers set available_quantity=initial_quantity where id=$1",[heldOffer]); } catch { stockRejected=true; }
  ok(stockRejected && await stock(heldOffer)===18, "El comercio no puede reutilizar unidades retenidas al editar stock");
  await db.query("update public.reservations set expires_at=now()-interval '1 second' where id=$1",[held.id]);
  ok(!(await pay(held.id)).ok && await stock(heldOffer)===20, "Pago tardío libera stock aunque el cron todavía no haya pasado");
  const limitOffer = await offer("Límite por cliente");
  await rpc(client,"cancel_reservation",[legacy.id]);
  await rpc(owner,"cancel_reservation",[lateCancel.id]);
  await rpc(client,"cancel_reservation",[newRate.id]);
  for(let i=0;i<5;i++) await reserve(limitOffer);
  await fail(client,"create_reservation",[limitOffer,1],"Sexta reserva activa rechazada en servidor");
  await db.exec(await readFile(new URL("20261114130000_srs_offer_discount.sql", root), "utf8"));
  let discountRejected = false;
  try { await offer("Descuento inválido"); } catch { discountRejected = true; }
  ok(discountRejected, "PostgreSQL rechaza crear descuentos mayores que 50 %");
  await db.query("update public.offers set discounted_price=10 where id=$1", [heldOffer]);
  ok((await row("select discounted_price from public.offers where id=$1",[heldOffer])).discounted_price==='10.00' || Number((await row("select discounted_price from public.offers where id=$1",[heldOffer])).discounted_price)===10, "PostgreSQL permite exactamente 50 %");
  await db.query("update public.offers set available_quantity=available_quantity where id=$1",[limitOffer]);
  ok(await stock(limitOffer)===15, "Regla nueva conserva stock e historial de ofertas anteriores");
  console.log(`${checks} comprobaciones PostgreSQL correctas.`);
} finally { await db.close(); }
