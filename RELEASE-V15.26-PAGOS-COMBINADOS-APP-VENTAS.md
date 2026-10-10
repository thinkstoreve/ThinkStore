# ThinkStore Main V15.26 · Pagos combinados App Ventas

## App Ventas · Reparaciones
- Permite seleccionar entre 1 y 3 métodos de pago en una misma reparación.
- Al seleccionar 2 métodos, el primer monto se escribe manualmente y el segundo recibe automáticamente el saldo restante.
- Al seleccionar 3 métodos, los dos primeros montos se escriben manualmente y el tercero recibe automáticamente el saldo restante.
- Compatible con Efectivo USD/Bs., Pago Móvil, Zelle, Transferencia USD/Bs., Punto de venta Bs., USDT, EUR y Otro.
- En bolívares, el saldo automático usa la tasa BCV vigente y verificada.
- EUR/Otro mantienen el monto original manual y calculan automáticamente el equivalente USD del último tramo.
- Cada referencia de pago se conserva por método.
- El backend valida el pago completo antes de procesarlo y registra cada tramo por separado en el historial de abonos.
- Los repuestos reservados se consumen únicamente al completar el último tramo del saldo, conservando el cierre V8.8.8.
- La Nota de Entrega muestra `Pago combinado` y lista los métodos/referencias utilizados.

## App Ventas · Ventas de productos
- El componente existente de Pago mixto queda limitado a máximo 3 métodos.
- El último método se completa automáticamente al escribir el primer monto o los dos primeros montos.
- Se mantiene la validación BCV del servidor para pagos en bolívares.

## Seguridad / datos
- No se agrega una tabla nueva ni se modifica el esquema de Supabase.
- No requiere SQL adicional.
- Se conserva el historial individual de pagos para Enterprise y Caja.

## Caché
- Staff actualizado a caché `V15.26.0`.
