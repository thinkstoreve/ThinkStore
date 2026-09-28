ThinkStore V14.27 · Servicio Técnico / flujo completo

Cambios principales
- envio-regiones.html ahora valida el formulario, registra la solicitud en Soporte Think y luego abre WhatsApp con el mensaje prellenado.
- Nueva Netlify Function: /.netlify/functions/region-service-request
- Las solicitudes desde regiones se guardan directamente en SUPPORT Supabase dentro de service_orders con status "Solicitud web".
- El panel de soporte reconoce "Solicitud web" y puede pasarla luego a "Recibido" cuando el equipo llegue físicamente.
- Enterprise ya puede ver estas solicitudes porque enterprise-support consume service_orders del Supabase de soporte.
- Envío opcional de correo de confirmación usando RESEND_API_KEY.
- Número público de WhatsApp centralizado en service-public-config.js.
- servicio-precios.html pasa dispositivo, modelo, precio, SKU y stock a agenda-soporte.html.
- agenda-soporte.html precarga los datos provenientes de Precios y Repuestos y permite editarlos.
- AirPods añadido como categoría de agenda.
- Seguimiento de soporte reconoce el estado inicial "Solicitud web".

Variables requeridas en Netlify
- SUPPORT_SUPABASE_URL
- SUPPORT_SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY (opcional para correo de confirmación)
- FROM_SUPPORT_EMAIL (opcional)
- REPLY_TO_SUPPORT (opcional)

WhatsApp
Editar service-public-config.js para cambiar el número técnico:
window.THINKSTORE_SERVICE_CONFIG={ whatsapp:'584120142898' };
Usar formato internacional sin + ni espacios.

Flujo
Cliente -> envio-regiones.html -> region-service-request -> SUPPORT Supabase/service_orders -> Panel Soporte + Enterprise -> WhatsApp técnico.
