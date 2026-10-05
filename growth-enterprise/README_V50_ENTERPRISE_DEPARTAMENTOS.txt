ThinkStore V50 Enterprise - Correos por departamento

Esta versión deja preparado el envío profesional por departamento usando la función Netlify netlify/functions/send-email.js.

Departamentos configurados:
- pedidos: ThinkStore Pedidos <pedidos@thinkstore.com.ve>
- preordenes: ThinkStore Preórdenes <preordenes@thinkstore.com.ve>
- soporte: ThinkStore Soporte <soporte@thinkstore.com.ve>
- ventas: ThinkStore Ventas <ventas@thinkstore.com.ve>

Uso recomendado:
- Supabase Auth: soporte@thinkstore.com.ve para registro, recuperación y seguridad de cuenta.
- Netlify Function + Resend: pedidos@ para pedidos, preordenes@ para preórdenes, ventas@ para mensajes comerciales.

Variables necesarias en Netlify:
RESEND_API_KEY=tu_api_key_de_resend

Opcionales si deseas sobrescribir remitentes:
FROM_PEDIDOS_EMAIL=ThinkStore Pedidos <pedidos@thinkstore.com.ve>
FROM_PREORDENES_EMAIL=ThinkStore Preórdenes <preordenes@thinkstore.com.ve>
FROM_SOPORTE_EMAIL=ThinkStore Soporte <soporte@thinkstore.com.ve>
FROM_VENTAS_EMAIL=ThinkStore Ventas <ventas@thinkstore.com.ve>
REPLY_TO_PEDIDOS=pedidos@thinkstore.com.ve
REPLY_TO_PREORDENES=preordenes@thinkstore.com.ve
REPLY_TO_SOPORTE=soporte@thinkstore.com.ve
REPLY_TO_VENTAS=ventas@thinkstore.com.ve

Importante:
Para que Resend permita enviar desde @thinkstore.com.ve, el dominio debe estar verificado en Resend con SPF/DKIM propios de Resend. Zoho ya quedó configurado para buzones, pero Resend requiere su verificación separada.
