-- ThinkStore Enterprise · auditoría administrativa en la base principal.
-- Ejecutar SOLO en el proyecto Supabase "thinkstore". No modifica pedidos ni inventario.
create extension if not exists pgcrypto;
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log(created_at desc);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon,authenticated;
notify pgrst, 'reload schema';
