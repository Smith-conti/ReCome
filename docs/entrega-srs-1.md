# Primera entrega SRS — 14/11/2026

Flujo implementado: reservar de 1 a 5 unidades → pago simulado en 10 minutos → confirmación del comercio en 15 minutos → QR de un solo uso → entrega dentro del horario → comisión y neto simulados.

No hay cobros, pasarelas ni datos bancarios. La comisión inicial es 10 %, configurable por ADMIN en /admin/configuracion. Cada reserva conserva su tasa y horario aceptados; cambiar la oferta o la tasa no modifica esas condiciones.

## Estados y stock

- PENDING_PAYMENT: retiene stock, sin QR. Al pagar pasa a PENDING y empieza el plazo de confirmación.
- PENDING: el comercio confirma o rechaza. Solo la confirmación genera el QR.
- CONFIRMED: QR utilizable dentro del horario. El cliente puede cancelar hasta 60 minutos antes del inicio.
- DELIVERED: una sola entrega; calcula comisión redondeada a dos decimales y neto. Repetir QR produce error y no duplica importes.
- CANCELLED: impago, falta de confirmación, rechazo o cancelación. Libera stock una sola vez.
- NO_SHOW: finalizó el recojo sin entrega; libera stock y no genera comisión.

Las RPC comprueban los plazos exactos aunque todavía no haya pasado el cron de cada minuto. Una actualización manual de stock no puede reutilizar unidades retenidas. Máximo 5 reservas activas por cliente.

Las reservas anteriores conservan workflow_version=1, códigos, cantidades e historial, sin recalcular comisiones retroactivas. El flujo nuevo utiliza workflow_version=2.

## Migraciones

Aplicadas al proyecto ReCome en Supabase el 14/11/2026:

1. 20261114120000_srs_reservation_states.sql: ejecutar y confirmar por separado.
2. 20261114121000_srs_reservation_flow.sql: aplicar después de confirmar enums.
3. 20261114122000_srs_minute_cron.sql: cron de vencimientos cada minuto.

En instalaciones nuevas, supabase/consolidado.sql incluye los enums nuevos desde su creación y el flujo completo. No ejecutar el consolidado sobre una base existente. Las migraciones de tablas no son idempotentes.

## Pruebas

- Interfaz local: reserva, pago simulado, espera sin QR, aparición del QR al confirmar y cancelación de la reserva demo.
- npm run test:srs: 33 comprobaciones en PostgreSQL embebido, sin tocar Supabase. Incluye preservación de reserva anterior de ocho unidades, permisos, plazos, QR repetido, horarios, liberación de stock y límite de reservas.
- npm run verify:remote: 35 comprobaciones reales con usuarios y datos temporales identificados por UUID, limpiados al terminar. Usa .env.local y el administrador demo existente.
- npx tsc --noEmit y npm run lint: correctos.
- npm run build -- --webpack: compilación de producción correcta. Necesita acceso a Google Fonts. Turbopack presenta un fallo previo al crear un subproceso CSS en este entorno; no se cambia el comando build predeterminado.

## Prueba manual

1. npm run dev; abrir http://localhost:3000.
2. Ingresar como cliente y reservar una oferta vigente (máximo 5 unidades).
3. Abrir la reserva y pulsar Completar pago simulado. Antes de confirmar no debe aparecer QR.
4. Ingresar como propietario en otra sesión y confirmar en /negocio/reservas.
5. Volver a la reserva del cliente y mostrar el QR. En /negocio/entregas escanearlo o pegar su contenido completo.
6. La entrega solo funciona dentro del horario aceptado. Comprobar comisión y neto en /negocio/reservas. Repetir el mismo QR debe rechazarse.
7. Probar impago de 10 minutos y falta de confirmación de 15 minutos; el cron actualiza estado y devuelve stock.

El lector por cámara requiere permiso del navegador y HTTPS o localhost; dispone de entrada manual. La cámara física no forma parte de las comprobaciones automatizadas.

El seed demo se adaptó a los estados nuevos. Genera horarios e historial ficticios únicamente sobre sus propias reservas para demostrar entregas pasadas; no prueba el paso real del tiempo. No se ejecutó --reset sobre los datos existentes durante esta entrega.

## Pendiente fuera de esta entrega

Fase 7 de reportes/estadísticas y los demás requisitos del PDF no incluidos aquí. Esta entrega no declara cumplimiento total del SRS.
