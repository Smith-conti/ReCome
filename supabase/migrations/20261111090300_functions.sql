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
