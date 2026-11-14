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
returns numeric language plpgsql security definer set search_path='' as $$
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
end; $$;

-- Rutina interna. Todas las mutaciones bloquean primero la oferta y después
-- las reservas: evita invertir el orden de locks entre cron y acciones.
create or replace function public.expire_offer_reservations(p_offer_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
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
end; $$;

create or replace function public.expire_reservations()
returns integer language plpgsql security definer set search_path='' as $$
declare o record; v_count integer:=0;
begin
  for o in select id from public.offers where id in (
    select offer_id from public.reservations where status in ('PENDING_PAYMENT','PENDING','CONFIRMED') and expires_at<=clock_timestamp()
  ) order by id for update skip locked
  loop v_count:=v_count+public.expire_offer_reservations(o.id); end loop;
  return v_count;
end; $$;

create or replace function public.create_reservation(p_offer_id uuid,p_quantity integer)
returns public.reservations language plpgsql security definer set search_path='' as $$
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
end; $$;

create or replace function public.simulate_reservation_payment(p_reservation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
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
end; $$;

create or replace function public.confirm_reservation(p_reservation_id uuid)
returns public.reservations language plpgsql security definer set search_path='' as $$
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
end; $$;

create or replace function public.cancel_reservation(p_reservation_id uuid)
returns public.reservations language plpgsql security definer set search_path='' as $$
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
end; $$;

create or replace function public.deliver_reservation(p_reservation_id uuid,p_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
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
end; $$;

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
returns trigger language plpgsql security definer set search_path='' as $$
declare v_held integer;
begin
  select coalesce(sum(quantity),0)::integer into v_held from public.reservations
    where offer_id=new.id and status in ('PENDING_PAYMENT','PENDING','CONFIRMED');
  if new.available_quantity+v_held>new.initial_quantity then
    raise exception 'El stock disponible más las unidades reservadas no puede superar la cantidad inicial.' using errcode='P0001';
  end if;
  return new;
end; $$;
create trigger offers_ensure_reserved_stock before update of initial_quantity,available_quantity
on public.offers for each row execute function public.ensure_offer_reserved_stock();
revoke all on function public.ensure_offer_reserved_stock() from public,anon,authenticated,service_role;
