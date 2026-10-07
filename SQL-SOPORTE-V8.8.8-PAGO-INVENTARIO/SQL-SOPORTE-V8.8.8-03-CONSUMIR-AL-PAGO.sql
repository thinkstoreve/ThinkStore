-- ThinkStore Soporte V8.8.8 · 03 · Consumir reservas al completar pago
-- Requiere SQL 01 y 02.
begin;

create or replace function public.ts_consume_reserved_service_parts(
  p_order_code text,
  p_actor_email text default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_order public.service_orders%rowtype;
  r public.service_order_parts%rowtype;
  p public.service_parts%rowtype;
  v_existing integer;
  v_needed integer;
  v_new_qty integer;
  v_cost numeric(12,2):=0;
  v_lines integer:=0;
begin
  select * into v_order from public.service_orders where upper(code)=upper(trim(p_order_code)) for update;
  if not found then raise exception 'Orden no encontrada'; end if;
  if coalesce(v_order.inventory_consumed,false) then
    return jsonb_build_object('ok',true,'already_consumed',true,'order_code',v_order.code,'direct_parts_cost',coalesce(v_order.direct_parts_cost,0));
  end if;

  for r in
    select * from public.service_order_parts
     where order_code=v_order.code and status='reserved'
     order by created_at,id
     for update
  loop
    select * into p from public.service_parts where id=r.part_id and active=true for update;
    if not found then raise exception 'Repuesto reservado ya no existe'; end if;

    select least(r.quantity_reserved,
      coalesce(abs(sum(case when quantity<0 then quantity else 0 end)),0)::integer)
      into v_existing
      from public.service_part_movements
     where part_id=r.part_id
       and upper(coalesce(order_id,''))=upper(v_order.code)
       and lower(coalesce(movement_type,'')) like 'consumo%';

    v_needed := greatest(r.quantity_reserved-coalesce(v_existing,0),0);
    if v_needed > p.quantity then
      raise exception 'Stock insuficiente al cobrar %. Necesario: %, disponible: %',p.name,v_needed,p.quantity;
    end if;

    if v_needed > 0 then
      v_new_qty := p.quantity-v_needed;
      update public.service_parts set quantity=v_new_qty,updated_at=now() where id=p.id;
      insert into public.service_part_movements(part_id,order_id,movement_type,quantity,balance_after,note,actor_email)
      values(p.id,v_order.code,'consumo_pago',-v_needed,v_new_qty,'Consumo automático al completar el pago',nullif(trim(p_actor_email),''));
    end if;

    update public.service_order_parts
       set quantity_consumed=quantity_reserved,status='consumed',consumed_at=now(),updated_at=now()
     where id=r.id;

    v_cost := v_cost + round(coalesce(r.unit_cost_snapshot,0)*r.quantity_reserved,2);
    v_lines := v_lines + 1;
  end loop;

  update public.service_orders
     set direct_parts_cost=v_cost,
         inventory_consumed=true,
         inventory_consumed_at=now(),
         updated_at=now()
   where code=v_order.code;

  return jsonb_build_object('ok',true,'already_consumed',false,'order_code',v_order.code,'lines',v_lines,'direct_parts_cost',v_cost);
end;
$$;

revoke all on function public.ts_consume_reserved_service_parts(text,text) from public;
grant execute on function public.ts_consume_reserved_service_parts(text,text) to service_role;
notify pgrst,'reload schema';
commit;
