-- ThinkStore Soporte V8.8.8 · 02 · Guardar reservas sin descontar stock
-- Requiere SQL 01.
begin;

create or replace function public.ts_save_service_order_parts(
  p_order_code text,
  p_parts jsonb,
  p_actor_email text default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_order public.service_orders%rowtype;
  v_item jsonb;
  v_part public.service_parts%rowtype;
  v_part_id uuid;
  v_qty integer;
  v_reserved_other integer;
  v_cost numeric(12,2):=0;
  v_count integer:=0;
begin
  if public.current_service_role() not in ('superadmin','admin','reception','technician','sales')
     and current_setting('request.jwt.claim.role',true) <> 'service_role' then
    raise exception 'Acceso no autorizado';
  end if;

  select * into v_order from public.service_orders where upper(code)=upper(trim(p_order_code)) for update;
  if not found then raise exception 'Orden no encontrada'; end if;
  if coalesce(v_order.inventory_consumed,false) or lower(coalesce(v_order.payment_status,'')) in ('cobrado','pagado') then
    raise exception 'La orden ya fue cobrada; no se pueden cambiar sus repuestos';
  end if;
  if jsonb_typeof(coalesce(p_parts,'[]'::jsonb)) <> 'array' then raise exception 'Lista de repuestos inválida'; end if;

  update public.service_order_parts
     set status='released',updated_at=now()
   where order_code=v_order.code and status='reserved';

  for v_item in select * from jsonb_array_elements(coalesce(p_parts,'[]'::jsonb)) loop
    v_part_id := nullif(v_item->>'part_id','')::uuid;
    v_qty := coalesce(nullif(v_item->>'quantity','')::integer,0);
    if v_part_id is null or v_qty <= 0 then raise exception 'Repuesto o cantidad inválida'; end if;

    select * into v_part from public.service_parts where id=v_part_id and active=true for update;
    if not found then raise exception 'Repuesto no encontrado'; end if;

    select coalesce(sum(greatest(quantity_reserved-quantity_consumed,0)),0)::integer
      into v_reserved_other
      from public.service_order_parts
     where part_id=v_part_id and status='reserved' and order_code<>v_order.code;

    if v_qty > greatest(v_part.quantity-v_reserved_other,0) then
      raise exception 'Stock insuficiente para reservar %. Disponible real: %',v_part.name,greatest(v_part.quantity-v_reserved_other,0);
    end if;

    insert into public.service_order_parts(
      order_code,part_id,quantity_reserved,quantity_consumed,unit_cost_snapshot,sale_price_snapshot,status,created_by_email,updated_at,consumed_at
    ) values(
      v_order.code,v_part.id,v_qty,0,coalesce(v_part.unit_cost,0),coalesce(v_part.sale_price,0),'reserved',nullif(trim(p_actor_email),''),now(),null
    )
    on conflict(order_code,part_id) do update set
      quantity_reserved=excluded.quantity_reserved,
      quantity_consumed=0,
      unit_cost_snapshot=excluded.unit_cost_snapshot,
      sale_price_snapshot=excluded.sale_price_snapshot,
      status='reserved',
      created_by_email=coalesce(excluded.created_by_email,public.service_order_parts.created_by_email),
      updated_at=now(),
      consumed_at=null;

    v_cost := v_cost + round(coalesce(v_part.unit_cost,0)*v_qty,2);
    v_count := v_count + 1;
  end loop;

  update public.service_orders set reserved_parts_cost=v_cost,updated_at=now() where code=v_order.code;

  return jsonb_build_object('ok',true,'order_code',v_order.code,'reserved_lines',v_count,'reserved_cost',v_cost);
end;
$$;

revoke all on function public.ts_save_service_order_parts(text,jsonb,text) from public;
grant execute on function public.ts_save_service_order_parts(text,jsonb,text) to authenticated,service_role;
notify pgrst,'reload schema';
commit;
