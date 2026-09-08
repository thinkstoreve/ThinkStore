ThinkStore V13.44 · Ventas presenciales sin registro obligatorio

NUEVO FLUJO
1. Panel > Ventas: captura nombre, correo, documento, teléfono y dirección.
2. Se abre venta-presencial.html en una pestaña nueva.
3. Productos: categorías + buscador + únicamente inventario disponible.
4. Imagen tomada del catálogo; se asigna serial, condición, garantía,
   leyenda/modelo editable (ej. A1398), características y nota.
5. Carrito de múltiples productos.
6. Pago: Efectivo USD, Pago Móvil o Zelle con sus iconos.
   Efectivo no exige referencia. Pago Móvil/Zelle sí.
7. Forma de entrega: retiro, delivery o envío nacional.
8. Guardar en espera crea el pedido como Pago por verificar y reserva stock.
9. Confirmar pago usa la protección de pagos existente, muestra animación,
   envía correo de agradecimiento + Nota de Entrega y mantiene trazabilidad.
10. Pedidos incluye pestañas: Todos, Ventas online, Ventas presenciales.

IMPORTANTE
Antes de usar ventas presenciales sin cuenta, ejecutar:
supabase_v13_44_ventas_presenciales.sql

No crea usuarios Auth para compradores presenciales.
Los pedidos online existentes sin order_channel se consideran online.
