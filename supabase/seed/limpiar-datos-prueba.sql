-- ReCome · Limpieza de los datos de prueba
--
-- Borra los 7 comercios creados por supabase/seed/datos-prueba.mjs, sus
-- ofertas, sus reservas y las cuentas de Auth asociadas (@recome.test).
--
-- Ejecutar en el SQL Editor de Supabase. Todo va en una transacción: si algo
-- falla, no se borra nada.

begin;

create temp table seed_businesses on commit drop as
select b.id
from public.businesses b
join public.profiles p on p.id = b.owner_id
where p.email like '%@recome.test';

create temp table seed_profiles on commit drop as
select p.id
from public.profiles p
where p.email like '%@recome.test';

-- Reservas y su historial (los FK son ON DELETE RESTRICT).
delete from public.reservation_events
where reservation_id in (
  select r.id
  from public.reservations r
  where r.business_id in (select id from seed_businesses)
     or r.customer_id in (select id from seed_profiles)
);

delete from public.reservations
where business_id in (select id from seed_businesses)
   or customer_id in (select id from seed_profiles);

-- Ofertas del comercio.
delete from public.offers
where business_id in (select id from seed_businesses);

-- Auditoría de esas cuentas o entidades.
delete from public.audit_logs
where actor_id in (select id from seed_profiles)
   or entity_id in (select id from seed_businesses);

-- Comercios.
delete from public.businesses
where id in (select id from seed_businesses);

-- Cuentas de Auth. El perfil se elimina en cascada.
delete from auth.users
where email like '%@recome.test';

-- Comprobación: todo debe quedar en 0.
select
  (select count(*) from public.businesses) as comercios,
  (select count(*) from public.offers) as ofertas,
  (select count(*) from public.profiles) as perfiles;

commit;
