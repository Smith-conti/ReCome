-- ReCome · Fase 6: migración incremental.
--
-- Para proyectos que YA tienen aplicado el esquema de las fases anteriores.
-- Pega todo este archivo en Supabase → SQL Editor → New query y pulsa Run.
--
-- Contiene las migraciones de historial, permisos/cron y propiedad en Storage:
--   20261114090000_fase6_offer_history.sql
--   20261114100000_fase6_expiration_cron.sql
--   20261114110000_fase6_storage_owner_paths.sql
--
-- Para una instalación desde cero usa `consolidado.sql` (ya la incluye).

-- ===========================================================================
-- 20261114090000_fase6_offer_history.sql
-- ===========================================================================

-- Historial de reservas del cliente.
--
-- Las políticas del catálogo solo dejan leer ofertas ACTIVE con recojo vigente.
-- Sin esta política, al abrir una reserva entregada, cancelada o vencida el
-- cliente perdería el título y los datos de la oferta.
--
-- La política no se aplica a `anon`: solo un cliente autenticado puede leer
-- las ofertas que él mismo reservó.

create index if not exists reservations_offer_id_idx
on public.reservations (offer_id);

drop policy if exists offers_select_customer_reservations on public.offers;

create policy offers_select_customer_reservations
on public.offers for select
to authenticated
using (
  exists (
    select 1
    from public.reservations r
    where r.offer_id = offers.id
      and r.customer_id = (select auth.uid())
  )
);

-- 20261114100000_fase6_expiration_cron.sql
-- Fase 6: vencimientos sin depender del navegador ni de un despliegue web.
-- Supabase incluye pg_cron; ejecutar como postgres (SQL Editor o migraciones).
-- El nombre estable actualiza el job existente al volver a ejecutar el script.
create extension if not exists pg_cron with schema pg_catalog;

-- Supabase puede conceder EXECUTE por privilegios por defecto directamente a
-- anon/authenticated. Revocar PUBLIC no elimina esas concesiones explícitas.
revoke all on function public.expire_reservations() from public, anon, authenticated;
grant execute on function public.expire_reservations() to service_role;

select cron.schedule(
  'recome-expire-reservations',
  '*/15 * * * *',
  'select public.expire_reservations();'
);


-- 20261114110000_fase6_storage_owner_paths.sql
-- En el EXISTS sobre businesses, `name` sin calificar se resuelve como
-- businesses.name, no como storage.objects.name. Usar la ruta del objeto.
alter policy storage_business_assets_insert_owner on storage.objects
with check (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1 from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

alter policy storage_business_assets_update_owner on storage.objects
using (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1 from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(storage.objects.name))[1]
  )
)
with check (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1 from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

alter policy storage_business_assets_delete_owner on storage.objects
using (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1 from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(storage.objects.name))[1]
  )
);
