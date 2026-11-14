# Segunda entrega SRS: catálogo y filtros

14/11/2026. RF-005 y parte de RF-004.

El catálogo permite combinar nombre, categoría, tipo de negocio, zona/distrito, precio mínimo/máximo, fecha y horario de recojo. El rango horario se interpreta en America/Lima (UTC−5) y muestra ofertas cuyo intervalo de recojo coincide con el elegido. La fecha sola abarca todo ese día; las horas requieren fecha y un rango creciente. Los extremos que solo se tocan no coinciden.

Los filtros se guardan en la URL y se conservan al cambiar categoría o página. Se muestran 24 resultados por página, ordenados por fin del recojo e ID. Solo aparecen ofertas activas, no archivadas, de negocios aprobados, con stock positivo y vigentes. Los datos anteriores sin fecha límite explícita se identifican como tales y siguen limitados por su fin de recojo.

Las tarjetas y la ficha muestran los días naturales restantes hasta la fecha límite según Cusco. Se mantienen precio original, precio reducido, porcentaje de descuento, stock y horario. La búsqueda sin resultados permite limpiar filtros; los rangos inválidos muestran mensajes.

## Descuento

El PDF establece descuento máximo del 50 %, no mínimo. Se valida en el formulario/Server Action y mediante trigger de PostgreSQL al crear ofertas, cambiar precios o publicarlas. Migración aplicada en Supabase: 20261114130000_srs_offer_discount.sql. El consolidado también la incluye.

No se modificaron automáticamente precios ni reservas existentes. Ofertas anteriores con descuento mayor que 50 % deben corregirse al editar precios o republicar; las devoluciones de stock y el historial siguen funcionando. Los seeds ajustan los precios nuevos al límite, sin ejecutar un reinicio de datos existentes.

## Verificación

- npm run test:catalog: 12 comprobaciones de filtros, zona horaria, fechas, rangos, conservación de URL y descuentos.
- npm run test:srs: 36 comprobaciones PostgreSQL, incluidas tres del nuevo trigger y compatibilidad del stock.
- npm run verify:remote: 36 comprobaciones reales con datos temporales propios y limpieza posterior; incluye rechazo de descuento superior al 50 %.
- TypeScript, lint y build de producción con Webpack correctos.
- Interfaz local: combinación Panadería + Wanchaq + máximo S/ 8 + 15/11/2026 de 18:00 a 19:00 devolvió tres ofertas; máximo S/ 1 devolvió estado vacío. Diseño revisado a 360 px.

No declara completo todo RF-004: queda revisar como entrega posterior la obligatoriedad de fecha límite/ingredientes y el control del recojo dentro del horario de atención del negocio. La fase 7 continúa pendiente.
