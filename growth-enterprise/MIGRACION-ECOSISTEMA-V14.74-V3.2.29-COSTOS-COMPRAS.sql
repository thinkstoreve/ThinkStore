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
