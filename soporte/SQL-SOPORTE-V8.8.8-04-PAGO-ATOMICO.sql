create or replace function public.apply_service_payment_and_inventory(
  p_order_id bigint,
  p_amount_paid numeric,
  p_payment_status text,
  p_payment_method text,
  p_payment_notes text,
  p_paid_at timestamptz,
  p_actor_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_order public.service_orders;
  v_updated public.service_orders;
  v_inventory jsonb:=jsonb_build_object('ok',true,'lines',0,'units',0,'total_cost',0,'items','[]'::jsonb);
begin
  if coalesce(auth.role(),'')<>'service_role' and public.current_service_role() not in ('superadmin','admin','reception','technician','sales') then
    raise exception 'Acceso no autorizado';
  end if;
  select * into v_order from public.service_orders where id=p_order_id for update;
  if not found then raise exception 'Orden no encontrada'; end if;
  if lower(coalesce(p_payment_status,'')) in ('cobrado','pagado') then
    v_inventory:=public.consume_service_order_parts(p_order_id,p_actor_email);
  end if;
  update public.service_orders
  set amount_paid=greatest(0,coalesce(p_amount_paid,0)),
      payment_status=coalesce(nullif(trim(p_payment_status),''),'Pendiente'),
      payment_method=nullif(trim(p_payment_method),''),
      payment_notes=nullif(trim(p_payment_notes),''),
      paid_at=p_paid_at,
      updated_at=now()
  where id=p_order_id
  returning * into v_updated;
  return jsonb_build_object('ok',true,'order',to_jsonb(v_updated),'inventory',v_inventory);
end $$;

revoke all on function public.apply_service_payment_and_inventory(bigint,numeric,text,text,text,timestamptz,text) from public;
grant execute on function public.apply_service_payment_and_inventory(bigint,numeric,text,text,text,timestamptz,text) to authenticated,service_role;
