-- MAIN. Lecturas personales en Staff; no cambia mensajes, estados de Meta ni clientes.
begin;
create table if not exists public.whatsapp_staff_reads (
 user_id uuid not null,message_id uuid not null references public.whatsapp_message_log(id) on delete cascade,
 read_at timestamptz not null default now(),primary key(user_id,message_id)
);
alter table public.whatsapp_staff_reads enable row level security;
revoke all on public.whatsapp_staff_reads from public,anon,authenticated;
grant all on public.whatsapp_staff_reads to service_role;
create index if not exists whatsapp_inbound_alert_idx on public.whatsapp_message_log(phone_e164,created_at desc,id desc) where direction='inbound';
create or replace function public.ts_whatsapp_alerts(p_user uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if p_user is null then raise exception 'Sesión de usuario requerida';end if;
 with unread as (
 select m.phone_e164,count(*) as unread_count,(array_agg(m.id order by m.created_at desc,m.id desc))[1] as latest_id,max(m.created_at) as latest_at
 from public.whatsapp_message_log m where m.direction='inbound' and m.phone_e164 is not null and not exists(select 1 from public.whatsapp_staff_reads r where r.user_id=p_user and r.message_id=m.id) group by m.phone_e164
 ), top_rows as (select u.*,c.name from unread u left join public.whatsapp_contacts c using(phone_e164) order by latest_at desc,latest_id desc limit 100)
 select jsonb_build_object('total',coalesce((select sum(unread_count) from unread),0),'conversations',coalesce((select jsonb_agg(to_jsonb(t)) from top_rows t),'[]'::jsonb)) into result;
 return result;
end $$;
create or replace function public.ts_whatsapp_inbox(p_user uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_user is null then raise exception 'Sesión de usuario requerida';end if;
 return coalesce((select jsonb_agg(to_jsonb(t)) from (
 select c.*,l.body_preview as latest_preview,l.direction as latest_direction,l.created_at as latest_at,l.status as latest_status,
 (select count(*) from public.whatsapp_message_log m where m.phone_e164=c.phone_e164 and m.direction='inbound' and not exists(select 1 from public.whatsapp_staff_reads r where r.user_id=p_user and r.message_id=m.id)) as unread_count
 from public.whatsapp_contacts c left join lateral(select body_preview,direction,created_at,status from public.whatsapp_message_log m where m.phone_e164=c.phone_e164 order by created_at desc,id desc limit 1) l on true
 order by coalesce(l.created_at,c.last_inbound_at,c.created_at) desc,c.phone_e164 limit 200
 ) t),'[]'::jsonb);
end $$;
create or replace function public.ts_whatsapp_mark_read(p_user uuid,p_phone text,p_ids uuid[]) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
 if p_user is null or p_phone !~ '^[0-9]{8,15}$' or p_ids is null or cardinality(p_ids)>100 then raise exception 'Lectura inválida';end if;
 insert into public.whatsapp_staff_reads(user_id,message_id)
 select p_user,m.id from public.whatsapp_message_log m where m.id=any(p_ids) and m.phone_e164=p_phone and m.direction='inbound' on conflict do nothing;
 get diagnostics n=row_count;return n;
end $$;
revoke all on function public.ts_whatsapp_alerts(uuid),public.ts_whatsapp_inbox(uuid),public.ts_whatsapp_mark_read(uuid,text,uuid[]) from public,anon,authenticated;
grant execute on function public.ts_whatsapp_alerts(uuid),public.ts_whatsapp_inbox(uuid),public.ts_whatsapp_mark_read(uuid,text,uuid[]) to service_role;
notify pgrst,'reload schema';
commit;
