# ThinkStore · Plantillas WhatsApp · 30/10/2026

Se añade el botón «Plantillas de WhatsApp» en App Ventas → WhatsApp → conversación. Consulta en Meta las plantillas de texto aprobadas, muestra una vista previa y solicita los datos de cada variable. El envío queda registrado en el historial y en la tabla de control para evitar duplicados.

Para promociones, el cliente autoriza escribiendo PROMOCIONES al WhatsApp de ThinkStore. BAJA detiene los avisos y revoca la autorización promocional. ACTIVAR corresponde a los avisos de servicio existentes. El botón de envío muestra los requisitos pendientes; seleccionar una plantilla no envía mensajes. Esta entrega permite envío individual, no difusión masiva ni campañas programadas.

Los eventos de órdenes, citas, cambios de reparación y abonos usan la integración existente. Se confirmó que las cuatro variables de activación están en true en producción y que el número y cuenta corresponden a ThinkStore. Se creó en Supabase principal la tabla whatsapp_notification_outbox mediante la migración V15.38 existente, que faltaba. La tabla tiene RLS y no permite acceso anónimo ni desde clientes autenticados: las funciones del servidor registran los envíos.

No se importan autorizaciones ni se envían avisos históricos. Los eventos futuros requieren el consentimiento registrado del destinatario. El panel «Estado del canal y los avisos» permite comprobar el canal, la configuración y la tabla de envíos. La automatización de financiación conserva sus restricciones y programación existentes.

Validación: 262 pruebas automatizadas aprobadas antes de publicar. No se enviaron mensajes reales de prueba a clientes durante la implementación. Los archivos previos se compararon contra main 3a52a34 para preservar los cambios publicados de finanzas y abonos. Inventory, Think Care y Enterprise no se modificaron.
