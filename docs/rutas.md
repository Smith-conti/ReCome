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
| `/login` | Estado vacío (Fase 3) | `src/app/(auth)/login/page.tsx` |
| `/registro` | Estado vacío (Fase 3) | `src/app/(auth)/registro/page.tsx` |

## Cliente

| Ruta | Estado |
|---|---|
| `/cliente` | Pendiente (Fase 3, redirige a `/cliente/dashboard`) |
| `/cliente/dashboard` | Pendiente (Fase 3) |
| `/cliente/reservas` | Pendiente (Fase 6) |
| `/cliente/perfil` | Pendiente (Fase 3) |

## Negocio

| Ruta | Estado |
|---|---|
| `/negocio` | Pendiente (Fase 4, redirige a `/negocio/dashboard`) |
| `/negocio/dashboard` | Pendiente (Fase 4) |
| `/negocio/perfil` | Pendiente (Fase 4) |
| `/negocio/ofertas` | Pendiente (Fase 5) |
| `/negocio/ofertas/nueva` | Pendiente (Fase 5) |
| `/negocio/ofertas/[id]/editar` | Pendiente (Fase 5) |
| `/negocio/reservas` | Pendiente (Fase 6) |
| `/negocio/entregas` | Pendiente (Fase 6) |

## Administración

| Ruta | Estado |
|---|---|
| `/admin` | Pendiente (Fase 4, redirige a `/admin/dashboard`) |
| `/admin/dashboard` | Pendiente (Fase 4) |
| `/admin/negocios` | Pendiente (Fase 4) |
| `/admin/negocios/[id]` | Pendiente (Fase 4) |
| `/admin/usuarios` | Pendiente (Fase 4) |
| `/admin/ofertas` | Pendiente (Fase 5) |
| `/admin/reservas` | Pendiente (Fase 6) |
| `/admin/reportes` | Pendiente (Fase 7) |
