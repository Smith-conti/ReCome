# Mapa de rutas

La lista de la sección 4 de `base-recome.md` es la fuente única de verdad.
Los índices de cada área redirigen a su dashboard.

## Público

| Ruta | Estado | Archivo |
|---|---|---|
| `/` | Implementado | `src/app/(public)/page.tsx` |
| `/ofertas` | Implementado (Fase 5) | `src/app/(public)/ofertas/page.tsx` |
| `/ofertas/[id]` | Implementado (Fase 5) | `src/app/(public)/ofertas/[id]/page.tsx` |
| `/establecimientos` | Implementado (Fase 5) | `src/app/(public)/establecimientos/page.tsx` |
| `/establecimientos/[slug]` | Implementado (Fase 5) | `src/app/(public)/establecimientos/[slug]/page.tsx` |

## Autenticación

| Ruta | Estado | Archivo |
|---|---|---|
| `/login` | Implementado (Fase 3) | `src/app/(auth)/login/page.tsx` |
| `/registro` | Implementado (Fase 3) | `src/app/(auth)/registro/page.tsx` |
| `/recuperar` | Implementado (Fase 3) | `src/app/(auth)/recuperar/page.tsx` |
| `/restablecer` | Implementado (Fase 3) | `src/app/(auth)/restablecer/page.tsx` |
| `/auth/callback` | Implementado (Fase 3) | `src/app/auth/callback/route.ts` |

## Cliente

| Ruta | Estado | Archivo |
|---|---|---|
| `/cliente` | Implementado (redirige a `/cliente/dashboard`) | `src/app/cliente/page.tsx` |
| `/cliente/dashboard` | Implementado (Fase 3) | `src/app/cliente/dashboard/page.tsx` |
| `/cliente/reservas` | Implementado (Fase 6) | `src/app/cliente/reservas/page.tsx` |
| `/cliente/reservas/[id]` | Implementado (Fase 6) | `src/app/cliente/reservas/[id]/page.tsx` |
| `/cliente/perfil` | Implementado (Fase 3) | `src/app/cliente/perfil/page.tsx` |

## Negocio

| Ruta | Estado | Archivo |
|---|---|---|
| `/negocio` | Implementado (redirige a `/negocio/dashboard`) | `src/app/negocio/page.tsx` |
| `/negocio/dashboard` | Implementado (Fase 3; estado del establecimiento en Fase 4) | `src/app/negocio/dashboard/page.tsx` |
| `/negocio/perfil` | Implementado (Fase 4) | `src/app/negocio/perfil/page.tsx` |
| `/negocio/ofertas` | Implementado (Fase 5) | `src/app/negocio/ofertas/page.tsx` |
| `/negocio/ofertas/nueva` | Implementado (Fase 5) | `src/app/negocio/ofertas/nueva/page.tsx` |
| `/negocio/ofertas/[id]/editar` | Implementado (Fase 5) | `src/app/negocio/ofertas/[id]/editar/page.tsx` |
| `/negocio/reservas` | Implementado (Fase 6) | `src/app/negocio/reservas/page.tsx` |
| `/negocio/entregas` | Implementado (Fase 6) | `src/app/negocio/entregas/page.tsx` |

## Administración

| Ruta | Estado | Archivo |
|---|---|---|
| `/admin` | Implementado (redirige a `/admin/dashboard`) | `src/app/admin/page.tsx` |
| `/admin/dashboard` | Implementado (Fase 3; contadores y pendientes en Fase 4) | `src/app/admin/dashboard/page.tsx` |
| `/admin/negocios` | Implementado (Fase 4) | `src/app/admin/negocios/page.tsx` |
| `/admin/negocios/[id]` | Implementado (Fase 4) | `src/app/admin/negocios/[id]/page.tsx` |
| `/admin/usuarios` | No implementado (el esquema no tiene estado de usuario) | — |
| `/admin/ofertas` | Implementado (Fase 5, solo lectura) | `src/app/admin/ofertas/page.tsx` |
| `/admin/reservas` | Implementado (Fase 6, solo lectura) | `src/app/admin/reservas/page.tsx` |
| `/admin/reportes` | Pendiente (Fase 7) | — |

## Reglas de acceso

- `/cliente/**` exige sesión con rol `CLIENT`.
- `/negocio/**` exige sesión con rol `BUSINESS`.
- `/admin/**` exige sesión con rol `ADMIN`.
- Un rol distinto es redirigido a su propio dashboard (no ve un error).
- Sin sesión, el proxy redirige a `/login?next=<ruta>` y el login devuelve a
  esa ruta si es interna y segura.
- Con sesión, `/login`, `/registro`, `/recuperar` y `/restablecer` no se
  muestran: el proxy redirige al dashboard del rol.

## Reglas de la Fase 4

- Un comercio tiene como máximo un establecimiento (`businesses.owner_id` es
  único). `/negocio/perfil` muestra el alta si no existe y la edición si ya
  existe, con los horarios de la semana.
- El estado de aprobación no se envía desde el formulario: el alta entra como
  `PENDING` y la edición nunca cambia el estado.
- Guardar un establecimiento `REJECTED` lo reenvía a revisión con la RPC
  `resubmit_business`; el resto de ediciones conserva el estado.
- `/admin/negocios/[id]` no filtra por estado: un administrador puede abrir
  cualquier establecimiento, incluidos `REJECTED` y `SUSPENDED`.
- Aprobar, rechazar y suspender exigen rol `ADMIN` en el servidor y en la RPC.
  Un acceso cruzado entre roles se resuelve con el guard del layout (redirige
  al dashboard propio), igual que en la Fase 3.

## Reglas de la Fase 5

- El comercio administra sus ofertas en `/negocio/ofertas`. Puede crear
  borradores aunque su establecimiento siga en revisión, pero publicar exige
  `APPROVED` (lo comprueban la RPC y el trigger de la base).
- El formulario nunca envía `status`, `available_quantity`, `archived_at` ni
  `business_id`: la propiedad sale de la sesión y esos campos solo cambian con
  `set_offer_status`, `set_offer_stock` y `archive_offer`.
- La imagen se sube desde el navegador a `offer-images/{business_id}/{uuid}` y
  se guarda su URL pública. Límite: 5 MB, JPG/PNG/WebP.
- El catálogo público solo muestra ofertas `ACTIVE`, sin archivar, con
  `pickup_end` futuro y de comercios `APPROVED`; la RLS aplica la misma regla.
- `/ofertas` busca por título y filtra por categoría con parámetros GET.
  `/establecimientos` busca por nombre y filtra por tipo de comercio.
- `/admin/ofertas` es de solo lectura: no inventa auditoría ni acciones
  administrativas que el esquema no registra.
- Las fechas de los formularios se interpretan en hora de Perú (UTC-5) y se
  envían como ISO con desplazamiento `-05:00`.

## Reglas de la Fase 6

- Solo una cuenta `CLIENT` puede reservar. El formulario aparece en
  `/ofertas/[id]`; sin sesión muestra los CTA de acceso y con otro rol explica
  que la reserva es para clientes.
- La reserva se crea con `create_reservation`, que valida stock, oferta activa,
  horario de recojo, límite de 5 reservas activas y genera un código único de
  6 caracteres (sin `O`, `I`, `0` ni `1`).
- El código de recojo se muestra al cliente en `/cliente/reservas` y en el
  detalle. **No** se muestra en `/negocio/reservas` ni en `/admin/reservas`.
- El comercio confirma con `confirm_reservation` y registra la entrega en
  `/negocio/entregas` escribiendo el código; la acción busca la reserva por
  `pickup_code` bajo RLS y llama a `deliver_reservation`.
- Una entrega exige estado `CONFIRMED`. Cinco códigos incorrectos bloquean la
  reserva y solo un administrador puede revisarla.
- El cliente puede cancelar mientras el horario de recojo no haya empezado; la
  cancelación devuelve el stock y redirige con un aviso visible.
- `expire_reservations` corre desde `/api/cron/expire-reservations` cada 15
  minutos (`vercel.json`), protegido con `CRON_SECRET` y la clave secreta de
  Supabase. Marca `EXPIRED` y devuelve el stock.
- `/admin/reservas` es de solo lectura y no expone códigos de recojo.
- Para leer los datos de una oferta ya inactiva desde el historial del cliente,
  `supabase/fase6.sql` añade la política `offers_select_customer_reservations`.
