# PROMPT MAESTRO — DESARROLLO DE RECOME

## 1. ROL Y RESPONSABILIDAD

Actúa como un arquitecto de software senior, ingeniero Full Stack y especialista en Next.js, TypeScript, PostgreSQL, Supabase, seguridad web y despliegues en Vercel.

Tu responsabilidad es diseñar e implementar **ReCome**, una plataforma web funcional, escalable, segura y adaptable a dispositivos móviles.

No quiero únicamente explicaciones, ejemplos aislados o prototipos visuales. Quiero que trabajes directamente sobre el código del proyecto, crees los archivos necesarios, configures las tecnologías, implementes las funcionalidades y ejecutes las pruebas correspondientes.

Trabaja de forma ordenada, manteniendo una arquitectura limpia y evitando código innecesariamente complejo.

Antes de modificar cualquier archivo:
1. Inspecciona la estructura actual del proyecto.
2. Identifica las tecnologías y dependencias existentes.
3. Comprueba qué funcionalidades ya están implementadas.
4. Conserva el código útil que ya exista.
5. Presenta un plan breve de implementación.
6. No sobrescribas archivos sin revisar su contenido.
7. Consulta la sección 16 (decisiones cerradas) antes de tocar el esquema de datos, las rutas o las políticas de seguridad.

---

# 2. DESCRIPCIÓN DEL PROYECTO

El proyecto se llama **ReCome**.

Es una plataforma web que conecta a consumidores con establecimientos gastronómicos que tienen excedentes de alimentos o productos próximos a perder su oportunidad de venta comercial.

Los establecimientos podrán publicar productos con descuentos para que los usuarios puedan comprarlos o reservarlos antes de que se desperdicien.

### Problema que busca solucionar

Panaderías, pastelerías, cafeterías, heladerías y restaurantes generan excedentes de alimentos que, por diferentes motivos, no llegan a venderse durante su jornada comercial.

Al mismo tiempo, existen consumidores interesados en comprar alimentos a precios más económicos.

ReCome conecta ambas necesidades mediante una plataforma digital.

### Objetivos

- Reducir el desperdicio de alimentos.
- Facilitar la venta de excedentes alimentarios.
- Permitir a los consumidores conseguir productos a menor precio.
- Ayudar a los establecimientos a recuperar parte del valor de sus excedentes.
- Promover el consumo responsable.
- Contribuir al Objetivo de Desarrollo Sostenible 12, especialmente a la meta 12.3.

### Ubicación inicial

La primera zona de operación será el Centro Histórico de Cusco, Perú.

El sistema debe poder ampliarse posteriormente a otros distritos y ciudades.

### Tipos de establecimientos

- Panaderías.
- Pastelerías.
- Cafeterías.
- Heladerías.
- Restaurantes.
- Otros establecimientos gastronómicos.

### Propuesta de valor

Los comercios publican productos disponibles con descuentos y horarios específicos de recojo.

Los clientes consultan las ofertas, realizan reservas y acuden al establecimiento para recoger sus productos.

---

# 3. DECISIONES TECNOLÓGICAS OBLIGATORIAS

Utiliza las siguientes tecnologías:

| Componente | Tecnología |
|---|---|
| Framework | Next.js |
| Lenguaje | TypeScript |
| Enrutamiento | App Router |
| Estilos | Tailwind CSS |
| Componentes UI | shadcn/ui |
| Iconos | Lucide React |
| Base de datos | Supabase PostgreSQL |
| Autenticación | Supabase Auth |
| Almacenamiento | Supabase Storage |
| Cliente Supabase | @supabase/supabase-js |
| Integración SSR | @supabase/ssr |
| Control de versiones | Git y GitHub |
| Despliegue | Vercel |

### Versiones de referencia

Versiones estables al momento de redactar este documento. Verifícalas con `npm view <paquete> version` antes de instalar y regístralas en `docs/stack.md`:

| Paquete | Versión |
|---|---|
| next | 16.4.x |
| @supabase/ssr | 0.12.x |
| @supabase/supabase-js | 2.119.x |
| tailwindcss | 4.3.x |
| zod | 4.6.x |
| shadcn (CLI) | 4.23.x |

Notas de compatibilidad:

- Con Next.js 16 el middleware se denomina `proxy.ts`; en Next 15 era `middleware.ts`. No mezcles ambas convenciones.
- Tailwind CSS 4 se configura desde CSS (`@import "tailwindcss"` + `@theme`) y no requiere `tailwind.config.js`.
- Zod 4 cambia mensajes y algunas APIs respecto a Zod 3. Sigue la documentación de la versión instalada.

### Restricciones tecnológicas

- Utiliza una sola aplicación Next.js.
- No crees aplicaciones separadas para clientes, comercios y administradores.
- No implementes microservicios.
- No utilices una base de datos local como solución definitiva.
- No almacenes contraseñas manualmente.
- Utiliza Supabase Auth para gestionar las credenciales.
- Utiliza PostgreSQL como fuente principal de datos.
- Utiliza variables de entorno para las credenciales.
- No expongas claves privadas en el navegador.
- No introduzcas dependencias innecesarias.
- Utiliza versiones estables y compatibles de las dependencias.
- No supongas que una API o método existe: comprueba la documentación y las versiones instaladas.

---

# 4. ARQUITECTURA GENERAL

Construye una única aplicación con tres áreas diferenciadas.

## A. Área pública y de clientes

Rutas:

- `/`
- `/ofertas`
- `/ofertas/[id]`
- `/establecimientos`
- `/establecimientos/[slug]`
- `/login`
- `/registro`
- `/cliente` (redirige a `/cliente/dashboard`)
- `/cliente/dashboard`
- `/cliente/reservas`
- `/cliente/perfil`

Funcionalidades:

1. Visualizar la página principal.
2. Consultar ofertas disponibles.
3. Filtrar productos por categoría.
4. Buscar ofertas por nombre.
5. Consultar detalles de cada producto.
6. Ver el precio original y el precio con descuento.
7. Consultar el establecimiento que publica la oferta.
8. Consultar horarios y ubicación de recojo.
9. Registrarse e iniciar sesión.
10. Reservar productos.
11. Consultar el historial de reservas.
12. Consultar el estado de las reservas.
13. Visualizar un código de recojo.
14. Cancelar reservas cuando las condiciones lo permitan.

## B. Área privada de establecimientos

Rutas:

- `/negocio`
- `/negocio/dashboard`
- `/negocio/perfil`
- `/negocio/ofertas`
- `/negocio/ofertas/nueva`
- `/negocio/ofertas/[id]/editar`
- `/negocio/reservas`
- `/negocio/entregas`

Funcionalidades:

1. Registro de establecimientos.
2. Edición del perfil del negocio.
3. Carga de imágenes.
4. Registro de dirección y teléfono.
5. Registro de horarios.
6. Consulta del estado de aprobación.
7. Creación de ofertas.
8. Edición de ofertas.
9. Pausar y reactivar ofertas.
10. Administrar cantidades disponibles.
11. Consultar reservas recibidas.
12. Confirmar la entrega de productos.
13. Consultar historial de entregas.
14. Consultar estadísticas básicas.

Un establecimiento solamente podrá publicar ofertas cuando su cuenta haya sido aprobada por un administrador.

Cada comercio solamente podrá administrar su propio establecimiento, sus ofertas y sus reservas.

## C. Área administrativa

Rutas:

- `/admin`
- `/admin/dashboard`
- `/admin/negocios`
- `/admin/negocios/[id]`
- `/admin/usuarios`
- `/admin/ofertas`
- `/admin/reservas`
- `/admin/reportes`

Funcionalidades:

1. Visualizar estadísticas generales.
2. Consultar establecimientos registrados.
3. Aprobar establecimientos.
4. Rechazar establecimientos.
5. Suspender establecimientos.
6. Consultar usuarios registrados.
7. Suspender usuarios cuando corresponda.
8. Consultar ofertas publicadas.
9. Supervisar reservas.
10. Consultar actividad de la plataforma.
11. Consultar indicadores básicos de impacto.

El administrador tendrá un diseño de dashboard propio, aunque pertenezca a la misma aplicación Next.js.

No crees un segundo proyecto ni un segundo despliegue de Vercel.

---

# 5. SISTEMA DE ROLES Y AUTORIZACIÓN

Implementa tres roles:

- `CLIENT`
- `BUSINESS`
- `ADMIN`

Cada usuario tendrá un único rol principal.

El rol debe almacenarse en una estructura segura del servidor y no debe poder modificarse libremente desde el cliente.

### Reglas de autorización

CLIENT:
- Puede consultar ofertas públicas.
- Puede administrar su propio perfil.
- Puede crear reservas.
- Puede consultar y cancelar sus propias reservas.
- No puede acceder a paneles privados de comercios ni administradores.

BUSINESS:
- Puede consultar su propio panel.
- Puede administrar únicamente su propio establecimiento. En el MVP un propietario administra un solo comercio (`businesses.owner_id` es UNIQUE); la ampliación a varios queda documentada para una fase posterior.
- Puede publicar ofertas si está aprobado.
- Puede consultar las reservas de sus ofertas.
- Puede confirmar entregas.
- No puede consultar información privada de otros establecimientos.

Los roles `CLIENT` y `BUSINESS` se eligen en el registro. `ADMIN` nunca se solicita desde el formulario: se asigna en la base de datos mediante seed o SQL manual.

ADMIN:
- Puede acceder al panel administrativo.
- Puede aprobar y suspender establecimientos.
- Puede supervisar usuarios, ofertas y reservas.
- Puede consultar indicadores generales.

### Seguridad obligatoria

Implementa:

- Protección de rutas.
- Validación de roles en el servidor.
- Comprobación de propiedad de los recursos.
- Políticas RLS en Supabase.
- Validación de datos de entrada.
- Manejo seguro de sesiones.
- Protección frente a accesos directos a rutas privadas.
- Manejo de errores de autorización.

No consideres suficiente ocultar botones o elementos de interfaz.

La seguridad debe aplicarse también en las consultas, Server Actions y endpoints.

---

# 6. MODELO DE BASE DE DATOS

Diseña la base de datos en PostgreSQL mediante migraciones SQL versionadas.

Utiliza claves primarias UUID, claves foráneas, índices, restricciones y marcas de tiempo cuando corresponda.

Los tipos, restricciones y políticas concretas se detallan en cada tabla y en la sección 16 (decisiones cerradas). Los precios son `numeric(10,2)`; no se usan `float` ni `double precision`.

## Tabla: profiles

Campos:

- id: UUID, clave primaria y referencia a `auth.users(id)` con `ON DELETE CASCADE`.
- full_name: text, obligatorio.
- email: text, obligatorio y único.
- phone: text, opcional.
- role: enum `user_role` (`CLIENT`, `BUSINESS`, `ADMIN`), por defecto `CLIENT`.
- avatar_url: text, opcional.
- created_at / updated_at: `timestamptz`, por defecto `now()`.

Reglas:

- El perfil se crea automáticamente con un trigger `AFTER INSERT` sobre `auth.users`; nunca desde el navegador.
- El registro solo puede solicitar los roles `CLIENT` o `BUSINESS`. `ADMIN` se asigna por seed/SQL.
- El rol no puede modificarse desde el cliente: revoca el privilegio de actualización de la columna (`REVOKE UPDATE (role) ON profiles FROM authenticated;`) o muévelo a una tabla solo escribible por el servidor.

## Tabla: businesses

Campos:

- id: UUID.
- owner_id: UUID, referencia a `profiles(id)`.
- name: text, obligatorio.
- slug: text, único, generado desde el nombre y normalizado.
- description: text.
- type: enum `business_type` (`BAKERY`, `PASTRY`, `CAFE`, `ICE_CREAM`, `RESTAURANT`, `OTHER`) — rubro del comercio.
- address: text.
- district: text.
- city: text, por defecto `Cusco`.
- phone: text.
- email: text, opcional.
- latitude / longitude: `numeric(9,6)`, opcionales.
- opening_hours: `jsonb`, arreglo `[{ "day": 1, "open": "08:00", "close": "20:00" }]`, con `day` de 1 (lunes) a 7 (domingo).
- logo_url: text.
- approval_status: enum `approval_status` (`PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`), por defecto `PENDING`.
- rejection_reason: text, opcional.
- approved_at: `timestamptz`, opcional.
- created_at / updated_at: `timestamptz`.

Restricciones:

- `slug` UNIQUE.
- `owner_id` UNIQUE: un propietario administra un único establecimiento en el MVP.
- `approval_status = 'REJECTED'` exige `rejection_reason`.
- `approval_status = 'APPROVED'` exige `approved_at`.

## Tabla: categories

Campos:

- id: UUID.
- name: text, único.
- slug: text, único.
- description: text.
- image_url: text, opcional.
- is_active: boolean, por defecto `true`.
- created_at: `timestamptz`.

Alcance: `categories` clasifica **ofertas** y es administrable sin migraciones. El rubro del comercio vive en `businesses.type` y no depende de esta tabla. Ambas clasificaciones pueden coincidir, pero no se sincronizan automáticamente.

Categorías iniciales sugeridas:

- Panadería.
- Pastelería.
- Cafetería.
- Heladería.
- Comida preparada.
- Otros.

## Tabla: offers

Campos:

- id: UUID.
- business_id: UUID, referencia a `businesses(id)` con `ON DELETE RESTRICT`.
- category_id: UUID, referencia a `categories(id)`.
- title: text.
- slug: text, generado y único por comercio (`UNIQUE (business_id, slug)`).
- description: text.
- original_price: `numeric(10,2)`, mayor que cero.
- discounted_price: `numeric(10,2)`, mayor que cero y menor que `original_price`.
- initial_quantity: integer, mayor que cero.
- available_quantity: integer, entre cero y `initial_quantity`.
- image_url: text.
- pickup_start / pickup_end: `timestamptz`, con `pickup_end > pickup_start`.
- expiration_at: `timestamptz`, opcional; si existe, no puede ser anterior a `pickup_end`.
- ingredients / allergens / storage_instructions: text, opcionales.
- status: enum `offer_status` (`DRAFT`, `ACTIVE`, `SOLD_OUT`, `EXPIRED`, `PAUSED`), por defecto `DRAFT`.
- archived_at: `timestamptz`, opcional (borrado lógico).
- created_at / updated_at: `timestamptz`.

Reglas:

- `SOLD_OUT` se deriva de `available_quantity = 0` mediante trigger; no se escribe manualmente.
- No se eliminan ofertas con reservas asociadas: se archivan con `archived_at` o pasan a `PAUSED`.
- Una oferta solo puede estar `ACTIVE` si su comercio tiene `approval_status = 'APPROVED'` (validado en función o trigger).
- El stock solo cambia mediante funciones SQL; nunca a partir de un valor enviado por el navegador.

## Tabla: reservations

Campos:

- id: UUID.
- offer_id: UUID, referencia a `offers(id)` con `ON DELETE RESTRICT`.
- business_id: UUID, referencia a `businesses(id)`; copia denormalizada de `offers.business_id` para simplificar RLS y las consultas del panel del comercio.
- customer_id: UUID, referencia a `profiles(id)`.
- quantity: integer, mayor que cero y menor o igual a 10.
- unit_price: `numeric(10,2)`, instantánea del precio al reservar.
- total_price: `numeric(10,2)`, columna generada `GENERATED ALWAYS AS (quantity * unit_price) STORED`.
- status: enum `reservation_status` (`PENDING`, `CONFIRMED`, `DELIVERED`, `CANCELLED`, `EXPIRED`), por defecto `PENDING`.
- pickup_code: `char(6)`, único, en mayúsculas y con alfabeto sin caracteres ambiguos (sin `0/O`, `1/I`, `8/B`).
- expires_at: `timestamptz`, por defecto igual a `offers.pickup_end` al crear la reserva.
- created_at / updated_at: `timestamptz`.

Restricciones:

- `total_price` nunca se recibe desde el cliente.
- `business_id` debe coincidir con `offers.business_id` (validado en la función de creación).
- Un cliente no puede tener más de 5 reservas activas simultáneas (`PENDING` o `CONFIRMED`).

## Tabla: reservation_events

Campos:

- id: UUID.
- reservation_id: UUID, referencia a `reservations(id)` con `ON DELETE CASCADE`.
- actor_id: UUID, referencia a `profiles(id)`.
- event: enum `reservation_event` (`CREATED`, `CONFIRMED`, `DELIVERED`, `CANCELLED`, `EXPIRED`).
- description: text.
- created_at: `timestamptz`.

## Tabla: audit_logs

Registro de acciones administrativas. No sustituye a `reservation_events`.

Campos:

- id: UUID.
- actor_id: UUID, referencia a `profiles(id)`.
- action: enum `admin_action` (`BUSINESS_APPROVED`, `BUSINESS_REJECTED`, `BUSINESS_SUSPENDED`, `USER_SUSPENDED`, `USER_REACTIVATED`, `OFFER_REMOVED`).
- entity: text (`business`, `profile`, `offer`).
- entity_id: UUID.
- metadata: `jsonb`, opcional (detalle o motivo).
- created_at: `timestamptz`.

Solo escribible desde funciones del servidor: sin `INSERT`, `UPDATE` ni `DELETE` para usuarios autenticados.

Agrega restricciones para impedir cantidades negativas, precios negativos y relaciones inválidas.

Agrega índices para búsquedas frecuentes y claves foráneas. Como mínimo:

- `offers (status, pickup_end)` y `offers (category_id)`.
- `offers (business_id, created_at DESC)`.
- `reservations (customer_id, status)` y `reservations (business_id, status)`.
- `reservations (pickup_code)` único.
- `reservation_events (reservation_id, created_at)`.

### Reglas de integridad

- El precio descontado debe ser menor que el precio original.
- La cantidad disponible nunca puede ser negativa.
- La cantidad reservada no puede superar el stock disponible (validado de forma atómica, no con lectura previa).
- Una reserva no puede superar el stock disponible.
- Una oferta debe pertenecer a un comercio existente.
- Un comercio no aprobado no puede publicar ofertas activas.
- Un cliente no puede modificar reservas de otros clientes.
- Un comercio no puede modificar reservas de otro comercio.
- El código de recojo debe ser único.
- Una oferta archivada no puede recibir reservas nuevas.
- Cancelar o dejar vencer una reserva devuelve el stock a la oferta.
- La entrega es idempotente: solo existe una transición `CONFIRMED → DELIVERED` por reserva.

### Seguridad de base de datos

Implementa RLS en todas las tablas expuestas mediante la API de Supabase.

No confíes en el `user_id`, rol, precio o estado enviado por el navegador sin validarlo en el servidor.

La creación de perfiles y la asignación de roles deben realizarse mediante flujos seguros.

No permitas que un usuario se convierta a ADMIN modificando su petición: revoca la actualización de la columna `role` y valida el rol en cada política y Server Action.

Además:

- Las funciones SQL que escriben stock o reservas deben ser `SECURITY DEFINER` con `search_path = ''` fijo y permisos `EXECUTE` limitados a `authenticated`.
- Define políticas en `storage.objects` para los buckets de imágenes: lectura pública y escritura restringida al propietario según el prefijo de ruta (`${business_id}/...` o `${user_id}/...`).
- La clave secreta de Supabase (`SUPABASE_SECRET_KEY`) nunca llega al navegador y solo se usa en código de servidor.

---

# 7. FLUJO DE NEGOCIO PRINCIPAL

El sistema debe seguir este flujo:

1. Un establecimiento se registra.
2. Su estado inicial es PENDING.
3. El administrador revisa sus datos.
4. El administrador aprueba el establecimiento.
5. El establecimiento accede a su panel.
6. Publica una oferta con cantidad, precios y horario de recojo.
7. La oferta aparece en el catálogo público.
8. Un cliente inicia sesión.
9. El cliente selecciona una oferta.
10. El cliente indica la cantidad que desea reservar.
11. El sistema comprueba el stock disponible.
12. Se crea la reserva.
13. Se descuenta o retiene el stock de forma atómica.
14. El cliente recibe un código de recojo.
15. El establecimiento consulta la reserva.
16. El cliente acude al establecimiento.
17. El comercio valida el código y confirma la entrega.
18. El sistema registra la entrega y actualiza las estadísticas.

### Control de stock

Implementa la creación de reservas en una única función PostgreSQL transaccional (`create_reservation`), invocada desde una Server Action. No hagas una lectura de stock seguida de una actualización independiente.

El descuento de stock debe ser una sola sentencia atómica:

```sql
UPDATE offers
SET available_quantity = available_quantity - p_quantity,
    updated_at = now()
WHERE id = p_offer_id
  AND status = 'ACTIVE'
  AND archived_at IS NULL
  AND available_quantity >= p_quantity
RETURNING available_quantity;
```

Si la sentencia no devuelve filas, el stock es insuficiente y la función debe fallar con un error controlado, sin crear la reserva. El precio se toma de `offers.discounted_price` dentro de la función; nunca del cliente.

Generación del código de recojo:

- 6 caracteres, alfabeto sin ambigüedad, unicidad garantizada por restricción y reintento ante colisión (máximo 5 intentos).
- La validación del código solo se permite sobre reservas del comercio autenticado.
- Limita a 5 los intentos fallidos por reserva para evitar enumeración.

Comportamiento ante cancelación y vencimiento:

- El cliente puede cancelar mientras el estado sea `PENDING` o `CONFIRMED` y siempre que `now() < offers.pickup_start`. Pasado ese momento, solo el comercio o un administrador puede cancelar.
- Al cancelar se devuelve el stock a la oferta y se registra un evento `CANCELLED`.
- Si al llegar `expires_at` (igual a `pickup_end`) la reserva no fue entregada, pasa a `EXPIRED` y devuelve el stock. Esto se ejecuta con una tarea programada: Vercel Cron cada 15 minutos contra un route handler protegido con `CRON_SECRET`, o `pg_cron` si está disponible en el plan de Supabase. No dependas de que el cliente abra la página.
- El vencimiento y la devolución de stock deben ser idempotentes: procesar dos veces la misma reserva no altera el stock dos veces.

La operación de entrega debe ser idempotente: un código no puede utilizarse dos veces para entregar la misma reserva. Impón la transición con una condición de estado:

```sql
UPDATE reservations
SET status = 'DELIVERED', updated_at = now()
WHERE id = p_reservation_id
  AND business_id = p_business_id
  AND status = 'CONFIRMED';
```

Si no se actualiza ninguna fila, responde con el estado actual y no registres la entrega.

---

# 8. ALCANCE DEL MVP

Implementa únicamente las funcionalidades esenciales para validar el modelo de negocio.

### Incluido

- Página principal.
- Registro e inicio de sesión.
- Tres roles.
- Registro de comercios.
- Aprobación administrativa.
- Gestión de ofertas.
- Carga de imágenes.
- Catálogo público.
- Búsqueda y filtros básicos.
- Reservas.
- Control de inventario.
- Código de recojo.
- Confirmación de entrega.
- Panel del cliente.
- Panel del comercio.
- Panel del administrador.
- Estadísticas básicas.
- Auditoría de acciones administrativas.
- Paginación en catálogo y tablas de administración.
- Diseño adaptable a móviles.
- Seguridad y políticas RLS.

### No incluido todavía

- Pagos en línea.
- Pasarela de pagos.
- Delivery.
- Aplicación móvil nativa.
- Sistema de puntos.
- Programa de fidelización.
- Chat entre clientes y comercios.
- Integración con POS.
- Integración con inventarios externos.
- Facturación electrónica.
- Inteligencia artificial.
- Geolocalización avanzada.

IMPORTANTE: los pagos se implementarán en una fase posterior. No simules pagos exitosos ni afirmes que se ha cobrado dinero. El MVP debe gestionar reservas y recojos sin pasarela de pago.

---

# 9. DISEÑO Y EXPERIENCIA DE USUARIO

Quiero una interfaz moderna, profesional, intuitiva y visualmente atractiva.

La identidad visual debe transmitir:

- Sostenibilidad.
- Alimentación.
- Confianza.
- Ahorro.
- Comercio local.
- Consumo responsable.

### Paleta sugerida

- Verde oscuro: `#245B40`.
- Verde principal: `#3D8057`.
- Verde claro: `#E8F2E8`.
- Crema: `#FFF9EF`.
- Blanco: `#FFFFFF`.
- Gris de texto: `#647067`.
- Naranja de acento: `#E6A04B`.

Utiliza esta paleta de manera coherente, sin saturar la interfaz.

### Reglas de diseño

- Diseño responsive.
- Prioridad a la experiencia móvil.
- Navegación clara.
- Tipografía legible.
- Tarjetas de productos con imágenes.
- Estados de carga.
- Estados vacíos.
- Mensajes de error comprensibles.
- Confirmaciones de acciones.
- Formularios con validaciones.
- Modales cuando sean útiles.
- Navegación lateral en los dashboards.
- Tablas administrativas ordenadas.
- Indicadores visuales de estados.
- Contraste accesible.
- Componentes reutilizables.

No quiero una interfaz genérica sin identidad. El diseño debe sentirse como un producto digital real.

Utiliza shadcn/ui como base, adaptando los componentes a la identidad de ReCome.

El idioma de toda la aplicación será español.

No incluyas textos de interfaz en inglés, salvo términos técnicos inevitables.

---

# 10. ESTRUCTURA DE CARPETAS

Organiza el proyecto de forma similar a la siguiente:

```text
recome/
├── public/
│   └── images/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx
│   │   │   ├── ofertas/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── establecimientos/
│   │   │       ├── page.tsx
│   │   │       └── [slug]/page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── registro/page.tsx
│   │   ├── cliente/
│   │   │   ├── page.tsx              # redirige a /cliente/dashboard
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── reservas/page.tsx
│   │   │   └── perfil/page.tsx
│   │   ├── negocio/
│   │   │   ├── page.tsx              # redirige a /negocio/dashboard
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── perfil/page.tsx
│   │   │   ├── ofertas/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── nueva/page.tsx
│   │   │   │   └── [id]/editar/page.tsx
│   │   │   ├── reservas/page.tsx
│   │   │   └── entregas/page.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx              # redirige a /admin/dashboard
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── negocios/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── usuarios/page.tsx
│   │   │   ├── ofertas/page.tsx
│   │   │   ├── reservas/page.tsx
│   │   │   └── reportes/page.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── public/
│   │   ├── client/
│   │   ├── business/
│   │   └── admin/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── auth/
│   │   ├── validations/
│   │   └── utils/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   └── proxy.ts                      # middleware.ts si se usa Next 15
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── docs/
│   ├── stack.md
│   └── rutas.md
├── .env.local
├── .env.example
└── package.json
```

Esta estructura materializa exactamente las rutas de la sección 4. Si hay discrepancia, la sección 4 es la fuente única de verdad y debe corregirse la estructura, no al revés.

Adapta la estructura si existe una razón técnica justificada, pero conserva la separación entre interfaz, lógica de negocio, acceso a datos y validaciones.

---

# 11. VALIDACIONES Y CALIDAD

Utiliza Zod para validar los formularios y datos de entrada.

Implementa validaciones para:

- Correo electrónico.
- Contraseña.
- Teléfono.
- Precios.
- Cantidades.
- Horarios.
- Estados.
- Campos obligatorios.
- Imágenes.
- Datos de establecimientos.

Incluye:

- Manejo centralizado de errores cuando sea apropiado.
- Tipos TypeScript explícitos.
- Componentes reutilizables.
- Código limpio.
- Funciones pequeñas.
- Evitar duplicación.
- Consultas eficientes.
- Estados de carga.
- Prevención de errores de concurrencia.
- Protección contra acceso no autorizado.

No utilices `any` salvo que exista una justificación concreta.

No ignores errores de TypeScript ni desactives reglas de ESLint para ocultar problemas.

---

# 12. VARIABLES DE ENTORNO

Crea un archivo `.env.example` con las variables necesarias.

Como mínimo:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SECRET_KEY=
CRON_SECRET=
```

Notas:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` es la clave publicable (`sb_publishable_...`) y puede llegar al navegador. Si el proyecto usa las claves antiguas, el equivalente es `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SUPABASE_SECRET_KEY` (`sb_secret_...`) es de servidor: nunca debe llevar el prefijo `NEXT_PUBLIC_` ni usarse en componentes cliente. Solo se emplea en tareas administrativas puntuales.
- `CRON_SECRET` protege el endpoint que expira reservas; Vercel Cron lo envía en la cabecera `Authorization: Bearer`.
- El primer administrador no se crea desde la aplicación: se define en `supabase/seed.sql` o con SQL manual en el panel de Supabase.

No incluyas valores reales en el repositorio.

No subas `.env.local` a GitHub.

No utilices secretos privados en componentes cliente.

---

# 13. DESPLIEGUE EN VERCEL

Prepara el proyecto para desplegarse en Vercel.

Verifica:

- Build de producción.
- Variables de entorno.
- Rutas.
- Autenticación.
- Configuración SSR.
- Compatibilidad con Supabase.
- Ausencia de errores de TypeScript.
- Ausencia de errores de compilación.

No afirmes que el proyecto está desplegado si no has realizado realmente el despliegue.

Prepara instrucciones para conectar GitHub con Vercel.

---

# 14. METODOLOGÍA DE TRABAJO

Trabaja por fases. No intentes implementar todo el sistema de golpe.

## FASE 1 — Preparación del proyecto

1. Inspeccionar el proyecto actual.
2. Configurar Next.js y TypeScript.
3. Configurar Tailwind CSS.
4. Configurar shadcn/ui.
5. Instalar dependencias.
6. Preparar estructura de carpetas.
7. Configurar variables de entorno.
8. Configurar clientes de Supabase.
9. Crear la página principal inicial.
10. Verificar el funcionamiento local.

## FASE 2 — Base de datos y seguridad

1. Diseñar migraciones SQL.
2. Crear las tablas.
3. Crear relaciones.
4. Crear restricciones.
5. Crear índices.
6. Configurar RLS.
7. Crear funciones transaccionales para reservas.
8. Preparar datos iniciales de categorías.
9. Documentar la configuración.

## FASE 3 — Autenticación y roles

1. Registro.
2. Inicio de sesión.
3. Cierre de sesión.
4. Gestión de sesiones.
5. Perfiles.
6. Roles.
7. Protección de rutas.
8. Redirección según rol.
9. Recuperación de contraseña si corresponde.

## FASE 4 — Comercios y administración

1. Registro de establecimientos.
2. Panel de comercio.
3. Aprobación administrativa.
4. Edición del perfil.
5. Suspensión y rechazo.
6. Validación de permisos.

## FASE 5 — Ofertas

1. Crear ofertas.
2. Editar ofertas.
3. Subir imágenes.
4. Administrar stock.
5. Publicar y pausar ofertas.
6. Catálogo público.
7. Búsqueda y filtros.

## FASE 6 — Reservas y recojos

1. Crear reservas.
2. Validar stock.
3. Generar códigos de recojo.
4. Consultar reservas.
5. Cancelaciones.
6. Vencimiento de reservas.
7. Confirmación de entrega.
8. Historial de eventos.

## FASE 7 — Estadísticas y pruebas

1. Paneles con datos reales.
2. Indicadores básicos.
3. Pruebas de roles.
4. Pruebas de RLS.
5. Pruebas de reservas concurrentes.
6. Pruebas responsive.
7. Build de producción.
8. Preparación de despliegue.

---

# 15. REGLAS DE EJECUCIÓN PARA OPENCODE

Estas instrucciones son obligatorias:

1. Trabaja directamente en el repositorio.
2. Antes de crear un archivo, comprueba si ya existe.
3. No elimines archivos sin justificación.
4. No sustituyas implementaciones funcionales por código de ejemplo.
5. No generes toda la aplicación en un único archivo.
6. No dejes botones sin funcionalidad.
7. No utilices datos ficticios como si fueran datos reales.
8. Si necesitas datos de demostración, identifícalos claramente.
9. No simules una conexión con Supabase.
10. No afirmes que una función funciona si no la has probado.
11. Si faltan credenciales, crea la configuración y explica qué debe proporcionar el usuario.
12. Si una decisión requiere credenciales externas, deja el flujo preparado sin inventarlas.
13. Ejecuta las pruebas disponibles después de cada fase.
14. Corrige los errores antes de avanzar.
15. Mantén una arquitectura coherente.
16. No implementes pagos en esta versión.
17. Todo el contenido visible de la aplicación debe estar en español.
18. Prioriza seguridad y consistencia de datos.
19. Evita complejidad innecesaria para el MVP.
20. Explica brevemente qué archivos has creado o modificado y por qué.

Si encuentras un problema que impide continuar, explica el problema y solicita únicamente la información indispensable.

---

# 16. DECISIONES CERRADAS Y SUPUESTOS

Estas decisiones resuelven las ambigüedades del documento. Aplícalas sin volver a preguntar, salvo que el usuario indique lo contrario.

### Rutas y navegación

- La lista de rutas de la sección 4 es la fuente única de verdad.
- `/cliente`, `/negocio` y `/admin` redirigen a su respectivo `/dashboard`.
- Existen páginas de detalle `/ofertas/[id]` y `/establecimientos/[slug]`.

### Roles y propiedad

- Un usuario tiene un único rol: `CLIENT`, `BUSINESS` o `ADMIN`.
- Un propietario `BUSINESS` administra un solo establecimiento en el MVP (`businesses.owner_id` UNIQUE). Varios establecimientos por dueño quedan fuera de alcance.
- `ADMIN` solo se crea por seed o SQL manual, nunca por registro web.
- El rol se protege a nivel de columna: el usuario no puede actualizarlo.

### Modelo de datos

- Dinero: `numeric(10,2)`. Nunca `float` ni `double precision`.
- Fechas y horas: `timestamptz`. Zona de presentación: `America/Lima` (UTC-5).
- `businesses.type` describe el rubro del comercio (enum fijo). `categories` clasifica ofertas y es administrable.
- `SOLD_OUT` se deriva de `available_quantity = 0`; no se escribe manualmente.
- `total_price` es una columna generada; el cliente no la envía.
- Las ofertas con historial no se eliminan: se archivan (`archived_at`) o se pausan.
- `audit_logs` registra las acciones administrativas.

### Reservas y stock

- Toda reserva se crea mediante la función `create_reservation`, con descuento atómico de stock.
- Máximo 10 unidades por reserva y 5 reservas activas por cliente.
- El código de recojo tiene 6 caracteres, es único y admite 5 intentos fallidos.
- El cliente cancela solo antes de `pickup_start`; después decide el comercio o un administrador.
- Al cancelar o vencer se devuelve el stock, de forma idempotente.
- El vencimiento se ejecuta con Vercel Cron cada 15 minutos mediante un endpoint protegido con `CRON_SECRET`.

### Imágenes

- Buckets: `avatars`, `business-logos` y `offer-images`.
- Lectura pública; escritura, actualización y borrado restringidos al propietario por prefijo de ruta.
- Límites: máximo 5 MB por archivo y solo `image/jpeg`, `image/png` o `image/webp`.

### Calidad

- Validación con Zod 4 en cliente y servidor, con los mismos esquemas.
- Pruebas: Vitest para validaciones y lógica, Playwright para flujos E2E y un script SQL para la prueba de reservas concurrentes.
- Estado de carga y estados vacíos obligatorios en cada listado.

### Supuestos adoptados

Si alguno no coincide con lo esperado, indícalo antes de la Fase 6; no bloquea las fases anteriores.

1. No hay penalización por no recoger: la reserva vence como `EXPIRED` sin cobro, ya que no existen pagos en el MVP.
2. La recuperación de contraseña se incluye mediante Supabase Auth (flujo de correo).
3. El catálogo público solo muestra ofertas `ACTIVE`, no archivadas, de comercios `APPROVED` y con `pickup_end` futuro.
4. Las estadísticas se calculan con consultas agregadas; no se añade una librería de gráficos salvo que se justifique.

---

# 17. PRIMERA TAREA: COMENZAR A IMPLEMENTAR

Quiero que comiences ahora con la FASE 1.

No te limites a explicarme cómo hacerlo. Realiza las operaciones directamente en el proyecto.

Orden de ejecución:

1. Inspecciona el repositorio actual.
2. Presenta un diagnóstico breve.
3. Identifica si el proyecto está vacío o contiene código.
4. Propón la estructura definitiva.
5. Configura o adapta Next.js.
6. Instala las dependencias necesarias.
7. Configura Tailwind y shadcn/ui.
8. Crea la estructura de carpetas.
9. Configura Supabase SSR.
10. Crea `.env.example`.
11. Crea la página principal de ReCome.
12. Implementa un diseño responsive con la identidad visual indicada.
13. Configura el idioma español.
14. Comprueba que el servidor de desarrollo funcione.
15. Ejecuta lint y build cuando sea posible.
16. Corrige los errores encontrados.

Al terminar, entrega un informe con:

- Diagnóstico inicial.
- Tecnologías configuradas.
- Archivos creados.
- Archivos modificados.
- Dependencias instaladas.
- Comandos ejecutados.
- Resultado de las verificaciones.
- Variables de entorno pendientes.
- Instrucciones para ejecutar el proyecto.
- Próximo paso recomendado.

**IMPORTANTE: termina la FASE 1 antes de comenzar la FASE 2. No avances automáticamente a implementar toda la aplicación.**

Quiero revisar y validar cada fase antes de continuar.

# RESULTADO ESPERADO

Al finalizar la primera fase quiero tener:

- Un proyecto Next.js funcional.
- Una estructura profesional.
- Una conexión de Supabase preparada.
- Una página inicial de ReCome visualmente terminada.
- Diseño responsive.
- Identidad visual coherente.
- Idioma español.
- Configuración lista para GitHub y Vercel.
- Una base sólida para implementar autenticación, roles y módulos.

Comienza inspeccionando el proyecto y ejecutando la FASE 1.