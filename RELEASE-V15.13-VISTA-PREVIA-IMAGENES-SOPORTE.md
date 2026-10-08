# ThinkStore Main — V15.13 · Vista previa real de imágenes en Soporte

## Correcciones

### Fotografías y archivos · Gestionar
- Las fotografías privadas ya no se tratan como archivos descargables cuando el navegador debe mostrarlas.
- Para imágenes antiguas con MIME genérico (`application/octet-stream`), Soporte infiere el tipo correcto desde la extensión (`jpg`, `jpeg`, `png`, `webp`, etc.) y genera una vista previa compatible.
- Los archivos HEIC/HEIF intentan usar la transformación de imágenes de Supabase para entregar una vista compatible con navegador cuando la función está disponible.
- Si una imagen directa supera el tamaño adecuado para una respuesta base64, se intenta primero una vista optimizada antes de caer al enlace seguro original.

### Visor ampliado
- Las tarjetas de imagen siguen abriendo el lightbox interno de Soporte.
- Al tocar una fotografía se amplía dentro de la aplicación; no se abre una descarga de forma intencional.
- Cierre con X, fondo o tecla Escape.

### Nuevas subidas
- Los uploads ahora envían explícitamente `Content-Type` usando el MIME real del archivo.
- Se aplica tanto a las imágenes cargadas desde Gestionar como a las fotos de Recepción.

### Caché
- Assets de Soporte actualizados a `15.13.0`.
- Service Worker actualizado a `r1513` para invalidar la versión anterior.

## Archivos modificados
- `soporte/app.js`
- `soporte/index.html`
- `soporte/panel.html`
- `soporte/sw.js`
- `soporte/netlify/functions/support-actions.js`
- `netlify/functions/support-actions.js`

## SQL
- No requiere SQL nuevo.
