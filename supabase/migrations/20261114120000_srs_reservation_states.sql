-- Ejecutar y confirmar esta migración antes de usar los nuevos valores enum.
alter type public.reservation_status add value if not exists 'PENDING_PAYMENT';
alter type public.reservation_status add value if not exists 'NO_SHOW';
alter type public.reservation_event add value if not exists 'PAYMENT_SIMULATED';
alter type public.reservation_event add value if not exists 'NO_SHOW';
alter type public.admin_action add value if not exists 'COMMISSION_RATE_CHANGED';
