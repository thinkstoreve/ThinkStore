ThinkStore Soporte V8.7
Centro de notificaciones + correo interno

PANEL
- Campana con contador.
- Módulo Notificaciones.
- Filtros: citas, mensajes, cotizaciones, reseñas y estados.
- Alertas cada 10 segundos.
- Marcar una o todas como leídas.

EVENTOS AUTOMÁTICOS
- Nueva cita web / cita modificada.
- Mensaje o pregunta del cliente.
- Reseña del cliente.
- Cotización aprobada.
- Equipo listo para entregar.
- Cambios de estado.

CORREO
- Función programada cada 5 minutos.
- Envía un resumen de novedades a soporte@thinkstore.com.ve.
- Variable opcional: SUPPORT_NOTIFICATION_TO
- Usa RESEND_API_KEY y FROM_SOPORTE_EMAIL ya configurados.

SEGUIMIENTO
- Al marcar la orden Entregado, el cliente puede dejar 1–5 estrellas y comentario.
- La reseña llega al Centro de Notificaciones.

PASO OBLIGATORIO
Ejecutar MIGRACION-SOPORTE-V8.7-NOTIFICACIONES.sql
en Supabase -> ThinkStore-Soporte.
