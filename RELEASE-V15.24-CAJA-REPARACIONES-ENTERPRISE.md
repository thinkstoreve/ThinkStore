# ThinkStore V15.24 · Correcciones antes del deploy

- Caja Staff: ya no toma automáticamente una caja abierta de un día anterior como apertura del día actual. Evita arrastrar fondos históricos como el supuesto fondo de $50.
- Reparaciones Staff: el listado y los KPI de Pendientes por cobrar leen el total automático de repuestos reservados aunque `quote_amount` todavía esté en cero.
- Reparaciones Staff: al añadir/quitar repuestos o cargos, los KPI y la fila se actualizan inmediatamente.
- Enterprise: conservar sesión válida al recargar la página o pulsar Actualizar. El cierre queda reservado para el botón Salir o una sesión realmente inválida.
- Caja Chica Enterprise: tarjetas más compactas, acciones premium, iconos SVG pequeños y logos bancarios locales con fondo transparente.
- Cache busting: Staff 15.24.0 y Enterprise 10.22.

No requiere una migración SQL nueva.
