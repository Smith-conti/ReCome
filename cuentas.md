# Cuentas de prueba de ReCome

Todas las cuentas usan correos `@recome.test` (no reciben mensajes reales) y la
misma contraseña:

> **Contraseña: `ReCome2026!`**

Se crean con `node supabase/seed/demo.mjs`. En local, entra en
<http://localhost:3000/login>. No hay despliegue público: no uses estas cuentas
en producción.

## Clientes (`CLIENT`)

Creados por `supabase/seed/demo.mjs` junto con sus reservas e historial.

| Correo | Nombre | Teléfono | Reservas |
|---|---|---|---|
| `ana.torres@recome.test` | Ana Torres Quispe | 984100101 | 4: 1 pendiente, 1 confirmada, 1 entregada, 1 cancelada |
| `jorge.mamani@recome.test` | Jorge Mamani Ccahuana | 984100202 | 4: 1 confirmada, 2 entregadas, 1 vencida |
| `lucia.condori@recome.test` | Lucía Condori Huamán | 984100303 | 3: 1 pendiente, 1 entregada, 1 cancelada |
| `diego.choque@recome.test` | Diego Choque Ataucuri | 984100404 | 3: 1 confirmada, 1 entregada, 1 vencida |
| `maria.huaman@recome.test` | María Huamán Yupanqui | 984100505 | 3: 1 pendiente, 1 confirmada, 1 entregada |
| `carlos.puma@recome.test` | Carlos Puma Ttito | 984100606 | 3: 1 pendiente, 1 entregada, 1 cancelada |

Qué probar con un cliente:

- `/cliente/dashboard`: contadores y próximas reservas.
- `/cliente/reservas`: filtros por estado, código de recojo y detalle con
  historial. El código solo lo ve el cliente.
- Cancelar una reserva **antes** de que empiece el horario de recojo.
- Reservar desde el catálogo y comprobar el límite de 5 reservas activas.

## Comercios (`BUSINESS`)

| Correo | Negocio | Propietario | Distrito |
|---|---|---|---|
| `eltrigal@recome.test` | Panadería El Trigal | Rosa Quispe Huamán | Wanchaq |
| `donachela@recome.test` | Pastelería Doña Chela | Graciela Mendoza Farfán | Cusco |
| `qorikancha@recome.test` | Café Qorikancha | Luis Alberto Ccoa Ttito | Cusco |
| `salkantay@recome.test` | Heladería Salkantay | María Elena Puma Vargas | Cusco |
| `tupananchis@recome.test` | Restaurante Tupananchis | Julio César Auccapuma Rojas | San Jerónimo |
| `losandes@recome.test` | Panificadora Los Andes | Eloy Huamán Cárdenas | Santiago |
| `manzanapata@recome.test` | Dulcería Manzanapata | Ana Lucía Béjar Yupanqui | Cusco |

Qué probar con un comercio:

- `/negocio/reservas`: confirmar pendientes y cancelar si no podrá atender.
- `/negocio/entregas`: escribir el código que muestra el cliente para marcar
  la reserva como entregada. Pedir el código a la cuenta `CLIENT`
  correspondiente.
- `/negocio/ofertas`: crear, editar, pausar y reponer stock de ofertas.
- `/negocio/perfil`: datos y horarios del establecimiento.

## Administrador (`ADMIN`)

| Correo | Nombre | Acceso |
|---|---|---|
| `admin@recome.test` | Administrador ReCome | `/admin/dashboard` |

Qué probar como admin:

- `/admin/negocios`: revisar y aprobar o rechazar comercios.
- `/admin/ofertas` y `/admin/reservas`: supervisión de solo lectura (sin
  códigos de recojo).
- `/admin/dashboard`: contadores generales.

## Ruta rápida de prueba (10 minutos)

1. Entra como **cliente** `ana.torres@recome.test` → `/cliente/reservas` →
   abre la reserva **confirmada** y copia su código de recojo.
2. Cierra sesión y entra como el comercio de esa reserva (por ejemplo
   `manzanapata@recome.test` si es el turrón) → `/negocio/entregas`.
3. Escribe el código del paso 1 y valida. La reserva pasa a **entregada**.
4. Vuelve a entrar como Ana y comprueba el cambio y el evento en el detalle.
5. Entra como `admin@recome.test` → `/admin/reservas` para ver la reserva
   actualizada en la supervisión global.

## Notas

- Las reservas demo se crean con las RPC reales: respetan stock, roles y
  estados. Si quieres regenerarlas:
  `node supabase/seed/demo.mjs --reset`.
- Si un cliente ya tiene reservas, el seed lo omite (es idempotente).
- Para borrar todas las cuentas y datos `@recome.test`, ejecuta
  `supabase/seed/limpiar-datos-prueba.sql` en el SQL Editor de Supabase.
- El historial reutiliza las ofertas vigentes para que siga visible sin la
  política de la Fase 6; por eso una reserva entregada o vencida puede mostrar
  una fecha de recojo futura.
- Para cambiar la contraseña de las cuentas nuevas, define
  `RECOME_SEED_PASSWORD` antes de ejecutar el seed. Las cuentas ya creadas
  conservan la contraseña anterior.
