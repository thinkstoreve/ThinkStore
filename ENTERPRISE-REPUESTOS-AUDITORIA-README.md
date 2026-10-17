# Enterprise · Trazabilidad de repuestos (predeploy)

Esta actualización añade un desglose **de solo lectura** de los repuestos consumidos en cada orden.

- Utiliza los registros `service_part_movements` y `service_parts` de Soporte.
- Prioriza el costo histórico registrado en el movimiento. Si no existe, indica que el costo actual de catálogo es una estimación y **no recalcula rentabilidad histórica**.
- El margen solo se muestra si el movimiento tiene precio de venta explícito; no se presume que costo o precio de catálogo sean el cobro real al cliente.
- No crea automáticamente compras, traspasos, salidas de Caja Chica ni gastos; se requiere vinculación verificable de compra y origen de fondos para automatizar.
- No altera los cálculos históricos del servidor ni los movimientos anteriores.
- Verificar que la pestaña de Tesorería incluya el contenedor `treasury` y probar botones en navegador antes de publicar.
- Diferencias históricas de $40 y $0,14 continúan pendientes de conciliación.
