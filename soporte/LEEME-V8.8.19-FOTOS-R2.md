# ThinkStore Soporte V8.8.19 · Fotos privadas R2

Proyecto específico para `soporte.thinkstore.com.ve`.

## Variables requeridas en Netlify

- `SUPPORT_R2_BUCKET_NAME=thinkstore-support-private`
- `SUPPORT_R2_ACCOUNT_ID`
- `SUPPORT_R2_ACCESS_KEY_ID`
- `SUPPORT_R2_SECRET_ACCESS_KEY`

El bucket debe permanecer privado. No usar `r2.dev` ni dominio público.

## Flujo

- Imágenes nuevas: navegador optimiza a WebP/JPEG -> Function autenticada -> R2 privado.
- Supabase conserva `service_order_photos` y la ruta `r2:<object-key>`.
- Vista previa: URL R2 firmada por 1 hora.
- Fotos antiguas en Supabase: migración diferida a R2 al abrirlas.
- Si R2 no está disponible, existe fallback a Supabase para compatibilidad.

## Prueba posterior al deploy

1. Iniciar sesión en Soporte.
2. Abrir una orden.
3. Subir una foto JPG/PNG.
4. Confirmar que aparece inmediatamente en la tarjeta.
5. Abrirla con la lupa.
6. Confirmar en R2 que se creó `support/orders/<order-id>/...`.
