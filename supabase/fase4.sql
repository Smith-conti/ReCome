-- ReCome · Fase 4: migración incremental.
--
-- Para proyectos que YA tienen aplicado el esquema de la Fase 2. Pega todo
-- este archivo en Supabase → SQL Editor → New query y pulsa Run.
--
-- Contiene las dos migraciones nuevas:
--   1. 20261113090000_admin_business_functions.sql
--   2. 20261113091000_business_insert_policy.sql
--
-- Para una instalación desde cero usa `consolidado.sql` (ya incluye ambas).

-- ===========================================================================
-- 20261113090000_admin_business_functions.sql
-- ===========================================================================

-- Aprobación, rechazo y suspensión de establecimientos.
--
-- El estado de aprobación no se puede cambiar con un `update` normal: las
-- columnas `approval_status`, `approved_at` y `rejection_reason` están
-- revocadas para `authenticated`. Por eso el cambio de estado solo ocurre
-- mediante estas funciones SECURITY DEFINER, que validan que quien llama sea
-- ADMIN (o el dueño, al reenviar) y dejan rastro en `audit_logs`.

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

  -- Aprobar dos veces no duplica la auditoría.
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
    jsonb_build_object(
      'previous_status', v_previous,
      'name', v_business.name
    )
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

-- Verificación rápida: debe devolver 23 funciones públicas y 21 políticas.
select
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public') as funciones,
  (select count(*)::int from pg_policies where schemaname = 'public') as politicas;
