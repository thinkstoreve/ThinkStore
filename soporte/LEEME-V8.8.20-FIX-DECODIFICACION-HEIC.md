# ThinkStore Soporte V8.8.20

Corrige el error `The source image could not be decoded`.

- `createImageBitmap` ya no bloquea la subida si el navegador no puede decodificar.
- Se intenta el decodificador `<img>` como alternativa.
- Si el navegador tampoco puede leer la imagen, se envía el archivo original al backend.
- HEIC/HEIF se convierte a JPEG en Netlify mediante `heic-convert` antes de guardarse en R2 privado.
- JPG/PNG/WebP siguen optimizándose en el navegador cuando es posible.
- Requiere las variables SUPPORT_R2_* ya configuradas.
