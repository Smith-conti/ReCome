# Cierre funcional de las fases 1–6

Fecha: 14 de noviembre de 2026. La Fase 7 queda pendiente por decisión del
usuario. Este cierre corresponde al funcionamiento local y al backend real de
Supabase; no certifica un despliegue de producción.

## Configuración comprobada en Supabase

- Las 7 tablas de dominio tienen RLS habilitado.
- Existen las cuatro RPC de aprobación, rechazo, suspensión y reenvío de comercios.
- La política `offers_select_customer_reservations` y el índice
  `reservations_offer_id_idx` ya estaban aplicados. El pendiente documental era antiguo.
- Se revocó EXECUTE sobre `expire_reservations()` a PUBLIC, `anon` y
  `authenticated`; `service_role` conserva el permiso. Se comprobó el resultado
  efectivo `false / false / true` para cliente, visitante y servidor.
- Se habilitó `pg_cron` y el job `recome-expire-reservations`, activo con
  `*/15 * * * *` y comando `select public.expire_reservations();`.
  Se observó una ejecución `succeeded` en `cron.job_run_details` el
  14/11/2026 a las 16:00 de Lima (21:00 UTC).
- Se corrigieron INSERT, UPDATE y DELETE de imágenes de comercios para usar
  `storage.foldername(storage.objects.name)`. La referencia anterior a `name`
  dentro del EXISTS se resolvía como `businesses.name` y rechazaba al dueño.
- Site URL: `http://localhost:3000`. Redirect URL guardada y confirmada:
  `http://localhost:3000/**`.

## Cambios versionados

Las migraciones `20261114100000_fase6_expiration_cron.sql` y
`20261114110000_fase6_storage_owner_paths.sql` reproducen las correcciones.
`fase6.sql` las incluye para actualizar instalaciones existentes y
`consolidado.sql` incluye las 13 migraciones para una instalación nueva.
No se borraron ni recrearon tablas del proyecto existente.

Se quitó la programación duplicada de `vercel.json`. El vencimiento funciona
directamente en Supabase y no depende del navegador ni del despliegue web.
El endpoint `/api/cron/expire-reservations` sigue disponible como alternativa
manual con `Authorization: Bearer <CRON_SECRET>`. Si se cambia de scheduler en
el futuro, se debe desactivar el anterior.

## Verificación funcional reproducible

```bash
npm run lint
node node_modules/typescript/bin/tsc --noEmit
node scripts/verify-phase6.mjs --run-remote
```

ESLint y TypeScript pasaron. La prueba de integración completó **33
comprobaciones** contra Supabase real:

- creación de cuentas temporales, sesión y perfiles CLIENT/BUSINESS;
- rechazo del cambio de rol a ADMIN por un cliente;
- alta del comercio con PENDING y aprobación administrativa;
- publicación, visibilidad pública, pausa y archivado de ofertas;
- precio calculado en servidor, código válido y descuento de stock;
- rechazo por stock insuficiente y acceso a reservas de otro cliente;
- confirmación, código incorrecto, entrega válida e idempotencia;
- historial con eventos únicos y lectura de ofertas inactivas reservadas;
- cancelación y vencimiento con devolución de stock una sola vez;
- rechazo de vencimientos llamados por cliente o visitante;
- subida de imagen del dueño y rechazo de otro usuario;
- suspensión/reactivación del comercio y cierre de sesión.

El script requiere `.env.local` y la cuenta de demostración
`admin@recome.test`, creada por el seed, con `RECOME_SEED_PASSWORD` si se cambió
la contraseña por defecto. Crea datos temporales únicos y los elimina por sus
identificadores en `finally`, incluso si una comprobación falla. La limpieza
terminó correctamente en todas las ejecuciones de esta revisión.

El servidor `npm run dev -- --port 3000` arrancó y se comprobaron 23 rutas HTTP
mediante `http://127.0.0.1:3000`:

- 7 páginas públicas/de autenticación respondieron HTTP 200: inicio, ofertas,
  establecimientos, login, registro, recuperación y restablecimiento.
- Los 3 dashboards sin sesión redirigieron al login con HTTP 307.
- 13 páginas privadas respondieron HTTP 200 con las sesiones reales de las
  cuentas demo: dashboard/reservas/perfil del cliente;
  dashboard/perfil/ofertas/nueva oferta/reservas/entregas del comercio;
  dashboard/comercios/ofertas/reservas del administrador.

Estas consultas comprueban la respuesta del servidor con cookies SSR; no
sustituyen una revisión visual completa ni las pruebas responsive de Fase 7.

## Fase 7 pendiente

- Estadísticas e indicadores por comercio y globales, y `/admin/reportes`.
- `/admin/usuarios` y suspensión/reactivación de usuarios, pendientes del
  alcance general; no confundirlos con la suspensión de comercios ya operativa.
- Pruebas de reservas concurrentes, revisión ampliada de roles/RLS y responsive.
- Resolver el fallo actual de `npm run build`: Next 16.4.6 / Turbopack en
  Windows con Node 24.20.0 informa `node process exited before we could connect
  to it with exit code: 0` al transformar `globals.css.css`. Se reprodujo fuera
  del aislamiento; la causa raíz no quedó determinada. No se ocultan errores
  de compilación ni se da el build por aprobado.
- Despliegue en Vercel, variables del dominio real, URLs de producción y SMTP.
  No se envió correo a un buzón real: las cuentas de prueba usan `.test`.

No hay un despliegue de producción verificado.
