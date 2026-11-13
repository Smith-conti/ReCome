# Mapa de rutas

La lista de la sección 4 de `base-recome.md` es la fuente única de verdad.
Los índices de cada área redirigen a su dashboard.

## Público

| Ruta | Estado | Archivo |
|---|---|---|
| `/` | Implementado | `src/app/(public)/page.tsx` |
| `/ofertas` | Estado vacío (Fase 5) | `src/app/(public)/ofertas/page.tsx` |
| `/ofertas/[id]` | Pendiente (Fase 5) | — |
| `/establecimientos` | Estado vacío (Fase 5) | `src/app/(public)/establecimientos/page.tsx` |
| `/establecimientos/[slug]` | Pendiente (Fase 5) | — |

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
| `/cliente/reservas` | Pendiente (Fase 6) | — |
| `/cliente/perfil` | Implementado (Fase 3) | `src/app/cliente/perfil/page.tsx` |

## Negocio

| Ruta | Estado | Archivo |
|---|---|---|
| `/negocio` | Implementado (redirige a `/negocio/dashboard`) | `src/app/negocio/page.tsx` |
| `/negocio/dashboard` | Implementado (Fase 3; registro de establecimiento en Fase 4) | `src/app/negocio/dashboard/page.tsx` |
| `/negocio/perfil` | Pendiente (Fase 4) | — |
| `/negocio/ofertas` | Pendiente (Fase 5) | — |
| `/negocio/ofertas/nueva` | Pendiente (Fase 5) | — |
| `/negocio/ofertas/[id]/editar` | Pendiente (Fase 5) | — |
| `/negocio/reservas` | Pendiente (Fase 6) | — |
| `/negocio/entregas` | Pendiente (Fase 6) | — |

## Administración

| Ruta | Estado | Archivo |
|---|---|---|
| `/admin` | Implementado (redirige a `/admin/dashboard`) | `src/app/admin/page.tsx` |
| `/admin/dashboard` | Implementado (Fase 3; gestión en Fase 4) | `src/app/admin/dashboard/page.tsx` |
| `/admin/negocios` | Pendiente (Fase 4) | — |
| `/admin/negocios/[id]` | Pendiente (Fase 4) | — |
| `/admin/usuarios` | Pendiente (Fase 4) | — |
| `/admin/ofertas` | Pendiente (Fase 5) | — |
| `/admin/reservas` | Pendiente (Fase 6) | — |
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
