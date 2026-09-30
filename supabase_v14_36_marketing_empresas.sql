-- Ejecutar antes de enviar campañas Empresas · Soporte técnico Apple.
create table if not exists public.marketing_enterprise_unsubscribes (
  email text primary key check (email = lower(trim(email))),
  unsubscribed_at timestamptz not null default now()
);
alter table public.marketing_enterprise_unsubscribes enable row level security;
revoke all on public.marketing_enterprise_unsubscribes from anon, authenticated;
grant select, insert, update on public.marketing_enterprise_unsubscribes to service_role;
-- Acceso exclusivo mediante funciones Netlify; no se altera la suscripción a otros flujos.
