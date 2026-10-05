ThinkStore V14.32 · Catálogo técnico + imágenes + estructura de inventario

1. CATÁLOGO VISUAL
- Categorías: iPhone, Mac, iPad, Apple Watch y AirPods.
- Filtros: serie, tipo de modelo, reparación, calidad, oferta y precio.
- Modal de producto: imagen, calidad, precio, SKU, garantía, tiempo, disponibilidad y modalidades.

2. IMÁGENES
- Pantallas iPhone -> assets/service-screen-ref.png
- Baterías iPhone -> assets/service-battery-ref.png
- Reparaciones internas iPhone -> assets/service-iphone-exploded.png
- Otras categorías -> assets/service-cat-*.png

La interfaz siempre prioriza image_url del inventario cuando exista. Por eso, cuando Supabase tenga una imagen específica para cada repuesto, esa imagen sustituirá automáticamente la referencia local.

3. SUPABASE (AÚN NO CONECTADO EN ESTA VERSIÓN)
Archivo preparado: supabase_service_parts_catalog.sql
Tablas propuestas:
- service_parts_catalog
- service_part_movements
Vista pública:
- service_parts_public

Campos principales:
category / series / model / model_type / repair / quality / sku
price_usd / original_price_usd / discount_percent / is_offer
image_url / thumbnail_url / gallery
warranty / repair_time / service_modes
stock_total / stock_reserved / stock_min / stock_location
supplier / supplier_sku / cost_usd
active / public / catalog_only

4. SIGUIENTE PASO
Revisar la tabla actual de repuestos de ThinkStore-Soporte y decidir si:
A) se migra a service_parts_catalog, o
B) se adapta la tabla existente y se crea una vista compatible.

Después, /.netlify/functions/service-parts debe leer service_parts_public.
