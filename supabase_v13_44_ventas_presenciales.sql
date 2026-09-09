-- ThinkStore V13.44 · Ventas presenciales sin registro obligatorio
-- Ejecutar una sola vez en Supabase SQL Editor antes de usar el nuevo flujo POS.

alter table public.pedidos
  add column if not exists order_channel text,
  add column if not exists guest_name text,
  add column if not exists guest_email text,
  add column if not exists guest_document text,
  add column if not exists guest_phone text,
  add column if not exists guest_address text,
  add column if not exists guest_city text,
  add column if not exists guest_state text,
  add column if not exists sale_note text;

update public.pedidos
set order_channel = 'online'
where order_channel is null;

alter table public.pedido_items
  add column if not exists numero_serie text,
  add column if not exists garantia_dias integer,
  add column if not exists condicion text,
  add column if not exists chip text,
  add column if not exists ram text,
  add column if not exists model_code text,
  add column if not exists features text,
  add column if not exists item_note text,
  add column if not exists image_url text;

create index if not exists pedidos_order_channel_idx on public.pedidos(order_channel);
create index if not exists pedidos_guest_email_idx on public.pedidos(lower(guest_email));
create index if not exists pedido_items_numero_serie_idx on public.pedido_items(numero_serie);
