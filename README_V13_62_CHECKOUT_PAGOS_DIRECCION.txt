ThinkStore V13.62 · Checkout pagos + datos de entrega

MEJORAS
- Confirmar pedido queda desactivado para Pago Móvil y Zelle hasta tener:
  * comprobante cargado
  * referencia de pago
  * monto automático disponible
- Efectivo y Punto de venta no requieren comprobante ni referencia.
- USDT permanece visible pero no permite confirmar todavía.
- Monto automático:
  * Pago Móvil: total convertido a bolívares con la tasa oficial disponible.
  * Zelle: total USD automático.
  * Punto de venta: muestra referencia USD/Bs, sin bloquear ni exigir comprobante.
- Resumen de pedido:
  * siempre muestra total USD
  * para métodos en bolívares muestra también equivalente en Bs
- Estado dinámico debajo de Confirmar pedido indica exactamente qué falta.
- Cuadro de comprobante corregido para no salirse del margen.
- C.I./RIF, teléfono y dirección son tarjetas editables desde el checkout.
- Delivery local:
  * botón "Usar ubicación actual"
  * guarda latitud, longitud, precisión aproximada y enlace de mapa en la sesión del cliente
  * el punto GPS se incorpora a la información del pedido
- buildOrder respeta persist=false para evitar pedidos locales fantasma si falla Supabase.
- Un fallo posterior al crear el pedido al subir el comprobante ya no convierte falsamente
  un pedido guardado en "pedido no confirmado".
- Stepper y WhatsApp usan tsCartItems() en vez de window.cart para evitar confundir
  el carrito con el elemento HTML #cart.

NOTA GPS
La V13.62 captura el punto GPS de entrega cuando el cliente lo autoriza.
No realiza seguimiento continuo en tiempo real del cliente.

SQL
No requiere SQL adicional.
Se conservan los SQL anteriores para las funciones Pre-Owned/Editor de productos.
