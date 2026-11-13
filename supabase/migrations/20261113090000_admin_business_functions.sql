-- ReCome · Fase 4
-- Aprobación, rechazo y suspensión de establecimientos.
--
-- El estado de aprobación no se puede cambiar con un `update` normal: las
-- columnas `approval_status`, `approved_at` y `rejection_reason` están
-- revocadas para `authenticated` (ver 20261111090500_rls.sql). Por eso el
-- cambio de estado solo ocurre mediante estas funciones SECURITY DEFINER,
-- que validan que quien llama sea ADMIN y dejan rastro en `audit_logs`.

-- ---------------------------------------------------------------------------
-- Aprobar
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Rechazar (solo solicitudes pendientes o ya rechazadas)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Suspender (solo comercios aprobados)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Reenviar a revisión (solo el dueño, solo si fue rechazado)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------------
revoke all on function public.approve_business(uuid) from public, anon;
revoke all on function public.reject_business(uuid, text) from public, anon;
revoke all on function public.suspend_business(uuid, text) from public, anon;
revoke all on function public.resubmit_business(uuid) from public, anon;

grant execute on function public.approve_business(uuid) to authenticated;
grant execute on function public.reject_business(uuid, text) to authenticated;
grant execute on function public.suspend_business(uuid, text) to authenticated;
grant execute on function public.resubmit_business(uuid) to authenticated;
