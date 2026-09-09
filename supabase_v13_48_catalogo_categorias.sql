-- ThinkStore V13.48 · Categorías editables del catálogo
create table if not exists public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  sort_order integer not null default 1000,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.catalog_categories (name, description, sort_order, active)
values
  ('iPhone','iPhone y sus variantes.',10,true),
  ('iPad','iPad y accesorios específicos.',20,true),
  ('Mac','Equipos Mac de escritorio y portátiles.',30,true),
  ('MacBook','MacBook Air, MacBook Pro y portátiles Apple.',40,true),
  ('iMac','Equipos iMac y configuraciones disponibles.',50,true),
  ('Accesorios Apple','Cables, cargadores, cases, vidrios y otros.',60,true),
  ('Audio','AirPods, audífonos y productos de audio.',70,true),
  ('Otro','Productos que no pertenecen a las categorías anteriores.',999,true)
on conflict (name) do update set
  description=excluded.description,
  sort_order=excluded.sort_order,
  active=true,
  updated_at=now();

create index if not exists catalog_categories_sort_idx on public.catalog_categories(sort_order, name);
