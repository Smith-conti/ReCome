# Traspaso del proyecto ReCome

> Documento de continuidad. Está pensado para que otra persona (o un agente) pueda
> retomar el trabajo en una máquina distinta **sin contexto previo**: qué es el
> proyecto, cómo se levanta, qué está hecho, qué falta, qué reglas no se pueden
> romper y qué trampas ya se resolvieron.
>
> Última actualización: **13 de noviembre de 2026** · Rama de trabajo: `master`
> (commits `7c4448e` «Fases 1 y 2 completas» + cambios de Fase 3 sin commitear).

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
| 4 | Comercios y administración (registro, perfil, aprobación/suspensión) | ⏳ **Siguiente trabajo** |
| 5 | Ofertas (CRUD, imágenes, stock, catálogo, filtros) | ⏳ Pendiente |
| 6 | Reservas y recojos (crear, cancelar, vencer, entregar, historial) | ⏳ Pendiente (RPC ya listas en la base) |
| 7 | Estadísticas, pruebas y despliegue | ⏳ Pendiente |

Hay 7 tablas, 6 categorías y 3 buckets creados en el proyecto real de Supabase,
con 7 comercios y 19 ofertas de prueba.

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
│   ├── cliente/               layout con guard + dashboard + perfil
│   ├── negocio/               layout con guard + dashboard
│   └── admin/                 layout con guard + dashboard
├── components/
│   ├── ui/                    shadcn (Base UI)
│   ├── layout/                cabecera con menú de cuenta, pie, logo
│   ├── auth/                  formularios y campos reutilizables
│   ├── dashboard/             shell, navegación lateral y esqueletos
│   └── public/                bloques de la landing y estados vacíos
├── lib/
│   ├── auth/
│   │   ├── session.ts         getSessionProfile / guards (ver 5.1)
│   │   ├── roles.ts           UserRole, ROLE_LABEL, dashboardForRole
│   │   ├── routes.ts          PROTECTED_PREFIXES, safeInternalPath
│   │   ├── actions.ts         Server Actions de auth y perfil
│   │   └── action-state.ts    tipo de estado para useActionState
│   ├── supabase/
│   │   ├── client.ts          cliente de navegador
│   │   ├── server.ts          cliente de servidor con cookies
│   │   ├── proxy.ts           refresco de sesión y redirecciones
│   │   └── env.ts             requireSupabaseEnv()
│   ├── validations/auth.ts    esquemas Zod compartidos
│   └── utils.ts               cn()
└── proxy.ts                   entrada del proxy (convención Next 16)

supabase/
├── config.toml
├── migrations/                8 migraciones en orden
├── consolidado.sql            las 8 en un solo script transaccional
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

**Importante para la Fase 4:** aunque RLS permite al admin actualizar
`businesses`, los privilegios de columna **revocan** `approval_status`,
`approved_at`, `rejection_reason` y `owner_id` para `authenticated`
(`20261111090500_rls.sql`, líneas 219–238). Es decir: **ni el dueño ni un admin
pueden cambiar el estado de aprobación con un `update` normal desde el cliente**.
Hay que hacerlo con funciones `security definer` (recomendado, deja rastro en
`audit_logs`) o con un cliente de servicio en el servidor. Ver sección 11.2.

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
| `expire_reservations()` | Solo `service_role` (cron) |

Auxiliares: `is_admin()`, `owns_business(uuid)`, `slugify(text)`,
`set_updated_at()`, `set_business_slug()`, `set_offer_slug()`,
`sync_offer_status()`, `ensure_offer_approved()`, `set_reservation_business()`,
`handle_new_user()`.

**No existe todavía ninguna RPC de aprobación/rechazo/suspensión de comercios**
(el enum `admin_action` ya tiene `BUSINESS_APPROVED`, `BUSINESS_REJECTED` y
`BUSINESS_SUSPENDED`, preparados para ello).

### 7.4 Storage

| Bucket | Ruta | Escritura |
|---|---|---|
| `avatars` | `{user_id}/archivo` | El propio usuario |
| `business-logos` | `{business_id}/archivo` | Dueño del comercio |
| `offer-images` | `{business_id}/...` | Dueño del comercio |

Lectura pública; 5 MB por archivo; solo `image/jpeg`, `image/png` o `image/webp`.

### 7.5 Cómo aplicar cambios de esquema

- Proyecto real: **SQL Editor** de Supabase con `supabase/consolidado.sql`
  (recrea todo desde cero en una transacción) **o** el archivo de migración
  nuevo suelto.
- Si se añade una migración, **actualizar también `consolidado.sql`** para que no
  diverjan, y las tablas de `docs/base-de-datos.md`.
- Verificación esperada del consolidado: `tablas = 7`, `categorias = 6`,
  `buckets = 3`.
- Los cambios de esquema no son idempotentes (enums y tablas se crean una vez).
- Ya aplicado al proyecto real: 7 tablas, 6 categorías, 3 buckets, 18 funciones
  y 21 políticas RLS en `public`.

---

## 8. Rutas

### Implementadas

| Ruta | Notas |
|---|---|
| `/` | Landing completa con ofertas destacadas (hoy vacías) |
| `/ofertas`, `/establecimientos` | Página con estado vacío explícito |
| `/login`, `/registro`, `/recuperar`, `/restablecer` | Fase 3 |
| `/auth/callback` | Canjea el código de Supabase y redirige por rol |
| `/cliente` | Redirige a `/cliente/dashboard` |
| `/cliente/dashboard` | Panel con datos reales del perfil |
| `/cliente/perfil` | Editar nombre y teléfono (correo y rol no editables) |
| `/negocio` | Redirige a `/negocio/dashboard` |
| `/negocio/dashboard` | Panel con el estado real del establecimiento |
| `/admin` | Redirige a `/admin/dashboard` |
| `/admin/dashboard` | Contadores reales: pendientes, aprobados, clientes, ofertas activas |

### Pendientes (fuente: sección 4 de `base-recome.md`)

| Fase | Rutas |
|---|---|
| 4 | `/negocio/perfil`, `/admin/negocios`, `/admin/negocios/[id]`, `/admin/usuarios` |
| 5 | `/ofertas/[id]`, `/establecimientos/[slug]`, `/negocio/ofertas`, `/negocio/ofertas/nueva`, `/negocio/ofertas/[id]/editar`, `/admin/ofertas` |
| 6 | `/cliente/reservas`, `/negocio/reservas`, `/negocio/entregas`, `/admin/reservas` |
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

## 11. Fase 4 — Comercios y administración (siguiente trabajo)

Objetivo: que un `BUSINESS` registre y edite su establecimiento, y que un
`ADMIN` lo apruebe, rechace o suspenda.

### 11.1 Tareas de la especificación

1. Registro de establecimientos.
2. Panel de comercio (completar lo que hoy solo muestra el estado).
3. Aprobación administrativa.
4. Edición del perfil del establecimiento.
5. Suspensión y rechazo.
6. Validación de permisos.

### 11.2 Decisión técnica previa (importante)

El estado de aprobación **no se puede actualizar con un `update` desde el
cliente**, ni siquiera como admin (privilegios de columna, sección 7.2). Opciones:

- **Recomendada:** nueva migración con RPC `security definer`
  `approve_business`, `reject_business` (exige motivo) y `suspend_business`
  (exige motivo), que validen `is_admin()`, actualicen `businesses` y escriban
  en `audit_logs` con el `admin_action` correspondiente. Mantiene el modelo de
  seguridad actual y deja auditoría real.
- Alternativa: cliente con `SUPABASE_SECRET_KEY` en el servidor
  (`src/lib/supabase/admin.ts`). Salta RLS y no escribe auditoría por sí solo;
  usar solo si la RPC resulta poco práctica.

El **alta** del establecimiento, en cambio, no necesita nada especial: la política
`businesses_insert_owner` ya permite a un `BUSINESS` insertar su propia fila y
obliga a que `approval_status` sea `PENDING` (aunque el formulario intente otra
cosa). La edición del perfil usa las columnas concedidas (sección 7.2), así que
tampoco requiere RPC. Solo el cambio de estado exige función.

Al aprobar un comercio hay que fijar `approved_at = now()` y limpiar
`rejection_reason` (hay constraints que lo exigen, ver
`20261111090100_tables.sql`, líneas 56–65).

### 11.3 Archivos previstos

```text
supabase/migrations/2026...._admin_business_functions.sql   RPC de aprobación
supabase/consolidado.sql                                    regenerar
src/lib/validations/business.ts                             Zod del comercio
src/lib/business/actions.ts                                 Server Actions
src/lib/business/queries.ts                                 lecturas del panel
src/components/business/business-form.tsx                   alta y edición
src/components/admin/business-review.tsx                    aprobar/rechazar/suspender
src/app/negocio/perfil/page.tsx                             alta si no existe + edición
src/app/admin/negocios/page.tsx                             lista con filtro por estado
src/app/admin/negocios/[id]/page.tsx                        detalle y acciones
src/app/admin/usuarios/page.tsx                             (si el alcance lo incluye)
```

Además: enlaces «Completar perfil del establecimiento» en
`/negocio/dashboard` y «Comercios» en la navegación de `/admin`; enlaces
pendientes en `src/components/dashboard/dashboard-nav.tsx`.

### 11.4 Requisitos de calidad para darla por terminada

- Zod compartido cliente/servidor para todos los campos (incluido
  `opening_hours` como JSON validado, no texto libre).
- Server Actions que revaliden sesión, rol y propiedad; nunca confiar en el
  `owner_id` que llega del formulario.
- Toda página nueva dentro de `<Suspense>` con su esqueleto.
- Listados con estado vacío explícito y estado de carga.
- Rechazo y suspensión exigen motivo visible en el detalle.
- `npm run lint` y `npm run build` sin errores.
- Verificación real en navegador (no solo compilación).
- Actualizar `docs/rutas.md`, `docs/base-de-datos.md` y `README.md`.
- Preguntar al usuario antes de empezar la Fase 5.

---

## 12. Fases 5, 6 y 7 (alcance pendiente)

### Fase 5 — Ofertas

Crear y editar ofertas, subir imágenes a `offer-images`, administrar stock,
publicar/pausar, catálogo público real en `/ofertas`, detalle
`/ofertas/[id]`, directorio `/establecimientos` y `/establecimientos/[slug]`,
búsqueda y filtros. Las RPC de stock y estado ya existen.

### Fase 6 — Reservas y recojos

Crear reservas (`create_reservation`), validar stock, mostrar el código de
recojo, consultar reservas por rol, cancelar, vencer (endpoint de Vercel Cron
protegido con `CRON_SECRET` que llama a `expire_reservations`), confirmar
entrega (`deliver_reservation`) e historial de eventos. La lógica de base ya
está probada; falta toda la UI y el endpoint.

### Fase 7 — Estadísticas y pruebas

Paneles con datos reales, indicadores por comercio y globales, pruebas de roles,
de RLS, de concurrencia (script SQL), responsive, build de producción y
preparación del despliegue en Vercel (GitHub + variables de entorno). **No
afirmar que está desplegado hasta desplegarlo de verdad.**

---

## 13. Reglas de trabajo obligatorias

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

## 14. Problemas conocidos y trampas ya resueltas

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

Estado de Git: hay cambios de la Fase 3 sin commitear (páginas y layouts de
auth, paneles, `session.ts`, `site-header.tsx`, `dashboard-skeleton.tsx`,
`README.md`, `docs/rutas.md` y el nuevo `docs/autenticacion.md`). Conviene
commitear antes de empezar la Fase 4 para tener un punto de retorno limpio.

---

## 15. Checklist antes de dar una fase por terminada

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

## 16. Comandos útiles

```bash
npm install                 # dependencias
npm run dev                 # desarrollo en :3000
npm run build               # build de producción (no junto con dev)
npm run lint                # ESLint
npx tsc --noEmit            # solo tipos

node supabase/seed/datos-prueba.mjs          # cargar datos de prueba
# limpiar: ejecutar supabase/seed/limpiar-datos-prueba.sql en el SQL Editor

git status --short          # ver cambios pendientes
```

Para inspeccionar la base sin la app, usar el SQL Editor de Supabase o la API
REST con `SUPABASE_SECRET_KEY` (nunca en el navegador).

---

## 17. Archivos que hay que leer primero

Si retomas el proyecto, en este orden:

1. **`TRASPASO.md`** (este archivo).
2. `base-recome.md` — secciones 4 (rutas), 13 (seguridad), 14 (fases),
   15 (reglas) y 16 (decisiones cerradas).
3. `src/lib/auth/session.ts` — el patrón de sesión de Next 16.
4. `docs/base-de-datos.md` — modelo, RLS y RPC.
5. `docs/rutas.md` — qué existe y qué falta.
6. `docs/autenticacion.md` — flujos y roles.
7. `src/app/negocio/dashboard/page.tsx` y
   `src/app/admin/dashboard/page.tsx` — punto de partida de la Fase 4.

---

## 18. Próximo paso concreto

1. Commitear el estado actual (Fase 3).
2. Configurar las Redirect URLs en Supabase (sección 4).
3. Implementar la Fase 4 siguiendo la sección 11, empezando por la migración de
   RPC de aprobación y el formulario de establecimiento.
4. Verificar en navegador, actualizar documentación y pedir validación antes de
   la Fase 5.
