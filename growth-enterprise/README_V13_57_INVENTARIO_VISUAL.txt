ThinkStore V13.57 · Inventario visual + Pre-Owned

MEJORAS
- Inventario agrupado visualmente por producto.
- Pestañas por categoría.
- Vista Visual y Vista Compacta.
- Filtros combinables por disponibilidad, capacidad, color, condición comercial,
  estado estético, publicación y alertas.
- Botones de capacidad, color y condición dentro de cada ficha de producto.
- Estado estético para Pre-Owned: Excelente / Bueno / Bien.
- Alertas de stock bajo, productos sin precio y productos sin imagen.
- Código corto ThinkStore TS-XXXXXXXX derivado del ID/SKU para búsqueda rápida.
- El SKU técnico y el ID interno se conservan sin cambios para no romper relaciones,
  inventario, pedidos ni auditoría.
- Historial, edición, ajustes de stock y publicación siguen accesibles.
- "Renovado" se presenta como "Pre-Owned" en la tienda y panel.
- Compatibilidad mantenida con variantes antiguas que aún tengan condition="Renovado".
- Exportación Excel muestra Pre-Owned y estado estético.
- Auditoría de edición de inventario conserva el actor_email.

SQL
Ejecutar una sola vez:
supabase_v13_57_inventario_visual.sql

Este SQL solo añade inventory_variants.cosmetic_grade y su validación.
No modifica SKU, IDs ni relaciones existentes.

NOTA
Si el SQL todavía no se ha ejecutado, el inventario sigue cargando normalmente.
Solo el guardado de Excelente/Bueno/Bien quedará pendiente hasta ejecutar la migración.
