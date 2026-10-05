THINKSTORE V14.10 · SERVICIO TÉCNICO + PRECIOS + STOCK

Cambios principales
------------------
1. Servicio Técnico mantiene la animación inicial de 4 pasos.
2. Hero actualizado con la vista técnica del iPhone en fondo transparente.
3. Botón principal "Diagnosticar mi equipo" cambiado a "Precios".
4. Nuevo módulo público de consulta de precios y disponibilidad de repuestos.
5. Buscador por modelo, reparación, SKU y compatibilidad.
6. Filtros por iPhone, MacBook, iPad, iMac, Apple Watch y AirPods.
7. Filtros dinámicos por serie/modelo.
8. Stock sincronizado desde Inventory Central / inventario unificado.
9. Estados públicos: En stock, Últimas piezas y Bajo pedido.
10. Nueva Netlify Function: netlify/functions/service-parts.js.
11. El endpoint público NO expone seriales, IMEI, costos internos ni ubicaciones.
12. El botón Servicio Técnico del menú ya no usa el bloque negro; conserva un estado activo sutil.

No requiere SQL nuevo.
Usa las mismas variables de Supabase que ya utiliza ThinkStore en Netlify:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

El precio publicado se obtiene de sale_price en Inventory Central o price_usd en inventory_variants.
La disponibilidad se calcula con el inventario unificado (stock físico - reservado).

Antes de publicar, conviene revisar en Inventory Central que cada repuesto tenga:
- SKU
- nombre/modelo
- categoría o nombre identificable como repuesto
- precio de venta
- stock
- imagen (opcional)
