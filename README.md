# ReCome

Plataforma web que conecta a consumidores con panaderías, pastelerías, cafeterías, heladerías y restaurantes de Cusco que tienen excedentes de alimentos, para que puedan reservarlos a precios reducidos y recogerlos en el establecimiento.

Proyecto alineado al Objetivo de Desarrollo Sostenible 12.3 (reducir el desperdicio de alimentos).

> **¿Retomas el proyecto en otra máquina?** Lee [`TRASPASO.md`](TRASPASO.md):
> estado de las fases, puesta en marcha, credenciales pendientes, decisiones
> técnicas y trampas ya resueltas.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui (Base UI) + Lucide
- Supabase (PostgreSQL, Auth y Storage) con integración SSR
- Zod para validación
- Despliegue previsto en Vercel

Detalle de versiones y convenciones en [`docs/stack.md`](docs/stack.md).

## Requisitos

- Node.js 20 o superior (probado con 24)
- npm 11

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # en Windows: copy .env.example .env.local
npm run dev
```

La aplicación queda disponible en <http://localhost:3000>.

Sin credenciales de Supabase el sitio funciona en modo público (sin sesión). Para habilitar autenticación y datos, completa en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`SUPABASE_SECRET_KEY` y `CRON_SECRET` son exclusivamente de servidor y no deben llevar el prefijo `NEXT_PUBLIC_`.

- `SUPABASE_SECRET_KEY`: **Project Settings → API Keys → Secret keys** en el
  panel de Supabase (`sb_secret_…`). Salta RLS: trátala como una contraseña.
- `CRON_SECRET`: se genera localmente, no viene de Supabase. Por ejemplo
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm run lint       # ESLint
npx tsc --noEmit   # tipos
```

## Estructura

```text
src/
├── app/
│   ├── (public)/      # landing, catálogo y directorio
│   ├── (auth)/        # login, registro y recuperación
│   ├── auth/          # callback de enlaces de Supabase
│   ├── cliente/       # panel del cliente
│   ├── negocio/       # panel del comercio
│   └── admin/         # panel administrativo
├── components/
│   ├── ui/            # componentes shadcn
│   ├── layout/        # cabecera, pie y logo
│   ├── auth/          # formularios de acceso y perfil
│   ├── business/      # formulario de establecimiento
│   ├── admin/         # panel de revisión de comercios
│   ├── dashboard/     # estructura de los paneles privados
│   └── public/        # componentes de páginas públicas
├── lib/
│   ├── auth/          # sesión, roles, rutas y Server Actions
│   ├── business/      # consultas y Server Actions de comercios
│   ├── supabase/      # clientes de navegador y servidor
│   ├── validations/   # esquemas Zod
│   ├── format.ts      # formatos de fecha, hora y moneda
│   └── utils.ts
├── services/          # lógica de acceso a datos (fases siguientes)
├── hooks/
├── types/
└── proxy.ts           # sesión y protección de rutas (convención de Next 16)

supabase/
├── config.toml
├── consolidado.sql    # todas las migraciones en un solo script
├── fase4.sql          # migración incremental de la Fase 4 (proyecto existente)
└── migrations/        # esquema, RLS, funciones y seed
```

El mapa completo de rutas está en [`docs/rutas.md`](docs/rutas.md).

## Base de datos

Las migraciones están en `supabase/migrations/` y se aplican en orden desde el
SQL Editor de Supabase o con `npx supabase db push`.

El detalle del modelo, las políticas RLS, las funciones RPC y las instrucciones
de aplicación está en [`docs/base-de-datos.md`](docs/base-de-datos.md).

> Las migraciones de las Fases 2 y 3 están aplicadas al proyecto real de
> Supabase. Las dos migraciones de la Fase 4 están en
> `supabase/fase4.sql`, un script incremental de una sola ejecución para ese
> proyecto. `supabase/consolidado.sql` reúne las 10 migraciones para recrear el
> esquema desde cero.

## Autenticación y roles

El detalle de registro, inicio de sesión, recuperación de contraseña,
protección de rutas y cuentas de prueba está en
[`docs/autenticacion.md`](docs/autenticacion.md).

## Estado del proyecto

Fases 1, 2, 3 y 4 implementadas:

- proyecto Next.js, diseño base, identidad visual y landing responsive;
- configuración de Supabase SSR;
- esquema PostgreSQL con RLS y funciones transaccionales de reservas;
- registro, inicio y cierre de sesión, recuperación de contraseña;
- perfiles y paneles privados por rol (`CLIENT`, `BUSINESS`, `ADMIN`);
- protección de rutas en proxy, layouts de servidor y RLS;
- alta y edición del establecimiento por parte del comercio, con horarios
  semanales;
- revisión administrativa: lista con filtros, detalle con datos del dueño y
  acciones de aprobar, rechazar, suspender y reactivar;
- reenvío de una solicitud rechazada por parte del dueño;
- cambio de estado solo mediante RPC `security definer` con auditoría.

Las rutas de catálogo y la gestión de ofertas muestran estados vacíos
explícitos hasta que se implementen sus fases. No hay pagos en línea ni datos
simulados.

La Fase 4 necesita que se aplique `supabase/fase4.sql` en el proyecto de
Supabase antes de probar la aprobación de comercios.

## Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. Importa el proyecto en Vercel.
3. Configura las variables de entorno de `.env.example` en el panel de Vercel.
4. Ejecuta el build de producción (`npm run build`) para validar antes de desplegar.

El requisito del documento es no afirmar que el proyecto está desplegado hasta que el despliegue se realice realmente.
