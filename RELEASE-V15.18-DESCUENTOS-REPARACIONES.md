# ThinkStore Main V15.18 · Descuentos en cobro de reparaciones

## App Ventas → Reparaciones
- Descuento porcentual (%) o monto fijo USD.
- Motivo opcional del descuento.
- Resumen: Subtotal, Descuento, Total a cobrar, Abonado y Saldo pendiente.
- El descuento queda persistido en la orden.
- No permite que el total final quede por debajo de lo ya abonado.
- Un descuento porcentual se recalcula al agregar nuevos servicios/productos.
- Un descuento fijo conserva el importe al agregar nuevos cargos.
- Quitar un cargo antes del pago recalcula subtotal, descuento y total.
- La Nota de Entrega muestra subtotal, descuento, motivo y total final.

## Requisito
Ejecutar primero MIGRACION-SOPORTE-V8.8.15-DESCUENTOS-APP-VENTAS.sql en el Supabase de Soporte.
