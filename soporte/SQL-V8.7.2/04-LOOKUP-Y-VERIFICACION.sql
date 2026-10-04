-- ThinkStore Soporte V8.7.2 · Migración dividida BIGINT-safe
-- Ejecutar en Supabase -> ThinkStore-Soporte -> SQL Editor
-- NO ejecutar en el Supabase principal.

-- PARTE 4 DE 4
-- Lookup público básico y verificación final.

begin;

-- ============================================================
-- I. Lookup público básico por código
--    El portal completo usa public_token.
-- ============================================================

drop function if exists public.lookup_service_order(text);

create function public.lookup_service_order(p_code text)
returns table(
  code text,
  device_model text,
  status text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path=public
as $$
  select
    o.code::text,
    o.device_model::text,
    o.status::text,
    o.updated_at
  from public.service_orders o
  where upper(o.code::text) = upper(trim(p_code))
  limit 1
$$;

revoke all
on function public.lookup_service_order(text)
from public;

grant execute
on function public.lookup_service_order(text)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;

-- ============================================================
-- J. VERIFICACIÓN FINAL
-- Debe devolver UNA FILA.
-- ============================================================

select
  (
    select format_type(a.atttypid,a.atttypmod)
    from pg_attribute a
    where a.attrelid='public.service_orders'::regclass
      and a.attname='id'
      and not a.attisdropped
  ) as service_orders_id_type,

  (
    select format_type(a.atttypid,a.atttypmod)
    from pg_attribute a
    where a.attrelid='public.service_order_messages'::regclass
      and a.attname='order_id'
      and not a.attisdropped
  ) as messages_order_id_type,

  (
    select format_type(a.atttypid,a.atttypmod)
    from pg_attribute a
    where a.attrelid='public.service_feedback'::regclass
      and a.attname='order_id'
      and not a.attisdropped
  ) as feedback_order_id_type,

  (
    select format_type(a.atttypid,a.atttypmod)
    from pg_attribute a
    where a.attrelid='public.support_notifications'::regclass
      and a.attname='order_id'
      and not a.attisdropped
  ) as notifications_order_id_type,

  (
    select count(*)
    from public.service_orders
    where public_token is null
  ) as orders_without_token,

  to_regclass('public.service_order_messages') as messages_table,
  to_regclass('public.service_feedback') as feedback_table,
  to_regclass('public.support_notifications') as notifications_table,

  exists(
    select 1 from pg_trigger
    where tgname='trg_ts_notify_client_message'
  ) as client_message_alerts,

  exists(
    select 1 from pg_trigger
    where tgname='trg_ts_notify_client_feedback'
  ) as feedback_alerts,

  exists(
    select 1 from pg_trigger
    where tgname='trg_ts_notify_order_status'
  ) as status_alerts;

