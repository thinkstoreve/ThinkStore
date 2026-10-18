-- Ejecutar una vez en SQL Editor del proyecto Supabase de ThinkStore.
-- No elimina datos. La lista existente de campañas usa esta misma tabla.
begin;
create table if not exists public.newsletter_subscribers (
 id uuid primary key default gen_random_uuid(),
 email text not null unique,
 status text not null default 'subscribed',
 source text not null default 'web',
 consent_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;
-- La web solo puede insertar. La lectura de campañas queda en el servidor.
revoke all on public.newsletter_subscribers from anon, authenticated;
grant insert (email, status, source, consent_at) on public.newsletter_subscribers to anon, authenticated;
grant all on public.newsletter_subscribers to service_role;
drop policy if exists newsletter_public_subscribe on public.newsletter_subscribers;
create policy newsletter_public_subscribe on public.newsletter_subscribers
 for insert to anon, authenticated
 with check (
  status = 'subscribed'
  and email = lower(btrim(email))
  and length(email) between 5 and 254
  and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  and length(source) between 1 and 80
  and consent_at is not null
 );
notify pgrst, 'reload schema';
commit;
