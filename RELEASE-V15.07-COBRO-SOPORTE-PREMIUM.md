# ThinkStore V15.07 — Cobro de Servicio Técnico Premium

Base: V15.06 `CLIENTES-SOPORTE-WHATSAPP`.

## Correcciones
- Se corrige el botón de cobro en órdenes con `quote_amount = 0`.
- Ya no sale silenciosamente cuando el saldo aparece en $0.00 por falta de total.
- En una orden sin total, el monto recibido puede convertirse en el total final al usar **Cobrar + Nota de Entrega**.
- El backend guarda primero el total final y después ejecuta el RPC atómico de cobro/inventario.
- Si el cobro falla después de definir el total, el total queda guardado y el pago puede reintentarse sin volver a escribirlo; nunca se crea un movimiento de pago ficticio.
- Las órdenes sin presupuesto permanecen visibles en el filtro de pendientes.

## Interfaz de pagos
Se simplifican los métodos a seis grupos principales:
1. Efectivo — USD / Bs.
2. Pago Móvil — Bs.
3. Zelle — USD.
4. Transferencia — USD / Bs.
5. Punto de venta — Bs.
6. Otros — USDT / EUR / Otro.

Las variantes se muestran como selector secundario, evitando botones duplicados.

## Diseño
- Logos/identificación visual para cada método.
- Tarjetas más limpias y compactas.
- Estado activo con selección visible.
- Animación de pulsación en métodos, botón Cobrar y acciones de cobro.
- Estado `Cobrando…` con indicador animado.
- El botón final muestra el monto: por ejemplo, `Cobrar $70.00 + Nota de Entrega`.
- En órdenes sin total, `Total reparación` y `Saldo pendiente` muestran `Por definir` en vez de `$0.00`.

## Base de datos
No requiere SQL nuevo.
