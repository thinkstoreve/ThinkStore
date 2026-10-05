ThinkStore V13.64 · Venta presencial: catálogo completo + stock + Pre-Order

CORRECCIÓN PRINCIPAL
La pantalla venta-presencial.html filtraba inventory_variants a available > 0.
Por eso, si no había existencia, el producto desaparecía completamente.

NUEVO COMPORTAMIENTO
- Muestra el catálogo interno completo, no solo variantes con stock.
- Fusiona:
  * catálogo real de Supabase
  * variantes reales de inventory_variants
  * catálogo estático PRODUCTS de data.js como respaldo
- Categorías visibles para filtrar productos.
- Cada tarjeta indica:
  * unidades en stock
  * sin stock
  * Pre-Order disponible
- Configuración de venta:
  * Venta desde stock
  * Pre-Order
- Si la variante tiene stock, puede reservarse normalmente.
- Si no tiene stock, cambia automáticamente a Pre-Order.
- Las variantes/capacidades/colores del catálogo estático que todavía no existen en inventory_variants
  también pueden registrarse como Pre-Order.
- Para una Pre-Order no se reserva ni descuenta inventario existente.
- El precio puede cargarse manualmente cuando la configuración todavía no tiene precio en Supabase.

INTEGRACIÓN CON V13.63
- Ya no se exige serial/IMEI dentro de la pantalla de venta presencial.
- Después de confirmar el pago, el pedido usa el flujo “Asignar equipo”.
- Serial, IMEI, batería Pre-Owned y condición general se registran al asignar la unidad física.
- La Nota de Entrega continúa bloqueada hasta completar esa asignación.

BACKEND
admin-create-sale.js ahora admite:
- artículos de stock vinculados a inventory_variants
- artículos Pre-Order sin stock
- artículos del catálogo que todavía no tienen variante física creada
- reserva únicamente los artículos vendidos desde stock

SQL
No requiere SQL nuevo.
La V13.63 sigue requiriendo supabase_v13_63_unidades_fisicas.sql para el módulo de asignación física.

LÍMITE
No se realizaron pruebas contra Supabase/Netlify en vivo.
