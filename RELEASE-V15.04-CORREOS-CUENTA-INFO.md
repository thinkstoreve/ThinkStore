# ThinkStore Main V15.04 · Correos de Cuenta + info@

## Cuenta de cliente
- Verificación de cuenta enviada por Resend con diseño ThinkStore.
- Recuperación de contraseña enviada por Resend con diseño ThinkStore.
- Bienvenida visual después de verificar.
- Correo de bienvenida después de verificar, una sola vez por cuenta.
- Recuperación termina en pantalla de confirmación y nuevo login.
- Login no usa las plantillas genéricas de Supabase para signup/recovery.

## info@thinkstore.com.ve
- Remitente predeterminado de Cuenta y comunicaciones generales.
- Reply-To de Cuenta y Marketing: info@thinkstore.com.ve.
- Nuevo registro genera notificación interna a info@ con datos básicos del cliente.
- La notificación interna usa Reply-To del cliente para facilitar una respuesta manual.
- Marketing y carrito abandonado usan info@ como remitente/reply-to por defecto.

## No modificado
- Servicio Técnico y seguimiento privado.
- Ventas/Pedidos.
- Staff / Caja / Reparaciones.
- Enterprise.
- BCV automático.

## Requisitos existentes en Netlify
- RESEND_API_KEY
- SUPABASE_SERVICE_ROLE_KEY (o MAIN_SUPABASE_SERVICE_ROLE_KEY / THINKSTORE_SUPABASE_SERVICE_ROLE_KEY)

Opcionales:
- FROM_INFO_EMAIL = ThinkStore Cuenta <info@thinkstore.com.ve>
- REPLY_TO_INFO = info@thinkstore.com.ve
- INFO_INBOX_EMAIL = info@thinkstore.com.ve

No requiere SQL nuevo.
