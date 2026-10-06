# ThinkStore Main V14.84 · Caja de Servicio Técnico

Base oficial: ZIP entregado por el usuario `ThinkStore-main (9)(1).zip`.

## App Ventas
- Nueva pestaña Reparaciones.
- Busca órdenes reales de Servicio Técnico.
- Registra abonos y pago total desde caja.
- Métodos: Efectivo USD/Bs, Pago Móvil, Zelle, transferencias USD/Bs, POS, EUR, USDT y Otro.
- Registra referencia, moneda y monto recibido en la nota del evento.
- Resumen diario unificado Tienda + Servicio Técnico.
- Distribución por método de pago, porcentaje y moneda.
- Saldo pendiente por reparación.

## Nota de Entrega
- Al marcar la reparación como pagada, genera Nota de Entrega con el mismo diseño de las ventas.
- Se envía automáticamente al correo del cliente mediante Resend.
- Se puede volver a visualizar, imprimir o guardar en PDF.
- Se puede reenviar desde App Ventas.
- La nota incluye orden, cliente, equipo, serial/IMEI, trabajo/reparación, repuestos consumidos, garantía, método y referencia de pago.

## Integración
- Los pagos actualizan `service_orders`.
- El trigger existente genera `service_payment_events`; Enterprise puede auditar los cobros por fecha.
- No se crea una venta de producto falsa.
- No requiere migración SQL nueva.
- Requiere en Netlify Main las variables de conexión al Supabase de Soporte:
  `SUPPORT_SUPABASE_URL` y `SUPPORT_SUPABASE_SERVICE_ROLE_KEY`.
