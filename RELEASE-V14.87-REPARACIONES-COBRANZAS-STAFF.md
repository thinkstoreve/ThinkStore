# ThinkStore Main V14.87 · Reparaciones en Staff

Restablece la **gestión de cobranza de reparaciones en Staff** sin sustituir el panel técnico ni perder la base de Main V14.86.

## Staff → Reparaciones
- Panel financiero para todas las órdenes reales de Supabase de Soporte: por cobrar, cobradas y todas.
- Resumen por saldo pendiente, cobrado y abonos parciales en USD. Las cotizaciones en otra moneda no se suman indebidamente a cifras USD.
- Búsqueda de código, cliente, equipo y serial; recarga manual de órdenes.
- Detalle por orden: equipo, cliente, presupuesto, abonado, saldo pendiente, estado, historial.
- Registro autorizado de abonos en USD o bolívares con conversión BCV verificada en servidor (para transferencias, Pago Móvil y POS).
- Cobro registrado **directamente en `service_orders` del Supabase independiente de Soporte**, con comprobante, método y bitácora interna.
- Evita sobrecobros y evita que dos cajeros confirmen simultáneamente la misma cantidad mediante verificación optimista del saldo anterior.
- Requiere que el historial `service_payment_events` esté habilitado antes de cualquier nuevo cobro, para mantener contabilidad verificable en Enterprise.
- Nota de entrega imprimible al quedar cobrada y con estado listo/entregado; imprimir NO modifica el estado de la orden.
- Staff → Servicio Técnico sigue abriendo por SSO el área de recepción, diagnóstico y bitácora.
- Acceso desde menú lateral (escritorio) y barra inferior (móviles) para los roles autorizados.

## Servidor / Variables del sitio Main en Netlify
- `SUPPORT_SUPABASE_URL`: URL de proyecto **Soporte**.
- `SUPPORT_SUPABASE_SERVICE_ROLE_KEY` (o `SUPPORT_SUPABASE_SECRET_KEY`): clave **secreta** solo en Netlify, nunca en frontend.
- Mantener las variables existentes del Supabase principal para autenticación Staff.
- Desplegar mediante **Git → Netlify**, incluyendo `netlify/functions/staff-repairs.js` y los archivos `staff/repairs.js` + `staff/app.css` + `staff/index.html`.
- No necesita migración nueva SI la cobranza de Soporte (V8.2) y el historial de abonos (V8.8.5) ya están creados. Si el historial falta, no permitirá confirmar pagos hasta aplicarlo EN EL PROYECTO SUPABASE DE SOPORTE, nunca en el principal.

## Verificaciones posteriores al despliegue
1. Iniciar sesión en Staff como socio o vendedor autorizado.
2. Abrir «Reparaciones», verificar que los códigos y montos coincidan con Soporte.
3. Comprobar filtro «Por cobrar» / «Cobradas» / «Todas».
4. Registrar un abono real pequeño de una orden autorizada, con referencia y comprobación de saldo (NO usar ventas ficticias en producción).
5. Confirmar el nuevo saldo en Soporte y el evento de cobro en Enterprise.
6. Verificar que «Imprimir nota de entrega» se habilite al cobrar por completo y dejar el equipo listo, y que no cambie el estado de entrega por imprimir.

## No se modificó
Enterprise independiente, Inventory, base de datos, Caja Staff ni funciones de ventas presenciales. Todo lo previo de V14.86 permanece dentro de un ZIP completo.
