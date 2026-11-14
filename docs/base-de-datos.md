# Base de datos y seguridad

Estado de las Fases 2 y 4. Las migraciones están escritas, probadas localmente y
**aplicadas al proyecto real de Supabase hasta la Fase 3**: 7 tablas, 6
categorías, 3 buckets, 18 funciones y 21 políticas RLS en `public`. Las dos
migraciones de la Fase 4 (revisión administrativa de comercios) están en
`supabase/fase4.sql` y todavía deben aplicarse en ese proyecto: dejan 23
funciones y 21 políticas.

## Migraciones

Ubicación: `supabase/migrations/`. Se ejecutan en orden:

| Archivo | Contenido |
|---|---|
| `20261111090000_extensions_and_enums.sql` | Extensión `unaccent` y enums del dominio |
| `20261111090100_tables.sql` | Tablas, claves foráneas y restricciones |
| `20261111090200_indexes.sql` | Índices de catálogo, reservas y paneles |
| `20261111090300_functions.sql` | Funciones, triggers y permisos de ejecución |
| `20261111090400_triggers.sql` | Triggers de integridad y mantenimiento |
| `20261111090500_rls.sql` | RLS y privilegios por columna |
| `20261111090600_storage.sql` | Buckets y políticas de Storage |
| `20261111090700_seed_categories.sql` | 6 categorías iniciales (idempotente) |
| `20261113090000_admin_business_functions.sql` | RPC de aprobación, rechazo, suspensión y reenvío |
| `20261113091000_business_insert_policy.sql` | Helper `has_role` y política de alta de comercios |

## Cómo aplicar

### Opción A · Editor SQL de Supabase (recomendada)

Para un proyecto que **ya tiene** las 8 migraciones de la Fase 2, pega
`supabase/fase4.sql` en **SQL Editor > New query** y pulsa **Run**. Es
incremental e idempotente: incluye solo las dos migraciones de la Fase 4 y
termina con una verificación que debe devolver:

| funciones | politicas |
|---|---|
| 23 | 21 |

Para recrear el esquema desde cero, usa `supabase/consolidado.sql`: contiene
las 10 migraciones en orden, dentro de una sola transacción y con una
verificación final.

1. Abre el proyecto en <https://supabase.com/dashboard>.
2. Entra en **SQL Editor > New query**.
3. Pega **todo** el contenido de `supabase/consolidado.sql`.
4. Pulsa **Run** (Ctrl+Enter).
5. La última consulta debe devolver una fila:

   | tablas | categorias | buckets |
   |---|---|---|
   | 7 | 6 | 3 |

Si algún valor no coincide, revisa la pestaña de errores antes de continuar.

> El archivo es una transcripción de `supabase/migrations/`. Si modificas una
> migración, vuelve a generar el consolidado para que no diverjan.

Alternativa: ejecutar los 10 archivos de `supabase/migrations/` uno por uno, en
el orden de la tabla anterior.

### Opción B · Supabase CLI

Ya existe `supabase/config.toml`. Requiere Docker solo para el entorno local;
`db push` trabaja contra el proyecto remoto:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

> Usa primero un proyecto de desarrollo. Las migraciones no son idempotentes
> (enums y tablas se crean una sola vez); el seed de categorías sí lo es.

## Modelo

Enums: `user_role`, `business_type`, `approval_status`, `offer_status`,
`reservation_status`, `reservation_event`, `admin_action`.

Tablas:

- `profiles`: perfil vinculado a `auth.users` (1:1). El rol `ADMIN` nunca se
  crea desde el registro web.
- `businesses`: establecimientos. `owner_id` es UNIQUE (un comercio por dueño).
- `categories`: clasifican ofertas; administrables sin migraciones.
- `offers`: excedentes publicados. Precios `numeric(10,2)`.
- `reservations`: reservas. `total_price` es columna generada; `unit_price` es
  una instantánea del precio de la oferta.
- `reservation_events`: historial de estados (actor nulo en eventos del sistema).
- `audit_logs`: acciones administrativas, solo escritura desde funciones.

Reglas garantizadas en la base:

- `SOLD_OUT` se deriva de `available_quantity = 0`; no se escribe a mano.
- Una oferta `ACTIVE` exige un comercio `APPROVED` y `pickup_end` futuro.
- Una oferta archivada no recibe reservas y no puede volver a publicarse.
- El stock nunca se actualiza con un valor enviado por el navegador: se cambia
  con `create_reservation`, `cancel_reservation`, `expire_reservations` o
  `set_offer_stock`.
- Máximo 10 unidades por reserva y 5 reservas activas por cliente.
- El código de recojo tiene 6 caracteres de un alfabeto sin ambigüedades
  (`0/O`, `1/I`, `8/B` excluidos) y es único.

## RLS por tabla

| Tabla | `anon` | `CLIENT` | `BUSINESS` | `ADMIN` |
|---|---|---|---|---|
| `profiles` | — | Lee y edita su perfil | Lee clientes que le reservaron | Todo |
| `businesses` | Solo `APPROVED` | Solo `APPROVED` | Lee y edita el propio | Todo |
| `categories` | Solo activas | Solo activas | Solo activas | Todo |
| `offers` | Catálogo público | Catálogo público | Lee todo lo propio | Todo |
| `reservations` | — | Solo las propias | Solo las de su comercio | Todo |
| `reservation_events` | — | Solo las de sus reservas | Solo las de su comercio | Todo |
| `audit_logs` | — | — | — | Solo lectura |

El catálogo público exige `status = 'ACTIVE'`, `archived_at IS NULL`,
`pickup_end > now()` y comercio `APPROVED`.

Columnas protegidas (revocadas a `authenticated`):

- `profiles.role` y `profiles.email`.
- `businesses.approval_status`, `rejection_reason`, `approved_at`, `owner_id`.
- `offers.business_id`, `available_quantity`, `status`, `archived_at`.
- Las reservas y los eventos no admiten `INSERT`/`UPDATE`/`DELETE` directos.

> Consecuencia: el estado de aprobación **no se cambia con un `update` normal**,
> ni siquiera desde una sesión `ADMIN`, porque el privilegio de columna está
> revocado. El cambio ocurre solo con las funciones `security definer`
> `approve_business`, `reject_business`, `suspend_business` (admin) y
> `resubmit_business` (dueño), que validan el rol y escriben en `audit_logs`.

### Política de alta de comercios

`businesses_insert_owner` comprobaba el rol con una subconsulta a
`public.profiles`. Esa subconsulta activaba las políticas de `profiles`, una de
las cuales consulta `reservations` y, a través de ellas, `businesses`; Postgres
detectaba la referencia circular y abortaba el `INSERT` con
`infinite recursion detected in policy for relation "businesses"`.

La comprobación se movió a `public.has_role(public.user_role)`, una función
`security definer` que lee el perfil sin volver a entrar en las políticas. La
política final exige `owner_id = auth.uid()`, `approval_status = 'PENDING'` y
`has_role('BUSINESS')`.

## Funciones RPC

| Función | Retorno | Quién puede ejecutarla |
|---|---|---|
| `create_reservation(offer_id uuid, quantity int)` | `reservations` | Cliente autenticado |
| `cancel_reservation(reservation_id uuid)` | `reservations` | Cliente dueño antes de `pickup_start`; comercio o admin después |
| `confirm_reservation(reservation_id uuid)` | `reservations` | Comercio dueño o admin |
| `deliver_reservation(reservation_id uuid, code text)` | `jsonb` | Comercio dueño o admin |
| `set_offer_stock(offer_id uuid, quantity int)` | `offers` | Comercio dueño o admin |
| `set_offer_status(offer_id uuid, status offer_status)` | `offers` | Comercio dueño o admin |
| `archive_offer(offer_id uuid)` | `offers` | Comercio dueño o admin |
| `approve_business(business_id uuid)` | `businesses` | Solo `ADMIN` |
| `reject_business(business_id uuid, reason text)` | `businesses` | Solo `ADMIN` |
| `suspend_business(business_id uuid, reason text)` | `businesses` | Solo `ADMIN` |
| `resubmit_business(business_id uuid)` | `businesses` | Dueño del comercio |
| `expire_reservations()` | `integer` | Solo `service_role` (cron) |

Notas de implementación:

- `create_reservation` bloquea la fila de la oferta con `FOR UPDATE` y descuenta
  el stock en una sola sentencia atómica. El precio se toma de la oferta.
- `deliver_reservation` devuelve un objeto con `ok`, `error` y la reserva. Un
  código incorrecto incrementa `failed_attempts`; al llegar a 5 la reserva queda
  bloqueada. La entrega repetida es idempotente.
- `cancel_reservation` y `expire_reservations` devuelven el stock solo cuando la
  transición de estado se aplica realmente, por lo que son idempotentes.
- `expire_reservations` está pensada para un endpoint de Vercel Cron protegido
  con `CRON_SECRET` (Fase 6).
- `approve_business` es idempotente: aprobar dos veces no duplica la auditoría.
  También reactiva un comercio `SUSPENDED`, limpia `rejection_reason` y fija
  `approved_at`.
- `reject_business` exige un motivo de 5 a 500 caracteres y rechaza comercios
  ya aprobados (para esos está la suspensión). Deja `approved_at` en `null`.
- `suspend_business` solo actúa sobre comercios `APPROVED` y guarda el motivo en
  `rejection_reason`; el comercio desaparece del catálogo público.
- `resubmit_business` exige ser dueño y que el comercio esté `REJECTED`; lo
  devuelve a `PENDING` y limpia el motivo.
- Las cuatro funciones están revocadas para `public` y `anon`; solo
  `authenticated` puede invocarlas y la validación real de rol ocurre dentro.

## Storage

Buckets públicos de lectura, escritura restringida por prefijo:

| Bucket | Ruta esperada | Escritura |
|---|---|---|
| `avatars` | `{user_id}/archivo` | El propio usuario |
| `business-logos` | `{business_id}/archivo` | Dueño del comercio |
| `offer-images` | `{business_id}/...` | Dueño del comercio |

Límites: 5 MB por archivo y solo `image/jpeg`, `image/png` o `image/webp`.

## Administradores

`ADMIN` se asigna únicamente por SQL, después de que el usuario exista:

```sql
update public.profiles
set role = 'ADMIN'
where email = 'correo@dominio.com';
```

El rol no se puede cambiar desde la API: la columna está revocada para
`authenticated` y el trigger de alta degrada cualquier rol distinto de
`BUSINESS` a `CLIENT`.

## Verificación realizada

Se ejecutaron las 10 migraciones sobre PostgreSQL 17 embebido (PGlite) con
esquemas `auth` y `storage` simulados. Resultado: **42 comprobaciones** de la
Fase 2 y **35 comprobaciones** de la Fase 4, todas correctas. Entre ellas:

- alta automática de perfiles y degradación de `ADMIN` desde metadata;
- slugs normalizados y únicos;
- bloqueo de ofertas activas para comercios no aprobados;
- creación, cancelación, confirmación y entrega de reservas;
- descuento y devolución de stock;
- vencimiento idempotente;
- límites de 10 unidades y 5 reservas activas;
- bloqueo tras 5 códigos fallidos;
- `SOLD_OUT` derivado y reactivación al reponer stock;
- RLS de catálogo, aislamiento entre clientes y comercios;
- privilegios de columna (rol, stock y reservas);
- alta de comercio sin recursión de RLS y siempre en `PENDING`;
- aprobación idempotente con `approved_at` y auditoría;
- rechazo y suspensión con motivo obligatorio;
- reenvío de la solicitud rechazada solo por el dueño;
- `anon` y roles sin permiso no pueden ejecutar las RPC de revisión.

Además, `supabase/consolidado.sql` se ejecutó completo en el mismo entorno y
devolvió `tablas = 7`, `categorias = 6`, `buckets = 3`, con 23 funciones, 6
triggers y 21 políticas RLS en `public`. `supabase/fase4.sql` se probó sobre un
esquema de Fase 2 y devolvió los mismos conteos.

Pendiente de verificar dentro de las fases siguientes:

1. Aplicar `supabase/fase4.sql` al proyecto real y repetir el ciclo de revisión.
2. Probar la reserva concurrente con un script SQL (Fase 7).
3. Configurar el cron de vencimientos (Fase 6).
4. Confirmar las políticas de Storage al subir la primera imagen real (Fase 5).

## Datos de prueba

`supabase/seed/` contiene utilidades **solo para desarrollo**:

| Archivo | Uso |
|---|---|
| `datos-prueba.mjs` | Crea 7 comercios de Cusco con su cuenta `BUSINESS` y 19 ofertas activas |
| `ofertas-vigentes.mjs` | Renueva precios, stock y fechas de recojo del catálogo de prueba |
| `comercios.mjs` | Catálogo compartido de comercios y ofertas de demostración |
| `cliente.mjs` | Lectura de `.env.local` y cliente REST con la clave secreta |
| `limpiar-datos-prueba.sql` | Borra todo lo anterior (comercios, ofertas, reservas y cuentas `@recome.test`) |

Requisitos: `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SECRET_KEY` en `.env.local`.

```bash
node supabase/seed/datos-prueba.mjs

# Renovar la vigencia de las ofertas para probar el catálogo:
node supabase/seed/ofertas-vigentes.mjs
node supabase/seed/ofertas-vigentes.mjs 2026-11-15 2026-11-16 2026-11-17
```

El script es idempotente: las cuentas se buscan por correo y los comercios por
`owner_id`, así que se puede volver a ejecutar sin duplicar filas. Las cuentas
usan la contraseña `RECOME_SEED_PASSWORD` (por defecto `ReCome2026!`).

Comercios creados:

| Comercio | Rubro | Distrito | Ofertas |
|---|---|---|---|
| Panadería El Trigal | `BAKERY` | Wanchaq | 3 |
| Pastelería Doña Chela | `PASTRY` | Cusco | 3 |
| Café Qorikancha | `CAFE` | Cusco | 3 |
| Heladería Salkantay | `ICE_CREAM` | Cusco | 2 |
| Restaurante Tupananchis | `RESTAURANT` | San Jerónimo | 3 |
| Panificadora Los Andes | `BAKERY` | Santiago | 2 |
| Dulcería Manzanapata | `PASTRY` | Cusco | 3 |

Las ofertas usan horarios de recojo del mismo día (o del día siguiente si ya
pasaron) en hora de Perú (`-05:00`). Las cuentas de Auth se crean con
`email_confirm: true` para poder iniciar sesión sin correo de confirmación.
