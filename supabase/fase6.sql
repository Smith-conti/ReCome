-- ReCome · Fase 6: migración incremental.
--
-- Para proyectos que YA tienen aplicado el esquema de las fases anteriores.
-- Pega todo este archivo en Supabase → SQL Editor → New query y pulsa Run.
--
-- Contiene la migración nueva:
--   20261114090000_fase6_offer_history.sql
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
