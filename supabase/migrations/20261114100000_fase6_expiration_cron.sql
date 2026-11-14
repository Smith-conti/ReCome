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
