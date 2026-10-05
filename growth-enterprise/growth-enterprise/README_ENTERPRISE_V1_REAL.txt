ThinkStore Growth Enterprise V1 Real

Cambios aplicados:
- Nuevo módulo: Control Comercial ThinkStore.
- Panel Ejecutivo ahora intenta leer datos reales desde Supabase.
- Lectura segura de clientes, pedidos, comprobantes y productos si existen.
- No modifica Resend.
- No modifica correos de bienvenida, recuperación, pedidos ni cambios de estado.
- No modifica notas de entrega.
- No modifica el panel actual de administración de la tienda.
- No escribe en clientes, pedidos, pedido_items, comprobantes ni order_status_history.

Tablas leídas en modo seguro:
- clientes / customers
- pedidos / orders
- comprobantes / payments / payment_receipts
- productos / products / catalogo

Objetivo:
Enterprise se convierte en un panel ejecutivo y de control comercial, dejando intacto el flujo actual de ventas, clientes registrados, pedidos, preórdenes, validación de pagos, correos y notas de entrega.
