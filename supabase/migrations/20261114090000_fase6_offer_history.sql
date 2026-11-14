-- ReCome · Fase 6
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
