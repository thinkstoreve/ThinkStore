-- Adds auditable soft void actions. Installing does not void any operation.
begin;
create or replace function public.ts_enterprise_void_order(p_order_id uuid,p_actor uuid,p_email text,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.pedidos%rowtype; j jsonb; released jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Acceso no autorizado'; end if;
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'Indica un motivo de al menos 5 caracteres'; end if;
 select * into o from public.pedidos where id=p_order_id for update;
 if not found then raise exception 'Venta no encontrada'; end if;
 j:=to_jsonb(o);
 if lower(coalesce(o.estado,'')) like '%cancel%' then return jsonb_build_object('ok',true,'already_void',true,'id',o.id); end if;
 if j->>'payment_decision'='approved'
 or coalesce((j->>'paid_usd')::numeric,(j->>'amount_paid')::numeric,(j->>'monto_pagado')::numeric,0)>0
 or lower(coalesce(o.estado,'')) ~ 'verificado|entreg|enviad|preparando|comprando|disponible|tránsito|transito'
 or exists(select 1 from public.ts_order_payments where pedido_id=o.id and status in ('confirmed','pending'))
 or exists(select 1 from public.comprobantes where pedido_id=o.id)
 or nullif(trim(coalesce(j->>'referencia_pago','')),'') is not null then
  raise exception 'La venta tiene pagos, comprobantes o entrega. Revisa el cobro y su devolución en la venta de origen. No se ha modificado la caja.';
 end if;
 update public.pedidos set estado='Cancelado',payment_decision_locked=true,updated_at=now() where id=o.id;
 released:=public.ts_release_inventory(o.id,'Anulación Enterprise: '||left(p_reason,500));
 if released->>'ok' is distinct from 'true' then raise exception 'No se pudo liberar la reserva; se canceló la anulación'; end if;
 insert into public.order_status_history(pedido_id,estado,nota) values(o.id,'Cancelado','Anulado desde Enterprise por '||coalesce(p_email,p_actor::text)||'. Motivo: '||left(p_reason,500));
 insert into public.admin_audit_log(actor_email,action,entity_type,entity_id,before_data,after_data) values(p_email,'enterprise_void_unpaid_sale','pedido',o.id::text,j,jsonb_build_object('estado','Cancelado','reason',left(p_reason,500),'actor_id',p_actor));
 return jsonb_build_object('ok',true,'id',o.id,'code',o.codigo,'cash_changed',false);
end $$;
revoke all on function public.ts_enterprise_void_order(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.ts_enterprise_void_order(uuid,uuid,text,text) to service_role;
create or replace function public.ts_enterprise_void_entry(p_entry_id uuid,p_actor uuid,p_email text,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare e public.enterprise_finance_entries%rowtype; stamp jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Acceso no autorizado'; end if;
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'Indica un motivo de al menos 5 caracteres'; end if;
 select * into e from public.enterprise_finance_entries where id=p_entry_id for update;
 if not found then raise exception 'Movimiento no encontrado'; end if;
 if e.status='void' then return jsonb_build_object('ok',true,'already_void',true,'id',e.id); end if;
 if coalesce(nullif(trim(e.source_system),''),'manual') not in ('manual','enterprise') then raise exception 'Este registro proviene de otro sistema. Gestiona su anulación en el origen para mantenerlo sincronizado.'; end if;
 if exists(select 1 from public.enterprise_finance_entries where related_entry_id=e.id and status<>'void') then raise exception 'El movimiento tiene abonos o pagos vinculados. Revisa primero esos movimientos.'; end if;
 stamp:=jsonb_build_object('reason',left(p_reason,500),'actor_id',p_actor,'actor_email',p_email,'at',now(),'previous_status',e.status);
 update public.enterprise_finance_entries set status='void',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('void',stamp) where id=e.id;
 insert into public.admin_audit_log(actor_email,action,entity_type,entity_id,before_data,after_data) values(p_email,'enterprise_void_entry','enterprise_finance_entry',e.id::text,to_jsonb(e),stamp);
 return jsonb_build_object('ok',true,'id',e.id,'status','void');
end $$;
revoke all on function public.ts_enterprise_void_entry(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.ts_enterprise_void_entry(uuid,uuid,text,text) to service_role;
-- A collection or payment cannot be added to a void parent after cancellation.
create or replace function public.ts_enterprise_check_parent_entry() returns trigger language plpgsql set search_path=public as $$
declare parent_status text;
begin
 if new.related_entry_id is not null and new.status<>'void' then
  select status into parent_status from public.enterprise_finance_entries where id=new.related_entry_id for key share;
  if parent_status='void' then raise exception 'El movimiento vinculado está anulado'; end if;
 end if;
 return new;
end $$;
drop trigger if exists ts_enterprise_check_parent_entry on public.enterprise_finance_entries;
create trigger ts_enterprise_check_parent_entry before insert or update on public.enterprise_finance_entries for each row execute function public.ts_enterprise_check_parent_entry();
notify pgrst,'reload schema';
commit;
