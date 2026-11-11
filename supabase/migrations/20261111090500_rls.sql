-- ReCome · Fase 2
-- Row Level Security y privilegios por columna.
--
-- Principio: el rol del usuario, los precios, el stock y los estados no se
-- confían al navegador. Las escrituras sensibles pasan por funciones SQL.

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.categories enable row level security;
alter table public.offers enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_events enable row level security;
alter table public.audit_logs enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select_own
on public.profiles for select
to authenticated
using (id = (select auth.uid()));

create policy profiles_select_admin
on public.profiles for select
to authenticated
using (public.is_admin());

-- Un comercio puede ver los datos de los clientes que le reservaron.
create policy profiles_select_business_customers
on public.profiles for select
to authenticated
using (
  exists (
    select 1
    from public.reservations r
    join public.businesses b on b.id = r.business_id
    where r.customer_id = profiles.id
      and b.owner_id = (select auth.uid())
  )
);

create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
create policy businesses_select_approved
on public.businesses for select
to anon, authenticated
using (approval_status = 'APPROVED');

create policy businesses_select_owner
on public.businesses for select
to authenticated
using (owner_id = (select auth.uid()));

create policy businesses_select_admin
on public.businesses for select
to authenticated
using (public.is_admin());

create policy businesses_insert_owner
on public.businesses for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and approval_status = 'PENDING'
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'BUSINESS'
  )
);

create policy businesses_update_owner
on public.businesses for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create policy categories_select_public
on public.categories for select
to anon, authenticated
using (is_active or public.is_admin());

create policy categories_admin_all
on public.categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- offers
-- ---------------------------------------------------------------------------
create policy offers_select_catalog
on public.offers for select
to anon, authenticated
using (
  status = 'ACTIVE'
  and archived_at is null
  and pickup_end > now()
  and exists (
    select 1
    from public.businesses b
    where b.id = offers.business_id
      and b.approval_status = 'APPROVED'
  )
);

create policy offers_select_owner
on public.offers for select
to authenticated
using (public.owns_business(business_id));

create policy offers_select_admin
on public.offers for select
to authenticated
using (public.is_admin());

create policy offers_insert_owner
on public.offers for insert
to authenticated
with check (
  public.owns_business(business_id)
  and archived_at is null
  and (
    status in ('DRAFT', 'PAUSED')
    or (
      status in ('ACTIVE', 'SOLD_OUT')
      and exists (
        select 1
        from public.businesses b
        where b.id = offers.business_id
          and b.approval_status = 'APPROVED'
      )
    )
  )
);

create policy offers_update_owner
on public.offers for update
to authenticated
using (public.owns_business(business_id))
with check (public.owns_business(business_id));

-- ---------------------------------------------------------------------------
-- reservations
-- ---------------------------------------------------------------------------
create policy reservations_select_customer
on public.reservations for select
to authenticated
using (customer_id = (select auth.uid()));

create policy reservations_select_business
on public.reservations for select
to authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = reservations.business_id
      and b.owner_id = (select auth.uid())
  )
);

create policy reservations_select_admin
on public.reservations for select
to authenticated
using (public.is_admin());

-- ---------------------------------------------------------------------------
-- reservation_events
-- ---------------------------------------------------------------------------
create policy reservation_events_select_related
on public.reservation_events for select
to authenticated
using (
  exists (
    select 1
    from public.reservations r
    where r.id = reservation_events.reservation_id
      and r.customer_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.reservations r
    join public.businesses b on b.id = r.business_id
    where r.id = reservation_events.reservation_id
      and b.owner_id = (select auth.uid())
  )
  or public.is_admin()
);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create policy audit_logs_select_admin
on public.audit_logs for select
to authenticated
using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Privilegios por columna
-- ---------------------------------------------------------------------------
-- Perfil: el rol y el correo no se modifican desde el cliente.
revoke update on public.profiles from anon, authenticated;
revoke insert, delete on public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url, updated_at)
  on public.profiles to authenticated;

-- Comercio: el estado de aprobación solo lo cambia el servidor.
revoke update on public.businesses from anon, authenticated;
revoke insert, delete on public.businesses from anon;
revoke delete on public.businesses from authenticated;
grant update (
  name,
  slug,
  description,
  type,
  address,
  district,
  city,
  phone,
  email,
  latitude,
  longitude,
  opening_hours,
  logo_url,
  updated_at
) on public.businesses to authenticated;

-- Oferta: stock, estado y archivado solo mediante funciones SQL.
revoke update on public.offers from anon, authenticated;
revoke delete on public.offers from anon, authenticated;
grant update (
  category_id,
  title,
  slug,
  description,
  original_price,
  discounted_price,
  initial_quantity,
  image_url,
  pickup_start,
  pickup_end,
  expiration_at,
  ingredients,
  allergens,
  storage_instructions,
  updated_at
) on public.offers to authenticated;

-- Reservas, eventos y auditoría: solo lectura a través de RLS.
revoke insert, update, delete on public.reservations from anon, authenticated;
revoke insert, update, delete on public.reservation_events from anon, authenticated;
revoke insert, update, delete on public.audit_logs from anon, authenticated;
