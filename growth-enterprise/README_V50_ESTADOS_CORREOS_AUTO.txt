ThinkStore V50 - Estados inteligentes + correos automáticos

Incluye:
- Estados oficiales de pedido: Pedido recibido, Pago por verificar, Pago verificado, Preparando pedido, Comprando proveedor, En tránsito, Disponible para entrega, Enviado, Entregado y Cancelado.
- Dashboard admin con selector de estado actualizado.
- Sincronización segura hacia Supabase usando Netlify Function admin-update-order.
- Historial de estados preparado en order_status_history.
- Envío automático por Resend al cambiar un estado desde el dashboard.
- Remitente por departamento:
  * pedidos@thinkstore.com.ve para pedidos normales.
  * preordenes@thinkstore.com.ve para Comprando proveedor / En tránsito.
  * soporte@thinkstore.com.ve para cancelaciones o soporte.

Variables requeridas en Netlify:
- RESEND_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- THINKSTORE_ADMIN_SECRET

Recomendación:
No desplegar hasta consolidar la V50 Enterprise Final, para ahorrar créditos de Netlify.
