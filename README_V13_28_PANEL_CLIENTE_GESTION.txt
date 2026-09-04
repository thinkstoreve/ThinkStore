ThinkStore V13.28 · Panel cliente gestión completa

- Edición de datos personales directamente desde el panel cliente.
- Mis reparaciones muestra detalle ampliado de citas/revisiones.
- Mis pedidos permite abrir el detalle completo de cada pedido.
- La Nota de Entrega se habilita al aprobar el pedido (Pago verificado o etapa posterior).
- El cliente puede cambiar la modalidad de entrega mientras el pedido aún lo permita.
- En estado En tránsito, el cambio se permite únicamente si todavía no existe número de guía.
- Una vez asignada guía, enviado, disponible para entrega, entregado o cancelado, el cambio queda bloqueado.
- Modalidades: Retiro en tienda, Delivery Caracas y Envío nacional por MRW / Zoom / TEALCA.
- Nueva Netlify Function segura client-order.js: valida la sesión y que el pedido pertenezca al cliente.
- No requiere SQL adicional.
