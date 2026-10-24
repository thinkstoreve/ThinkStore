# WhatsApp de ventas · interfaz y notificaciones

Bandeja renovada con lista de conversaciones, avatares, búsquedas y filtros Todos / No leídos / Equipo / Bot. Burbujas, fechas y estados de entrega; historial anterior por páginas. En teléfonos, lista y chat se muestran en pantallas separadas con botón de regreso. Los borradores se conservan en memoria al cambiar de conversación y se vacían al salir de sesión.

App Ventas y Administración muestran un contador de mensajes personales, un panel de pendientes y avisos de nuevos mensajes. Sonido y avisos del navegador se activan desde controles explícitos. No se solicitan permisos automáticamente ni se muestran cuerpos de mensajes en los avisos externos.

Los avisos funcionan con la aplicación abierta. Se consulta aproximadamente cada ocho segundos en primer plano; las pestañas de fondo pueden ser ralentizadas por el navegador. No es Web Push y no promete alertas con la aplicación cerrada.

Las lecturas se sincronizan por usuario y por ID de mensaje. No cambian estados de Meta, contactos, asignaciones, solicitudes, órdenes o cobros. Una lectura no afecta a otro integrante del equipo y no incluye mensajes que todavía no se habían consultado. La pestaña oculta y la lista móvil sin chat abierto no marcan mensajes como leídos.

Se conservan la atención humana inicial, el bot asignado por el equipo, los siete tipos de solicitud, la ventana de respuesta y la prevención de envíos duplicados. Los fallos de conexión muestran un estado pendiente, nunca un cero confirmado.

## Validación
32 pruebas automatizadas: `node --test tests/whatsapp-inbox.test.js tests/whatsapp-integral-webhook.test.js tests/whatsapp-service-events.test.js tests/requests-integral.test.js`.

`tests/whatsapp-reads-rollback.sql` valida aislamiento entre usuarios y chats, alcance de lecturas, mensajes recibidos durante una consulta y permisos RPC; revierte sus registros y no envía mensajes externos.

Migración MAIN aditiva `MIGRACION-WHATSAPP-LECTURAS-20261024.sql`. Las tablas de mensajes y contactos existentes conservan sus registros.
