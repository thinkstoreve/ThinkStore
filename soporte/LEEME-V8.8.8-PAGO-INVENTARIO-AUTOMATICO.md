# ThinkStore Soporte V8.8.8

Flujo nuevo:

1. En **Gestionar reparación**, busca y guarda los repuestos que se usarán.
2. Los repuestos quedan **reservados**, pero el stock físico todavía no baja.
3. App Ventas puede registrar abonos sin tocar inventario.
4. Cuando App Ventas completa el saldo y marca la reparación **Cobrado/Pagado**, el proceso es atómico:
   - valida stock,
   - descuenta los repuestos pendientes,
   - registra los movimientos de inventario,
   - cambia `payment_status` a `Cobrado`,
   - registra el pago,
   - genera la Nota de Entrega.
5. Si falta stock, el cobro final no se confirma hasta corregirlo.
6. Si una pieza ya fue descontada con el flujo antiguo, no se vuelve a descontar.

Ejecutar primero, en el Supabase de Soporte y en este orden:

- `SQL-SOPORTE-V8.8.8-01-ORDEN-REPUESTOS.sql`
- `SQL-SOPORTE-V8.8.8-02-GUARDAR-REPUESTOS.sql`
- `SQL-SOPORTE-V8.8.8-03-CONSUMIR-AL-PAGO.sql`
- `SQL-SOPORTE-V8.8.8-04-PAGO-ATOMICO.sql`
