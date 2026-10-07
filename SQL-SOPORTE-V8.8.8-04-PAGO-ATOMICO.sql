-- ThinkStore Soporte V8.8.8 · 04 · Pago + inventario en una sola transacción
-- Requiere SQL 01, 02 y 03 + historial de abonos V8.8.5.
begin;

create or replace function public.ts_service_record_payment_atomic(
  p_order_code text,
  p_amount_delta numeric,
  p_payment_method text,
  p_reference text default null,
  p_notes text default null,
  p_actor_email text default null,
  p_currency text default 'USD',
  p_original_amount numeric default null,
  p_bcv_rate numeric default null,
  p_bcv_effective_date date default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  o public.service_orders%rowtype;
  v_before numeric(12,2);
  v_after numeric(12,2);
  v_total numeric(12,2);
  v_final boolean;
  v_consume jsonb:=jsonb_build_object('ok',true,'lines',0,'direct_parts_cost',0);
  v_note text;
begin
  if p_amount_delta is null or p_amount_delta<=0 then raise exception 'Monto de pago inválido'; end if;

  select * into o from public.service_orders where upper(code)=upper(trim(p_order_code)) for update;
  if not found then raise exception 'Orden no encontrada'; end if;
  if lower(coalesce(o.status,'')) in ('cancelado','no aprobado') then raise exception 'La orden no admite cobros'; end if;

  v_total:=round(coalesce(o.quote_amount,0),2);
  v_before:=round(coalesce(o.amount_paid,0),2);
  if v_total<=0 then raise exception 'La orden no tiene un presupuesto válido'; end if;
  if v_before>=v_total then raise exception 'La reparación ya está cobrada'; end if;
  if round(v_before+p_amount_delta,2)>round(v_total,2) then
    raise exception 'El pago supera el saldo pendiente. Saldo: %',round(v_total-v_before,2);
  end if;

  v_after:=round(v_before+p_amount_delta,2);
  v_final:=v_after>=v_total;

  -- Si el pago completa el saldo, primero consume el inventario reservado.
  -- Si falta stock, esta función lanza excepción y TODO el pago se revierte.
  if v_final then
    v_consume:=public.ts_consume_reserved_service_parts(o.code,p_actor_email);
  end if;

  v_note:=concat_ws(' · ',
    nullif(trim(p_notes),''),
    case when nullif(trim(p_reference),'') is not null then 'Ref. '||trim(p_reference) end,
    case when upper(coalesce(p_currency,'USD'))='VES' and p_bcv_rate is not null then 'BCV '||p_bcv_rate::text end,
    case when upper(coalesce(p_currency,'USD'))='VES' and p_original_amount is not null then 'Recibido Bs. '||round(p_original_amount,2)::text end,
    case when p_bcv_effective_date is not null then 'Vigencia '||p_bcv_effective_date::text end,
    nullif(trim(p_actor_email),'')
  );

  update public.service_orders
     set amount_paid=v_after,
         payment_status=case when v_final then 'Cobrado' else 'Abono parcial' end,
         payment_method=nullif(trim(p_payment_method),''),
         payment_notes=left(concat_ws(E'\n',nullif(trim(coalesce(o.payment_notes,'')),''),v_note),1800),
         paid_at=now(),
         delivery_note_generated_at=case when v_final then coalesce(delivery_note_generated_at,now()) else delivery_note_generated_at end,
         updated_at=now()
   where id=o.id;

  return jsonb_build_object(
    'ok',true,
    'order_code',o.code,
    'before',v_before,
    'after',v_after,
    'total',v_total,
    'pending',greatest(0,round(v_total-v_after,2)),
    'fully_paid',v_final,
    'payment_status',case when v_final then 'Cobrado' else 'Abono parcial' end,
    'inventory',v_consume,
    'delivery_note_ready',v_final
  );
end;
$$;

revoke all on function public.ts_service_record_payment_atomic(text,numeric,text,text,text,text,text,numeric,numeric,date) from public;
grant execute on function public.ts_service_record_payment_atomic(text,numeric,text,text,text,text,text,numeric,numeric,date) to service_role;
notify pgrst,'reload schema';
commit;
