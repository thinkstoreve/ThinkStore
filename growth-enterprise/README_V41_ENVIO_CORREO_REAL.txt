ThinkStore V41 - Envío real de correos

Se agregó una función de Netlify para enviar correos reales desde los botones:
- Pedidos > Correo
- Preórdenes > Enviar estatus

Para activarlo en Netlify:
1. Crea una cuenta en Resend.com.
2. Verifica tu dominio thinkstore.com.ve o usa un remitente autorizado.
3. En Netlify > Site configuration > Environment variables agrega:
   RESEND_API_KEY = tu API key de Resend
   FROM_EMAIL = ThinkStore <notificaciones@thinkstore.com.ve>
   REPLY_TO = ventas@thinkstore.com.ve
4. Vuelve a desplegar el ZIP.

Si RESEND_API_KEY no está configurado, el sistema abre el correo manualmente como respaldo.
