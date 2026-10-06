create or replace function public.consume_service_order_parts(p_order_id bigint,p_actor_email text default null)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_order public.service_orders;
  v_row public.service_order_parts;
  v_part public.service_parts;
  v_next integer;
  v_count integer:=0;
  v_units integer:=0;
  v_cost numeric(14,2):=0;
  v_items jsonb:='[]'::jsonb;
begin
  if coalesce(auth.role(),'')<>'service_role' and public.current_service_role() not in ('superadmin','admin','reception','technician','sales') then
    raise exception 'Acceso no autorizado';
  end if;
  select * into v_order from public.service_orders where id=p_order_id for update;
  if not found then raise exception 'Orden no encontrada'; end if;
  for v_row in select * from public.service_order_parts where service_order_id=p_order_id and status='pending' order by created_at for update loop
    select * into v_part from public.service_parts where id=v_row.part_id and active=true for update;
    if not found then raise exception 'Repuesto no encontrado'; end if;
    if v_part.quantity<v_row.quantity then
      raise exception 'Stock insuficiente para %. Disponible: %, requerido: %',v_part.name,v_part.quantity,v_row.quantity;
    end if;
    v_next:=v_part.quantity-v_row.quantity;
    update public.service_parts set quantity=v_next,updated_at=now() where id=v_part.id;
    insert into public.service_part_movements(part_id,order_id,movement_type,quantity,balance_after,note,actor_email)
    values(v_part.id,v_order.code,'consumo_pago',-v_row.quantity,v_next,'Descuento automático al cobrar la reparación',coalesce(nullif(trim(p_actor_email),''),auth.jwt()->>'email'));
    update public.service_order_parts set status='consumed',consumed_at=now(),consumed_by=coalesce(nullif(trim(p_actor_email),''),auth.jwt()->>'email'),updated_at=now() where id=v_row.id;
    v_count:=v_count+1;
    v_units:=v_units+v_row.quantity;
    v_cost:=v_cost+(coalesce(v_row.unit_cost_snapshot,v_part.unit_cost,0)*v_row.quantity);
    v_items:=v_items||jsonb_build_array(jsonb_build_object('part_id',v_part.id,'sku',v_part.sku,'name',v_part.name,'quantity',v_row.quantity,'balance_after',v_next));
  end loop;
  return jsonb_build_object('ok',true,'order_code',v_order.code,'lines',v_count,'units',v_units,'total_cost',round(v_cost,2),'items',v_items);
end $$;

revoke all on function public.consume_service_order_parts(bigint,text) from public;
grant execute on function public.consume_service_order_parts(bigint,text) to authenticated,service_role;
