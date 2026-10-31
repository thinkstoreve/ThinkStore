begin;
create table if not exists public.ts_imported_customers (
 id uuid primary key, source_key text not null unique, nombre text not null,
 correo text, telefono text, cedula_rif text, direccion text, ciudad text, estado text,
 telefonos jsonb not null default '[]', correos jsonb not null default '[]',
 source_records jsonb not null default '[]', source text not null default 'iCenter / FileMaker',
 marketing_whatsapp_consent boolean not null default false,
 marketing_email_consent boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.ts_imported_customers enable row level security;
revoke all on public.ts_imported_customers from public,anon,authenticated;
grant select,insert,update on public.ts_imported_customers to service_role;
create or replace view public.ts_customer_directory with (security_invoker=true) as
select id,nombre,correo,telefono,cedula_rif,direccion,ciudad,estado,created_at,'Registrado'::text as source
from public.clientes
union all
select i.id,i.nombre,i.correo,i.telefono,i.cedula_rif,i.direccion,i.ciudad,i.estado,i.created_at,i.source
from public.ts_imported_customers i
where not exists (select 1 from public.clientes c where
 (nullif(lower(trim(c.correo)),'') is not null and i.correos ? lower(trim(c.correo)))
 or (length(regexp_replace(coalesce(c.telefono,''),'[^0-9]','','g'))>=10 and exists (select 1 from jsonb_array_elements_text(i.telefonos) p where right(regexp_replace(p,'[^0-9]','','g'),10)=right(regexp_replace(c.telefono,'[^0-9]','','g'),10)))
 or (length(regexp_replace(coalesce(c.cedula_rif,''),'[^0-9]','','g'))>=5 and regexp_replace(c.cedula_rif,'[^0-9]','','g')=regexp_replace(i.cedula_rif,'[^0-9]','','g')));
revoke all on public.ts_customer_directory from public,anon,authenticated;
grant select on public.ts_customer_directory to service_role;
commit;
select count(*) as directorio_actual from public.ts_customer_directory;
