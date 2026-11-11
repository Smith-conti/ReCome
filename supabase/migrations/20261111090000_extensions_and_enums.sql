-- ReCome · Fase 2
-- Extensiones y tipos enumerados del dominio.
--
-- Ejecutar las migraciones en orden. Este archivo se aplica una sola vez.

create extension if not exists unaccent with schema extensions;

create type public.user_role as enum ('CLIENT', 'BUSINESS', 'ADMIN');

create type public.business_type as enum (
  'BAKERY',
  'PASTRY',
  'CAFE',
  'ICE_CREAM',
  'RESTAURANT',
  'OTHER'
);

create type public.approval_status as enum (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SUSPENDED'
);

create type public.offer_status as enum (
  'DRAFT',
  'ACTIVE',
  'SOLD_OUT',
  'EXPIRED',
  'PAUSED'
);

create type public.reservation_status as enum (
  'PENDING',
  'CONFIRMED',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED'
);

create type public.reservation_event as enum (
  'CREATED',
  'CONFIRMED',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED'
);

create type public.admin_action as enum (
  'BUSINESS_APPROVED',
  'BUSINESS_REJECTED',
  'BUSINESS_SUSPENDED',
  'USER_SUSPENDED',
  'USER_REACTIVATED',
  'OFFER_REMOVED'
);
