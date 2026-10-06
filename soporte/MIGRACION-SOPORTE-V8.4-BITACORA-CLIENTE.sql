-- ThinkStore Soporte V8.4
-- Bitácora visible para el cliente + reporte detallado
-- Ejecutar UNA SOLA VEZ en el proyecto Supabase ThinkStore-Soporte.

begin;

alter table public.service_order_notes
  add column if not exists client_title text,
  add column if not exists diagnosis text,
  add column if not exists work_performed text,
  add column if not exists parts_used text,
  add column if not exists tests_performed text,
  add column if not exists client_notes text;

create index if not exists service_notes_client_visibility_idx
  on public.service_order_notes(order_id, visibility, created_at desc);

drop function if exists public.lookup_service_order(text);

create function public.lookup_service_order(p_code text)
returns table(
  code text,
  client_name text,
  device_model text,
  status text,
  updated_at timestamptz,
  quote_status text,
  quote_amount numeric,
  quote_currency text,
  warranty_days integer,
  client_updates jsonb
)
language sql
stable
security definer
set search_path=public
as $$
  select
    o.code,
    o.client_name,
    o.device_model,
    o.status::text,
    o.updated_at,
    o.quote_status::text,
    o.quote_amount,
    o.quote_currency,
    coalesce(o.warranty_days,0),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',n.id,
          'note_type',n.note_type,
          'status_after',n.status_after,
          'client_title',n.client_title,
          'note',n.note,
          'diagnosis',n.diagnosis,
          'work_performed',n.work_performed,
          'parts_used',n.parts_used,
          'tests_performed',n.tests_performed,
          'client_notes',n.client_notes,
          'author_name',n.author_name,
          'created_at',n.created_at
        )
        order by n.created_at desc
      )
      from public.service_order_notes n
      where n.order_id=o.id
        and n.visibility='client'
    ),'[]'::jsonb)
  from public.service_orders o
  where upper(o.code)=upper(trim(p_code))
  limit 1
$$;

revoke all on function public.lookup_service_order(text) from public;
grant execute on function public.lookup_service_order(text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;

-- Verificación rápida:
select
  column_name
from information_schema.columns
where table_schema='public'
  and table_name='service_order_notes'
  and column_name in (
    'client_title','diagnosis','work_performed',
    'parts_used','tests_performed','client_notes'
  )
order by column_name;
