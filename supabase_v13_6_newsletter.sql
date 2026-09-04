-- ThinkStore V13.6 · Suscripciones a ofertas y novedades
-- Ejecutar una sola vez en Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'subscribed' check (status in ('subscribed','unsubscribed')),
  source text not null default 'web',
  consent_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists newsletter_subscribers_email_unique
  on public.newsletter_subscribers (lower(email));

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "newsletter_public_insert" on public.newsletter_subscribers;
create policy "newsletter_public_insert"
on public.newsletter_subscribers
for insert
to anon, authenticated
with check (
  status = 'subscribed'
  and email ~* '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
);

-- No se crea una política pública de SELECT: los visitantes no pueden leer la lista.
-- El Panel/Netlify puede leerla usando la Service Role existente en el servidor.
