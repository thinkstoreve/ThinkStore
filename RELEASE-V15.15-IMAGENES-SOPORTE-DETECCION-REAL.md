# ThinkStore Main — V15.15 · Imágenes Soporte · detección real

## Problema corregido
Las fotos antiguas podían aparecer como **ABRIR ARCHIVO** y descargarse porque el frontend decidía si un registro era imagen mirando únicamente la extensión del nombre/ruta.

## Corrección
- El frontend ya no depende de la extensión para clasificar el archivo.
- `support-actions` inspecciona el contenido real de la imagen y detecta JPEG, PNG, WebP, GIF, BMP, TIFF, AVIF y HEIC/HEIF por cabecera/binario.
- Primero se intenta una vista previa optimizada; si no está disponible, se recupera el contenido privado y se genera una `data:image/...` segura para imágenes de tamaño compatible.
- Las fotos antiguas con MIME genérico (`application/octet-stream`) pueden mostrarse si su contenido real es una imagen.
- Al hacer clic en una imagen se abre el lightbox interno; no navega al enlace ni dispara descarga.
- `ABRIR ARCHIVO` queda reservado únicamente para archivos que realmente no son imágenes.
- Se fuerza caché nueva de Soporte `15.15.0 / r1515` para evitar que el Service Worker continúe sirviendo `app.js` anterior.

## SQL
No requiere SQL nuevo.
