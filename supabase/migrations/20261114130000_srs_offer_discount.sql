-- RF-004: descuento máximo 50 %. No reescribe precios ni reservas anteriores.
create or replace function public.ensure_offer_discount_limit()
returns trigger language plpgsql security definer set search_path='' as $$
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
end; $$;
create trigger offers_discount_limit before insert or update of original_price,discounted_price,status
on public.offers for each row execute function public.ensure_offer_discount_limit();
revoke all on function public.ensure_offer_discount_limit() from public,anon,authenticated,service_role;
