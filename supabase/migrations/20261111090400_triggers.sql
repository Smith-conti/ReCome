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
