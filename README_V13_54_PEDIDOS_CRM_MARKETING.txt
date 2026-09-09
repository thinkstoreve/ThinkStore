ThinkStore V13.54 · Pedidos + CRM + Marketing

MEJORAS
- Pedidos: botón Abrir ficha completa en nueva ventana con animación.
- Ficha de pedido: cliente, pago, entrega, productos, seriales, garantías, notas e historial.
- Clientes / CRM: integra registrados y compradores de ventas directas.
- CRM muestra cantidad de compras, gasto acumulado, último pedido, garantías activas y soporte.
- Cada cliente puede abrir una ficha CRM independiente con animación.
- Marketing: historial de campañas enviadas con fecha, audiencia, enviados y fallidos.
- Marketing: opción Duplicar campaña para reutilizar una campaña anterior.
- Se amplía el registro de marketing_campaigns con contenido_json e imagen.
- Se evita lanzar una segunda consulta de refreshRealData mientras otra sigue en curso.

SQL
Ejecutar supabase_v13_54_marketing_history.sql para habilitar historial persistente de campañas.
Si aún no se ejecuta, el envío de campañas sigue funcionando; simplemente no habrá historial permanente.

Base completa: V13.53.
No se modifica la lógica de stock, reservas, pagos ni notas de entrega.
