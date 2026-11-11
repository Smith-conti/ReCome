-- ReCome · Fase 2
-- Índices para búsquedas y listados frecuentes.

-- Catálogo público.
create index offers_status_pickup_end_idx
  on public.offers (status, pickup_end);

create index offers_category_id_idx
  on public.offers (category_id);

create index offers_business_created_at_idx
  on public.offers (business_id, created_at desc);

create index offers_active_catalog_idx
  on public.offers (pickup_end, category_id)
  where status = 'ACTIVE' and archived_at is null;

-- Reservas.
create index reservations_customer_status_idx
  on public.reservations (customer_id, status);

create index reservations_business_status_idx
  on public.reservations (business_id, status);

create index reservations_expires_at_idx
  on public.reservations (expires_at)
  where status in ('PENDING', 'CONFIRMED');

-- Historial.
create index reservation_events_reservation_created_at_idx
  on public.reservation_events (reservation_id, created_at);

-- Paneles administrativos.
create index businesses_approval_status_idx
  on public.businesses (approval_status);

create index profiles_role_idx
  on public.profiles (role);

create index categories_active_idx
  on public.categories (is_active);
