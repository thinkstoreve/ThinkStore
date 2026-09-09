ThinkStore V50 Enterprise Final - Checklist de Deploy

Infraestructura ya preparada:
- RESEND_API_KEY en Netlify.
- SUPABASE_URL en Netlify.
- SUPABASE_SERVICE_ROLE_KEY en Netlify.
- THINKSTORE_ADMIN_SECRET en Netlify.
- Dominio thinkstore.com.ve verificado en Resend.
- DNS Resend + Zoho funcionando.

Módulos incluidos:
1. Dashboard Administrador Enterprise
   - Clientes reales desde Supabase.
   - Pedidos reales desde Supabase.
   - Preórdenes y comprobantes.
   - Estadísticas principales.
   - Cambio de estado seguro por Netlify Function.

2. Estados de pedidos
   - Pedido recibido.
   - Pago por verificar.
   - Pago verificado.
   - Preparando pedido.
   - Comprando proveedor.
   - En tránsito.
   - Disponible para entrega.
   - Enviado.
   - Entregado.
   - Cancelado.

3. Correos automáticos
   - pedidos@thinkstore.com.ve para pedidos.
   - preordenes@thinkstore.com.ve para preórdenes.
   - soporte@thinkstore.com.ve para soporte/cancelados.
   - ventas@thinkstore.com.ve para ventas.

4. Historial de compras cliente
   - Mis pedidos.
   - Estado visual.
   - Historial.
   - Nota de entrega.

5. Nota de entrega premium
   - Logo ThinkStore.
   - Datos de cliente.
   - Productos.
   - Método de pago/envío.
   - QR/enlace de seguimiento.

Antes de subir:
- No cambies DNS ni Resend.
- Verifica que las variables en Netlify existan con los nombres exactos.
- Sube este ZIP una sola vez como deploy grande.

Después de subir:
1. Crear cliente de prueba.
2. Hacer pedido de prueba.
3. Revisar Supabase > pedidos y pedido_items.
4. Entrar al Dashboard Admin.
5. Cambiar estado del pedido.
6. Confirmar correo automático.
7. Revisar Historial / Mis Pedidos.
8. Generar nota de entrega.
