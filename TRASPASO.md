# Traspaso del proyecto ReCome

> Documento de continuidad. Está pensado para que otra persona (o un agente) pueda
> retomar el trabajo en una máquina distinta **sin contexto previo**: qué es el
> proyecto, cómo se levanta, qué está hecho, qué falta, qué reglas no se pueden
> romper y qué trampas ya se resolvieron.
>
> Última actualización: **14 de noviembre de 2026** · Rama de trabajo: `master`
> (Fases 1–6 commiteadas; ver estado de Git en la sección 15).

---

## 1. Qué es ReCome

Plataforma web para Cusco que conecta consumidores con panaderías, pastelerías,
cafeterías, heladerías y restaurantes que tienen **excedentes de alimentos**. El
cliente reserva a precio reducido y recoge en el local con un código de 6
caracteres. **No hay pagos en línea**: el pago se hace en el establecimiento.

Alineado al ODS 12.3 (reducir el desperdicio de alimentos).

La especificación completa, con las 7 fases y las decisiones cerradas, está en
[`base-recome.md`](./base-recome.md). **Es la fuente de verdad del alcance.**

---

## 2. Estado en una línea

| Fase | Alcance | Estado |
|---|---|---|
| 1 | Preparación del proyecto (Next.js, Tailwind, shadcn, Supabase SSR, landing) | ✅ Completada y verificada |
| 2 | Base de datos, RLS y funciones transaccionales | ✅ Completada y **aplicada al proyecto real** |
| 3 | Autenticación, sesiones, roles y protección de rutas | ✅ Completada y verificada en navegador |
| 4 | Comercios y administración (registro, perfil, aprobación/suspensión) | ✅ Completada y validada por el usuario |
| 5 | Ofertas (CRUD, imágenes, stock, catálogo, filtros) | ✅ Completada y verificada en navegador |
| 6 | Reservas y recojos (crear, cancelar, vencer, entregar, historial) | ✅ Código completo y verificado · ⏳ falta aplicar `fase6.sql` |
| 7 | Estadísticas, pruebas y despliegue | ⏳ Pendiente |

Hay 7 tablas, 6 categorías y 3 buckets creados en el proyecto real de Supabase,
con 7 comercios y 19 ofertas de prueba. Las migraciones de las Fases 2, 4 y 6
están aplicadas o listas para aplicar. La Fase 5 no requirió cambios de esquema:
reutiliza las RPC y las políticas existentes.

**Nada está desplegado.** No afirmar lo contrario.

---

## 3. Puesta en marcha en una máquina nueva

Requisitos: **Node.js 20+** (probado con 24) y npm 11. En Windows funciona con
PowerShell o CMD.

```bash
git clone <repo> recome
cd recome
npm install
copy .env.example .env.local     # Linux/macOS: cp .env.example .env.local
# editar .env.local con las credenciales reales (sección 4)
npm run dev
```

La app queda en <http://localhost:3000>.

Sin credenciales el sitio público funciona (landing y estados vacíos), pero
login, paneles y datos quedan inactivos.

### Variables de entorno (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SECRET_KEY=sb_secret_...
CRON_SECRET=<32 bytes aleatorios en hex>
```

| Variable | Dónde se obtiene | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Cliente y servidor |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys | Puede llegar al navegador |
| `NEXT_PUBLIC_SITE_URL` | Se define a mano | Enlaces absolutos de confirmación/recuperación |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys → Secret keys | **Solo servidor**. Salta RLS: es una contraseña |
| `CRON_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | Protege el cron de vencimientos (Fase 6) |

`.env.local` está en `.gitignore`. **Si se cambia de máquina hay que volver a
crear el archivo**: no viaja con el repositorio.

Proyecto de Supabase ya provisionado: `qhjtagnlwefzmklgtfvp.supabase.co`
(Auth con proveedor email, `mailer_autoconfirm = false`, `disable_signup = false`).

### Datos de prueba

`supabase/seed/datos-prueba.mjs` crea 7 comercios de Cusco con su cuenta
`BUSINESS` y 19 ofertas activas. Es idempotente.

```bash
node supabase/seed/datos-prueba.mjs
```

Las ofertas del seed vencen al terminar el día de recojo. Para volver a
generar ofertas activas sin recrear cuentas ni comercios:

```bash
node supabase/seed/ofertas-vigentes.mjs                      # próximos 3 días
node supabase/seed/ofertas-vigentes.mjs 2026-11-15 2026-11-16 2026-11-17
```

El catálogo de comercios y ofertas vive en `supabase/seed/comercios.mjs`, y la
lectura de credenciales y el cliente REST en `supabase/seed/cliente.mjs`.

Para borrar todo lo anterior:

```sql
-- ejecutar en el SQL Editor de Supabase
-- ver supabase/seed/limpiar-datos-prueba.sql
```

---

## 4. Configuración externa pendiente (bloquea flujos de correo)

En Supabase → **Authentication → URL Configuration → Redirect URLs**, añadir:

- `http://localhost:3000/**` (desarrollo)
- `https://<dominio-real>/**` (cuando exista el despliegue)

Sin esto, los enlaces de **confirmación de cuenta** y de **recuperación de
contraseña** no vuelven a la aplicación. El registro funciona, pero el correo
llega con un enlace que Supabase rechaza.

`mailer_autoconfirm = false` significa que **cada cuenta nueva debe confirmar el
correo antes de entrar**. Para probar sin correo, crear la cuenta con
`email_confirm: true` mediante la API de administración (así lo hace el seed).

La entrega usa el SMTP de Supabase (con límites de frecuencia). En producción
conviene configurar un SMTP propio.

---

## 5. Stack y convenciones que no se pueden ignorar

Versiones instaladas (ver `docs/stack.md`):

| Paquete | Versión |
|---|---|
| next | 16.4.6 (App Router, Turbopack) |
| react / react-dom | 19.3.0 |
| typescript | 5.x |
| tailwindcss | 4.3.3 (CSS-first) |
| shadcn (CLI) | 4.23.0 |
| @base-ui/react | 1.9.x |
| lucide-react | 1.72.x |
| @supabase/supabase-js | 2.119.x |
| @supabase/ssr | 0.12.x |
| zod | 4.6.x |

### 5.1 Next.js 16: diferencias que ya causaron errores

Estas reglas no son opcionales; están resueltas en el código y **hay que
mantenerlas**:

1. **`src/proxy.ts` reemplaza a `middleware.ts`.** Exporta `proxy` y
   `config.matcher`. El refresco de sesión y las redirecciones viven en
   `src/lib/supabase/proxy.ts`.
2. **Cache Components está activado** (`next.config.ts`). Toda lectura dinámica
   (cookies, sesión, base de datos) debe estar dentro de un `<Suspense>`.
3. **Patrón de sesión obligatorio** (`src/lib/auth/session.ts`):
   - `getSessionProfile()` lleva `"use cache: private"`. Es el patrón documentado
     por Next 16 para leer sesión: el resultado queda en el navegador, nunca en
     el servidor, y permite `cookies()` y `Date.now()` (que Supabase usa al
     validar el token).
   - `getRequestProfile()` y `requireSessionProfile()` llaman a
     `await connection()` **antes** de leer la sesión. Sin eso, Next falla con
     *«encountered the unstable value `Date.now()` while prerendering»*.
   - **No usar `cache()` de React** para memorizar la sesión: en Next 16 puede
     reutilizar un almacén de cookies de otro contexto de render y lanza
     `InvariantError: Received an underlying cookies object that does not match
     either cookies or mutableCookies`. Ya se probó y se descartó.
   - Cada página/layout que llama a un guard se envuelve en `<Suspense>` con su
     propio esqueleto (`DashboardBodySkeleton`, `DashboardSkeleton`).
4. **`export const instant = false`** en `src/app/cliente/layout.tsx`,
   `negocio/layout.tsx` y `admin/layout.tsx`. Evita el aviso del validador
   cuando el guard redirige a otro panel. Los paneles privados priorizan la
   comprobación de rol sobre la navegación instantánea.
5. **`/login`, `/registro` y `/recuperar` no leen la sesión.** El proxy saca de
   esas rutas a quien ya inició sesión. No volver a añadir lecturas de sesión
   ahí: fue justamente lo que provocaba el `InvariantError`.
6. **`npm run dev` y `npm run build` comparten `.next`.** No ejecutarlos a la
   vez: el servidor de desarrollo queda con chunks rotos y muestra
   «This page couldn't load». Si pasa, detener el dev, borrar `.next` y
   reiniciar.

### 5.2 Tailwind 4 y shadcn 4

- Sin `tailwind.config.js`: los tokens están en `src/app/globals.css`
  (`@import`, `@theme inline`).
- Los componentes shadcn 4 usan **Base UI**, no Radix. Para un enlace con
  apariencia de botón: `buttonVariants()` + `next/link`. Para superponer:
  la prop `render`.
- Identidad visual: verde, crema y naranja; tipografía y radios ya definidos en
  los tokens. Mobile-first.

### 5.3 Reglas de producto

- **Todo el texto visible en español.**
- **Sin pagos en línea.**
- **Sin datos ficticios presentados como reales.** Los estados vacíos deben ser
  explícitos («Aún no hay ofertas publicadas»), nunca datos inventados.
- **Sin botones sin función.** Si una acción no está implementada, no se muestra
  el botón o se muestra deshabilitado con una explicación.
- Estados de carga y estados vacíos obligatorios en cada listado.

---

## 6. Mapa del código

```text
src/
├── app/
│   ├── (public)/              landing, /ofertas, /establecimientos
│   ├── (auth)/                login, registro, recuperar, restablecer
│   ├── auth/callback/         canje del código de Supabase
│   ├── cliente/               layout con guard + dashboard + reservas + perfil
│   ├── negocio/               layout con guard + dashboard, ofertas, reservas y entregas
│   ├── admin/                 layout con guard + dashboard, negocios, ofertas y reservas
│   └── api/cron/              vencimiento automático de reservas
├── components/
│   ├── ui/                    shadcn (Base UI)
│   ├── layout/                cabecera con menú de cuenta, pie, logo
│   ├── auth/                  formularios y campos reutilizables
│   ├── business/              formulario de establecimiento con horarios
│   ├── offers/                formulario, imagen, tarjeta y acciones de oferta
│   ├── reservations/          formulario, acciones y validación de códigos
│   ├── admin/                 panel de revisión (aprobar/rechazar/suspender)
│   ├── dashboard/             shell, navegación lateral y esqueletos
│   └── public/                bloques de la landing y estados vacíos
├── lib/
│   ├── auth/
│   │   ├── session.ts         getSessionProfile / guards (ver 5.1)
│   │   ├── roles.ts           UserRole, ROLE_LABEL, dashboardForRole
│   │   ├── routes.ts          PROTECTED_PREFIXES, safeInternalPath
│   │   ├── actions.ts         Server Actions de auth y perfil
│   │   └── action-state.ts    tipo de estado para useActionState
│   ├── business/
│   │   ├── types.ts           tipos de comercio y horarios
│   │   ├── queries.ts         lecturas del panel admin y del propio comercio
│   │   ├── actions.ts         Server Actions de alta, edición y revisión
│   │   └── action-state.ts    estado de los formularios
│   ├── offers/
│   │   ├── types.ts           estados, etiquetas y categorías
│   │   ├── queries.ts         catálogo, directorio, panel y admin
│   │   ├── actions.ts         crear/editar, estado, stock y archivar
│   │   └── action-state.ts    estado de los formularios
│   ├── reservations/
│   │   ├── types.ts           estados, etiquetas y modelos de reserva
│   │   ├── queries.ts         reservas por rol, cola de entregas e historial
│   │   ├── actions.ts         crear, cancelar, confirmar y entregar
│   │   └── action-state.ts    estado de los formularios
│   ├── supabase/
│   │   ├── client.ts          cliente de navegador
│   │   ├── server.ts          cliente de servidor con cookies
│   │   ├── proxy.ts           refresco de sesión y redirecciones
│   │   └── env.ts             requireSupabaseEnv()
│   ├── validations/
│   │   ├── auth.ts            esquemas Zod de acceso y perfil
│   │   ├── business.ts        esquema Zod del establecimiento
│   │   ├── offer.ts           esquema Zod de la oferta y sus fechas
│   │   ├── reservation.ts     esquemas Zod de reserva y código de recojo
│   │   └── errors.ts          fieldErrors / readForm compartidos
│   ├── format.ts              fecha, hora y moneda en America/Lima
│   └── utils.ts               cn()
└── proxy.ts                   entrada del proxy (convención Next 16)

supabase/
├── config.toml
├── migrations/                11 migraciones en orden
├── consolidado.sql            las 11 en un solo script transaccional
├── fase4.sql                  las 2 de la Fase 4, para el proyecto ya existente
├── fase6.sql                  la de la Fase 6, para el proyecto ya existente
└── seed/                      datos de prueba y limpieza

docs/
├── stack.md                   versiones y convenciones
├── base-de-datos.md           modelo, RLS, RPC, storage, seed
├── autenticacion.md           flujos, roles, protección, cuentas
└── rutas.md                   estado real de cada ruta
```

No existen todavía `src/services/`, `src/hooks/` ni `src/types/` con contenido.
Cuando una fase los necesite, se crean siguiendo la estructura del README.

---

## 7. Base de datos

### 7.1 Tablas y enums

Enums: `user_role`, `business_type`, `approval_status`, `offer_status`,
`reservation_status`, `reservation_event`, `admin_action`.

| Tabla | Rol |
|---|---|
| `profiles` | Perfil 1:1 con `auth.users`; el rol vive aquí |
| `businesses` | Establecimientos; `owner_id` es **UNIQUE** (un comercio por dueño) |
| `categories` | Clasifican ofertas (6 sembradas) |
| `offers` | Excedentes publicados |
| `reservations` | Reservas; `total_price` generado, `pickup_code char(6)` único |
| `reservation_events` | Historial de estados de cada reserva |
| `audit_logs` | Acciones administrativas; **solo escribible desde funciones** |

Reglas garantizadas en la base:

- Dinero en `numeric(10,2)`, fechas en `timestamptz` (presentación
  `America/Lima`, UTC-5). Slugs generados por trigger con `unaccent`+`slugify`.
- `SOLD_OUT` se deriva de `available_quantity = 0`; no se escribe a mano.
- Una oferta `ACTIVE` exige comercio `APPROVED` y `pickup_end` futuro.
- El stock solo cambia por `create_reservation`, `cancel_reservation`,
  `expire_reservations` o `set_offer_stock`.
- Máximo 10 unidades por reserva y 5 reservas activas por cliente.
- `pickup_code`: 6 caracteres de `^[AC-HJ-NP-Z2-79]{6}$` (sin `0/O`, `1/I`,
  `8/B`), único, con bloqueo tras 5 intentos fallidos.

### 7.2 RLS y privilegios por columna

| Tabla | `anon` | `CLIENT` | `BUSINESS` | `ADMIN` |
|---|---|---|---|---|
| `profiles` | — | Lee/edita el propio | Lee clientes que le reservaron | Todo |
| `businesses` | Solo `APPROVED` | Solo `APPROVED` | Lee/edita el propio | Todo |
| `categories` | Solo activas | Solo activas | Solo activas | Todo |
| `offers` | Catálogo público | Catálogo público | Lee todo lo propio | Todo |
| `reservations` | — | Solo las propias | Solo las de su comercio | Todo |
| `reservation_events` | — | Las de sus reservas | Las de su comercio | Todo |
| `audit_logs` | — | — | — | Solo lectura |

**Importante:** aunque RLS permite al admin actualizar `businesses`, los
privilegios de columna **revocan** `approval_status`, `approved_at`,
`rejection_reason` y `owner_id` para `authenticated`
(`20261111090500_rls.sql`). Es decir: **ni el dueño ni un admin pueden cambiar el
estado de aprobación con un `update` normal desde el cliente**. Por eso la Fase 4
lo hace con funciones `security definer` que además dejan rastro en
`audit_logs` (sección 7.3).

Columnas editables por el dueño del comercio: `name, slug, description, type,
address, district, city, phone, email, latitude, longitude, opening_hours,
logo_url, updated_at`.

### 7.3 Funciones RPC ya implementadas

| Función | Quién |
|---|---|
| `create_reservation(offer_id, quantity)` | Cliente autenticado |
| `cancel_reservation(reservation_id)` | Cliente dueño antes de `pickup_start`; comercio/admin después |
| `confirm_reservation(reservation_id)` | Comercio dueño o admin |
| `deliver_reservation(reservation_id, code)` | Comercio dueño o admin |
| `set_offer_stock(offer_id, quantity)` | Comercio dueño o admin |
| `set_offer_status(offer_id, status)` | Comercio dueño o admin |
| `archive_offer(offer_id)` | Comercio dueño o admin |
| `approve_business(business_id)` | Solo `ADMIN` |
| `reject_business(business_id, reason)` | Solo `ADMIN`; exige motivo de 5–500 caracteres |
| `suspend_business(business_id, reason)` | Solo `ADMIN`; solo sobre `APPROVED` |
| `resubmit_business(business_id)` | Dueño; solo si está `REJECTED` |
| `expire_reservations()` | Solo `service_role` (cron) |

Auxiliares: `is_admin()`, `owns_business(uuid)`, `has_role(user_role)`,
`slugify(text)`, `set_updated_at()`, `set_business_slug()`, `set_offer_slug()`,
`sync_offer_status()`, `ensure_offer_approved()`, `set_reservation_business()`,
`handle_new_user()`.

`has_role` nació de un bug real: la política `businesses_insert_owner`
comprobaba el rol con una subconsulta a `profiles`, cuyas políticas volvían a
`businesses` vía `reservations`; Postgres abortaba el `INSERT` con
`infinite recursion detected in policy for relation "businesses"`. Ahora la
comprobación vive en una función `security definer` y el alta funciona.

### 7.4 Storage

| Bucket | Ruta | Escritura |
|---|---|---|
| `avatars` | `{user_id}/archivo` | El propio usuario |
| `business-logos` | `{business_id}/archivo` | Dueño del comercio |
| `offer-images` | `{business_id}/...` | Dueño del comercio |

Lectura pública; 5 MB por archivo; solo `image/jpeg`, `image/png` o `image/webp`.

### 7.5 Cómo aplicar cambios de esquema

- Proyecto real: **SQL Editor** de Supabase con `supabase/fase4.sql` para las
  migraciones nuevas (proyecto ya existente) o `supabase/consolidado.sql` para
  recrear todo desde cero en una transacción.
- Si se añade una migración, **actualizar también `consolidado.sql`** para que no
  diverjan, y las tablas de `docs/base-de-datos.md`.
- Verificación esperada del consolidado: `tablas = 7`, `categorias = 6`,
  `buckets = 3`; y en ambos scripts `funciones = 23`, `politicas = 21`.
- Los cambios de esquema no son idempotentes (enums y tablas se crean una vez);
  `fase4.sql` sí puede reejecutarse.
- Ya aplicado al proyecto real: 7 tablas, 6 categorías, 3 buckets, 18 funciones
  y 21 políticas RLS en `public` (Fase 2). Con `fase4.sql` quedan 23 funciones.

---

## 8. Rutas

### Implementadas

| Ruta | Notas |
|---|---|
| `/` | Landing completa con ofertas destacadas reales dentro de un `Suspense` |
| `/ofertas` | Catálogo público con búsqueda por título y filtro por categoría |
| `/ofertas/[id]` | Ficha con precios, stock, horario, punto de recojo y datos del comercio |
| `/establecimientos` | Directorio con búsqueda y filtro por tipo de comercio |
| `/establecimientos/[slug]` | Ficha del comercio con sus ofertas activas |
| `/login`, `/registro`, `/recuperar`, `/restablecer` | Fase 3 |
| `/auth/callback` | Canjea el código de Supabase y redirige por rol |
| `/cliente` | Redirige a `/cliente/dashboard` |
| `/cliente/dashboard` | Panel con datos reales del perfil, contadores y próximas reservas |
| `/cliente/reservas` | Historial con filtros por estado, contadores y códigos de recojo activos |
| `/cliente/reservas/[id]` | Detalle, código, historial de eventos y cancelación con aviso visible |
| `/cliente/perfil` | Editar nombre y teléfono (correo y rol no editables) |
| `/negocio` | Redirige a `/negocio/dashboard` |
| `/negocio/dashboard` | Panel con el estado real del establecimiento y acceso a la edición |
| `/negocio/perfil` | Alta (si no existe) y edición del establecimiento, con horarios semanales |
| `/negocio/ofertas` | Listado por estado con búsqueda, contadores y acciones rápidas |
| `/negocio/ofertas/nueva` | Formulario de creación; guarda como borrador |
| `/negocio/ofertas/[id]/editar` | Edición, stock, publicación/pausa y archivado |
| `/negocio/reservas` | Reservas recibidas: confirmar, cancelar y datos de contacto |
| `/negocio/entregas` | Validación del código de recojo y cola de recojos pendientes |
| `/admin` | Redirige a `/admin/dashboard` |
| `/admin/dashboard` | Contadores reales: pendientes, aprobados, clientes, ofertas activas |
| `/admin/negocios` | Listado con filtro por estado, contadores y enlaces al detalle |
| `/admin/negocios/[id]` | Datos del dueño, ubicación, horarios, ofertas y acciones de revisión |
| `/admin/ofertas` | Listado de solo lectura con filtros por estado y título |
| `/admin/reservas` | Supervisión de solo lectura de todas las reservas, sin códigos |
| `/api/cron/expire-reservations` | Cron protegido con `CRON_SECRET` que ejecuta `expire_reservations` |

### Pendientes (fuente: sección 4 de `base-recome.md`)

| Fase | Rutas |
|---|---|
| 4 | `/admin/usuarios` (diferida: el esquema no tiene estado de usuario) |
| 7 | `/admin/reportes` |

### Reglas de acceso

- `/cliente/**` exige `CLIENT`; `/negocio/**` exige `BUSINESS`;
  `/admin/**` exige `ADMIN`.
- Rol incorrecto → redirección a su propio dashboard (nunca un error).
- Sin sesión → `/login?next=<ruta>`; el login vuelve al destino solo si es
  interno y seguro (`safeInternalPath`).
- Con sesión → `/login`, `/registro`, `/recuperar` y `/restablecer` redirigen al
  dashboard del rol.

Tres capas de protección: **proxy** (primera barrera), **guards de layout**
(`requireRole`), **RLS + Server Actions** (verificación definitiva). Cada
mutación vuelve a comprobar sesión y propiedad.

---

## 9. Cuentas de prueba

Contraseña única: **`ReCome2026!`** (también listadas en `Cuentas.txt`).

| Correo | Rol | Comercio |
|---|---|---|
| `eltrigal@recome.test` | `BUSINESS` | Panadería El Trigal (Wanchaq) |
| `donachela@recome.test` | `BUSINESS` | Pastelería Doña Chela |
| `qorikancha@recome.test` | `BUSINESS` | Café Qorikancha |
| `salkantay@recome.test` | `BUSINESS` | Heladería Salkantay |
| `tupananchis@recome.test` | `BUSINESS` | Restaurante Tupananchis |
| `losandes@recome.test` | `BUSINESS` | Panificadora Los Andes |
| `manzanapata@recome.test` | `BUSINESS` | Dulcería Manzanapata |
| `admin@recome.test` | `ADMIN` | — |

Los correos `@recome.test` no reciben mensajes reales: sirven para iniciar
sesión, no para probar la confirmación por correo. No hay cuentas `CLIENT`
permanentes (se crean y se borran durante las pruebas).

`ADMIN` **nunca** se pide en el registro. Se asigna por SQL:

```sql
update public.profiles set role = 'ADMIN' where email = 'correo@dominio.com';
```

---

## 10. Qué se hizo en cada fase

### Fase 1 — Preparación ✅

Next.js 16 + TypeScript, Tailwind 4, shadcn 4, dependencias, estructura de
carpetas, `.env.example`, clientes de Supabase (navegador, servidor, proxy),
landing responsive con identidad verde/crema/naranja, idioma español,
`docs/stack.md`.

### Fase 2 — Base de datos ✅

8 migraciones (`supabase/migrations/`), `consolidado.sql`, `config.toml`,
`docs/base-de-datos.md`. 42 comprobaciones sobre PostgreSQL 17 embebido
(PGlite) con esquemas `auth` y `storage` simulados: alta de perfiles,
degradación de `ADMIN` desde metadata, slugs, bloqueo de ofertas de comercios no
aprobados, reservas, cancelaciones, entrega, stock, vencimiento idempotente,
límites, bloqueo por códigos fallidos, RLS y privilegios de columna.
Esquema aplicado al proyecto real y seed cargado (7 comercios, 19 ofertas).

### Fase 3 — Autenticación y roles ✅

`/login`, `/registro` (solo `CLIENT` y `BUSINESS`), `/recuperar`,
`/restablecer`, `/auth/callback`, logout, menú de cuenta en la cabecera,
`/cliente/dashboard`, `/cliente/perfil`, `/negocio/dashboard`,
`/admin/dashboard`, guards de rol y proxy. `docs/autenticacion.md`.

Verificado en navegador: login de comercio y admin, acceso cruzado
`BUSINESS → /cliente/dashboard` redirige, cliente de prueba con perfil editado y
persistido, validaciones de `/registro`, contraseña incorrecta, usuario
eliminado redirigido a `/login`, sin errores de consola. `npm run lint` y
`npm run build` limpios.

---

## 11. Fase 4 — Comercios y administración ✅ (código)

Objetivo: que un `BUSINESS` registre y edite su establecimiento, y que un
`ADMIN` lo apruebe, rechace o suspenda.

### 11.1 Qué se implementó

1. **Alta del establecimiento** en `/negocio/perfil` (nombre, tipo, descripción,
   dirección, distrito, teléfono, correo, coordenadas, logo y horarios de los 7
   días con tramos múltiples). El `owner_id` sale siempre de la sesión.
2. **Panel de comercio** `/negocio/dashboard` con el estado real, el motivo de
   rechazo y el botón «Editar establecimiento» o «Corregir datos y reenviar».
3. **Aprobación administrativa** desde `/admin/negocios/[id]`, con nota opcional
   en `audit_logs`.
4. **Edición del perfil** del establecimiento, conservando el estado.
5. **Rechazo y suspensión** con motivo obligatorio (5–500 caracteres), visible
   para el dueño.
6. **Validación de permisos** en cada capa: layout con `requireRole`, Server
   Actions que revalidan sesión y propiedad, RLS y RPC que comprueban el rol
   dentro de la base.

### 11.2 Decisiones técnicas

- El estado de aprobación **no se actualiza con `update`**: las columnas están
  revocadas para `authenticated` (sección 7.2). Se añadieron cuatro RPC
  `security definer` (`approve_business`, `reject_business`,
  `suspend_business`, `resubmit_business`) que validan `is_admin()` u
  `owns_business()`, actualizan la fila y escriben en `audit_logs`.
- `approve_business` es idempotente y también sirve para **reactivar** un
  comercio suspendido. `reject_business` no acepta comercios ya aprobados (para
  eso está la suspensión). `resubmit_business` solo lo puede llamar el dueño y
  solo si el comercio está `REJECTED`.
- **El alta no necesita RPC**: `businesses_insert_owner` permite el `INSERT`
  propio y fuerza `approval_status = 'PENDING'`. Pero esa política tenía un bug
  de recursión (sección 7.3); se corrigió con `has_role` en la migración
  `20261113091000_business_insert_policy.sql`.
- Guardar un comercio `REJECTED` en `/negocio/perfil` actualiza los datos y
  llama a `resubmit_business`, de modo que vuelve a `PENDING` en una sola
  acción.
- `/admin/usuarios` se **difirió a propósito**: `profiles` no tiene columna de
  estado, así que suspender usuarios exigiría cambiar el esquema. No se creó una
  ruta sin función.

### 11.3 Archivos creados o modificados

```text
supabase/migrations/20261113090000_admin_business_functions.sql   RPC de revisión
supabase/migrations/20261113091000_business_insert_policy.sql     has_role + política de alta
supabase/consolidado.sql                                          10 migraciones
supabase/fase4.sql                                                script incremental
src/lib/validations/business.ts                                   Zod del comercio y horarios
src/lib/validations/errors.ts                                     fieldErrors / readForm
src/lib/business/{types,queries,actions,action-state}.ts          dominio del comercio
src/lib/format.ts                                                 fecha, hora y moneda
src/components/business/business-form.tsx                         alta y edición
src/components/admin/business-review-panel.tsx                    aprobar/rechazar/suspender
src/app/negocio/perfil/page.tsx                                   alta si no existe + edición
src/app/admin/negocios/page.tsx                                   lista con filtro por estado
src/app/admin/negocios/[id]/page.tsx                              detalle y acciones
src/components/dashboard/dashboard-nav.tsx                        enlaces nuevos
src/app/negocio/dashboard/page.tsx                                CTA de edición
src/app/admin/dashboard/page.tsx                                  contadores y «Ver todos»
src/lib/auth/{actions,action-state}.ts                            migrados a fieldErrors
```

### 11.4 Verificación hecha

- **35 comprobaciones SQL** nuevas en PGlite (además de las 42 de la Fase 2):
  alta `PENDING`, imposibilidad de autoaprobarse, edición sin cambiar estado,
  autorización de cada RPC, aprobación idempotente con auditoría, rechazo y
  suspensión con motivo, reenvío solo por el dueño, salida y vuelta al catálogo.
- `verify-consolidated.cjs`: `tablas = 7`, `categorias = 6`, `buckets = 3`,
  23 funciones y 21 políticas.
- `verify-fase4-sql.cjs`: `fase4.sql` aplicado sobre un esquema de Fase 2 deja
  los mismos conteos, el alta ya no recursa y la aprobación se audita.
- `npm run lint` y `npm run build` limpios.
- En navegador, con sesión `ADMIN` real: `/admin/dashboard` con contadores,
  `/admin/negocios` con filtros y los 7 comercios, detalle con datos del dueño,
  horarios y ofertas. Sin sesión, las rutas privadas redirigen a
  `/login?next=…`.

### 11.5 Pendiente para cerrar la fase

1. **Aplicar `supabase/fase4.sql`** en Supabase → SQL Editor (requiere acceso al
   panel; el proyecto solo tiene claves publishable/secret, no DDL). Debe
   devolver `funciones = 23` y `politicas = 21`.
2. Tras aplicarlo, probar en navegador: alta de un comercio nuevo, aprobación,
   rechazo con motivo, reenvío del dueño, suspensión y reactivación, accesos
   cruzados y estados vacíos.
3. Confirmar que ya no aparece `infinite recursion detected in policy for
   relation "businesses"` al dar de alta.

---

## 12. Fase 5 — Ofertas ✅ (código)

Objetivo: que el comercio cree, publique y administre excedentes, y que el
público los encuentre en el catálogo y en el directorio de establecimientos.

### 12.1 Qué se implementó

1. **Panel de ofertas** `/negocio/ofertas`: listado con contadores por estado,
   búsqueda por título, filtro por estado y acciones rápidas de publicar,
   pausar o volver a borrador.
2. **Alta y edición** `/negocio/ofertas/nueva` y
   `/negocio/ofertas/[id]/editar`: título, categoría, descripción, precios,
   cantidad total, horario de recojo, vencimiento, ingredientes, alérgenos,
   conservación e imagen.
3. **Imagen** subida directamente desde el navegador a Supabase Storage, en
   `offer-images/{business_id}/{uuid}.{ext}`, con vista previa y opción de
   quitarla.
4. **Stock** ajustable con `set_offer_stock`; al llegar a cero la base marca la
   oferta como `SOLD_OUT`.
5. **Publicación, pausa y borrador** con `set_offer_status`; **archivado** con
   `archive_offer`. La UI muestra «Archivada» a partir de `archived_at`.
6. **Catálogo público** `/ofertas` con búsqueda por título, filtro por
   categoría, contador de resultados, estados vacíos y tarjetas con precios,
   descuento, stock y horario.
7. **Ficha pública** `/ofertas/[id]` con imagen, precios, ahorro, stock,
   horario, vencimiento, punto de recojo, datos del comercio y enlace a Google
   Maps.
8. **Directorio** `/establecimientos` con búsqueda y filtro por tipo, y ficha
   `/establecimientos/[slug]` con datos de contacto, horarios y ofertas activas.
9. **Administración de solo lectura** `/admin/ofertas`: todas las ofertas con
   estado, precio, stock, recojo y enlace al comercio.
10. **Landing**: la sección de ofertas destacadas ahora consulta datos reales
    dentro de un límite de `Suspense`.
11. **Navegación**: enlaces «Ofertas» en los paneles de comercio y
    administración, y resumen de ofertas en el dashboard del comercio.

### 12.2 Decisiones técnicas

- La imagen **no pasa por una Server Action**: se sube desde el navegador con
  `createClient()` de `src/lib/supabase/client.ts` y se guarda su URL pública.
  Así se evita el límite de tamaño de las Server Actions.
- `status`, `available_quantity`, `archived_at` y `business_id` no se envían
  desde los formularios. La base tiene esas columnas revocadas para
  `authenticated`; solo cambian con las RPC existentes.
- Se permiten **borradores** aunque el comercio no esté aprobado, pero publicar
  exige `APPROVED`. Lo garantizan la RPC, el trigger y la RLS.
- El slug de la oferta lo genera el trigger `set_offer_slug()` en el `INSERT`;
  el formulario envía `slug: ""` a propósito.
- Las fechas de `<input type="datetime-local">` se interpretan como hora de
  Perú (`-05:00`) y se convierten a ISO antes de guardar.
- Los campos sensibles de fecha y precio se validan con Zod y también con las
  restricciones de la tabla (`discounted_price < original_price`,
  `pickup_end > pickup_start`, `expiration_at >= pickup_end`).
- Las rutas dinámicas públicas usan `export const instant = false` y
  `generateMetadata` empieza con `await connection()`, igual que el detalle
  administrativo de la Fase 4.
- Se usa `<img>` con `eslint-disable` para las URLs de Supabase, evitando
  configurar dominios remotos en `next/image`.

### 12.3 Archivos creados o modificados

```text
src/lib/validations/offer.ts                         Zod de la oferta
src/lib/offers/{types,queries,actions,action-state}.ts dominio de ofertas
src/lib/format.ts                                    precio, hora y fechas Lima
src/components/offers/offer-card.tsx                 tarjeta pública y esqueletos
src/components/offers/offer-form.tsx                 formulario de alta/edición
src/components/offers/offer-image-field.tsx          subida a Storage
src/components/offers/offer-status-actions.tsx       publicar/pausar/borrador
src/components/offers/stock-form.tsx                 ajuste de stock
src/components/offers/archive-offer-button.tsx       archivado con confirmación
src/app/(public)/ofertas/page.tsx                    catálogo real
src/app/(public)/ofertas/[id]/page.tsx               ficha pública
src/app/(public)/establecimientos/page.tsx           directorio real
src/app/(public)/establecimientos/[slug]/page.tsx    ficha del comercio
src/app/negocio/ofertas/page.tsx                     panel de ofertas
src/app/negocio/ofertas/nueva/page.tsx               alta
src/app/negocio/ofertas/[id]/editar/page.tsx         edición y acciones
src/app/admin/ofertas/page.tsx                       consulta administrativa
src/components/public/featured-offers.tsx            destacadas con datos reales
src/components/dashboard/dashboard-nav.tsx           enlaces de ofertas
src/app/negocio/dashboard/page.tsx                   resumen de ofertas
src/app/admin/dashboard/page.tsx                     acceso a /admin/ofertas
```

### 12.4 Verificación hecha

- `npm run lint` sin errores.
- `npx tsc --noEmit` sin errores después de `next build` (el build genera los
  tipos `LayoutProps` de Next 16).
- `npm run build` correcto: 27 rutas, incluidas las nuevas fichas dinámicas y
  los paneles.
- Consultas REST verificadas contra el Supabase real con la clave publicable:
  los `select` anidados de oferta/comercio/categoría funcionan, el catálogo
  devuelve solo ofertas activas, los borradores no son visibles para `anon` y
  el directorio devuelve los 7 comercios aprobados.
- El build detectó que las fichas dinámicas necesitaban `instant = false`;
  corregido y verificado en un segundo build.

### 12.5 Pendiente para cerrar la fase

1. Probar en navegador con una cuenta `BUSINESS` real: crear un borrador, subir
   una imagen, publicarlo, verlo en `/ofertas`, abrir su ficha, pausarlo,
   cambiar el stock y archivarlo.
2. Probar `/admin/ofertas` con la cuenta `ADMIN`.
3. Crear ofertas nuevas: los horarios del seed ya vencieron y solo queda una
   oferta activa en el catálogo público.
4. Revisar consola del navegador y log del servidor; después commitear la fase.

---

## 13. Fase 6 — Reservas y recojos ✅ (código)

### 13.1 Qué se implementó

- Formulario de reserva en `/ofertas/[id]` con CTA de acceso para invitados,
  aviso para roles que no son `CLIENT` y selector de cantidad limitado por
  stock (máximo 10 por reserva).
- `/cliente/reservas` con pestañas por estado, contadores reales y códigos de
  recojo en las reservas activas.
- `/cliente/reservas/[id]` con detalle, código, historial de eventos, enlace a
  Google Maps, cancelación y avisos `creada`/`cancelada`.
- `/negocio/reservas` para confirmar, cancelar y ver los datos de contacto del
  cliente. El código de recojo **no** se muestra en esta pantalla.
- `/negocio/entregas` con el formulario de validación del código y la cola de
  reservas pendientes/confirmadas.
- `/admin/reservas` de solo lectura, sin códigos.
- `/api/cron/expire-reservations` + `vercel.json` (cron cada 15 minutos).
- Navegación por rol y dashboards de cliente/comercio con datos reales.

### 13.2 Decisiones técnicas

- La entrega se resuelve por código: la acción busca la reserva por
  `pickup_code` bajo RLS y luego llama a `deliver_reservation(id, code)`. Así el
  comercio no necesita conocer el id de la reserva.
- Solo se añadió una política nueva, `offers_select_customer_reservations`, para
  que el cliente lea sus ofertas ya inactivas. No se añadió una política de
  `businesses` para evitar recursión.
- `expire_reservations` se ejecuta con `SUPABASE_SECRET_KEY`; el endpoint exige
  `Authorization: Bearer <CRON_SECRET>`.
- El aviso de cancelación usa redirección a `?cancelada=1` porque la
  revalidación borraba el estado de `useActionState`.
- `/ofertas/[id]` llama `await connection()` antes de `new Date()` para evitar
  el error de prerender al revalidar la ruta.

### 13.3 Archivos creados o modificados

- `src/lib/reservations/{types,queries,actions,action-state}.ts`
- `src/lib/validations/reservation.ts`
- `src/components/reservations/{reservation-form,reservation-actions,delivery-code-form}.tsx`
- `src/app/cliente/reservas/{page.tsx,[id]/page.tsx}`
- `src/app/negocio/{reservas,entregas}/page.tsx`
- `src/app/admin/reservas/page.tsx`
- `src/app/api/cron/expire-reservations/route.ts`, `vercel.json`
- `supabase/migrations/20261114090000_fase6_offer_history.sql`,
  `supabase/fase6.sql`, `supabase/consolidado.sql`
- Navegación, dashboards de cliente/comercio y ficha pública de oferta.

### 13.4 Verificación hecha

- `npm run lint` limpio y `npx tsc --noEmit` sin errores.
- `npm run build` correcto: 33 rutas, cron dinámico, sin avisos nuevos.
- 24/24 pruebas REST: crear, stock, confirmar, código incorrecto/correcto,
  historial, cancelar, límite de 5 activas, aislamiento entre comercios,
  cron 200/401, vencimiento y devolución de stock.
- 27/27 comprobaciones en Chrome real vía CDP: reservar desde la ficha,
  confirmar, entregar con el código, código inexistente, cancelar y admin;
  consola limpia y sin respuestas HTTP de error.
- Datos de prueba eliminados y cuenta `cliente.prueba@recome.test` borrada.

### 13.5 Pendiente para cerrar la fase

1. Aplicar `supabase/fase6.sql` en el proyecto de Supabase para habilitar la
   lectura del historial de ofertas inactivas.
2. Validación del usuario antes de empezar la Fase 7.

---

### Fase 7 — Estadísticas y pruebas (pendiente)

Paneles con datos reales, indicadores por comercio y globales, pruebas de roles,
de RLS, de concurrencia (script SQL), responsive, build de producción y
preparación del despliegue en Vercel (GitHub + variables de entorno). **No
afirmar que está desplegado hasta desplegarlo de verdad.**

---

## 14. Reglas de trabajo obligatorias

Tomadas de la sección 15 de `base-recome.md`:

1. Trabajar directamente en el repositorio.
2. Antes de crear un archivo, comprobar si ya existe.
3. No eliminar archivos sin justificación.
4. No sustituir código funcional por ejemplos.
5. No meter toda la app en un solo archivo.
6. No dejar botones sin funcionalidad.
7. No usar datos ficticios como si fueran reales.
8. Identificar claramente cualquier dato de demostración.
9. No simular una conexión con Supabase.
10. No afirmar que algo funciona sin haberlo probado.
11. Si faltan credenciales, dejar la configuración lista y explicar qué falta.
12. No inventar credenciales externas.
13. Ejecutar las pruebas después de cada fase.
14. Corregir errores antes de avanzar.
15. Mantener la arquitectura coherente.
16. No implementar pagos.
17. Todo el contenido visible en español.
18. Priorizar seguridad y consistencia de datos.
19. Evitar complejidad innecesaria para el MVP.
20. Explicar brevemente qué archivos se crearon o modificaron y por qué.

Además: **validar cada fase con el usuario antes de continuar** y avanzar en
orden (4 → 5 → 6 → 7).

---

## 15. Problemas conocidos y trampas ya resueltas

| Síntoma | Causa | Solución aplicada |
|---|---|---|
| `InvariantError: Received an underlying cookies object…` | `cache()` de React + `cookies()` en Next 16 | Quitar `cache()`; usar `"use cache: private"` |
| `unstable value Date.now() while prerendering` | Supabase calcula expiración del token al leer sesión | `await connection()` en los guards antes de leer |
| `uncached data during prerendering` | Lectura dinámica fuera de `Suspense` | `<Suspense>` por página/layout con esqueleto |
| Aviso del validador al redirigir el guard | Validación de navegación instantánea | `export const instant = false` en los layouts privados |
| «This page couldn't load / A server error occurred» | `dev` y `build` compartiendo `.next` | Detener dev, borrar `.next`, reiniciar solo dev |
| Enlaces de correo no vuelven a la app | Redirect URLs sin configurar | Añadir `http://localhost:3000/**` (sección 4) |
| Cuenta nueva no puede entrar | `mailer_autoconfirm = false` | Confirmar correo o crear con `email_confirm: true` |
| Avisos de hidratación en el navegador | Extensiones (Grammarly, LanguageTool) | Ignorar: no vienen del código |
| `npm run dev > archivo.log 2>&1` falla en Windows | Redirección de shell en este entorno | Usar `npm run dev` normal o lanzarlo con `spawn` de Node |
| Horas de recojo desfasadas | PostgREST devuelve UTC | El seed usa offset `-05:00`; presentar con `America/Lima` |
| `infinite recursion detected in policy for relation "businesses"` al dar de alta un comercio | `businesses_insert_owner` consultaba `profiles`, que volvía a `businesses` vía `reservations` | Migración `20261113091000`: helper `has_role` `security definer` |
| `Date.now() while prerendering` en `/admin/negocios/[id]` | `generateMetadata` leía Supabase antes de marcar la ruta como dinámica | `await connection()` al inicio de `generateMetadata` |
| El navegador headless no muestra el contenido de `<Suspense>` | `requestAnimationFrame` se pausa si la ventana no está visible | No es un fallo de la app: el HTML servido sí trae el contenido; validar con `tabs.focus` o por HTTP |

Estado de Git: las Fases 1–6 están commiteadas; el último commit es
«Fase 6 - Reservas y recojos». Incluye `src/lib/reservations`,
`src/components/reservations`, las rutas de reservas de los tres roles, el
cron, `vercel.json`, la migración `20261114090000_fase6_offer_history.sql`,
`supabase/fase6.sql` y los cambios de navegación, dashboards y ficha pública.
`.env.local` no viaja con Git.

---

## 16. Checklist antes de dar una fase por terminada

- [ ] La funcionalidad se probó en el navegador con una cuenta real.
- [ ] Se probaron los accesos cruzados entre roles.
- [ ] Las mutaciones revalidan sesión, rol y propiedad en el servidor.
- [ ] Los formularios muestran errores por campo en español.
- [ ] Hay estados de carga y estados vacíos.
- [ ] `npm run lint` sin errores.
- [ ] `npm run build` correcto y sin avisos nuevos.
- [ ] Sin errores en consola del navegador ni en el log del servidor.
- [ ] `docs/rutas.md` y la documentación afectada actualizadas.
- [ ] Los datos de prueba creados durante la verificación se eliminaron.
- [ ] Se pidió validación al usuario antes de la siguiente fase.

---

## 17. Comandos útiles

```bash
npm install                 # dependencias
npm run dev                 # desarrollo en :3000
npm run build               # build de producción (no junto con dev)
npm run lint                # ESLint
npx tsc --noEmit            # solo tipos

node supabase/seed/datos-prueba.mjs          # cargar datos de prueba
node supabase/seed/ofertas-vigentes.mjs      # renovar fechas de las ofertas
# limpiar: ejecutar supabase/seed/limpiar-datos-prueba.sql en el SQL Editor

git status --short          # ver cambios pendientes
```

Para inspeccionar la base sin la app, usar el SQL Editor de Supabase o la API
REST con `SUPABASE_SECRET_KEY` (nunca en el navegador).

---

## 18. Archivos que hay que leer primero

Si retomas el proyecto, en este orden:

1. **`TRASPASO.md`** (este archivo).
2. `base-recome.md` — secciones 4 (rutas), 13 (seguridad), 14 (fases),
   15 (reglas) y 16 (decisiones cerradas).
3. `src/lib/auth/session.ts` — el patrón de sesión de Next 16.
4. `docs/base-de-datos.md` — modelo, RLS y RPC.
5. `docs/rutas.md` — qué existe y qué falta.
6. `docs/autenticacion.md` — flujos y roles.
7. `src/lib/business/actions.ts` — Server Actions de comercios.
8. `src/app/admin/negocios/[id]/page.tsx` — detalle y acciones de revisión.
9. `src/lib/offers/actions.ts` — Server Actions de ofertas.
10. `src/app/negocio/ofertas/[id]/editar/page.tsx` — edición, stock y estado.
11. `src/lib/reservations/actions.ts` — crear, cancelar, confirmar y entregar.
12. `src/app/negocio/entregas/page.tsx` — validación del código de recojo.

---

## 19. Próximo paso concreto

1. Aplicar `supabase/fase6.sql` en Supabase (SQL Editor → New query → Run)
   para habilitar la lectura del historial de ofertas inactivas.
2. Validar la Fase 6 con el usuario: reservar una oferta desde una cuenta
   `CLIENT`, confirmarla y entregarla con el comercio, y revisar el historial.
3. El catálogo ya tiene ofertas activas repartidas entre el 15, 16 y 17 de
   noviembre (`supabase/seed/ofertas-vigentes.mjs`). Si se vencen, volver a
   ejecutar ese script.
4. Con la Fase 6 validada, empezar la Fase 7 (estadísticas, pruebas de
   concurrencia y preparación del despliegue). **No afirmar que está desplegado
   hasta desplegarlo de verdad.**
