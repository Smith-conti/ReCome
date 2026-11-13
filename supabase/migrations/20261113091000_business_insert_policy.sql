-- ReCome · Fase 4
-- Corrección de la política de alta de comercios.
--
-- La política `businesses_insert_owner` comprobaba el rol con una subconsulta
-- a `public.profiles`. Esa subconsulta activa las políticas de `profiles`, una
-- de las cuales consulta `reservations` y, a través de ellas, `businesses`:
-- Postgres detecta la referencia circular y aborta el INSERT con
-- «infinite recursion detected in policy for relation "businesses"».
--
-- La comprobación se mueve a `public.has_role`, una función SECURITY DEFINER
-- (las tablas pertenecen a `postgres`, que no está sujeto a RLS) para que la
-- política no vuelva a entrar en las políticas de otras tablas.

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
