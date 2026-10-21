-- No borra pedidos ni pagos. Cancelación o solicitud auditable en una transacción.
begin;
create or replace function public.ts_client_cancel_order(p_order_id uuid,p_customer_id uuid,p_reason text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.pedidos%rowtype; j jsonb; st text; has_payment boolean; release_result jsonb; message text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Acceso no autorizado'; end if;
 select * into o from public.pedidos where id=p_order_id and cliente_id=p_customer_id for update;
 if not found then raise exception 'Pedido no encontrado en tu cuenta'; end if;
 j:=to_jsonb(o); st:=lower(coalesce(o.estado,''));
 if st like '%cancel%' then return jsonb_build_object('cancelled',true,'message','Este pedido ya está cancelado.'); end if;
 if st ~ 'entreg|enviad|tránsito|transito' then raise exception 'El pedido ya fue enviado o entregado. Contacta con ThinkStore para gestionar el caso.'; end if;
 has_payment:=coalesce(j->>'payment_decision','')='approved'
  or coalesce((j->>'payment_decision_locked')::boolean,false)
  or st ~ 'verificado|preparando|comprando|disponible'
  or nullif(trim(coalesce(j->>'referencia_pago','')),'') is not null
  or coalesce((j->>'paid_usd')::numeric,(j->>'amount_paid')::numeric,(j->>'monto_pagado')::numeric,0)>0
  or exists(select 1 from public.ts_order_payments where pedido_id=o.id and status='confirmed')
  or exists(select 1 from public.comprobantes where pedido_id=o.id);
 if has_payment then
  if not exists(select 1 from public.order_status_history where pedido_id=o.id and nota like 'Solicitud de cancelación del cliente:%') then
   insert into public.order_status_history(pedido_id,estado,nota) values(o.id,o.estado,'Solicitud de cancelación del cliente: '||left(coalesce(nullif(trim(p_reason),''),'Sin motivo indicado'),500)||'. Revisar pagos antes de resolver.');
  end if;
  return jsonb_build_object('cancelled',false,'requested',true,'message','Administración recibió tu solicitud. Como hay un pago reportado, confirmado o una operación en curso, revisaremos el caso antes de cancelar. No se ha anulado ningún pago.');
 end if;
 -- Bloquea la decisión y libera exclusivamente las reservas: nunca devuelve vendidos al stock.
 update public.pedidos set estado='Cancelado',payment_decision_locked=true,updated_at=now() where id=o.id;
 release_result:=public.ts_release_inventory(o.id,'Cancelación solicitada por el cliente '||o.codigo);
 if release_result->>'ok' is distinct from 'true' then raise exception 'No se pudo liberar la reserva. No se canceló el pedido.'; end if;
 insert into public.order_status_history(pedido_id,estado,nota) values(o.id,'Cancelado','Cancelado por el cliente sin pagos registrados. Motivo: '||left(coalesce(nullif(trim(p_reason),''),'Sin motivo indicado'),500));
 return jsonb_build_object('cancelled',true,'message','Tu pedido fue cancelado y su reserva de inventario liberada.');
end $$;
revoke all on function public.ts_client_cancel_order(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.ts_client_cancel_order(uuid,uuid,text) to service_role;
-- Un reporte o una aprobación concurrente no puede resucitar un pedido cancelado.
create or replace function public.ts_protect_cancelled_order() returns trigger language plpgsql set search_path=public as $$
begin
 if lower(coalesce(old.estado,'')) like '%cancel%' and (new.estado is distinct from old.estado or (new.payment_decision='approved' and old.payment_decision is distinct from 'approved')) then
  raise exception 'Pedido cancelado: crea un nuevo pedido para continuar.';
 end if;
 return new;
end $$;
drop trigger if exists ts_protect_cancelled_order on public.pedidos;
create trigger ts_protect_cancelled_order before update on public.pedidos for each row execute function public.ts_protect_cancelled_order();
notify pgrst,'reload schema';
commit;
