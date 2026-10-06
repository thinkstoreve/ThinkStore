# ThinkStore Main V14.83

Base exclusiva: `ThinkStore-main (9)(1).zip` entregado por el usuario.

## Enterprise V10.13
- Corrige la publicación de `enterprise-finance` y evita wrappers frágiles para las funciones Enterprise.
- Resumen financiero real con cobros, costos, utilidad distribuible, cuentas por cobrar, socios y obligaciones.
- Gráficas de cobros vs costos, origen de ingresos y reparto.
- Métodos de pago con porcentaje, fuente y moneda asociada.
- Pestaña Ventas con pedidos reales, canales online/presencial y métodos de pago.
- Pestaña Servicio Técnico con órdenes, cobros, pendientes, costos y métodos de pago.
- Mantiene Tesorería & Socios, Conciliación y Auditoría semanal.

## App Ventas / Staff V14.4
- Acceso directo a nueva venta.
- Métodos: Efectivo USD/Bs, Pago Móvil, Zelle, Transferencia USD/Bs, Punto de Venta, EUR, USDT y Otro.
- Nueva pestaña Servicio para registrar cobros y abonos de reparaciones existentes.
- El cobro actualiza `service_orders`; el trigger existente genera `service_payment_events`, por lo que Enterprise lo reconoce sin duplicar ingresos.
- No requiere una migración SQL nueva.

## Requisitos de entorno
El Supabase principal usa las variables ya existentes. Para Servicio Técnico en Enterprise/App Ventas el sitio principal debe conservar `SUPPORT_SUPABASE_URL` y `SUPPORT_SUPABASE_SERVICE_ROLE_KEY` (o `SUPPORT_SUPABASE_SECRET_KEY`) en Netlify.
