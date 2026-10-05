-- ThinkStore Enterprise · Data Bridge 1.3-A
-- Ejecutar en Supabase SQL Editor del proyecto principal ThinkStore.
-- Objetivo: permitir que Enterprise lea datos reales de clientes, pedidos,
-- comprobantes, inventario y soporte en modo seguro, sin modificar nada.

create or replace function public.enterprise_current_admin_ok()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.roles_usuarios r
    where r.activo = true
      and (
        r.id = auth.uid()
        or lower(r.email) = lower(coalesce(auth.jwt()->>'email',''))
      )
      and r.rol in ('super_admin','admin','gerente')
  )
  or exists (
    select 1 from public.profiles p
    where p.active = true
      and (
        p.id = auth.uid()
        or lower(p.email) = lower(coalesce(auth.jwt()->>'email',''))
      )
      and p.role in ('super_admin','admin','gerente')
  );
$$;

create or replace function public.enterprise_pick_table(_tables text[])
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  t text;
begin
  foreach t in array _tables loop
    if to_regclass('public.' || t) is not null then
      return t;
    end if;
  end loop;
  return null;
end;
$$;

create or replace function public.enterprise_table_rows(_table text, _limit integer default 250)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb := '[]'::jsonb;
  has_created boolean := false;
  has_updated boolean := false;
begin
  if _table is null or to_regclass('public.' || _table) is null then
    return '[]'::jsonb;
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = _table and column_name = 'created_at'
  ) into has_created;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = _table and column_name = 'updated_at'
  ) into has_updated;

  if has_created then
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from (select * from public.%I order by created_at desc limit %s) x',
      _table,
      greatest(1, least(coalesce(_limit,250), 500))
    ) into result;
  elsif has_updated then
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from (select * from public.%I order by updated_at desc limit %s) x',
      _table,
      greatest(1, least(coalesce(_limit,250), 500))
    ) into result;
  else
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from (select * from public.%I limit %s) x',
      _table,
      greatest(1, least(coalesce(_limit,250), 500))
    ) into result;
  end if;

  return coalesce(result, '[]'::jsonb);
end;
$$;

create or replace function public.enterprise_table_count(_table text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result integer := 0;
begin
  if _table is null or to_regclass('public.' || _table) is null then
    return 0;
  end if;
  execute format('select count(*)::int from public.%I', _table) into result;
  return coalesce(result, 0);
end;
$$;

create or replace function public.enterprise_dashboard_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  t_customers text := public.enterprise_pick_table(array['clientes','customers','profiles_clientes','usuarios_clientes']);
  t_orders text := public.enterprise_pick_table(array['pedidos','orders','ordenes','compras']);
  t_order_items text := public.enterprise_pick_table(array['pedido_items','order_items','items_pedido']);
  t_payments text := public.enterprise_pick_table(array['comprobantes','payments','payment_receipts','pagos']);
  t_products text := public.enterprise_pick_table(array['productos','products','catalogo','inventory','inventario']);
  t_preorders text := public.enterprise_pick_table(array['preordenes','preorders','orders_preorder','pre_orders']);
  t_history text := public.enterprise_pick_table(array['order_status_history','historial_estados','pedido_historial']);
  t_staff text := public.enterprise_pick_table(array['roles_usuarios','profiles']);
  t_invitations text := public.enterprise_pick_table(array['staff_invitations']);
  t_support text := public.enterprise_pick_table(array['service_orders','ordenes_servicio','support_orders','repair_orders']);
  t_support_notes text := public.enterprise_pick_table(array['service_order_notes','bitacora_servicio','service_notes','repair_notes']);
  t_support_users text := public.enterprise_pick_table(array['service_users','support_users']);
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if not public.enterprise_current_admin_ok() then
    raise exception 'Acceso denegado: usuario sin rol Enterprise activo';
  end if;

  return jsonb_build_object(
    'source', 'enterprise_dashboard_snapshot',
    'mode', 'read_only',
    'generated_at', now(),
    'tables', jsonb_build_object(
      'customers', t_customers,
      'orders', t_orders,
      'orderItems', t_order_items,
      'payments', t_payments,
      'products', t_products,
      'preorders', t_preorders,
      'orderHistory', t_history,
      'staff', t_staff,
      'invitations', t_invitations,
      'support', t_support,
      'supportNotes', t_support_notes,
      'supportUsers', t_support_users
    ),
    'counts', jsonb_build_object(
      'customers', public.enterprise_table_count(t_customers),
      'orders', public.enterprise_table_count(t_orders),
      'payments', public.enterprise_table_count(t_payments),
      'products', public.enterprise_table_count(t_products),
      'preorders', public.enterprise_table_count(t_preorders),
      'support', public.enterprise_table_count(t_support)
    ),
    'customers', public.enterprise_table_rows(t_customers, 300),
    'orders', public.enterprise_table_rows(t_orders, 300),
    'orderItems', public.enterprise_table_rows(t_order_items, 300),
    'payments', public.enterprise_table_rows(t_payments, 250),
    'products', public.enterprise_table_rows(t_products, 300),
    'preorders', public.enterprise_table_rows(t_preorders, 220),
    'orderHistory', public.enterprise_table_rows(t_history, 220),
    'staff', public.enterprise_table_rows(t_staff, 150),
    'invitations', public.enterprise_table_rows(t_invitations, 150),
    'serviceOrders', public.enterprise_table_rows(t_support, 300),
    'serviceNotes', public.enterprise_table_rows(t_support_notes, 220),
    'serviceUsers', public.enterprise_table_rows(t_support_users, 150)
  );
end;
$$;

revoke all on function public.enterprise_dashboard_snapshot() from public;
grant execute on function public.enterprise_dashboard_snapshot() to authenticated;

grant execute on function public.enterprise_current_admin_ok() to authenticated;
grant execute on function public.enterprise_pick_table(text[]) to authenticated;
grant execute on function public.enterprise_table_rows(text, integer) to authenticated;
grant execute on function public.enterprise_table_count(text) to authenticated;
