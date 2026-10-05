ThinkStore V13.59 · Editor avanzado de productos

NOVEDADES
- Botón "Editar ficha" funcional desde Productos.
- Abre una ventana amplia independiente: producto-editor.html.
- Edición de ficha de catálogo: categoría, descripción, orden y publicación.
- Variantes filtrables por capacidad, color y condición.
- Colores predefinidos tomados del modelo en data.js + colores reales del inventario.
- Pre-Owned:
  * estado estético Excelente / Bueno / Bien
  * salud de batería 0-100%
  * detalle corto automático según estado y batería
- Edición segura de stock, stock mínimo y precio.
- Código corto TS visible; SKU e ID internos permanecen intactos.
- Gestión de imágenes:
  * portada general
  * imagen por color
  * ajuste automático 1400x1400
  * mejora ligera automática
  * detección de fondo claro conectado a los bordes y conversión a transparencia
  * salida WEBP optimizada para catálogo
  * almacenamiento en Cloudflare R2
- Vista previa de publicación antes de publicar.
- Auditoría extendida a cosmetic_grade, battery_health_pct y cosmetic_note.

SQL REQUERIDO
Ejecutar una sola vez:
supabase_v13_59_editor_productos.sql

Ese SQL NO cambia SKU, ID ni relaciones; solo añade:
- battery_health_pct
- cosmetic_note

V13.57 cosmetic_grade sigue siendo compatible.
