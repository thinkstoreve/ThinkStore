-- =============================================================
-- THINKSTORE · SQL PRINCIPAL FINAL
-- Main V14.75 · Enterprise V10.9 · Inventory V3.2.30
-- Ejecutar en el Supabase PRINCIPAL de ThinkStore.
-- Incluye: aislamiento clientes, invitaciones internas, identidad Freddy,
-- identidad Inventory, Finanzas Centrales, costos/COGS/compras/proveedores
-- y conciliación semanal por método de pago.
-- Es acumulativo para estas mejoras: NO requiere ejecutar sus SQL anteriores.
-- =============================================================

-- ThinkStore V14.71 · Aislamiento Clientes compatible con profiles_role_check
-- Ejecutar UNA VEZ en el Supabase PRINCIPAL.
-- IMPORTANTE: NO cambia profiles.role a 'cliente' porque este proyecto usa un CHECK
-- que no acepta ese valor. La separación Cliente/Personal se hace con is_internal.

begin;

alter table public.profiles
  add column if not exists is_internal boolean not null default false,
  add column if not exists internal_origin text,
  add column if not exists internal_invited_at timestamptz,
  add column if not exists internal_invited_by uuid references auth.users(id) on delete set null;

create index if not exists profiles_is_internal_idx
  on public.profiles (is_internal)
  where is_internal = true;

-- Limpia cualquier trigger antiguo que intentara escribir role='cliente'.
drop trigger if exists trg_thinkstore_enforce_public_client_role on public.profiles;
drop trigger if exists trg_thinkstore_enforce_public_client_rol on public.profiles;
drop trigger if exists trg_thinkstore_enforce_internal_profile on public.profiles;
drop function if exists public.thinkstore_enforce_public_client_role();
drop function if exists public.thinkstore_enforce_public_client_rol();
drop function if exists public.thinkstore_enforce_internal_profile();

-- 1) Personal creado por invitación administrativa: metadata de Auth manda.
update public.profiles p
set is_internal = true,
    internal_origin = coalesce(p.internal_origin,'panel_invite'),
    internal_invited_at = coalesce(p.internal_invited_at,p.created_at,now())
from auth.users u
where u.id=p.id
  and (
    lower(coalesce(u.raw_app_meta_data->>'thinkstore_internal','')) in ('true','1','yes')
    or lower(coalesce(u.raw_user_meta_data->>'thinkstore_internal','')) in ('true','1','yes')
  );

-- 2) Admin / Super Admin bootstrap existentes se conservan SIEMPRE como internos.
do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role') then
    execute $q$
      update public.profiles p
      set is_internal=true,
          internal_origin=coalesce(p.internal_origin,'legacy_admin'),
          internal_invited_at=coalesce(p.internal_invited_at,p.created_at,now())
      where lower(replace(coalesce(p.role,''),' ','_')) in
        ('admin','administrator','gerente','superadmin','super_admin')
    $q$;
  end if;

  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='rol') then
    execute $q$
      update public.profiles p
      set is_internal=true,
          internal_origin=coalesce(p.internal_origin,'legacy_admin'),
          internal_invited_at=coalesce(p.internal_invited_at,p.created_at,now())
      where lower(replace(coalesce(p.rol,''),' ','_')) in
        ('admin','administrator','gerente','superadmin','super_admin')
    $q$;
  end if;
end $$;

-- 3) Personal histórico legítimo: rol interno y NO existe como cliente público.
do $$
begin
  if to_regclass('public.clientes') is not null then
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role') then
      execute $q$
        update public.profiles p
        set is_internal=true,
            internal_origin=coalesce(p.internal_origin,'legacy_staff'),
            internal_invited_at=coalesce(p.internal_invited_at,p.created_at,now())
        where coalesce(p.is_internal,false)=false
          and lower(replace(coalesce(p.role,''),' ','_')) in
            ('vendedor','recepcion','recepción','soporte','tecnico','técnico','logistica','logística','marketing')
          and not exists(select 1 from public.clientes c where c.id=p.id)
      $q$;
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='rol') then
      execute $q$
        update public.profiles p
        set is_internal=true,
            internal_origin=coalesce(p.internal_origin,'legacy_staff'),
            internal_invited_at=coalesce(p.internal_invited_at,p.created_at,now())
        where coalesce(p.is_internal,false)=false
          and lower(replace(coalesce(p.rol,''),' ','_')) in
            ('vendedor','recepcion','recepción','soporte','tecnico','técnico','logistica','logística','marketing')
          and not exists(select 1 from public.clientes c where c.id=p.id)
      $q$;
    end if;
  end if;
end $$;

-- 4) Todo usuario que existe en clientes y NO fue marcado explícitamente como personal
-- queda fuera de los paneles. NO tocamos role/rol para respetar profiles_role_check.
do $$
begin
  if to_regclass('public.clientes') is not null then
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role') then
      execute $q$
        update public.profiles p
        set is_internal=false,
            internal_origin=null,
            internal_invited_at=null,
            internal_invited_by=null
        where exists(select 1 from public.clientes c where c.id=p.id)
          and lower(replace(coalesce(p.role,''),' ','_')) not in
            ('admin','administrator','gerente','superadmin','super_admin')
          and not exists (
            select 1 from auth.users u
            where u.id=p.id
              and (
                lower(coalesce(u.raw_app_meta_data->>'thinkstore_internal','')) in ('true','1','yes')
                or lower(coalesce(u.raw_user_meta_data->>'thinkstore_internal','')) in ('true','1','yes')
              )
          )
      $q$;
    elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='rol') then
      execute $q$
        update public.profiles p
        set is_internal=false,
            internal_origin=null,
            internal_invited_at=null,
            internal_invited_by=null
        where exists(select 1 from public.clientes c where c.id=p.id)
          and lower(replace(coalesce(p.rol,''),' ','_')) not in
            ('admin','administrator','gerente','superadmin','super_admin')
          and not exists (
            select 1 from auth.users u
            where u.id=p.id
              and (
                lower(coalesce(u.raw_app_meta_data->>'thinkstore_internal','')) in ('true','1','yes')
                or lower(coalesce(u.raw_user_meta_data->>'thinkstore_internal','')) in ('true','1','yes')
              )
          )
      $q$;
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='custom_role_key') then
      execute $q$
        update public.profiles p set custom_role_key=null
        where coalesce(p.is_internal,false)=false
          and exists(select 1 from public.clientes c where c.id=p.id)
      $q$;
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='permission_overrides') then
      execute $q$
        update public.profiles p set permission_overrides='{"allow":[],"deny":[]}'::jsonb
        where coalesce(p.is_internal,false)=false
          and exists(select 1 from public.clientes c where c.id=p.id)
      $q$;
    end if;
  end if;
end $$;

comment on column public.profiles.is_internal is
  'TRUE exclusivamente para personal ThinkStore autorizado. FALSE para clientes, aunque profiles.role conserve un valor legado por compatibilidad del CHECK.';

commit;

-- VERIFICACIÓN 1: clientes expuestos como internos. Debe devolver 0 filas.
select p.id, p.email, p.role, p.is_internal
from public.profiles p
where coalesce(p.is_internal,false)=true
  and exists(select 1 from public.clientes c where c.id=p.id)
  and lower(replace(coalesce(p.role,''),' ','_')) not in
      ('admin','administrator','gerente','superadmin','super_admin')
order by p.created_at desc;

-- VERIFICACIÓN 2: personal interno real.
select p.id, p.email, p.role, p.is_internal, p.internal_origin
from public.profiles p
where coalesce(p.is_internal,false)=true
order by p.created_at desc;


-- ===== INVITACIONES INTERNAS / ROLE CHECK =====
-- ThinkStore V14.72 · Invitaciones internas compatibles con profiles_role_check
-- Ejecutar UNA VEZ en el Supabase PRINCIPAL.
-- No elimina ni modifica profiles_role_check.
-- Corrige el trigger histórico handle_new_user() para normalizar roles antes de insertar.

begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='role'
  ) then
    execute $fn$
      create or replace function public.handle_new_user()
      returns trigger
      language plpgsql
      security definer
      set search_path = public
      as $body$
      declare
        requested_role text;
        safe_role text;
      begin
        requested_role := lower(replace(replace(coalesce(new.raw_user_meta_data->>'role',''),'-','_'),' ','_'));

        -- Canonicaliza valores de interfaz a los admitidos por el esquema Growth.
        safe_role := case requested_role
          when 'superadmin' then 'super_admin'
          when 'super_admin' then 'super_admin'
          when 'administrator' then 'admin'
          when 'admin' then 'admin'
          when 'gerente' then 'gerente'
          when 'vendedor' then 'vendedor'
          when 'sales' then 'vendedor'
          when 'tecnico' then 'tecnico'
          when 'technician' then 'tecnico'
          when 'recepcion' then 'recepcion'
          when 'reception' then 'recepcion'
          when 'soporte' then 'recepcion'
          when 'support' then 'recepcion'
          when 'logistica' then 'logistica'
          when 'logistics' then 'logistica'
          when 'marketing' then 'marketing'
          else 'vendedor'
        end;

        insert into public.profiles (id, email, full_name, role, active)
        values (
          new.id,
          new.email,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
          safe_role,
          true
        )
        on conflict (id) do nothing;

        return new;
      end;
      $body$;
    $fn$;
  end if;
end $$;

-- Asegura que el trigger siga apuntando a la función corregida.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='role'
  ) then
    drop trigger if exists on_auth_user_created on auth.users;
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

commit;

-- Verificación opcional: debe devolver la definición de profiles_role_check sin modificarla.
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid='public.profiles'::regclass
  and conname='profiles_role_check';


-- ===== IDENTIDAD PRINCIPAL =====
-- ThinkStore Main / Enterprise V14.72 · Identidad canónica Freddy Sedispa
-- Ejecutar en el Supabase PRINCIPAL de ThinkStore.
-- Solo corrige nombre visible/metadata. No cambia correo, contraseña, teléfono, documento, roles ni permisos.

begin;

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data,'{}'::jsonb)
  || jsonb_build_object('full_name','Freddy Sedispa','name','Freddy Sedispa')
where lower(email)='thinkstore.ve@gmail.com';

do $$
begin
  if to_regclass('public.profiles') is not null then
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='full_name') then
      execute $q$update public.profiles set full_name='Freddy Sedispa' where lower(coalesce(email,''))='thinkstore.ve@gmail.com'$q$;
    end if;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='nombre') then
      if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='email') then
        execute $q$update public.profiles set nombre='Freddy Sedispa' where lower(coalesce(email,''))='thinkstore.ve@gmail.com'$q$;
      elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='correo') then
        execute $q$update public.profiles set nombre='Freddy Sedispa' where lower(coalesce(correo,''))='thinkstore.ve@gmail.com'$q$;
      end if;
    end if;
  end if;

  if to_regclass('public.roles_usuarios') is not null then
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='roles_usuarios' and column_name='full_name') then
      execute $q$update public.roles_usuarios set full_name='Freddy Sedispa' where lower(coalesce(email,''))='thinkstore.ve@gmail.com'$q$;
    end if;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='roles_usuarios' and column_name='nombre') then
      execute $q$update public.roles_usuarios set nombre='Freddy Sedispa' where lower(coalesce(email,''))='thinkstore.ve@gmail.com'$q$;
    end if;
  end if;
end $$;

commit;

select id,email,raw_user_meta_data->>'full_name' as full_name
from auth.users
where lower(email)='thinkstore.ve@gmail.com';


-- ===== IDENTIDAD INVENTORY (MISMO SUPABASE PRINCIPAL) =====
-- ThinkStore Inventory V3.2.29 · Identidad canónica global Freddy Sedispa
-- Ejecutar en el Supabase de INVENTORY.
-- No modifica contraseña, teléfono, documento ni permisos.

begin;

update public.thinkstore_inventory_users iu
set full_name='Freddy Sedispa', partner=true, role='super_admin', active=true, updated_at=now()
from auth.users au
where iu.user_id=au.id and lower(au.email)='thinkstore.ve@gmail.com';

update auth.users
set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)
  || jsonb_build_object('full_name','Freddy Sedispa','name','Freddy Sedispa','partner',true)
where lower(email)='thinkstore.ve@gmail.com';

update public.thinkstore_inventory_audit
set actor_name='Freddy Sedispa'
where lower(coalesce(actor_email,''))='thinkstore.ve@gmail.com';

update public.thinkstore_inventory_movements
set data=jsonb_set(
  jsonb_set(coalesce(data,'{}'::jsonb),'{user_name}',to_jsonb('Freddy Sedispa'::text),true),
  '{user_email}',to_jsonb('thinkstore.ve@gmail.com'::text),true
)
where lower(coalesce(data->>'user_email',''))='thinkstore.ve@gmail.com';

commit;

select iu.user_id,iu.full_name,iu.email,iu.role,iu.active
from public.thinkstore_inventory_users iu
join auth.users au on au.id=iu.user_id
where lower(au.email)='thinkstore.ve@gmail.com';


-- ===== FINANZAS + COSTOS + INVENTORY / COGS =====
-- =============================================================
-- ThinkStore MAIN · Enterprise V10.8 / Main V14.74 / Inventory V3.2.29
-- Migración consolidada para el Supabase PRINCIPAL.
-- Incluye Finanzas Centrales V10.7 + conexión real Inventory/COGS V10.8.
-- NO ejecutar todavía si se sigue en fase de mejoras.
-- =============================================================
-- ThinkStore Enterprise V10.7 · Finanzas Centrales
-- Ejecutar en el proyecto Supabase PRINCIPAL de ThinkStore.
-- No elimina ni modifica tablas operativas existentes.

begin;

create extension if not exists pgcrypto;

create table if not exists public.enterprise_finance_settings (
  id text primary key default 'default',
  company_share_pct numeric(6,3) not null default 50,
  freddy_share_pct numeric(6,3) not null default 25,
  nelson_share_pct numeric(6,3) not null default 25,
  technician_default_pct numeric(6,3) not null default 50,
  timezone text not null default 'America/Caracas',
  updated_at timestamptz not null default now(),
  constraint enterprise_finance_settings_split_check
    check (company_share_pct >= 0 and freddy_share_pct >= 0 and nelson_share_pct >= 0
      and abs((company_share_pct + freddy_share_pct + nelson_share_pct) - 100) < 0.001),
  constraint enterprise_finance_settings_tech_check
    check (technician_default_pct >= 0 and technician_default_pct <= 100)
);

insert into public.enterprise_finance_settings(id,company_share_pct,freddy_share_pct,nelson_share_pct,technician_default_pct)
values ('default',50,25,25,50)
on conflict (id) do nothing;

create table if not exists public.enterprise_finance_entries (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  entry_type text not null,
  category text,
  description text not null,
  amount_usd numeric(14,2) not null default 0,
  original_amount numeric(14,2),
  currency text not null default 'USD',
  exchange_rate numeric(18,6),
  payment_method text,
  reference text,
  counterparty text,
  partner_key text,
  funded_by text not null default 'company',
  source_system text not null default 'manual',
  source_id text,
  source_code text,
  related_entry_id uuid references public.enterprise_finance_entries(id) on delete set null,
  status text not null default 'posted',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_email text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enterprise_finance_entries_type_check check (entry_type in (
    'expense','purchase','refund','fee','warranty_cost','other_income',
    'receivable','receivable_collection','partner_advance','partner_repayment',
    'technician_commission','technician_payment','cash_adjustment'
  )),
  constraint enterprise_finance_entries_status_check check (status in ('pending','partial','paid','posted','void')),
  constraint enterprise_finance_entries_partner_check check (partner_key is null or partner_key in ('freddy','nelson')),
  constraint enterprise_finance_entries_funded_check check (funded_by in ('company','freddy','nelson')),
  constraint enterprise_finance_entries_amount_check check (amount_usd >= 0),
  constraint enterprise_finance_entries_currency_check check (char_length(currency) between 2 and 10)
);

create index if not exists enterprise_finance_entries_occurred_idx on public.enterprise_finance_entries(occurred_at desc);
create index if not exists enterprise_finance_entries_type_idx on public.enterprise_finance_entries(entry_type);
create index if not exists enterprise_finance_entries_partner_idx on public.enterprise_finance_entries(partner_key) where partner_key is not null;
create index if not exists enterprise_finance_entries_funded_idx on public.enterprise_finance_entries(funded_by);
create index if not exists enterprise_finance_entries_source_idx on public.enterprise_finance_entries(source_system,source_id);
create index if not exists enterprise_finance_entries_related_idx on public.enterprise_finance_entries(related_entry_id) where related_entry_id is not null;

create table if not exists public.enterprise_weekly_audits (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  status text not null default 'draft',
  gross_collected numeric(14,2) not null default 0,
  total_outflows numeric(14,2) not null default 0,
  distributable_profit numeric(14,2) not null default 0,
  company_share numeric(14,2) not null default 0,
  freddy_share numeric(14,2) not null default 0,
  nelson_share numeric(14,2) not null default 0,
  snapshot jsonb not null default '{}'::jsonb,
  notes text,
  created_by_email text,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint enterprise_weekly_audits_status_check check (status in ('draft','review','closed')),
  constraint enterprise_weekly_audits_period_check check (week_end >= week_start),
  unique(week_start,week_end)
);

create index if not exists enterprise_weekly_audits_week_idx on public.enterprise_weekly_audits(week_start desc);

-- Ledger financiero: lectura únicamente para administradores internos.
alter table public.enterprise_finance_entries enable row level security;
alter table public.enterprise_weekly_audits enable row level security;
alter table public.enterprise_finance_settings enable row level security;

drop policy if exists "Enterprise admins read finance entries" on public.enterprise_finance_entries;
create policy "Enterprise admins read finance entries" on public.enterprise_finance_entries
for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and coalesce(p.active,true)=true and p.role in ('super_admin','admin','gerente'))
  or exists(select 1 from public.roles_usuarios r where (r.id=auth.uid() or lower(r.email)=lower(coalesce(auth.jwt()->>'email',''))) and coalesce(r.activo,true)=true and r.rol in ('super_admin','admin','gerente'))
);

drop policy if exists "Enterprise admins read weekly audits" on public.enterprise_weekly_audits;
create policy "Enterprise admins read weekly audits" on public.enterprise_weekly_audits
for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and coalesce(p.active,true)=true and p.role in ('super_admin','admin','gerente'))
  or exists(select 1 from public.roles_usuarios r where (r.id=auth.uid() or lower(r.email)=lower(coalesce(auth.jwt()->>'email',''))) and coalesce(r.activo,true)=true and r.rol in ('super_admin','admin','gerente'))
);

drop policy if exists "Enterprise admins read finance settings" on public.enterprise_finance_settings;
create policy "Enterprise admins read finance settings" on public.enterprise_finance_settings
for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and coalesce(p.active,true)=true and p.role in ('super_admin','admin','gerente'))
  or exists(select 1 from public.roles_usuarios r where (r.id=auth.uid() or lower(r.email)=lower(coalesce(auth.jwt()->>'email',''))) and coalesce(r.activo,true)=true and r.rol in ('super_admin','admin','gerente'))
);

-- Las escrituras quedan centralizadas en la Function Enterprise con service_role.
-- Esto evita que una sesión del navegador pueda insertar o alterar movimientos directamente.

create or replace function public.enterprise_finance_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists enterprise_finance_entries_touch on public.enterprise_finance_entries;
create trigger enterprise_finance_entries_touch before update on public.enterprise_finance_entries
for each row execute function public.enterprise_finance_touch_updated_at();

drop trigger if exists enterprise_weekly_audits_touch on public.enterprise_weekly_audits;
create trigger enterprise_weekly_audits_touch before update on public.enterprise_weekly_audits
for each row execute function public.enterprise_finance_touch_updated_at();

notify pgrst, 'reload schema';
commit;


-- ===== CONEXIÓN INVENTORY / COSTOS / COMPRAS =====

-- ThinkStore Ecosistema V14.74 / Inventory V3.2.29 / Enterprise V10.8
-- Costos reales, compras, proveedores y snapshot de costo por venta.
-- Ejecutar UNA VEZ en el Supabase PRINCIPAL de ThinkStore antes de desplegar V14.74 / V3.2.29 / V10.8.
-- Es aditivo: no borra pedidos, clientes, inventario ni movimientos existentes.

begin;

create table if not exists public.thinkstore_inventory_purchases (
  workspace_key text not null default 'main',
  id text not null,
  data jsonb not null default '{}'::jsonb,
  primary key(workspace_key,id)
);
create index if not exists thinkstore_inventory_purchases_data_gin on public.thinkstore_inventory_purchases using gin(data);
create index if not exists thinkstore_inventory_purchases_date_idx on public.thinkstore_inventory_purchases(workspace_key, ((coalesce(data->>'purchase_date',data->>'created_at'))));

alter table public.thinkstore_inventory_purchases enable row level security;
drop policy if exists thinkstore_inventory_purchases_authorized_read on public.thinkstore_inventory_purchases;
create policy thinkstore_inventory_purchases_authorized_read
on public.thinkstore_inventory_purchases for select to authenticated
using (exists(select 1 from public.thinkstore_inventory_users iu where iu.user_id=auth.uid() and iu.active=true));
revoke insert,update,delete on public.thinkstore_inventory_purchases from anon,authenticated;
grant select on public.thinkstore_inventory_purchases to authenticated;

create or replace function public.inventory_get_state(p_workspace text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta public.thinkstore_inventory_meta%rowtype;
  v_payload jsonb;
  v_last_update jsonb;
  v_profile jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode='42501';
  end if;

  select to_jsonb(u)
  into v_profile
  from public.thinkstore_inventory_users u
  where u.user_id=auth.uid() and u.active=true;

  if v_profile is null then
    raise exception 'INVENTORY_ACCESS_DENIED' using errcode='42501';
  end if;

  select * into v_meta
  from public.thinkstore_inventory_meta
  where workspace_key=p_workspace;

  if not found then
    insert into public.thinkstore_inventory_meta(workspace_key,version)
    values(p_workspace,0)
    returning * into v_meta;
  end if;

  v_payload := jsonb_build_object(
    'products', coalesce((select jsonb_agg(data order by id) from public.thinkstore_inventory_products where workspace_key=p_workspace),'[]'::jsonb),
    'units', coalesce((select jsonb_agg(data order by id) from public.thinkstore_inventory_units where workspace_key=p_workspace),'[]'::jsonb),
    'stock', coalesce((select jsonb_agg(data order by id) from public.thinkstore_inventory_stock where workspace_key=p_workspace),'[]'::jsonb),
    'movements', coalesce((select jsonb_agg(data order by (data->>'created_at') desc nulls last) from public.thinkstore_inventory_movements where workspace_key=p_workspace),'[]'::jsonb),
    'locations', coalesce((select jsonb_agg(data order by id) from public.thinkstore_inventory_locations where workspace_key=p_workspace),'[]'::jsonb),
    'suppliers', coalesce((select jsonb_agg(data order by id) from public.thinkstore_inventory_suppliers where workspace_key=p_workspace),'[]'::jsonb),
    'purchases', coalesce((select jsonb_agg(data order by coalesce(data->>'purchase_date',data->>'created_at') desc nulls last) from public.thinkstore_inventory_purchases where workspace_key=p_workspace),'[]'::jsonb),
    'furniture', coalesce((select jsonb_agg(data order by id) from public.thinkstore_inventory_furniture where workspace_key=p_workspace),'[]'::jsonb)
  );

  select jsonb_build_object(
    'at',v_meta.updated_at,
    'user_id',u.user_id,
    'name',coalesce(u.full_name,u.email,'Usuario'),
    'email',u.email
  ) into v_last_update
  from public.thinkstore_inventory_users u
  where u.user_id=v_meta.updated_by;

  return jsonb_build_object(
    'profile',v_profile,
    'payload',v_payload,
    'version',v_meta.version,
    'updated_at',v_meta.updated_at,
    'last_update',coalesce(v_last_update,jsonb_build_object('at',v_meta.updated_at))
  );
end;
$$;


revoke all on function public.inventory_get_state(text) from public,anon;
grant execute on function public.inventory_get_state(text) to authenticated;

create or replace function public.inventory_save_state(
  p_workspace text,
  p_expected_version bigint,
  p_payload jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version bigint;
  v_new_version bigint;
  v_latest jsonb;
  v_name text;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode='42501';
  end if;

  if not exists (
    select 1
    from public.thinkstore_inventory_users
    where user_id=auth.uid()
      and active=true
      and (role='super_admin' or coalesce((permissions->>'write')::boolean,false)=true)
  ) then
    raise exception 'INVENTORY_WRITE_ACCESS_DENIED' using errcode='42501';
  end if;

  insert into public.thinkstore_inventory_meta(workspace_key,version)
  values(p_workspace,0)
  on conflict(workspace_key) do nothing;

  select version into v_version
  from public.thinkstore_inventory_meta
  where workspace_key=p_workspace
  for update;

  if v_version is distinct from p_expected_version then
    raise exception 'VERSION_CONFLICT' using errcode='40001';
  end if;

  -- PRODUCTOS: upsert solo si data cambió.
  insert into public.thinkstore_inventory_products(workspace_key,id,data)
  select p_workspace,e->>'id',e
  from jsonb_array_elements(coalesce(p_payload->'products','[]'::jsonb)) e
  where coalesce(e->>'id','')<>''
  on conflict (workspace_key,id) do update
    set data=excluded.data
    where thinkstore_inventory_products.data is distinct from excluded.data;

  delete from public.thinkstore_inventory_products t
  where t.workspace_key=p_workspace
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_payload->'products','[]'::jsonb)) e
      where e->>'id'=t.id
    );

  -- UNIDADES
  insert into public.thinkstore_inventory_units(workspace_key,id,data)
  select p_workspace,e->>'id',e
  from jsonb_array_elements(coalesce(p_payload->'units','[]'::jsonb)) e
  where coalesce(e->>'id','')<>''
  on conflict (workspace_key,id) do update
    set data=excluded.data
    where thinkstore_inventory_units.data is distinct from excluded.data;

  delete from public.thinkstore_inventory_units t
  where t.workspace_key=p_workspace
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_payload->'units','[]'::jsonb)) e
      where e->>'id'=t.id
    );

  -- STOCK
  insert into public.thinkstore_inventory_stock(workspace_key,id,data)
  select p_workspace,e->>'id',e
  from jsonb_array_elements(coalesce(p_payload->'stock','[]'::jsonb)) e
  where coalesce(e->>'id','')<>''
  on conflict (workspace_key,id) do update
    set data=excluded.data
    where thinkstore_inventory_stock.data is distinct from excluded.data;

  delete from public.thinkstore_inventory_stock t
  where t.workspace_key=p_workspace
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_payload->'stock','[]'::jsonb)) e
      where e->>'id'=t.id
    );

  -- MOVIMIENTOS
  insert into public.thinkstore_inventory_movements(workspace_key,id,data)
  select p_workspace,e->>'id',e
  from jsonb_array_elements(coalesce(p_payload->'movements','[]'::jsonb)) e
  where coalesce(e->>'id','')<>''
  on conflict (workspace_key,id) do update
    set data=excluded.data
    where thinkstore_inventory_movements.data is distinct from excluded.data;

  delete from public.thinkstore_inventory_movements t
  where t.workspace_key=p_workspace
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_payload->'movements','[]'::jsonb)) e
      where e->>'id'=t.id
    );

  -- UBICACIONES
  insert into public.thinkstore_inventory_locations(workspace_key,id,data)
  select p_workspace,e->>'id',e
  from jsonb_array_elements(coalesce(p_payload->'locations','[]'::jsonb)) e
  where coalesce(e->>'id','')<>''
  on conflict (workspace_key,id) do update
    set data=excluded.data
    where thinkstore_inventory_locations.data is distinct from excluded.data;

  delete from public.thinkstore_inventory_locations t
  where t.workspace_key=p_workspace
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_payload->'locations','[]'::jsonb)) e
      where e->>'id'=t.id
    );

  -- PROVEEDORES
  insert into public.thinkstore_inventory_suppliers(workspace_key,id,data)
  select p_workspace,e->>'id',e
  from jsonb_array_elements(coalesce(p_payload->'suppliers','[]'::jsonb)) e
  where coalesce(e->>'id','')<>''
  on conflict (workspace_key,id) do update
    set data=excluded.data
    where thinkstore_inventory_suppliers.data is distinct from excluded.data;

  delete from public.thinkstore_inventory_suppliers t
  where t.workspace_key=p_workspace
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_payload->'suppliers','[]'::jsonb)) e
      where e->>'id'=t.id
    );

  -- COMPRAS
  insert into public.thinkstore_inventory_purchases(workspace_key,id,data)
  select p_workspace,e->>'id',e
  from jsonb_array_elements(coalesce(p_payload->'purchases','[]'::jsonb)) e
  where coalesce(e->>'id','')<>''
  on conflict (workspace_key,id) do update
    set data=excluded.data
    where thinkstore_inventory_purchases.data is distinct from excluded.data;

  delete from public.thinkstore_inventory_purchases t
  where t.workspace_key=p_workspace
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_payload->'purchases','[]'::jsonb)) e
      where e->>'id'=t.id
    );

  -- MOBILIARIO
  insert into public.thinkstore_inventory_furniture(workspace_key,id,data)
  select p_workspace,e->>'id',e
  from jsonb_array_elements(coalesce(p_payload->'furniture','[]'::jsonb)) e
  where coalesce(e->>'id','')<>''
  on conflict (workspace_key,id) do update
    set data=excluded.data
    where thinkstore_inventory_furniture.data is distinct from excluded.data;

  delete from public.thinkstore_inventory_furniture t
  where t.workspace_key=p_workspace
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_payload->'furniture','[]'::jsonb)) e
      where e->>'id'=t.id
    );

  update public.thinkstore_inventory_meta
  set version=version+1, updated_at=now(), updated_by=auth.uid()
  where workspace_key=p_workspace
  returning version into v_new_version;

  select coalesce(full_name,email,'Usuario'),email
  into v_name,v_email
  from public.thinkstore_inventory_users
  where user_id=auth.uid();

  insert into public.thinkstore_inventory_audit(
    id,workspace_key,actor_user_id,actor_name,actor_email,
    action,entity_type,entity_id,details,created_at
  )
  values(
    'sync-'||p_workspace||'-'||v_new_version::text,
    p_workspace,auth.uid(),v_name,v_email,
    'Actualización sincronizada','sync',v_new_version::text,
    jsonb_build_object(
      'version',v_new_version,
      'products',jsonb_array_length(coalesce(p_payload->'products','[]'::jsonb)),
      'units',jsonb_array_length(coalesce(p_payload->'units','[]'::jsonb)),
      'stock',jsonb_array_length(coalesce(p_payload->'stock','[]'::jsonb)),
      'movements',jsonb_array_length(coalesce(p_payload->'movements','[]'::jsonb)),
      'purchases',jsonb_array_length(coalesce(p_payload->'purchases','[]'::jsonb))
    ),now()
  ) on conflict(id) do nothing;

  v_latest := p_payload->'movements'->0;
  if v_latest is not null and coalesce(v_latest->>'id','')<>'' then
    insert into public.thinkstore_inventory_audit(
      id,workspace_key,actor_user_id,actor_name,actor_email,
      action,entity_type,entity_id,details,created_at
    )
    values(
      v_latest->>'id',p_workspace,auth.uid(),v_name,v_email,
      coalesce(v_latest->>'type','Inventario actualizado'),
      case
        when v_latest ? 'product_id' then 'product'
        when v_latest ? 'unit_barcode' then 'unit'
        when v_latest ? 'furniture_id' then 'furniture'
        else 'inventory'
      end,
      coalesce(v_latest->>'product_id',v_latest->>'unit_barcode',v_latest->>'furniture_id',v_latest->>'asset_code'),
      v_latest,
      coalesce((v_latest->>'created_at')::timestamptz,now())
    ) on conflict(id) do nothing;
  end if;

  return v_new_version;
end;
$$;


revoke all on function public.inventory_save_state(text,bigint,jsonb) from public,anon;
grant execute on function public.inventory_save_state(text,bigint,jsonb) to authenticated;

-- Snapshot de costo en cada línea de venta.
alter table public.pedido_items
  add column if not exists inventory_variant_id uuid,
  add column if not exists sku text,
  add column if not exists unit_cost_usd numeric(12,2),
  add column if not exists cost_total_usd numeric(14,2),
  add column if not exists inventory_product_id text,
  add column if not exists supplier_name text,
  add column if not exists inventory_cost_source text,
  add column if not exists cost_snapshot_at timestamptz;

create index if not exists pedido_items_inventory_variant_idx on public.pedido_items(inventory_variant_id);
create index if not exists pedido_items_sku_idx on public.pedido_items(lower(sku));

create or replace function public.ts_snapshot_order_item_cost()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_product_id text;
  v_sku text;
  v_variant uuid;
  v_data jsonb;
  v_cost numeric;
  v_supplier_id text;
  v_supplier_name text;
begin
  if new.unit_cost_usd is not null and new.unit_cost_usd >= 0 then
    new.cost_total_usd := round(new.unit_cost_usd * greatest(coalesce(new.cantidad,1),1),2);
    if new.cost_snapshot_at is null then new.cost_snapshot_at:=now(); end if;
    return new;
  end if;

  v_variant:=new.inventory_variant_id;
  v_sku:=nullif(btrim(coalesce(new.sku,'')),'');

  if v_variant is not null then
    select b.inventory_product_id,b.sku into v_product_id,v_sku
    from public.thinkstore_inventory_bridge b
    where b.workspace_key='main' and b.variant_id=v_variant
    limit 1;
  end if;

  if v_product_id is null and v_sku is not null then
    select b.inventory_product_id,b.variant_id,b.sku into v_product_id,v_variant,v_sku
    from public.thinkstore_inventory_bridge b
    where b.workspace_key='main' and lower(b.sku)=lower(v_sku)
    limit 1;
  end if;

  if v_product_id is null then
    select p.id,p.data into v_product_id,v_data
    from public.thinkstore_inventory_products p
    where p.workspace_key='main'
      and lower(btrim(coalesce(p.data->>'name','')))=lower(btrim(coalesce(new.producto,'')))
      and (coalesce(btrim(new.color),'')='' or lower(coalesce(p.data->>'color',''))=lower(btrim(new.color)))
      and (coalesce(btrim(new.capacidad),'')='' or lower(coalesce(p.data->>'capacity',''))=lower(btrim(new.capacidad)))
    order by case when lower(coalesce(p.data->>'color',''))=lower(coalesce(new.color,'')) then 0 else 1 end,
             case when lower(coalesce(p.data->>'capacity',''))=lower(coalesce(new.capacidad,'')) then 0 else 1 end
    limit 1;
  end if;

  if v_data is null and v_product_id is not null then
    select p.data into v_data from public.thinkstore_inventory_products p
    where p.workspace_key='main' and p.id=v_product_id limit 1;
  end if;

  if v_data is not null then
    begin v_cost:=nullif(v_data->>'purchase_price','')::numeric; exception when others then v_cost:=null; end;
    v_supplier_id:=nullif(v_data->>'supplier_id','');
    if v_supplier_id is not null then
      select s.data->>'name' into v_supplier_name
      from public.thinkstore_inventory_suppliers s
      where s.workspace_key='main' and s.id=v_supplier_id limit 1;
    end if;
    new.inventory_product_id:=coalesce(new.inventory_product_id,v_product_id);
    new.inventory_variant_id:=coalesce(new.inventory_variant_id,v_variant);
    new.sku:=coalesce(new.sku,v_sku,v_data->>'sku');
    new.supplier_name:=coalesce(new.supplier_name,v_supplier_name);
    if v_cost is not null and v_cost>=0 then
      new.unit_cost_usd:=round(v_cost,2);
      new.cost_total_usd:=round(v_cost*greatest(coalesce(new.cantidad,1),1),2);
      new.inventory_cost_source:='inventory_snapshot';
      new.cost_snapshot_at:=now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ts_snapshot_order_item_cost on public.pedido_items;
create trigger trg_ts_snapshot_order_item_cost
before insert or update on public.pedido_items
for each row execute function public.ts_snapshot_order_item_cost();

-- Backfill seguro de líneas históricas que todavía no tienen snapshot.
update public.pedido_items
set cost_snapshot_at=cost_snapshot_at
where unit_cost_usd is null;

notify pgrst,'reload schema';
commit;

-- Diagnóstico: debe devolver conteos, no modificar datos.
select
  (select count(*) from public.thinkstore_inventory_purchases) as purchase_records,
  (select count(*) from public.pedido_items where unit_cost_usd is not null) as sale_items_with_cost,
  (select count(*) from public.thinkstore_inventory_products where nullif(data->>'purchase_price','') is not null) as inventory_products_with_cost;


-- ===== CONCILIACIÓN V10.9 =====
-- ThinkStore Enterprise V10.9 · Conciliación de caja y métodos de pago
-- Ejecutar en el Supabase PRINCIPAL de ThinkStore.
-- Aditivo e idempotente: no elimina ventas, compras, gastos ni auditorías.

begin;

create extension if not exists pgcrypto;

create table if not exists public.enterprise_reconciliations (
  id uuid primary key default gen_random_uuid(),
  period_type text not null default 'weekly',
  period_start date not null,
  period_end date not null,
  status text not null default 'review',
  expected jsonb not null default '{}'::jsonb,
  actual jsonb not null default '{}'::jsonb,
  differences jsonb not null default '{}'::jsonb,
  total_expected numeric(14,2) not null default 0,
  total_actual numeric(14,2) not null default 0,
  total_difference numeric(14,2) not null default 0,
  notes text,
  created_by_email text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint enterprise_reconciliations_period_type_check check (period_type in ('daily','weekly','custom')),
  constraint enterprise_reconciliations_status_check check (status in ('draft','review','closed')),
  constraint enterprise_reconciliations_period_check check (period_end >= period_start),
  unique(period_type,period_start,period_end)
);

create index if not exists enterprise_reconciliations_period_idx
  on public.enterprise_reconciliations(period_start desc, period_end desc);

alter table public.enterprise_reconciliations enable row level security;

drop policy if exists "Enterprise admins read reconciliations" on public.enterprise_reconciliations;
create policy "Enterprise admins read reconciliations" on public.enterprise_reconciliations
for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and coalesce(p.active,true)=true and p.role in ('super_admin','admin','gerente'))
  or exists(select 1 from public.roles_usuarios r where (r.id=auth.uid() or lower(r.email)=lower(coalesce(auth.jwt()->>'email',''))) and coalesce(r.activo,true)=true and r.rol in ('super_admin','admin','gerente'))
);

-- Escritura solo desde la Function de Enterprise con service_role.
revoke insert,update,delete on public.enterprise_reconciliations from anon,authenticated;
grant select on public.enterprise_reconciliations to authenticated;

create or replace function public.enterprise_reconciliation_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists enterprise_reconciliations_touch on public.enterprise_reconciliations;
create trigger enterprise_reconciliations_touch before update on public.enterprise_reconciliations
for each row execute function public.enterprise_reconciliation_touch_updated_at();

notify pgrst,'reload schema';
commit;

select to_regclass('public.enterprise_reconciliations') as reconciliation_table;
