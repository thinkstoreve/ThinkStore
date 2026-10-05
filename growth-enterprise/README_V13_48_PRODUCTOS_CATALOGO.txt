ThinkStore V13.48 · Productos / Catálogo visual

NUEVO EN PANEL > PRODUCTOS
- Vista visual tipo tienda con imagen principal del catálogo.
- Precio USD editable directamente desde cada tarjeta.
- Guardar precio aplica el valor a todas las variantes del mismo producto.
- Pestañas por categoría: iPhone, iPad, Mac, MacBook, iMac,
  Accesorios Apple, Audio y Otro.
- Accesorios Apple: "Cables, cargadores, cases, vidrios y otros."
- Buscador por nombre, modelo, categoría y características.
- Indicadores de publicado/borrador, variantes, stock disponible y reservado.
- Editor de ficha reutiliza la galería R2 existente para cambiar imagen principal,
  descripción, categoría, orden y publicación.
- Gestor de categorías: crear, editar, reordenar, ocultar o eliminar cuando no tenga productos.
- Nuevo producto: nombre, categoría, precio, stock inicial, SKU, condición,
  descripción e imagen principal opcional. Se crea como borrador para revisión.

SQL REQUERIDO
Ejecutar una sola vez antes de usar categorías editables:
  supabase_v13_48_catalogo_categorias.sql

Este SQL solo crea la tabla catalog_categories y carga las categorías iniciales.
No modifica pedidos, clientes, pagos ni stock existente.

Base: V13.47 completa. No requiere desplegar versiones intermedias.
