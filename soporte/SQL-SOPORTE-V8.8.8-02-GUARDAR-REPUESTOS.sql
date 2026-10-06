create or replace function public.save_service_order_parts(p_order_id bigint,p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_order public.service_orders;
  v_item jsonb;
  v_part public.service_parts;
  v_part_id uuid;
  v_qty integer;
  v_reserved integer;
  v_consumed integer;
  v_saved integer:=0;
begin
  if public.current_service_role() not in ('superadmin','admin','reception','technician','sales') then
    raise exception 'Acceso no autorizado';
  end if;
  select * into v_order from public.service_orders where id=p_order_id for update;
  if not found then raise exception 'Orden no encontrada'; end if;
  if lower(coalesce(v_order.payment_status,'')) in ('cobrado','pagado') then
    raise exception 'La reparación ya está cobrada y sus repuestos no pueden modificarse';
  end if;
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb)) <> 'array' then
    raise exception 'Lista de repuestos inválida';
  end if;
  for v_item in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    v_part_id:=(v_item->>'part_id')::uuid;
    v_qty:=greatest(0,coalesce((v_item->>'quantity')::integer,0));
    if v_qty<=0 then raise exception 'Cantidad inválida'; end if;
    select * into v_part from public.service_parts where id=v_part_id and active=true for update;
    if not found then raise exception 'Repuesto no encontrado'; end if;
    select coalesce(sum(quantity),0) into v_consumed from public.service_part_movements
      where part_id=v_part_id and upper(coalesce(order_id,''))=upper(v_order.code) and quantity<0;
    if v_consumed<0 then v_consumed:=abs(v_consumed); end if;
    if v_consumed>0 then raise exception 'El repuesto % ya fue descontado en esta orden',v_part.name; end if;
    select coalesce(sum(quantity),0) into v_reserved from public.service_order_parts
      where part_id=v_part_id and status='pending' and service_order_id<>p_order_id;
    if v_reserved+v_qty>v_part.quantity then
      raise exception 'Stock disponible insuficiente para %. Disponible para reservar: %',v_part.name,greatest(0,v_part.quantity-v_reserved);
    end if;
  end loop;
  delete from public.service_order_parts where service_order_id=p_order_id and status='pending';
  for v_item in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    v_part_id:=(v_item->>'part_id')::uuid;
    v_qty:=(v_item->>'quantity')::integer;
    select * into v_part from public.service_parts where id=v_part_id;
    insert into public.service_order_parts(service_order_id,order_code,part_id,quantity,unit_cost_snapshot,sale_price_snapshot,status,created_by)
    values(p_order_id,v_order.code,v_part_id,v_qty,v_part.unit_cost,v_part.sale_price,'pending',auth.jwt()->>'email')
    on conflict(service_order_id,part_id) do update set quantity=excluded.quantity,unit_cost_snapshot=excluded.unit_cost_snapshot,
      sale_price_snapshot=excluded.sale_price_snapshot,status='pending',consumed_at=null,consumed_by=null,updated_at=now();
    v_saved:=v_saved+1;
  end loop;
  return jsonb_build_object('ok',true,'saved',v_saved,'order_code',v_order.code);
end $$;

revoke all on function public.save_service_order_parts(bigint,jsonb) from public;
grant execute on function public.save_service_order_parts(bigint,jsonb) to authenticated;
