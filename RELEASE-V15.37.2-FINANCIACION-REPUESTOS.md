# ThinkStore V15.37.2 — Financiación desde repuestos preparados

## Corrección
El módulo de reparación financiada de App Ventas puede utilizar el total de los repuestos reservados y con precio de venta configurado como presupuesto de la reparación cuando aún no hay cotización definida desde Servicio Técnico.

Caso ejemplar: un Back Cover reservado por USD 40 permite guardar una inicial menor que USD 40 y una fecha de vencimiento. En el mismo guardado de condiciones se fija el presupuesto en USD 40 para esa orden, sin registrar pagos ni consumir inventario y **sin** modificar el estado de aprobación técnica de la cotización.

## Validaciones preservadas
- Cliente registrado, identificado, correo confirmado y ficha completa en la base principal.
- La orden debe estar activa, con total y saldo pendientes en USD.
- No se puede financiar si hay repuestos sin precio, cargos adicionales pendientes de consolidación, o la orden está pagada/cancelada.
- Bloqueo de cambios concurrentes en la orden mediante `updated_at`.
- Guardar las condiciones no registra ingresos, movimientos de inventario ni altera el estado de pago.
- El descuento y el importe total son calculados nuevamente en el servidor.

## Archivos modificados
- `staff/repairs.js` — interfaz, confirmación y mensaje del total automático.
- `staff/index.html` y `staff/sw.js` — versión de recursos V15.37.2.
- `netlify/functions/staff-repairs.js` — confirmación del total de repuestos y financiación en una sola actualización del registro de la orden.
- `tests/staff-financing-visibility.test.js` y `tests/staff-financing-auto-parts.test.js` — validación automatizada de los escenarios.

## Despliegue obligatorio por GitHub / Netlify Git
Actualizar los archivos dentro de sus rutas indicadas en la rama `main` y dejar que Netlify genere el build de las funciones de servidor. **No** utilizar el ZIP como simple drag-and-drop en Netlify: ese modo no garantiza la compilación de Netlify Functions.

El parche contiene solo los archivos modificados. La copia completa está basada en el repositorio ZIP `ThinkStore-main (3)(1).zip` enviado por el usuario, con las correcciones V15.37.1 integradas anteriormente.

**Pruebas locales**: 24/24 `node --test tests/*.test.js`. No se ha ejecutado contra las bases productivas ni desplegado remotamente.
