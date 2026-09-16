ThinkStore V13.73 · Editor de producto · imágenes por color

BASE
V13.72 acumulativa.

CORRECCIONES
- Las imágenes por color ya no dependen del orden de la galería.
- Cada imagen guarda su color real en catalog_product_images.color_name.
- Subir una imagen para un color NO reemplaza la portada general.
- Reemplazar un color solo sustituye la imagen de ese mismo color.
- La galería muestra claramente: Portada general / Light Blue / Dark Cherry / Dark Gray / Silver, etc.
- La vista previa del producto usa la imagen del color de la variante seleccionada cuando existe.

CALIDAD Y ENCUADRE
- Procesamiento aumentado de 1400×1400 a 1800×1800.
- WEBP de alta calidad (0.95, con fallback 0.88 si supera 4 MB).
- Nuevo selector de encuadre:
  · Producto grande (recomendado)
  · Completo con margen
  · Llenar cuadro (puede recortar)
- El modo recomendado ocupa casi todo el lienzo para evitar imágenes diminutas.
- Fondo transparente ahora viene desactivado por defecto para no eliminar fondos de producto accidentalmente.

TIENDA
- El catálogo público usa color_name para vincular cada color con su imagen exacta.
- Conserva compatibilidad con galerías antiguas basadas en orden.

SQL REQUERIDO
Ejecutar antes de usar la nueva carga por color:
supabase_v13_73_imagenes_por_color.sql

SEGURIDAD DE MIGRACIÓN
- Si el SQL no está aplicado, el backend lo detecta ANTES de borrar/modificar la galería existente.
- Devuelve un mensaje claro y deja las imágenes actuales intactas.

NO MODIFICADO
- Header y home V13.72.
- Catálogo iPhone 18 V13.71.
- Compra por categoría / Destacados.
- Carrito, pagos, pedidos, inventario, soporte y Enterprise.
