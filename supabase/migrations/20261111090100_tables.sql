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
