-- ReCome · Fase 2: esquema completo de la base de datos.
--
-- Archivo consolidado para pegar en el SQL Editor de Supabase.
-- Contiene, en orden, las 8 migraciones de supabase/migrations/.
--
-- Cómo usarlo:
--   1. Abre el proyecto en https://supabase.com/dashboard
--   2. Entra en SQL Editor > New query
--   3. Pega TODO este archivo y pulsa Run (Ctrl+Enter)
--   4. Al final debe devolver: tablas = 7, categorias = 6, buckets = 3
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
  'PENDING',
  'CONFIRMED',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED'
);

create type public.reservation_event as enum (
  'CREATED',
  'CONFIRMED',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED'
);

create type public.admin_action as enum (
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
revoke all on function public.expire_reservations() from public;

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
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy storage_avatars_update_own
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy storage_avatars_delete_own
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
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
      and b.id::text = (storage.foldername(name))[1]
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
      and b.id::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1
    from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(name))[1]
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
      and b.id::text = (storage.foldername(name))[1]
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
-- Verificación final
-- ===========================================================================

select
  (
    select count(*)
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'profiles', 'businesses', 'categories', 'offers',
        'reservations', 'reservation_events', 'audit_logs'
      )
  ) as tablas,
  (select count(*) from public.categories) as categorias,
  (
    select count(*)
    from storage.buckets
    where id in ('avatars', 'business-logos', 'offer-images')
  ) as buckets;

commit;
