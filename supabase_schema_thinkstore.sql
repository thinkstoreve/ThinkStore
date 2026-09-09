-- ThinkStore Supabase schema v11
-- Ejecutar en Supabase: SQL Editor -> New query -> Run

create table if not exists clientes (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  correo text unique,
  telefono text,
  cedula_rif text,
  direccion text,
  ciudad text,
  estado text,
  referencia text,
  metodo_envio_preferido text,
  agencia_destino text,
  created_at timestamptz default now()
);

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  cliente_id uuid references clientes(id) on delete set null,
  estado text default 'Pedido recibido',
  metodo_pago text,
  referencia_pago text,
  metodo_envio text,
  empresa_envio text,
  numero_guia text,
  total_usd numeric,
  total_bs numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade,
  producto text,
  color text,
  capacidad text,
  cantidad int default 1,
  precio_usd numeric
);

create table if not exists comprobantes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade,
  cliente_id uuid references clientes(id) on delete set null,
  url_archivo text,
  referencia text,
  monto numeric,
  created_at timestamptz default now()
);

alter table clientes enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;
alter table comprobantes enable row level security;

-- Clientes: cada usuario ve y actualiza solo su perfil.
drop policy if exists "clientes_select_own" on clientes;
create policy "clientes_select_own" on clientes for select using (auth.uid() = id);
drop policy if exists "clientes_insert_own" on clientes;
create policy "clientes_insert_own" on clientes for insert with check (auth.uid() = id);
drop policy if exists "clientes_update_own" on clientes;
create policy "clientes_update_own" on clientes for update using (auth.uid() = id);

-- Pedidos: cada usuario ve y crea sus pedidos.
drop policy if exists "pedidos_select_own" on pedidos;
create policy "pedidos_select_own" on pedidos for select using (auth.uid() = cliente_id);
drop policy if exists "pedidos_insert_own" on pedidos;
create policy "pedidos_insert_own" on pedidos for insert with check (auth.uid() = cliente_id);

-- Items: visibles si el pedido pertenece al usuario.
drop policy if exists "items_select_own" on pedido_items;
create policy "items_select_own" on pedido_items for select using (
  exists (select 1 from pedidos where pedidos.id = pedido_items.pedido_id and pedidos.cliente_id = auth.uid())
);
drop policy if exists "items_insert_own" on pedido_items;
create policy "items_insert_own" on pedido_items for insert with check (
  exists (select 1 from pedidos where pedidos.id = pedido_items.pedido_id and pedidos.cliente_id = auth.uid())
);

-- Comprobantes: cada usuario puede crear/ver sus comprobantes.
drop policy if exists "comprobantes_select_own" on comprobantes;
create policy "comprobantes_select_own" on comprobantes for select using (auth.uid() = cliente_id);
drop policy if exists "comprobantes_insert_own" on comprobantes;
create policy "comprobantes_insert_own" on comprobantes for insert with check (auth.uid() = cliente_id);
