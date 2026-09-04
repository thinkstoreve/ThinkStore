-- Ejecutar SOLO en la base Supabase independiente de soporte.thinkstore.com.ve
create table if not exists public.service_appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_email text not null,
  client_phone text not null,
  device_type text not null,
  device_model text not null,
  service_type text not null,
  reported_issue text not null,
  preferred_date date not null,
  preferred_time text not null,
  service_mode text not null default 'Presencial',
  source text not null default 'web',
  status text not null default 'pendiente_confirmacion',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists service_appointments_date_idx on public.service_appointments(preferred_date, status);
alter table public.service_appointments enable row level security;
-- No se crea policy pública de INSERT: la tienda escribe mediante Netlify Function + service role.
