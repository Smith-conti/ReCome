-- ReCome · Fases 1–6: esquema completo de la base de datos.
--
-- Archivo consolidado para pegar en el SQL Editor de Supabase.
-- Contiene, en orden, las migraciones de supabase/migrations/.
-- Requiere Supabase con pg_cron disponible.
--
-- Cómo usarlo:
--   1. Abre el proyecto en https://supabase.com/dashboard
--   2. Entra en SQL Editor > New query
--   3. Pega TODO este archivo y pulsa Run (Ctrl+Enter)
--   4. Al final debe devolver: tablas = 8, categorias = 6, buckets = 3
--
-- Se ejecuta UNA sola vez sobre un esquema vacío. No es idempotente:
-- los enums, tablas y triggers se crean una única vez. Si necesitas
-- reintentar, elimina antes los objetos creados por este script.

begin;

-- ===========================================================================
-- 20261111090000_extensions_and_enums.sql
-- ===========================================================================

-- ReCome · Fase 2
-- Extensiones y tipos enumerados del dominio.
--
-- Ejecutar las migraciones en orden. Este archivo se aplica una sola vez.

create extension if not exists unaccent with schema extensions;

create type public.user_role as enum ('CLIENT', 'BUSINESS', 'ADMIN');

create type public.business_type as enum (
  'BAKERY',
  'PASTRY',
  'CAFE',
  'ICE_CREAM',
  'RESTAURANT',
  'OTHER'
);

create type public.approval_status as enum (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SUSPENDED'
);

create type public.offer_status as enum (
  'DRAFT',
  'ACTIVE',
  'SOLD_OUT',
  'EXPIRED',
  'PAUSED'
);

create type public.reservation_status as enum (
  'PENDING_PAYMENT', 'NO_SHOW',
  'PENDING',
  'CONFIRMED',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED'
);

create type public.reservation_event as enum (
  'PAYMENT_SIMULATED', 'NO_SHOW',
  'CREATED',
  'CONFIRMED',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED'
);

create type public.admin_action as enum (
  'COMMISSION_RATE_CHANGED',
  'BUSINESS_APPROVED',
  'BUSINESS_REJECTED',
  'BUSINESS_SUSPENDED',
  'USER_SUSPENDED',
  'USER_REACTIVATED',
  'OFFER_REMOVED'
);

-- ===========================================================================
-- 20261111090100_tables.sql
-- ===========================================================================

-- ReCome · Fase 2
-- Tablas, relaciones y restricciones de integridad.
--
-- Dinero: numeric(10,2). Fechas: timestamptz. Claves primarias: UUID.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null
    check (char_length(btrim(full_name)) between 2 and 120),
  email text not null unique,
  phone text
    check (phone is null or char_length(btrim(phone)) between 6 and 30),
  role public.user_role not null default 'CLIENT',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil público de cada usuario. Se crea con un trigger sobre auth.users.';

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete restrict,
  name text not null
    check (char_length(btrim(name)) between 2 and 120),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  type public.business_type not null,
  address text,
  district text,
  city text not null default 'Cusco',
  phone text
    check (phone is null or char_length(btrim(phone)) between 6 and 30),
  email text,
  latitude numeric(9, 6)
    check (latitude is null or latitude between -90 and 90),
  longitude numeric(9, 6)
    check (longitude is null or longitude between -180 and 180),
  opening_hours jsonb not null default '[]'::jsonb
    check (jsonb_typeof(opening_hours) = 'array'),
  logo_url text,
  approval_status public.approval_status not null default 'PENDING',
  rejection_reason text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Un rechazo siempre explica el motivo.
  constraint businesses_rejection_reason_check check (
    approval_status <> 'REJECTED'
    or nullif(btrim(rejection_reason), '') is not null
  ),
  -- Una aprobación siempre registra la fecha.
  constraint businesses_approved_at_check check (
    approval_status <> 'APPROVED'
    or approved_at is not null
  )
);

comment on table public.businesses is
  'Establecimientos. En el MVP un propietario administra un único comercio.';

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
    check (char_length(btrim(name)) between 2 and 80),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.categories is
  'Categorías que clasifican ofertas. Administrables sin migraciones.';

-- ---------------------------------------------------------------------------
-- offers
-- ---------------------------------------------------------------------------
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  title text not null
    check (char_length(btrim(title)) between 3 and 140),
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  original_price numeric(10, 2) not null
    check (original_price > 0),
  discounted_price numeric(10, 2) not null
    check (discounted_price > 0 and discounted_price < original_price),
  initial_quantity integer not null
    check (initial_quantity > 0),
  available_quantity integer not null
    check (available_quantity >= 0 and available_quantity <= initial_quantity),
  image_url text,
  pickup_start timestamptz not null,
  pickup_end timestamptz not null,
  expiration_at timestamptz,
  ingredients text,
  allergens text,
  storage_instructions text,
  status public.offer_status not null default 'DRAFT',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint offers_pickup_window_check check (pickup_end > pickup_start),
  constraint offers_expiration_check check (
    expiration_at is null or expiration_at >= pickup_end
  ),
  -- Una oferta archivada no puede seguir publicada.
  constraint offers_archived_status_check check (
    archived_at is null
    or status in ('DRAFT', 'PAUSED', 'SOLD_OUT', 'EXPIRED')
  ),
  constraint offers_business_slug_unique unique (business_id, slug)
);

comment on table public.offers is
  'Excedentes publicados por los comercios. El stock solo cambia mediante funciones SQL.';

-- ---------------------------------------------------------------------------
-- reservations
-- ---------------------------------------------------------------------------
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete restrict,
  business_id uuid not null references public.businesses (id) on delete restrict,
  customer_id uuid not null references public.profiles (id) on delete restrict,
  quantity integer not null check (quantity between 1 and 10),
  unit_price numeric(10, 2) not null check (unit_price > 0),
  total_price numeric(10, 2)
    generated always as (quantity * unit_price) stored,
  status public.reservation_status not null default 'PENDING',
  pickup_code char(6) not null unique
    check (pickup_code ~ '^[AC-HJ-NP-Z2-79]{6}$'),
  failed_attempts integer not null default 0
    check (failed_attempts between 0 and 5),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.reservations is
  'Reservas creadas únicamente mediante create_reservation.';

-- ---------------------------------------------------------------------------
-- reservation_events
-- ---------------------------------------------------------------------------
create table public.reservation_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event public.reservation_event not null,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.reservation_events is
  'Historial de estados de cada reserva. actor_id es nulo en eventos del sistema.';

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action public.admin_action not null,
  entity text not null check (entity in ('business', 'profile', 'offer')),
  entity_id uuid not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Acciones administrativas. Solo escribible desde funciones del servidor.';

-- ===========================================================================
-- 20261111090200_indexes.sql
-- ===========================================================================

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

-- ===========================================================================
-- 20261111090300_functions.sql
-- ===========================================================================

-- ReCome · Fase 2
-- Funciones auxiliares, triggers de integridad y funciones transaccionales.
--
-- Todas las funciones privilegiadas son SECURITY DEFINER con search_path fijo
-- y permisos EXECUTE limitados. El navegador nunca envía precios ni stock.

-- ---------------------------------------------------------------------------
-- Auxiliares de autorización
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'ADMIN'
  );
$$;

create or replace function public.owns_business(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.owner_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Timestamps
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Slugs
-- ---------------------------------------------------------------------------
create or replace function public.slugify(p_text text)
returns text
language sql
stable
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      lower(extensions.unaccent(coalesce(p_text, ''))),
      '[^a-z0-9]+',
      '-',
      'g'
    ),
    '-'
  );
$$;

create or replace function public.set_business_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix integer := 0;
begin
  if new.slug is not null and btrim(new.slug) <> '' then
    return new;
  end if;

  v_base := public.slugify(new.name);
  if v_base = '' then
    v_base := 'comercio';
  end if;

  v_candidate := left(v_base, 70);
  while exists (
    select 1
    from public.businesses b
    where b.slug = v_candidate
      and b.id <> new.id
  ) loop
    v_suffix := v_suffix + 1;
    v_candidate := left(v_base, 65) || '-' || v_suffix::text;
  end loop;

  new.slug := v_candidate;
  return new;
end;
$$;

create or replace function public.set_offer_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix integer := 0;
begin
  if new.slug is not null and btrim(new.slug) <> '' then
    return new;
  end if;

  v_base := public.slugify(new.title);
  if v_base = '' then
    v_base := 'oferta';
  end if;

  v_candidate := left(v_base, 70);
  while exists (
    select 1
    from public.offers o
    where o.business_id = new.business_id
      and o.slug = v_candidate
      and o.id <> new.id
  ) loop
    v_suffix := v_suffix + 1;
    v_candidate := left(v_base, 65) || '-' || v_suffix::text;
  end loop;

  new.slug := v_candidate;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Integridad de ofertas
-- ---------------------------------------------------------------------------
create or replace function public.sync_offer_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.available_quantity = 0 and new.status = 'ACTIVE' then
    new.status := 'SOLD_OUT';
  elsif new.available_quantity > 0 and new.status = 'SOLD_OUT' then
    new.status := 'ACTIVE';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_offer_approved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.archived_at is null and new.status in ('ACTIVE', 'SOLD_OUT') then
    if not exists (
      select 1
      from public.businesses b
      where b.id = new.business_id
        and b.approval_status = 'APPROVED'
    ) then
      raise exception 'El comercio debe estar aprobado para publicar ofertas.'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.set_reservation_business()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
begin
  select o.business_id
    into v_business_id
  from public.offers o
  where o.id = new.offer_id;

  if v_business_id is null then
    raise exception 'La oferta indicada no existe.'
      using errcode = 'P0001';
  end if;

  new.business_id := v_business_id;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Alta de perfiles desde auth.users
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_full_name text;
begin
  if new.raw_user_meta_data ->> 'role' = 'BUSINESS' then
    v_role := 'BUSINESS';
  else
    v_role := 'CLIENT';
  end if;

  v_full_name := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');
  if v_full_name is null or char_length(v_full_name) < 2 then
    v_full_name := nullif(btrim(split_part(new.email, '@', 1)), '');
  end if;
  if v_full_name is null or char_length(v_full_name) < 2 then
    v_full_name := 'Usuario ReCome';
  end if;

  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    left(v_full_name, 120),
    lower(new.email),
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reservas
-- ---------------------------------------------------------------------------
create or replace function public.create_reservation(
  p_offer_id uuid,
  p_quantity integer
)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := (select auth.uid());
  v_offer public.offers%rowtype;
  v_reservation public.reservations%rowtype;
  v_active_count integer;
  v_code text;
  v_attempt integer := 0;
  v_index integer;
  v_alphabet constant text := 'ACDEFGHJKLMNPQRSTUVWXYZ2345679';
begin
  if v_customer_id is null then
    raise exception 'Debes iniciar sesión para reservar.'
      using errcode = 'P0001';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 10 then
    raise exception 'La cantidad debe estar entre 1 y 10 unidades.'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_customer_id
      and p.role = 'CLIENT'
  ) then
    raise exception 'Solo las cuentas de cliente pueden reservar.'
      using errcode = 'P0001';
  end if;

  -- Serializa la creación de reservas del mismo cliente.
  perform 1
  from public.profiles p
  where p.id = v_customer_id
  for update;

  select count(*)
    into v_active_count
  from public.reservations r
  where r.customer_id = v_customer_id
    and r.status in ('PENDING', 'CONFIRMED');

  if v_active_count >= 5 then
    raise exception 'Ya tienes 5 reservas activas. Recoge o cancela una antes de reservar otra.'
      using errcode = 'P0001';
  end if;

  select *
    into v_offer
  from public.offers o
  where o.id = p_offer_id
  for update;

  if not found then
    raise exception 'La oferta no existe.'
      using errcode = 'P0001';
  end if;

  if v_offer.archived_at is not null or v_offer.status <> 'ACTIVE' then
    raise exception 'La oferta ya no está disponible.'
      using errcode = 'P0001';
  end if;

  if v_offer.pickup_end <= now() then
    raise exception 'El horario de recojo de esta oferta ya terminó.'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.businesses b
    where b.id = v_offer.business_id
      and b.approval_status = 'APPROVED'
  ) then
    raise exception 'El comercio no está aprobado para recibir reservas.'
      using errcode = 'P0001';
  end if;

  -- Descuento atómico de stock. Nunca se lee y actualiza por separado.
  update public.offers o
     set available_quantity = o.available_quantity - p_quantity,
         updated_at = now()
   where o.id = p_offer_id
     and o.status = 'ACTIVE'
     and o.archived_at is null
     and o.available_quantity >= p_quantity;

  if not found then
    raise exception 'No hay stock suficiente para esa cantidad.'
      using errcode = 'P0001';
  end if;

  -- Código de recojo único, con reintentos ante colisión.
  loop
    v_attempt := v_attempt + 1;
    v_code := '';

    for v_index in 1..6 loop
      v_code := v_code || substr(
        v_alphabet,
        (1 + floor(random() * length(v_alphabet)))::integer,
        1
      );
    end loop;

    begin
      insert into public.reservations (
        offer_id,
        business_id,
        customer_id,
        quantity,
        unit_price,
        pickup_code,
        expires_at,
        status
      )
      values (
        p_offer_id,
        v_offer.business_id,
        v_customer_id,
        p_quantity,
        v_offer.discounted_price,
        v_code,
        v_offer.pickup_end,
        'PENDING'
      )
      returning * into v_reservation;

      exit;
    exception
      when unique_violation then
        if v_attempt >= 5 then
          raise exception 'No se pudo generar un código de recojo único. Inténtalo de nuevo.'
            using errcode = 'P0001';
        end if;
    end;
  end loop;

  insert into public.reservation_events (reservation_id, actor_id, event, description)
  values (
    v_reservation.id,
    v_customer_id,
    'CREATED',
    'Reserva creada por el cliente.'
  );

  return v_reservation;
end;
$$;

create or replace function public.cancel_reservation(p_reservation_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_reservation public.reservations%rowtype;
  v_offer public.offers%rowtype;
  v_is_customer boolean;
  v_is_owner boolean;
  v_is_admin boolean;
begin
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión para cancelar una reserva.'
      using errcode = 'P0001';
  end if;

  select *
    into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
  for update;

  if not found then
    raise exception 'La reserva no existe.'
      using errcode = 'P0001';
  end if;

  if v_reservation.status not in ('PENDING', 'CONFIRMED') then
    raise exception 'Esta reserva ya no se puede cancelar.'
      using errcode = 'P0001';
  end if;

  select *
    into v_offer
  from public.offers o
  where o.id = v_reservation.offer_id;

  v_is_customer := v_reservation.customer_id = v_actor_id;
  v_is_owner := exists (
    select 1
    from public.businesses b
    where b.id = v_reservation.business_id
      and b.owner_id = v_actor_id
  );
  v_is_admin := exists (
    select 1
    from public.profiles p
    where p.id = v_actor_id
      and p.role = 'ADMIN'
  );

  if v_is_customer and not (v_is_owner or v_is_admin) then
    if now() >= v_offer.pickup_start then
      raise exception 'El horario de recojo ya comenzó. Contacta al comercio para cancelar.'
        using errcode = 'P0001';
    end if;
  elsif not (v_is_owner or v_is_admin) then
    raise exception 'No puedes cancelar esta reserva.'
      using errcode = 'P0001';
  end if;

  update public.reservations r
     set status = 'CANCELLED',
         updated_at = now()
   where r.id = p_reservation_id
     and r.status in ('PENDING', 'CONFIRMED')
  returning * into v_reservation;

  if not found then
    select * into v_reservation
    from public.reservations r
    where r.id = p_reservation_id;

    return v_reservation;
  end if;

  update public.offers o
     set available_quantity = o.available_quantity + v_reservation.quantity,
         updated_at = now()
   where o.id = v_reservation.offer_id;

  insert into public.reservation_events (reservation_id, actor_id, event, description)
  values (
    v_reservation.id,
    v_actor_id,
    'CANCELLED',
    'Reserva cancelada. El stock fue devuelto a la oferta.'
  );

  return v_reservation;
end;
$$;

create or replace function public.confirm_reservation(p_reservation_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_reservation public.reservations%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión.'
      using errcode = 'P0001';
  end if;

  select *
    into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
  for update;

  if not found then
    raise exception 'La reserva no existe.'
      using errcode = 'P0001';
  end if;

  if not (
    exists (
      select 1
      from public.businesses b
      where b.id = v_reservation.business_id
        and b.owner_id = v_actor_id
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = v_actor_id
        and p.role = 'ADMIN'
    )
  ) then
    raise exception 'No puedes confirmar esta reserva.'
      using errcode = 'P0001';
  end if;

  if v_reservation.status = 'CONFIRMED' then
    return v_reservation;
  end if;

  if v_reservation.status <> 'PENDING' then
    raise exception 'Esta reserva ya no se puede confirmar.'
      using errcode = 'P0001';
  end if;

  update public.reservations r
     set status = 'CONFIRMED',
         updated_at = now()
   where r.id = p_reservation_id
     and r.status = 'PENDING'
  returning * into v_reservation;

  if not found then
    select * into v_reservation
    from public.reservations r
    where r.id = p_reservation_id;

    return v_reservation;
  end if;

  insert into public.reservation_events (reservation_id, actor_id, event, description)
  values (
    v_reservation.id,
    v_actor_id,
    'CONFIRMED',
    'Reserva confirmada por el establecimiento.'
  );

  return v_reservation;
end;
$$;

create or replace function public.deliver_reservation(
  p_reservation_id uuid,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_reservation public.reservations%rowtype;
  v_is_owner boolean;
  v_is_admin boolean;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  select *
    into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  v_is_owner := exists (
    select 1
    from public.businesses b
    where b.id = v_reservation.business_id
      and b.owner_id = v_actor_id
  );
  v_is_admin := exists (
    select 1
    from public.profiles p
    where p.id = v_actor_id
      and p.role = 'ADMIN'
  );

  if not (v_is_owner or v_is_admin) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_reservation.status = 'DELIVERED' then
    return jsonb_build_object(
      'ok', true,
      'already_delivered', true,
      'reservation', to_jsonb(v_reservation)
    );
  end if;

  if v_reservation.status <> 'CONFIRMED' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invalid_status',
      'status', v_reservation.status,
      'reservation', to_jsonb(v_reservation)
    );
  end if;

  if v_reservation.failed_attempts >= 5 then
    return jsonb_build_object(
      'ok', false,
      'error', 'locked',
      'reservation', to_jsonb(v_reservation)
    );
  end if;

  if upper(btrim(coalesce(p_code, ''))) <> btrim(v_reservation.pickup_code) then
    update public.reservations r
       set failed_attempts = r.failed_attempts + 1,
           updated_at = now()
     where r.id = p_reservation_id
    returning * into v_reservation;

    return jsonb_build_object(
      'ok', false,
      'error', 'invalid_code',
      'failed_attempts', v_reservation.failed_attempts,
      'reservation', to_jsonb(v_reservation)
    );
  end if;

  update public.reservations r
     set status = 'DELIVERED',
         updated_at = now()
   where r.id = p_reservation_id
     and r.status = 'CONFIRMED'
  returning * into v_reservation;

  if not found then
    select * into v_reservation
    from public.reservations r
    where r.id = p_reservation_id;

    return jsonb_build_object(
      'ok', true,
      'already_delivered', true,
      'reservation', to_jsonb(v_reservation)
    );
  end if;

  insert into public.reservation_events (reservation_id, actor_id, event, description)
  values (
    v_reservation.id,
    v_actor_id,
    'DELIVERED',
    'Entrega confirmada en el establecimiento.'
  );

  return jsonb_build_object('ok', true, 'reservation', to_jsonb(v_reservation));
end;
$$;

create or replace function public.expire_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_reservation record;
begin
  for v_reservation in
    select r.id, r.offer_id, r.quantity
    from public.reservations r
    where r.status in ('PENDING', 'CONFIRMED')
      and r.expires_at <= now()
    for update skip locked
  loop
    update public.reservations r
       set status = 'EXPIRED',
           updated_at = now()
     where r.id = v_reservation.id
       and r.status in ('PENDING', 'CONFIRMED');

    if found then
      update public.offers o
         set available_quantity = o.available_quantity + v_reservation.quantity,
             updated_at = now()
       where o.id = v_reservation.offer_id;

      insert into public.reservation_events (reservation_id, actor_id, event, description)
      values (
        v_reservation.id,
        null,
        'EXPIRED',
        'Reserva vencida automáticamente. El stock fue devuelto.'
      );

      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Gestión de stock y estado de ofertas (usada por el panel del comercio)
-- ---------------------------------------------------------------------------
create or replace function public.set_offer_stock(
  p_offer_id uuid,
  p_available_quantity integer
)
returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_offer public.offers%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión.'
      using errcode = 'P0001';
  end if;

  select *
    into v_offer
  from public.offers o
  where o.id = p_offer_id
  for update;

  if not found then
    raise exception 'La oferta no existe.'
      using errcode = 'P0001';
  end if;

  if not (
    public.owns_business(v_offer.business_id)
    or exists (
      select 1
      from public.profiles p
      where p.id = v_actor_id
        and p.role = 'ADMIN'
    )
  ) then
    raise exception 'No puedes modificar esta oferta.'
      using errcode = 'P0001';
  end if;

  if p_available_quantity is null
    or p_available_quantity < 0
    or p_available_quantity > v_offer.initial_quantity then
    raise exception 'La cantidad disponible debe estar entre 0 y la cantidad inicial.'
      using errcode = 'P0001';
  end if;

  update public.offers o
     set available_quantity = p_available_quantity,
         updated_at = now()
   where o.id = p_offer_id
  returning * into v_offer;

  return v_offer;
end;
$$;

create or replace function public.set_offer_status(
  p_offer_id uuid,
  p_status public.offer_status
)
returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_offer public.offers%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión.'
      using errcode = 'P0001';
  end if;

  select *
    into v_offer
  from public.offers o
  where o.id = p_offer_id
  for update;

  if not found then
    raise exception 'La oferta no existe.'
      using errcode = 'P0001';
  end if;

  if not (
    public.owns_business(v_offer.business_id)
    or exists (
      select 1
      from public.profiles p
      where p.id = v_actor_id
        and p.role = 'ADMIN'
    )
  ) then
    raise exception 'No puedes modificar esta oferta.'
      using errcode = 'P0001';
  end if;

  if p_status not in ('DRAFT', 'ACTIVE', 'PAUSED') then
    raise exception 'Estado de oferta no permitido.'
      using errcode = 'P0001';
  end if;

  if p_status = 'ACTIVE' then
    if v_offer.archived_at is not null then
      raise exception 'Una oferta archivada no se puede publicar.'
        using errcode = 'P0001';
    end if;

    if v_offer.pickup_end <= now() then
      raise exception 'No se puede publicar una oferta cuyo horario de recojo ya terminó.'
        using errcode = 'P0001';
    end if;

    if v_offer.available_quantity <= 0 then
      raise exception 'No se puede publicar una oferta sin stock.'
        using errcode = 'P0001';
    end if;

    if not exists (
      select 1
      from public.businesses b
      where b.id = v_offer.business_id
        and b.approval_status = 'APPROVED'
    ) then
      raise exception 'El comercio debe estar aprobado para publicar ofertas.'
        using errcode = 'P0001';
    end if;
  end if;

  update public.offers o
     set status = p_status,
         updated_at = now()
   where o.id = p_offer_id
  returning * into v_offer;

  return v_offer;
end;
$$;

create or replace function public.archive_offer(p_offer_id uuid)
returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_offer public.offers%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión.'
      using errcode = 'P0001';
  end if;

  select *
    into v_offer
  from public.offers o
  where o.id = p_offer_id
  for update;

  if not found then
    raise exception 'La oferta no existe.'
      using errcode = 'P0001';
  end if;

  if not (
    public.owns_business(v_offer.business_id)
    or exists (
      select 1
      from public.profiles p
      where p.id = v_actor_id
        and p.role = 'ADMIN'
    )
  ) then
    raise exception 'No puedes archivar esta oferta.'
      using errcode = 'P0001';
  end if;

  update public.offers o
     set archived_at = coalesce(o.archived_at, now()),
         status = 'PAUSED',
         updated_at = now()
   where o.id = p_offer_id
  returning * into v_offer;

  return v_offer;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------------
revoke all on function public.is_admin() from public;
revoke all on function public.owns_business(uuid) from public;
revoke all on function public.slugify(text) from public;
revoke all on function public.set_updated_at() from public;
revoke all on function public.set_business_slug() from public;
revoke all on function public.set_offer_slug() from public;
revoke all on function public.sync_offer_status() from public;
revoke all on function public.ensure_offer_approved() from public;
revoke all on function public.set_reservation_business() from public;
revoke all on function public.handle_new_user() from public;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.owns_business(uuid) to authenticated;

revoke all on function public.create_reservation(uuid, integer) from public;
revoke all on function public.cancel_reservation(uuid) from public;
revoke all on function public.confirm_reservation(uuid) from public;
revoke all on function public.deliver_reservation(uuid, text) from public;
revoke all on function public.set_offer_stock(uuid, integer) from public;
revoke all on function public.set_offer_status(uuid, public.offer_status) from public;
revoke all on function public.archive_offer(uuid) from public;
revoke all on function public.expire_reservations() from public, anon, authenticated;

grant execute on function public.create_reservation(uuid, integer) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
grant execute on function public.confirm_reservation(uuid) to authenticated;
grant execute on function public.deliver_reservation(uuid, text) to authenticated;
grant execute on function public.set_offer_stock(uuid, integer) to authenticated;
grant execute on function public.set_offer_status(uuid, public.offer_status) to authenticated;
grant execute on function public.archive_offer(uuid) to authenticated;

-- Solo el servidor (service_role) procesa vencimientos.
grant execute on function public.expire_reservations() to service_role;

-- ===========================================================================
-- 20261111090400_triggers.sql
-- ===========================================================================

-- ReCome · Fase 2
-- Triggers de integridad y de mantenimiento.

-- Timestamps de actualización.
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

create trigger offers_set_updated_at
before update on public.offers
for each row execute function public.set_updated_at();

create trigger reservations_set_updated_at
before update on public.reservations
for each row execute function public.set_updated_at();

-- Perfil automático al registrarse en Supabase Auth.
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Slugs generados y normalizados.
create trigger businesses_set_slug
before insert on public.businesses
for each row execute function public.set_business_slug();

create trigger offers_set_slug
before insert on public.offers
for each row execute function public.set_offer_slug();

-- SOLD_OUT se deriva del stock; nunca se escribe manualmente.
create trigger offers_sync_status
before insert or update of available_quantity, status on public.offers
for each row execute function public.sync_offer_status();

-- Una oferta publicada exige un comercio aprobado.
create trigger offers_ensure_approved
before insert or update of status, business_id, available_quantity, archived_at
on public.offers
for each row execute function public.ensure_offer_approved();

-- La reserva hereda el comercio de la oferta.
create trigger reservations_set_business
before insert on public.reservations
for each row execute function public.set_reservation_business();

-- ===========================================================================
-- 20261111090500_rls.sql
-- ===========================================================================

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

-- ===========================================================================
-- 20261111090600_storage.sql
-- ===========================================================================

-- ReCome · Fase 2
-- Buckets de Storage y políticas de acceso.
--
-- Lectura pública; escritura limitada al propietario según el prefijo de ruta.
-- Límite: 5 MB y solo JPEG, PNG o WebP.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatars',
    'avatars',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'business-logos',
    'business-logos',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'offer-images',
    'offer-images',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública de las imágenes.
create policy storage_public_read
on storage.objects for select
to anon, authenticated
using (bucket_id in ('avatars', 'business-logos', 'offer-images'));

-- Avatares: el primer segmento de la ruta es el id del usuario.
create policy storage_avatars_insert_own
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
);

create policy storage_avatars_update_own
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
);

create policy storage_avatars_delete_own
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
);

-- Logos y fotos de ofertas: el primer segmento es el id del comercio.
create policy storage_business_assets_insert_owner
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1
    from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

create policy storage_business_assets_update_owner
on storage.objects for update
to authenticated
using (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1
    from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(storage.objects.name))[1]
  )
)
with check (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1
    from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

create policy storage_business_assets_delete_owner
on storage.objects for delete
to authenticated
using (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1
    from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

-- ===========================================================================
-- 20261111090700_seed_categories.sql
-- ===========================================================================

-- ReCome · Fase 2
-- Datos iniciales: categorías de ofertas.
-- Idempotente: se puede ejecutar varias veces sin duplicar filas.

insert into public.categories (name, slug, description)
values
  ('Panadería', 'panaderia', 'Panes, masas y productos de bollería.'),
  ('Pastelería', 'pasteleria', 'Tortas, postres y bocaditos dulces.'),
  ('Cafetería', 'cafeteria', 'Café, infusiones y acompañamientos.'),
  ('Heladería', 'heladeria', 'Helados, postres fríos y bebidas frías.'),
  ('Comida preparada', 'comida-preparada', 'Platos listos para llevar o consumir.'),
  ('Otros', 'otros', 'Otros excedentes de alimentos no clasificados.')
on conflict (slug) do nothing;

-- ===========================================================================
-- 20261113090000_admin_business_functions.sql
-- ===========================================================================

-- ReCome · Fase 4
-- Aprobación, rechazo y suspensión de establecimientos.
--
-- El estado de aprobación no se puede cambiar con un `update` normal: las
-- columnas `approval_status`, `approved_at` y `rejection_reason` están
-- revocadas para `authenticated` (ver 20261111090500_rls.sql). Por eso el
-- cambio de estado solo ocurre mediante estas funciones SECURITY DEFINER,
-- que validan que quien llama sea ADMIN y dejan rastro en `audit_logs`.

create or replace function public.approve_business(p_business_id uuid)
returns public.businesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_business public.businesses%rowtype;
  v_previous public.approval_status;
begin
  if v_actor_id is null or not public.is_admin() then
    raise exception 'Solo un administrador puede aprobar establecimientos.'
      using errcode = 'P0001';
  end if;

  select *
    into v_business
  from public.businesses b
  where b.id = p_business_id
  for update;

  if not found then
    raise exception 'El establecimiento no existe.'
      using errcode = 'P0001';
  end if;

  v_previous := v_business.approval_status;

  if v_previous = 'APPROVED' then
    return v_business;
  end if;

  update public.businesses b
     set approval_status = 'APPROVED',
         approved_at = now(),
         rejection_reason = null,
         updated_at = now()
   where b.id = p_business_id
  returning * into v_business;

  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values (
    v_actor_id,
    'BUSINESS_APPROVED',
    'business',
    p_business_id,
    jsonb_build_object('previous_status', v_previous, 'name', v_business.name)
  );

  return v_business;
end;
$$;

create or replace function public.reject_business(
  p_business_id uuid,
  p_reason text
)
returns public.businesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_business public.businesses%rowtype;
  v_previous public.approval_status;
  v_reason text := nullif(btrim(p_reason), '');
begin
  if v_actor_id is null or not public.is_admin() then
    raise exception 'Solo un administrador puede rechazar establecimientos.'
      using errcode = 'P0001';
  end if;

  if v_reason is null or char_length(v_reason) < 5 then
    raise exception 'Explica el motivo del rechazo (mínimo 5 caracteres).'
      using errcode = 'P0001';
  end if;

  if char_length(v_reason) > 500 then
    raise exception 'El motivo no puede superar 500 caracteres.'
      using errcode = 'P0001';
  end if;

  select *
    into v_business
  from public.businesses b
  where b.id = p_business_id
  for update;

  if not found then
    raise exception 'El establecimiento no existe.'
      using errcode = 'P0001';
  end if;

  v_previous := v_business.approval_status;

  if v_previous = 'APPROVED' then
    raise exception 'Un establecimiento aprobado se suspende, no se rechaza.'
      using errcode = 'P0001';
  end if;

  update public.businesses b
     set approval_status = 'REJECTED',
         approved_at = null,
         rejection_reason = v_reason,
         updated_at = now()
   where b.id = p_business_id
  returning * into v_business;

  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values (
    v_actor_id,
    'BUSINESS_REJECTED',
    'business',
    p_business_id,
    jsonb_build_object(
      'previous_status', v_previous,
      'reason', v_reason,
      'name', v_business.name
    )
  );

  return v_business;
end;
$$;

create or replace function public.suspend_business(
  p_business_id uuid,
  p_reason text
)
returns public.businesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_business public.businesses%rowtype;
  v_previous public.approval_status;
  v_reason text := nullif(btrim(p_reason), '');
begin
  if v_actor_id is null or not public.is_admin() then
    raise exception 'Solo un administrador puede suspender establecimientos.'
      using errcode = 'P0001';
  end if;

  if v_reason is null or char_length(v_reason) < 5 then
    raise exception 'Explica el motivo de la suspensión (mínimo 5 caracteres).'
      using errcode = 'P0001';
  end if;

  if char_length(v_reason) > 500 then
    raise exception 'El motivo no puede superar 500 caracteres.'
      using errcode = 'P0001';
  end if;

  select *
    into v_business
  from public.businesses b
  where b.id = p_business_id
  for update;

  if not found then
    raise exception 'El establecimiento no existe.'
      using errcode = 'P0001';
  end if;

  v_previous := v_business.approval_status;

  if v_previous <> 'APPROVED' then
    raise exception 'Solo se puede suspender un establecimiento aprobado.'
      using errcode = 'P0001';
  end if;

  update public.businesses b
     set approval_status = 'SUSPENDED',
         rejection_reason = v_reason,
         updated_at = now()
   where b.id = p_business_id
  returning * into v_business;

  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values (
    v_actor_id,
    'BUSINESS_SUSPENDED',
    'business',
    p_business_id,
    jsonb_build_object(
      'previous_status', v_previous,
      'reason', v_reason,
      'name', v_business.name
    )
  );

  return v_business;
end;
$$;

create or replace function public.resubmit_business(p_business_id uuid)
returns public.businesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_business public.businesses%rowtype;
begin
  if v_actor_id is null or not public.owns_business(p_business_id) then
    raise exception 'No puedes reenviar este establecimiento.'
      using errcode = 'P0001';
  end if;

  select *
    into v_business
  from public.businesses b
  where b.id = p_business_id
  for update;

  if not found then
    raise exception 'El establecimiento no existe.'
      using errcode = 'P0001';
  end if;

  if v_business.approval_status <> 'REJECTED' then
    raise exception 'Solo se puede reenviar una solicitud rechazada.'
      using errcode = 'P0001';
  end if;

  update public.businesses b
     set approval_status = 'PENDING',
         approved_at = null,
         rejection_reason = null,
         updated_at = now()
   where b.id = p_business_id
  returning * into v_business;

  return v_business;
end;
$$;

revoke all on function public.approve_business(uuid) from public, anon;
revoke all on function public.reject_business(uuid, text) from public, anon;
revoke all on function public.suspend_business(uuid, text) from public, anon;
revoke all on function public.resubmit_business(uuid) from public, anon;

grant execute on function public.approve_business(uuid) to authenticated;
grant execute on function public.reject_business(uuid, text) to authenticated;
grant execute on function public.suspend_business(uuid, text) to authenticated;
grant execute on function public.resubmit_business(uuid) to authenticated;

-- ===========================================================================
-- 20261113091000_business_insert_policy.sql
-- ===========================================================================

-- La política `businesses_insert_owner` comprobaba el rol con una subconsulta
-- a `public.profiles`. Esa subconsulta activa las políticas de `profiles`, una
-- de las cuales consulta `reservations` y, a través de ellas, `businesses`:
-- Postgres detecta la referencia circular y aborta el INSERT con
-- «infinite recursion detected in policy for relation "businesses"».
--
-- La comprobación se mueve a `public.has_role`, una función SECURITY DEFINER
-- para que la política no vuelva a entrar en las políticas de otras tablas.

create or replace function public.has_role(p_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = p_role
  );
$$;

revoke all on function public.has_role(public.user_role) from public, anon;
grant execute on function public.has_role(public.user_role) to authenticated;

drop policy if exists businesses_insert_owner on public.businesses;

create policy businesses_insert_owner
on public.businesses for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and approval_status = 'PENDING'
  and public.has_role('BUSINESS')
);

-- ===========================================================================
-- 20261114090000_fase6_offer_history.sql
-- ===========================================================================

-- Historial de reservas del cliente. Permite leer la oferta reservada aunque
-- ya no esté activa, sin abrir el catálogo a ofertas ajenas.

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


-- ===========================================================================
-- Primera entrega SRS
-- ===========================================================================

-- Primera entrega SRS: pago simulado, plazos, QR y comisión sin dinero real.
-- Las reservas anteriores mantienen workflow_version=1 y su historial.
alter table public.reservations
  add column workflow_version smallint not null default 1,
  add column paid_at timestamptz,
  add column confirmed_at timestamptz,
  add column delivered_at timestamptz,
  add column pickup_token uuid unique,
  add column pickup_start_snapshot timestamptz,
  add column pickup_end_snapshot timestamptz,
  add column cancellation_reason text,
  add column commission_rate numeric(5,4) not null default 0.10,
  add column commission_amount numeric(10,2) not null default 0,
  add column business_net_amount numeric(10,2) not null default 0;

update public.reservations r set
  pickup_start_snapshot=o.pickup_start, pickup_end_snapshot=o.pickup_end
from public.offers o where o.id=r.offer_id;
alter table public.reservations
  alter column workflow_version set default 2,
  alter column pickup_start_snapshot set not null,
  alter column pickup_end_snapshot set not null,
  alter column pickup_code drop not null,
  add constraint reservations_srs_quantity check (workflow_version=1 or quantity between 1 and 5),
  add constraint reservations_srs_rate check (commission_rate between 0 and 1),
  add constraint reservations_srs_money check (
    workflow_version=1 or
    (status='DELIVERED' and commission_amount=round(total_price*commission_rate,2)
      and business_net_amount=total_price-commission_amount) or
    (status<>'DELIVERED' and commission_amount=0 and business_net_amount=0)
  );

create table public.commission_settings (
  id boolean primary key default true check (id),
  rate numeric(5,4) not null default 0.10 check (rate between 0 and 1),
  updated_at timestamptz not null default now()
);
insert into public.commission_settings(id) values(true);
alter table public.commission_settings enable row level security;
revoke all on public.commission_settings from public, anon, authenticated;
grant select on public.commission_settings to authenticated;
create policy commission_settings_admin on public.commission_settings for select
to authenticated using (public.is_admin());
alter table public.audit_logs drop constraint audit_logs_entity_check;
alter table public.audit_logs add constraint audit_logs_entity_check
  check (entity in ('business','profile','offer','platform'));

create or replace function public.set_commission_rate(p_rate numeric)
returns numeric language plpgsql security definer set search_path='' as $
declare v_previous numeric;
begin
  if not public.is_admin() then raise exception 'Solo un administrador puede cambiar la comisión.' using errcode='P0001'; end if;
  if p_rate is null or p_rate<0 or p_rate>1 or p_rate<>round(p_rate,4) then
    raise exception 'Indica una tasa válida entre 0 y 100 %%.' using errcode='P0001';
  end if;
  select rate into v_previous from public.commission_settings where id for update;
  update public.commission_settings set rate=p_rate, updated_at=clock_timestamp() where id;
  insert into public.audit_logs(actor_id,action,entity,entity_id,metadata)
  values(auth.uid(),'COMMISSION_RATE_CHANGED','platform','00000000-0000-0000-0000-000000000001',
    jsonb_build_object('previous_rate',v_previous,'rate',p_rate));
  return p_rate;
end; $;

-- Rutina interna. Todas las mutaciones bloquean primero la oferta y después
-- las reservas: evita invertir el orden de locks entre cron y acciones.
create or replace function public.expire_offer_reservations(p_offer_id uuid)
returns integer language plpgsql security definer set search_path='' as $
declare r public.reservations%rowtype; v_count integer:=0; v_status public.reservation_status; v_reason text;
begin
  perform 1 from public.offers where id=p_offer_id for update;
  for r in select * from public.reservations
    where offer_id=p_offer_id and status in ('PENDING_PAYMENT','PENDING','CONFIRMED')
      and expires_at<=clock_timestamp() order by id for update
  loop
    if r.workflow_version=1 then v_status:='EXPIRED'; v_reason:='LEGACY_EXPIRED';
    elsif r.status='CONFIRMED' then v_status:='NO_SHOW'; v_reason:='NOT_COLLECTED';
    else v_status:='CANCELLED'; v_reason:=case when r.status='PENDING_PAYMENT' then 'PAYMENT_TIMEOUT' else 'CONFIRMATION_TIMEOUT' end;
    end if;
    update public.reservations set status=v_status,cancellation_reason=v_reason where id=r.id;
    update public.offers o set available_quantity=o.available_quantity+r.quantity,
      status=case when exists(select 1 from public.businesses b where b.id=o.business_id and b.approval_status='APPROVED') then o.status else 'PAUSED'::public.offer_status end
      where o.id=p_offer_id;
    insert into public.reservation_events(reservation_id,actor_id,event,description)
    values(r.id,null,
      case v_status when 'NO_SHOW' then 'NO_SHOW'::public.reservation_event when 'EXPIRED' then 'EXPIRED'::public.reservation_event else 'CANCELLED'::public.reservation_event end,
      case v_reason when 'PAYMENT_TIMEOUT' then 'Cancelada: terminó el plazo de pago simulado.'
        when 'CONFIRMATION_TIMEOUT' then 'Cancelada: el comercio no confirmó dentro de 15 minutos.'
        when 'NOT_COLLECTED' then 'No recogida: terminó el horario de recojo. Sin comisión.'
        else 'Reserva anterior vencida.' end);
    v_count:=v_count+1;
  end loop;
  return v_count;
end; $;

create or replace function public.expire_reservations()
returns integer language plpgsql security definer set search_path='' as $
declare o record; v_count integer:=0;
begin
  for o in select id from public.offers where id in (
    select offer_id from public.reservations where status in ('PENDING_PAYMENT','PENDING','CONFIRMED') and expires_at<=clock_timestamp()
  ) order by id for update skip locked
  loop v_count:=v_count+public.expire_offer_reservations(o.id); end loop;
  return v_count;
end; $;

create or replace function public.create_reservation(p_offer_id uuid,p_quantity integer)
returns public.reservations language plpgsql security definer set search_path='' as $
declare v_uid uuid:=auth.uid(); o public.offers%rowtype; r public.reservations%rowtype;
begin
  if v_uid is null or not exists(select 1 from public.profiles where id=v_uid and role='CLIENT') then
    raise exception 'Debes ingresar con una cuenta de cliente.' using errcode='P0001'; end if;
  if p_quantity is null or p_quantity<1 or p_quantity>5 then
    raise exception 'Puedes reservar entre 1 y 5 unidades.' using errcode='P0001'; end if;
  perform 1 from public.profiles where id=v_uid for update;
  select * into o from public.offers where id=p_offer_id for update;
  if not found then raise exception 'La oferta no existe.' using errcode='P0001'; end if;
  perform public.expire_offer_reservations(o.id);
  select * into o from public.offers where id=p_offer_id;
  if (select count(*) from public.reservations where customer_id=v_uid and status in ('PENDING_PAYMENT','PENDING','CONFIRMED') and expires_at>clock_timestamp())>=5 then
    raise exception 'Ya tienes 5 reservas activas.' using errcode='P0001'; end if;
  if o.status<>'ACTIVE' or o.archived_at is not null or o.pickup_end<=clock_timestamp() or
    not exists(select 1 from public.businesses where id=o.business_id and approval_status='APPROVED') then
    raise exception 'La oferta ya no está disponible.' using errcode='P0001'; end if;
  update public.offers set available_quantity=available_quantity-p_quantity
    where id=o.id and available_quantity>=p_quantity;
  if not found then raise exception 'No hay stock suficiente.' using errcode='P0001'; end if;
  insert into public.reservations(offer_id,business_id,customer_id,quantity,unit_price,status,expires_at,
    pickup_start_snapshot,pickup_end_snapshot,commission_rate,workflow_version)
  values(o.id,o.business_id,v_uid,p_quantity,o.discounted_price,'PENDING_PAYMENT',
    least(clock_timestamp()+interval '10 minutes',o.pickup_end),o.pickup_start,o.pickup_end,
    (select rate from public.commission_settings where id),2) returning * into r;
  insert into public.reservation_events(reservation_id,actor_id,event,description)
    values(r.id,v_uid,'CREATED','Stock retenido por 10 minutos para completar el pago simulado.');
  return r;
end; $;

create or replace function public.simulate_reservation_payment(p_reservation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $
declare r public.reservations%rowtype; v_offer uuid;
begin
  select offer_id into v_offer from public.reservations where id=p_reservation_id and customer_id=auth.uid();
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  perform 1 from public.offers where id=v_offer for update;
  perform public.expire_offer_reservations(v_offer);
  select * into r from public.reservations where id=p_reservation_id for update;
  if r.paid_at is not null and r.status in ('PENDING','CONFIRMED','DELIVERED') then
    return jsonb_build_object('ok',true,'reservation',to_jsonb(r)); end if;
  if r.status<>'PENDING_PAYMENT' or r.workflow_version<>2 then
    return jsonb_build_object('ok',false,'error','invalid_status'); end if;
  update public.reservations set paid_at=clock_timestamp(),status='PENDING',
    expires_at=least(clock_timestamp()+interval '15 minutes',pickup_end_snapshot)
    where id=r.id returning * into r;
  insert into public.reservation_events(reservation_id,actor_id,event,description)
    values(r.id,auth.uid(),'PAYMENT_SIMULATED','Pago simulado completado. No se ha cobrado dinero ni se han solicitado datos bancarios.');
  return jsonb_build_object('ok',true,'reservation',to_jsonb(r));
end; $;

create or replace function public.confirm_reservation(p_reservation_id uuid)
returns public.reservations language plpgsql security definer set search_path='' as $
declare r public.reservations%rowtype; v_offer uuid; v_attempt integer:=0;
  v_alphabet constant text:='ACDEFGHJKLMNPQRSTUVWXYZ2345679';
begin
  select offer_id into v_offer from public.reservations where id=p_reservation_id;
  if not found then raise exception 'La reserva no existe.' using errcode='P0001'; end if;
  if auth.uid() is null or not (public.owns_business((select business_id from public.reservations where id=p_reservation_id)) or public.is_admin()) then
    raise exception 'No puedes confirmar esta reserva.' using errcode='P0001'; end if;
  perform 1 from public.offers where id=v_offer for update;
  perform public.expire_offer_reservations(v_offer);
  select * into r from public.reservations where id=p_reservation_id for update;
  if r.status in ('CANCELLED','EXPIRED','NO_SHOW','CONFIRMED') then return r; end if;
  if r.status<>'PENDING' or (r.workflow_version=2 and r.paid_at is null) then
    raise exception 'Primero debe completarse el pago simulado.' using errcode='P0001'; end if;
  loop
    begin
      update public.reservations set status='CONFIRMED',confirmed_at=clock_timestamp(),
        expires_at=pickup_end_snapshot,pickup_token=gen_random_uuid(),
        pickup_code=coalesce(pickup_code,(select string_agg(substr(v_alphabet,1+floor(random()*length(v_alphabet))::integer,1),'') from generate_series(1,6)))
        where id=r.id returning * into r;
      exit;
    exception when unique_violation or check_violation then
      v_attempt:=v_attempt+1;
      if v_attempt>=50 then raise exception 'No pudimos generar el identificador de recojo.' using errcode='P0001'; end if;
    end;
  end loop;
  insert into public.reservation_events(reservation_id,actor_id,event,description)
    values(r.id,auth.uid(),'CONFIRMED','Reserva confirmada. QR de un solo uso habilitado para el horario de recojo.');
  return r;
end; $;

create or replace function public.cancel_reservation(p_reservation_id uuid)
returns public.reservations language plpgsql security definer set search_path='' as $
declare r public.reservations%rowtype; v_offer uuid; v_owner boolean; v_reason text;
begin
  select offer_id into v_offer from public.reservations where id=p_reservation_id;
  if not found then raise exception 'La reserva no existe.' using errcode='P0001'; end if;
  perform 1 from public.offers where id=v_offer for update;
  select * into r from public.reservations where id=p_reservation_id for update;
  v_owner:=public.owns_business(r.business_id) or public.is_admin();
  if auth.uid() is null or not(v_owner or r.customer_id=auth.uid()) then
    raise exception 'No puedes cancelar esta reserva.' using errcode='P0001'; end if;
  perform public.expire_offer_reservations(v_offer);
  select * into r from public.reservations where id=p_reservation_id;
  if r.status not in ('PENDING_PAYMENT','PENDING','CONFIRMED') then return r; end if;
  if not v_owner and r.status='CONFIRMED' and clock_timestamp()>r.pickup_start_snapshot-interval '60 minutes' then
    raise exception 'Solo puedes cancelar hasta 60 minutos antes del recojo.' using errcode='P0001'; end if;
  v_reason:=case when v_owner then 'BUSINESS_REJECTED' else 'CUSTOMER_CANCELLED' end;
  update public.reservations set status='CANCELLED',cancellation_reason=v_reason where id=r.id returning * into r;
  update public.offers o set available_quantity=o.available_quantity+r.quantity,
    status=case when exists(select 1 from public.businesses b where b.id=o.business_id and b.approval_status='APPROVED') then o.status else 'PAUSED'::public.offer_status end
    where o.id=v_offer;
  insert into public.reservation_events(reservation_id,actor_id,event,description)
    values(r.id,auth.uid(),'CANCELLED',case when v_owner then 'Reserva rechazada o cancelada por el comercio. Stock liberado, sin cobro real.' else 'Reserva cancelada por el cliente. Stock liberado, sin cobro real.' end);
  return r;
end; $;

create or replace function public.deliver_reservation(p_reservation_id uuid,p_code text)
returns jsonb language plpgsql security definer set search_path='' as $
declare r public.reservations%rowtype; v_offer uuid; v_valid boolean;
begin
  select offer_id into v_offer from public.reservations where id=p_reservation_id;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if auth.uid() is null then return jsonb_build_object('ok',false,'error','unauthenticated'); end if;
  if not(public.owns_business((select business_id from public.reservations where id=p_reservation_id)) or public.is_admin()) then
    return jsonb_build_object('ok',false,'error','forbidden'); end if;
  perform 1 from public.offers where id=v_offer for update;
  perform public.expire_offer_reservations(v_offer);
  select * into r from public.reservations where id=p_reservation_id for update;
  if r.status='DELIVERED' then return jsonb_build_object('ok',false,'error','already_delivered'); end if;
  if r.status<>'CONFIRMED' then return jsonb_build_object('ok',false,'error','invalid_status','status',r.status); end if;
  if clock_timestamp()<r.pickup_start_snapshot or clock_timestamp()>=r.pickup_end_snapshot then
    return jsonb_build_object('ok',false,'error','outside_pickup_window'); end if;
  if r.failed_attempts>=5 then return jsonb_build_object('ok',false,'error','locked'); end if;
  v_valid:=case when r.workflow_version=1 then upper(btrim(coalesce(p_code,'')))=r.pickup_code
    else btrim(coalesce(p_code,''))=r.pickup_token::text end;
  if not coalesce(v_valid,false) then
    update public.reservations set failed_attempts=failed_attempts+1 where id=r.id returning * into r;
    return jsonb_build_object('ok',false,'error','invalid_code','failed_attempts',r.failed_attempts);
  end if;
  update public.reservations set status='DELIVERED',delivered_at=clock_timestamp(),
    commission_amount=case when workflow_version=2 then round(total_price*commission_rate,2) else 0 end,
    business_net_amount=case when workflow_version=2 then total_price-round(total_price*commission_rate,2) else 0 end
    where id=r.id returning * into r;
  insert into public.reservation_events(reservation_id,actor_id,event,description)
    values(r.id,auth.uid(),'DELIVERED','QR validado. Entrega registrada y comisión simulada calculada; no se mueve dinero real.');
  return jsonb_build_object('ok',true,'reservation',to_jsonb(r));
end; $;

-- Acelera la liberación, pero las RPC también comprueban el plazo exacto.
create index reservations_pending_expiration_idx on public.reservations(expires_at,offer_id)
  where status in ('PENDING_PAYMENT','PENDING','CONFIRMED');
revoke all on function public.expire_offer_reservations(uuid) from public,anon,authenticated,service_role;
revoke all on function public.expire_reservations() from public,anon,authenticated;
grant execute on function public.expire_reservations() to service_role;
revoke all on function public.simulate_reservation_payment(uuid) from public,anon;
grant execute on function public.simulate_reservation_payment(uuid) to authenticated;
revoke all on function public.set_commission_rate(numeric) from public,anon;
grant execute on function public.set_commission_rate(numeric) to authenticated;

-- No amplía los permisos directos de escritura de reservas a usuarios.
revoke insert,update,delete on public.reservations from anon,authenticated;

-- Una corrección de stock no puede reutilizar unidades ya retenidas: de lo
-- contrario un vencimiento posterior excedería la cantidad inicial.
create or replace function public.ensure_offer_reserved_stock()
returns trigger language plpgsql security definer set search_path='' as $
declare v_held integer;
begin
  select coalesce(sum(quantity),0)::integer into v_held from public.reservations
    where offer_id=new.id and status in ('PENDING_PAYMENT','PENDING','CONFIRMED');
  if new.available_quantity+v_held>new.initial_quantity then
    raise exception 'El stock disponible más las unidades reservadas no puede superar la cantidad inicial.' using errcode='P0001';
  end if;
  return new;
end; $;
create trigger offers_ensure_reserved_stock before update of initial_quantity,available_quantity
on public.offers for each row execute function public.ensure_offer_reserved_stock();
revoke all on function public.ensure_offer_reserved_stock() from public,anon,authenticated,service_role;

select cron.schedule('recome-expire-reservations','* * * * *','select public.expire_reservations();');

-- RF-004: descuento máximo 50 %. No reescribe precios ni reservas anteriores.
create or replace function public.ensure_offer_discount_limit()
returns trigger language plpgsql security definer set search_path='' as $
begin
  if tg_op='INSERT' then
    if new.discounted_price*2 < new.original_price then
      raise exception 'El descuento máximo permitido es del 50 %%.' using errcode='P0001';
    end if;
  elsif new.original_price is distinct from old.original_price
     or new.discounted_price is distinct from old.discounted_price
     or (new.status='ACTIVE' and old.status<>'ACTIVE') then
    if new.discounted_price*2 < new.original_price then
      raise exception 'El descuento máximo permitido es del 50 %%. Actualiza los precios antes de publicar.' using errcode='P0001';
    end if;
  end if;
  return new;
end; $;
create trigger offers_discount_limit before insert or update of original_price,discounted_price,status
on public.offers for each row execute function public.ensure_offer_discount_limit();
revoke all on function public.ensure_offer_discount_limit() from public,anon,authenticated,service_role;

-- Verificación final
-- ===========================================================================

select
  (
    select count(*)
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'profiles', 'businesses', 'categories', 'offers',
        'reservations', 'reservation_events', 'audit_logs', 'commission_settings'
      )
  ) as tablas,
  (select count(*) from public.categories) as categorias,
  (
    select count(*)
    from storage.buckets
    where id in ('avatars', 'business-logos', 'offer-images')
  ) as buckets;

commit;
