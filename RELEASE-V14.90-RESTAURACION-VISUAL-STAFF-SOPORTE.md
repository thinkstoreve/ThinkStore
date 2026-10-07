# ThinkStore Main V14.90 · Restauración visual Staff + Soporte

## Objetivo
Restaurar la experiencia aprobada de App Ventas para Servicio Técnico sin perder el flujo atómico V8.8.8 ni el Soporte integrado dentro del Main.

## App Ventas · Reparaciones
- Vuelve la pestaña **Reparaciones**.
- Vista alineada visualmente con el historial de Ventas de Staff.
- Filtros: Pendientes, Cobradas y Todas.
- Resumen: pendiente por cobrar, abonos registrados y cobradas.
- Modal de cobro estilo App Ventas.
- Acciones diferenciadas:
  - **Registrar abono**.
  - **Marcar pagado + Nota de Entrega**.
- Métodos recuperados: Efectivo USD/Bs, Pago Móvil, Zelle, Transferencia USD/Bs, Punto de venta Bs, EUR, USDT y Otro.
- Pagos Bs usan BCV verificado.
- EUR/Otro requieren equivalente USD explícito para proteger el saldo de la reparación.
- La Nota de Entrega se habilita al completar el saldo y no cambia por sí sola el estado técnico ni marca el equipo como entregado.
- La nota incluye cliente, equipo/serial, reparación, garantía, repuestos, total, método y referencia.

## Inventario / pago atómico
Se conserva V8.8.8:
- Guardar repuestos = reservar, no descontar.
- Abonos parciales no consumen inventario.
- Pago final consume repuestos en la misma transacción.
- Si falta stock, el pago final no se confirma.
- Evita doble descuento de repuestos.

## Soporte
- Continúa integrado en `/soporte/` dentro del Main.
- Se oculta completamente el badge flotante **Online · sincronizado / Instalar**.
- La cola offline y sincronización siguen funcionando en segundo plano.
- Cache de Soporte actualizado a v8.8.9 para evitar cargar el indicador antiguo.

## Despliegue
No requiere SQL nuevo si los 4 SQL de Soporte V8.8.8 ya fueron ejecutados.
Reemplazar el Main completo y hacer Commit + Push mediante GitHub Desktop.
