-- ThinkStore V14.0 · Staff App / POS interno
-- Ejecutar una sola vez en Supabase SQL Editor antes de usar la app ThinkStore Staff.
-- No elimina ni modifica ventas existentes.

alter table public.pedidos
  add column if not exists salesperson_user_id uuid,
  add column if not exists salesperson_email text,
  add column if not exists salesperson_name text,
  add column if not exists pos_source text;

create index if not exists pedidos_salesperson_user_id_idx
  on public.pedidos(salesperson_user_id);

create index if not exists pedidos_salesperson_email_idx
  on public.pedidos(lower(salesperson_email));

create index if not exists pedidos_pos_source_idx
  on public.pedidos(pos_source);

create index if not exists pedidos_presencial_created_at_idx
  on public.pedidos(order_channel, created_at desc);

comment on column public.pedidos.salesperson_user_id is 'Usuario interno que registró la venta presencial.';
comment on column public.pedidos.salesperson_email is 'Correo del vendedor al momento de la venta.';
comment on column public.pedidos.salesperson_name is 'Nombre del vendedor al momento de la venta.';
comment on column public.pedidos.pos_source is 'Origen del POS: staff_app, panel_pos u otro canal interno.';
