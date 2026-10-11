# ThinkStore Main V15.31 · Ficha Servicio Técnico enriquecida

Base: V15.30.

## Cambios
- La ficha pública de Servicio Técnico ahora respeta HTML enriquecido de Inventory.
- Soporta títulos, subtítulos, párrafos, negrita, cursiva, subrayado, viñetas, listas numeradas, citas y enlaces seguros.
- El endpoint `service-parts` prioriza `description_html` y conserva compatibilidad con descripciones antiguas en texto plano.
- La imagen principal se muestra centrada, completa y con `object-fit: contain`, dentro de un marco más compacto.
- Se ajusta automáticamente en móvil para evitar imágenes gigantes o recortadas.
- Se mantiene toda la sincronización de Servicio Técnico e Inventory de V15.29 y Accesorios de V15.30.

## SQL
No requiere migración SQL.
