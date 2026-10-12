# ThinkStore Soporte V8.8.25

- La carga R2 usa ahora una Netlify Function dedicada `support-r2-upload` y deja de depender de la acción multipropósito `file_upload_r2`.
- Corrige el error `Acción no válida` al subir fotografías.
- El botón de eliminar deja de ocupar una fila completa: ahora es una papelera flotante y transparente sobre la miniatura.
- Incluye animación al pasar, pulsar y eliminar.
- Mantiene confirmación antes de eliminar y borra R2 + metadatos de Supabase.
- Caché actualizado a V8.8.25 / assets 15.29.0.
- No requiere SQL ni variables nuevas.
