-- Document cancellation is distinct from payment reversal. Installing changes no orders.
begin;
create or replace function public.ts_enterprise_void_sale_document(p_order_id uuid,p_actor uuid,p_email text,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.pedidos%rowtype; before_row jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Acceso no autorizado'; end if;
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'Indica un motivo de al menos 5 caracteres'; end if;
 select * into o from public.pedidos where id=p_order_id for update;
 if not found then raise exception 'Venta no encontrada'; end if;
 if lower(coalesce(o.estado,'')) like '%cancel%' then return jsonb_build_object('ok',true,'already_void',true,'cash_changed',false); end if;
 before_row:=to_jsonb(o);
 -- Do not touch payment decisions, amounts, receipt records, cash, treasury or inventory.
 -- The unpaid action remains available to release only outstanding reservations.
 update public.pedidos set estado='Cancelado',payment_decision_locked=true,updated_at=now() where id=o.id;
 insert into public.order_status_history(pedido_id,estado,nota) values(o.id,'Cancelado','Anulación documental Enterprise por '||coalesce(p_email,p_actor::text)||'. Motivo: '||left(p_reason,500)||'. Pagos e inventario conservados; cualquier devolución o corrección se revisa por separado.');
 insert into public.admin_audit_log(actor_email,action,entity_type,entity_id,before_data,after_data) values(p_email,'enterprise_void_document_preserve_cash','pedido',o.id::text,before_row,jsonb_build_object('estado','Cancelado','reason',left(p_reason,500),'actor_id',p_actor,'cash_changed',false,'inventory_changed',false));
 return jsonb_build_object('ok',true,'id',o.id,'code',o.codigo,'cash_changed',false,'inventory_changed',false);
end $$;
revoke all on function public.ts_enterprise_void_sale_document(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.ts_enterprise_void_sale_document(uuid,uuid,text,text) to service_role;
notify pgrst,'reload schema';
commit;
