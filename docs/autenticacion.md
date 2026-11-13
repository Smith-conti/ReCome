# Autenticación y roles

Fase 3 implementada sobre Supabase Auth con `@supabase/ssr`.

## Roles

Cada usuario tiene un único rol en `public.profiles.role`:

| Rol | Panel | Puede |
|---|---|---|
| `CLIENT` | `/cliente` | Editar su perfil, reservar y cancelar sus reservas (Fase 6) |
| `BUSINESS` | `/negocio` | Administrar su establecimiento y sus ofertas cuando esté aprobado |
| `ADMIN` | `/admin` | Revisar comercios, gestionar usuarios y supervisar la plataforma |

El rol se guarda en la base de datos, no en el cliente. El formulario de
registro solo permite `CLIENT` y `BUSINESS`; `ADMIN` se asigna con la clave
secreta desde el SQL Editor o con la API de administración.

## Flujo de registro

1. `/registro` valida nombre, correo, teléfono opcional, rol y contraseña con
   Zod (mínimo 8 caracteres, una letra y un número).
2. `supabase.auth.signUp` envía `full_name`, `phone` y `role` en
   `user_metadata`. El trigger `handle_new_user` crea el perfil.
3. Si Supabase exige confirmación de correo, se muestra un aviso y el enlace
   del correo pasa por `/auth/callback`, que canjea el código y redirige al
   dashboard del rol.
4. El cliente nunca puede enviar `ADMIN` ni cambiar su rol después.

### Confirmación de correo

En el proyecto actual `mailer_autoconfirm` está en `false`: cada cuenta nueva
debe confirmar su correo antes de ingresar. Para que los enlaces funcionen en
desarrollo, agrega `http://localhost:3000/**` en **Authentication → URL
Configuration → Redirect URLs**. En producción agrega el dominio real. Sin esa
configuración Supabase rechaza el `emailRedirectTo` y el enlace no vuelve a la
aplicación.

La entrega de correos usa el SMTP de Supabase, con límites de frecuencia. Para
producción conviene configurar un SMTP propio en **Authentication → SMTP**.

## Inicio y cierre de sesión

- `/login` valida las credenciales con `signInWithPassword` y comprueba que el
  perfil tenga un rol válido antes de redirigir.
- El destino puede venir en `?next=`; solo se aceptan rutas internas
  (`safeInternalPath`) para evitar redirecciones abiertas.
- Con sesión activa, `/login`, `/registro` y `/recuperar` redirigen al panel
  del rol.
- El cierre de sesión es una Server Action (`logoutAction`) que llama a
  `signOut`, revalida el layout y vuelve a `/`.
- La cabecera pública muestra el menú de cuenta (panel, perfil del cliente y
  cerrar sesión) en escritorio y en el menú móvil.

## Recuperación de contraseña

1. `/recuperar` solicita el enlace con `resetPasswordForEmail`. La respuesta es
   siempre la misma para no revelar qué correos existen.
2. El enlace vuelve por `/auth/callback` y deja la sesión iniciada.
3. `/restablecer` permite definir la nueva contraseña. Si no hay sesión válida,
   muestra un estado de enlace expirado con acceso a solicitar otro.

## Protección de rutas

Hay tres capas:

1. **Proxy** (`src/proxy.ts` → `src/lib/supabase/proxy.ts`): refresca el token
   en cada petición, redirige a `/login` sin sesión y saca del área de acceso a
   quien ya inició sesión. Es la primera barrera, no la única.
2. **Layouts de servidor** (`cliente`, `negocio`, `admin`): `requireRole`
   valida el rol contra el perfil y redirige al panel correcto si no coincide.
3. **Server Actions y RLS**: cada mutación vuelve a comprobar la sesión y la
   propiedad del recurso; las políticas RLS limitan las filas visibles incluso
   si se llama a la API directamente.

La lectura de sesión usa `getClaims()` (verifica la firma del JWT), no
`getSession()`, y se declara con `use cache: private`: el resultado queda en el
navegador, nunca en el servidor, y permite `cookies()` y los valores
dependientes del tiempo que Supabase usa al validar el token. Los guards llaman
a `connection()` antes de leer la sesión y cada página o layout que la usa está
dentro de un `<Suspense>`, como exige Cache Components. No se usa `cache()` de
React: en Next 16 puede reutilizar un almacén de cookies de otro contexto de
render.

## Cuentas y datos de prueba

Las cuentas de prueba y el SQL de limpieza están documentados en
[`base-de-datos.md`](base-de-datos.md#datos-de-prueba). Todas usan la
contraseña `ReCome2026!`:

- Comercios: `eltrigal@recome.test`, `donachela@recome.test`,
  `qorikancha@recome.test`, `salkantay@recome.test`,
  `tupananchis@recome.test`, `losandes@recome.test`,
  `manzanapata@recome.test` (rol `BUSINESS`).
- Administración: `admin@recome.test` (rol `ADMIN`).

Los correos `@recome.test` no reciben mensajes reales: sirven para probar el
inicio de sesión, no el flujo de confirmación.

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SITE_URL` construye los enlaces de confirmación y recuperación.
Debe coincidir con el dominio desplegado y con las Redirect URLs de Supabase.
La clave secreta (`SUPABASE_SECRET_KEY`) nunca se usa en el navegador ni en
componentes de cliente.
