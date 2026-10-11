# ThinkStore Main V15.32 · Catálogo por categoría / imágenes corregidas

Base: V15.31.

## Corrección principal
- Se corrigieron rutas antiguas de imágenes de iPhone 18 que apuntaban a `iphone18/colors/...`, carpeta que ya no existe en el deploy actual.
- iPhone Ultra, iPhone 18 Pro Max e iPhone 18 Pro ahora usan assets existentes y válidos.
- La vista por categoría ya no cae en `iphone_assets_sheet.jpg` cuando una imagen de iPhone falla.
- El fallback de iPhone pasa a una portada segura de producto, no al mosaico del catálogo.

## Protección adicional
- Las rutas legacy del iPhone 18 se traducen automáticamente a los assets actuales.
- Una imagen genérica `iphone_assets_sheet` guardada como placeholder editorial ya no sustituye la portada válida de un producto existente.
- El mismo resolvedor de imagen se reutiliza en tarjetas y fichas para evitar inconsistencias.

## Validación
- `script.js`: sintaxis OK.
- `data.js`: sintaxis OK.
- Se comprobaron todos los `main`, `gallery` y `colors` de PRODUCTS: 0 referencias locales rotas.

No requiere SQL nuevo.
