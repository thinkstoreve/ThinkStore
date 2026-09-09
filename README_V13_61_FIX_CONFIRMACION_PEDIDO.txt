ThinkStore V13.61 · Fix confirmación de pedido

CAUSA
- ts-fx.js usaba (window.cart || []).reduce(...).
- Como existe un elemento HTML con id="cart", el navegador puede exponer window.cart como ese elemento DOM.
- Un elemento DOM no tiene .reduce(), por eso aparecía:
  (g.cart || []).reduce is not a function
- El error ocurría DESPUÉS de guardar el pedido en Supabase, durante el refresco visual del carrito.
- Por eso el sistema mostraba primero un mensaje falso de fallo y luego el modal correcto de pedido creado.

CORRECCIÓN
- script.js expone window.tsCartItems() para obtener siempre el array real del carrito.
- ts-fx.js usa ese getter seguro y valida Array.isArray().
- El flujo checkout ahora distingue entre:
  1. fallo antes de guardar en Supabase = pedido NO confirmado
  2. error posterior (correo/UI/WhatsApp/render) = pedido YA confirmado
- Una vez Supabase confirma el pedido, nunca vuelve a mostrarse "No se ha confirmado la compra".
- Guardado local idempotente para evitar duplicados si una acción posterior falla.
- Cache busting: ts-fx.js?v=13.61 y script.js?v=13.61.

SQL
No requiere SQL adicional.
