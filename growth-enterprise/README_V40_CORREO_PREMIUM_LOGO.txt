V40 - Correo premium ThinkStore

Cambios aplicados:
- Se agregó el logo ThinkStore dentro de assets/thinkstore-email-logo.jpeg.
- Se rediseñó el texto del correo de Pedidos y Preórdenes con formato premium.
- El correo ahora incluye cabecera ThinkStore, slogan, datos del pedido, estatus, fecha estimada y progreso del pedido.

Nota técnica:
Esta versión usa mailto para abrir el correo desde el navegador. Por seguridad, los clientes de correo no permiten insertar imágenes adjuntas automáticamente desde una web estática. El logo queda incluido en el proyecto para una futura integración con backend/Supabase Edge Function o servicio SMTP, donde sí podrá enviarse como HTML con imagen visible.
