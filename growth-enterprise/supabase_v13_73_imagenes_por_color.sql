-- ThinkStore V13.73 · Imágenes de catálogo por color
-- Permite vincular cada imagen a un color sin depender del orden de la galería.

alter table public.catalog_product_images
  add column if not exists color_name text;

create index if not exists catalog_product_images_product_color_idx
  on public.catalog_product_images(product_key, color_name);

comment on column public.catalog_product_images.color_name is
  'Color comercial al que pertenece la imagen. NULL = portada general o imagen adicional.';

notify pgrst, 'reload schema';
