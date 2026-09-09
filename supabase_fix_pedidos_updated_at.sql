-- ThinkStore: compatibilidad de actualización de estados y correos
-- Ejecutar una sola vez en Supabase SQL Editor del proyecto principal.

alter table public.pedidos
  add column if not exists updated_at timestamptz default now();

update public.pedidos
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

create or replace function public.ts_touch_pedidos_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ts_pedidos_touch_updated_at on public.pedidos;
create trigger ts_pedidos_touch_updated_at
before update on public.pedidos
for each row execute function public.ts_touch_pedidos_updated_at();

notify pgrst, 'reload schema';
