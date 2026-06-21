ThinkStore Marketing Profesional

Incluye:
- Nueva pestaña Marketing en el Dashboard administrador.
- Plantilla premium con logo ThinkStore limpio.
- Envío real con Resend desde Netlify Function: netlify/functions/send-campaign.js
- Audiencias: todos los clientes, clientes con pedidos, correo de prueba.
- Vista previa de campaña antes de enviar.
- Preparado para historial de campañas si existe tabla marketing_campaigns.

Variables requeridas en Netlify:
- RESEND_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- THINKSTORE_ADMIN_SECRET y/o THINKSTORE_ADMIN_CODE

Recomendación: usar un código único para las variables admin, no palabras comunes.
