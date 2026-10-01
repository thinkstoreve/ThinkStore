# V14.44 · Invitación de Soporte con marca ThinkStore

Las invitaciones enviadas desde Roles de Soporte utilizan ahora Resend y la plantilla ThinkStore incluida, con logo oficial, rol asignado y botón Crear mi contraseña.

Remitente: ThinkStore <info@thinkstore.com.ve>
Respuestas: info@thinkstore.com.ve
Asunto: Tu invitación al equipo ThinkStore

Activación:
1. Desplegar el paquete nuevo. Para el sitio independiente de Soporte, publicar la carpeta soporte con sus funciones, como en las versiones anteriores.
2. En las variables del servidor del sitio de Soporte, configurar RESEND_API_KEY con una clave de Resend autorizada a enviar desde el dominio thinkstore.com.ve. Se admite también la variable heredada RESEND_APY_KEY. No pegar claves en HTML ni en el navegador.
3. Confirmar en Resend que thinkstore.com.ve esté verificado y autorizado para envío. La configuración SMTP de Supabase no cambia el remitente de este nuevo flujo.
4. Conservar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de Soporte, y la URL de redirección autorizada https://soporte.thinkstore.com.ve/index.html (o SUPPORT_INVITE_REDIRECT_URL si ya se personalizó).
5. Requiere la migración V14.38 de permisos previamente aplicada. Este cambio de correo no requiere SQL adicional.

Supabase genera el enlace de invitación; Resend envía el mensaje. No se usa el correo genérico de Supabase como alternativa. Si falla la configuración o el envío, el panel indica que el perfil se guardó pero el correo no se envió o no pudo confirmarse. Para cuentas ya registradas, usar el acceso o recuperación de contraseña existentes. El cambio cubre la invitación del panel de Soporte, no los demás mensajes de Auth ni invitaciones realizadas manualmente desde Supabase Dashboard.

No se enviaron invitaciones reales ni se desplegó el sitio en esta entrega. Pasaron 50 pruebas automatizadas, incluidas las de permisos, remitente, HTML escapado, ausencia de enlaces privados en auditoría y errores del proveedor. No se ha confirmado entrega real en bandeja de entrada.

Referencia oficial del enlace generado para envío personalizado:
https://supabase.com/docs/reference/javascript/auth-admin-generatelink
