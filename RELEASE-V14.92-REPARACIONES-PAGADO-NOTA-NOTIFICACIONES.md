# ThinkStore Main V14.92 · Reparaciones, Pagado, Nota de Entrega y Notificaciones restauradas

## App Ventas · Reparaciones
- El estado de Servicio Técnico vuelve a usar **Pagado / Pagadas**, no Cobrado / Cobradas.
- Conserva filtros Pendientes / Pagadas / Todas.
- Conserva abonos parciales y el botón **Marcar pagado + Nota de Entrega**.
- Mantiene métodos de pago USD, Bs., Zelle, Pago Móvil, transferencias, punto, EUR, USDT y Otro.
- El pago final conserva el cierre atómico V8.8.8: si falta stock reservado, el pago no se confirma.

## Nota de Entrega de Servicio Técnico
- Usa el mismo sistema visual de la Nota de Entrega de ventas normales.
- Logo ThinkStore PNG con fondo transparente.
- Sin firmas.
- Sin sello, check o ícono Pagado/Cobrado.
- Incluye orden de servicio, cliente, equipo, Serial/IMEI, reparación realizada, repuestos usados, garantía, total, método y referencia.
- Al completar el saldo se intenta enviar automáticamente por correo.
- Permite Ver / Imprimir y Reenviar al correo desde App Ventas.
- El pago no cambia automáticamente el estado técnico ni marca el equipo como entregado.

## Soporte · Notificaciones y conversación
- Restaura la pestaña **Notificaciones**.
- Muestra mensajes del cliente, citas, cotizaciones, reseñas y cambios importantes por orden.
- Restaura conversación cliente ↔ ThinkStore con burbujas tipo iMessage.
- Desde una notificación se puede abrir la conversación o la orden.
- El portal seguro de seguimiento permite al cliente responder usando el token público de la orden.
- Los enlaces de correo usan el token seguro cuando está disponible.

## Inventario y pagos
- Mantiene Guardar repuestos como reserva, sin descontar stock al guardar.
- Los abonos parciales no consumen repuestos.
- El pago final consume los repuestos reservados de forma atómica y evita doble descuento.
- Estado técnico y estado de pago siguen separados.

## Indicador de conexión
- Conserva V14.91: aparece al iniciar, sincroniza, muestra Online brevemente y se minimiza a un punto verde.
- Si queda Offline vuelve a expandirse hasta recuperar conexión.

## SQL
Esta versión no introduce una migración nueva.
- Si V8.7.1 Notificaciones/Portal Cliente ya estaba instalado, no ejecutar SQL nuevamente.
- Si V8.8.8 Pago/Inventario ya estaba instalado, no ejecutar sus 4 SQL nuevamente.
- Si Notificaciones muestra “estructura no disponible”, verificar primero que Main apunte al Supabase correcto de Soporte antes de ejecutar una migración.
