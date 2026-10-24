-- Supabase SOPORTE tnezvnziqnjxhcwjtcuy. No genera pagos, inventario ni tesorería.
begin;
create schema if not exists ts_migration_backup;
revoke all on schema ts_migration_backup from public,anon,authenticated;
create table if not exists ts_migration_backup.service_orders_pre_integral_20261024 as table public.service_orders;
alter table ts_migration_backup.service_orders_pre_integral_20261024 enable row level security;
revoke all on ts_migration_backup.service_orders_pre_integral_20261024 from public,anon,authenticated;
alter table public.service_orders add column if not exists thinkstore_request_id uuid;
create unique index if not exists service_order_request_unique on public.service_orders(thinkstore_request_id) where thinkstore_request_id is not null;
create or replace function public.ts_order_from_request(p_data jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.service_orders; rid uuid; folio text;
begin
 rid:=(p_data->>'request_id')::uuid;
 if rid is null or nullif(p_data->>'customer_approved_at','') is null or length(trim(coalesce(p_data->>'confirmation','')))<8 then raise exception 'Falta autorización o inicio del servicio'; end if;
 perform pg_advisory_xact_lock(hashtextextended(rid::text,617));
 select * into r from public.service_orders where thinkstore_request_id=rid;
 if found then return to_jsonb(r); end if;
 folio:=public.next_service_order_code();
 if folio !~ '^TS-SVC-[0-9]{4}-[0-9]{4,}$' then raise exception 'Numeración de Soporte inválida'; end if;
 insert into public.service_orders(thinkstore_request_id,code,client_name,client_phone,client_email,device_model,reported_issue,status,service_mode,created_by_email,assigned_technician_email,quote_amount,quote_currency,quote_status,quote_repair_details,quote_approved_at,payment_status,amount_paid,public_token,reception_checklist)
 values(rid,folio,p_data->>'client_name',p_data->>'client_phone',nullif(p_data->>'client_email',''),p_data->>'device_model',p_data->>'reported_issue','Pendiente de atención',case when p_data->>'request_type' in ('think_care','technical_visit','business') then 'Domicilio' else 'Presencial' end,p_data->>'created_by_email',nullif(p_data->>'assigned_technician_email',''),nullif(p_data->>'quote_amount','')::numeric,'USD',case when nullif(p_data->>'quote_amount','') is not null then 'Aprobada' else 'Pendiente' end,p_data->>'quote_details',(p_data->>'customer_approved_at')::timestamptz,'Pendiente',0,gen_random_uuid(),jsonb_build_object('__request',jsonb_build_object('id',rid,'authorization',p_data->>'approval_evidence','service_started',p_data->>'confirmation','location',p_data->>'location','service',p_data->>'service')))
 returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.ts_order_from_request(jsonb) from public,anon,authenticated;
grant execute on function public.ts_order_from_request(jsonb) to service_role;
notify pgrst,'reload schema';
commit;
