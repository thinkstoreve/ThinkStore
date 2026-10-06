# ThinkStore Main V14.87

App Ventas finaliza la reparación y el inventario en una sola operación.

- Abonos parciales: actualizan el saldo, sin descontar repuestos.
- Pago final: cambia Soporte a **Cobrado** y descuenta automáticamente los repuestos reservados.
- La operación de pago + inventario es atómica en Supabase: si el stock no alcanza, el cobro final no se confirma.
- Se mantiene el historial de pagos, Nota de Entrega, correo al cliente, auditoría y métodos de pago.
- App Ventas informa cuántas unidades fueron descontadas al completar el cobro.

Requiere la migración SQL de Soporte V8.8.8 y Soporte V8.8.8 desplegado.
