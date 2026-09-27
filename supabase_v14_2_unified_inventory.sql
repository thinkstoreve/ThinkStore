-- ThinkStore V14.2 / Inventory V3.2.5 — Unified Inventory Bridge
-- Bidirectional synchronization between:
--   public.inventory_variants / public.inventory_units   (ThinkStore / Staff POS)
--   public.thinkstore_inventory_*                        (Inventory Central)
-- Run ONCE in the same Supabase project used by both systems.
-- Does not delete orders, customers, products or historical movements.

begin;

-- Safety checks: both inventory systems must exist before wiring them together.
do $$
begin
  if to_regclass('public.inventory_variants') is null then
    raise exception 'Falta public.inventory_variants. Ejecuta primero el SQL de inventario de ThinkStore.';
  end if;
  if to_regclass('public.thinkstore_inventory_products') is null
     or to_regclass('public.thinkstore_inventory_stock') is null
     or to_regclass('public.thinkstore_inventory_units') is null
     or to_regclass('public.thinkstore_inventory_meta') is null then
    raise exception 'Faltan tablas de Inventory Central. Ejecuta primero el esquema de ThinkStore Inventory.';
  end if;
end $$;

create table if not exists public.thinkstore_inventory_bridge (
  workspace_key text not null default 'main',
  inventory_product_id text not null,
  sku text not null,
  variant_id uuid null,
  tracking_mode text not null default 'serialized',
  updated_at timestamptz not null default now(),
  primary key (workspace_key, inventory_product_id)
);

create index if not exists thinkstore_inventory_bridge_workspace_sku_idx
  on public.thinkstore_inventory_bridge(workspace_key, lower(sku));
create index if not exists thinkstore_inventory_bridge_variant_idx
  on public.thinkstore_inventory_bridge(variant_id);

alter table public.thinkstore_inventory_bridge enable row level security;
revoke all on public.thinkstore_inventory_bridge from anon, authenticated;

create or replace function public.ts_bridge_safe_num(p_value text, p_default numeric default 0)
returns numeric
language plpgsql immutable
as $$
begin
  if p_value is null or btrim(p_value)='' then return p_default; end if;
  return p_value::numeric;
exception when others then
  return p_default;
end;
$$;

create or replace function public.ts_bridge_tracking_mode(p_data jsonb)
returns text
language sql immutable
as $$
  select case
    when lower(coalesce(p_data->>'tracking_mode','')) in ('quantity','serialized')
      then lower(p_data->>'tracking_mode')
    when lower(coalesce(p_data->>'category','')) in ('accesorios','repuestos') then 'quantity'
    when lower(coalesce(p_data->>'name','')) ~ '(cable|funda|case|vidrio|mica|protector|cargador|adaptador|correa|accesorio|repuesto)' then 'quantity'
    else 'serialized'
  end
$$;

create or replace function public.ts_bridge_status_to_main(p_status text)
returns text
language sql immutable
as $$
  select case lower(coalesce(p_status,''))
    when 'disponible' then 'available'
    when 'reservado' then 'assigned'
    when 'vendido' then 'sold'
    when 'servicio técnico' then 'in_service'
    when 'servicio tecnico' then 'in_service'
    when 'devuelto' then 'returned'
    when 'defectuoso' then 'returned'
    when 'baja' then 'returned'
    when 'uso interno' then 'returned'
    else 'available'
  end
$$;

create or replace function public.ts_bridge_status_to_inventory(p_status text)
returns text
language sql immutable
as $$
  select case lower(coalesce(p_status,''))
    when 'available' then 'Disponible'
    when 'assigned' then 'Reservado'
    when 'sold' then 'Vendido'
    when 'in_service' then 'Servicio técnico'
    when 'returned' then 'Devuelto'
    else 'Disponible'
  end
$$;

create or replace function public.ts_bridge_touch_meta(p_workspace text default 'main')
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if current_setting('ts.bridge_bulk',true)='1' then return; end if;
  insert into public.thinkstore_inventory_meta(workspace_key,version)
  values(coalesce(nullif(p_workspace,''),'main'),0)
  on conflict(workspace_key) do nothing;

  update public.thinkstore_inventory_meta
     set version=version+1,
         updated_at=now(),
         updated_by=null
   where workspace_key=coalesce(nullif(p_workspace,''),'main');
end;
$$;

create or replace function public.ts_bridge_log_movement(
  p_workspace text,
  p_product_id text,
  p_type text,
  p_reason text,
  p_delta integer default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id text := 'bridge-'||gen_random_uuid()::text;
  v_barcode text;
begin
  if current_setting('ts.bridge_bulk',true)='1' then return; end if;
  select data->>'product_barcode' into v_barcode
  from public.thinkstore_inventory_products
  where workspace_key=p_workspace and id=p_product_id;

  insert into public.thinkstore_inventory_movements(workspace_key,id,data)
  values(
    p_workspace,
    v_id,
    jsonb_strip_nulls(jsonb_build_object(
      'id',v_id,
      'product_id',p_product_id,
      'product_barcode',v_barcode,
      'quantity_delta',p_delta,
      'type',p_type,
      'reason',p_reason,
      'user_name','ThinkStore Sync',
      'source','unified_inventory_bridge',
      'created_at',now()
    ))
  )
  on conflict(workspace_key,id) do nothing;
end;
$$;

-- Update the mirrored counters embedded in the Inventory Central product JSON.
create or replace function public.ts_bridge_refresh_product_counters(p_workspace text, p_product_id text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_variant public.inventory_variants%rowtype;
  v_variant_id uuid;
begin
  select variant_id into v_variant_id
  from public.thinkstore_inventory_bridge
  where workspace_key=p_workspace and inventory_product_id=p_product_id;
  if v_variant_id is null then return; end if;

  select * into v_variant from public.inventory_variants where id=v_variant_id;
  if not found then return; end if;

  update public.thinkstore_inventory_products
     set data = data || jsonb_build_object(
       'sync_variant_id',v_variant.id::text,
       'sync_stock_on_hand',coalesce(v_variant.stock_on_hand,0),
       'sync_stock_reserved',coalesce(v_variant.stock_reserved,0),
       'sync_stock_sold',coalesce(v_variant.stock_sold,0),
       'sync_available',greatest(0,coalesce(v_variant.stock_on_hand,0)-coalesce(v_variant.stock_reserved,0)),
       'sync_updated_at',now(),
       'sync_source','unified'
     )
   where workspace_key=p_workspace and id=p_product_id;
end;
$$;

-- Create/update a ThinkStore inventory_variants row from an Inventory Central product.
create or replace function public.ts_bridge_product_to_store(p_workspace text, p_product_id text)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  p jsonb;
  v_sku text;
  v_variant_id uuid;
  v_mode text;
  v_price numeric;
  v_min integer;
begin
  select data into p
  from public.thinkstore_inventory_products
  where workspace_key=p_workspace and id=p_product_id;
  if p is null then return null; end if;

  v_sku := btrim(coalesce(p->>'sku',''));
  if v_sku='' then return null; end if;
  v_mode := public.ts_bridge_tracking_mode(p);
  v_price := public.ts_bridge_safe_num(p->>'sale_price',0);
  v_min := greatest(0,public.ts_bridge_safe_num(p->>'min_stock',case when v_mode='quantity' then 5 else 1 end)::integer);

  -- Preserve the already-linked ThinkStore variant when the SKU is edited in Inventory Central.
  select variant_id into v_variant_id
  from public.thinkstore_inventory_bridge
  where workspace_key=p_workspace and inventory_product_id=p_product_id
  limit 1;

  if v_variant_id is null then
    select id into v_variant_id
    from public.inventory_variants
    where lower(sku)=lower(v_sku)
    order by id
    limit 1;
  end if;

  if v_variant_id is null then
    insert into public.inventory_variants(
      sku,product_name,model,color,capacity,condition,
      stock_on_hand,stock_reserved,stock_sold,stock_min,price_usd,active
    ) values (
      v_sku,
      coalesce(nullif(p->>'name',''),v_sku),
      nullif(p->>'model',''),nullif(p->>'color',''),nullif(p->>'capacity',''),
      coalesce(nullif(p->>'condition',''),'Nuevo'),
      0,0,0,v_min,v_price,true
    ) returning id into v_variant_id;
  else
    update public.inventory_variants
       set sku=v_sku,
           product_name=coalesce(nullif(p->>'name',''),product_name),
           model=coalesce(nullif(p->>'model',''),model),
           color=coalesce(nullif(p->>'color',''),color),
           capacity=coalesce(nullif(p->>'capacity',''),capacity),
           condition=coalesce(nullif(p->>'condition',''),condition),
           stock_min=v_min,
           price_usd=v_price,
           active=true
     where id=v_variant_id;
  end if;

  insert into public.thinkstore_inventory_bridge(workspace_key,inventory_product_id,sku,variant_id,tracking_mode,updated_at)
  values(p_workspace,p_product_id,v_sku,v_variant_id,v_mode,now())
  on conflict(workspace_key,inventory_product_id) do update
    set sku=excluded.sku,variant_id=excluded.variant_id,tracking_mode=excluded.tracking_mode,updated_at=now();

  return v_variant_id;
end;
$$;

-- Recompute physical stock in ThinkStore after editing Inventory Central.
create or replace function public.ts_bridge_recompute_store_stock(p_workspace text, p_product_id text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_variant_id uuid;
  v_mode text;
  v_target integer:=0;
  v_reserved integer:=0;
begin
  select variant_id,tracking_mode into v_variant_id,v_mode
  from public.thinkstore_inventory_bridge
  where workspace_key=p_workspace and inventory_product_id=p_product_id;

  if v_variant_id is null then
    v_variant_id:=public.ts_bridge_product_to_store(p_workspace,p_product_id);
    select tracking_mode into v_mode
    from public.thinkstore_inventory_bridge
    where workspace_key=p_workspace and inventory_product_id=p_product_id;
  end if;
  if v_variant_id is null then return; end if;

  if v_mode='quantity' then
    select coalesce(sum(greatest(0,public.ts_bridge_safe_num(data->>'quantity',0)::integer)),0)
      into v_target
    from public.thinkstore_inventory_stock
    where workspace_key=p_workspace and data->>'product_id'=p_product_id;
  else
    select count(*)::integer into v_target
    from public.thinkstore_inventory_units
    where workspace_key=p_workspace
      and data->>'product_id'=p_product_id
      and coalesce(data->>'status','Disponible') not in ('Vendido','Baja');
  end if;

  select coalesce(stock_reserved,0) into v_reserved
  from public.inventory_variants where id=v_variant_id;

  if v_target < v_reserved then
    raise exception 'SYNC_STOCK_BELOW_RESERVED: stock físico % es menor que reservado %',v_target,v_reserved
      using errcode='23514';
  end if;

  update public.inventory_variants
     set stock_on_hand=v_target
   where id=v_variant_id;

  perform public.ts_bridge_refresh_product_counters(p_workspace,p_product_id);
end;
$$;

-- Adjust Inventory Central quantity-location rows to a target physical stock while preserving locations when possible.
create or replace function public.ts_bridge_adjust_inventory_quantity_stock(
  p_workspace text,
  p_product_id text,
  p_target integer
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_current integer;
  v_delta integer;
  v_row record;
  v_take integer;
  v_newq integer;
  v_id text;
begin
  p_target:=greatest(0,coalesce(p_target,0));
  select coalesce(sum(greatest(0,public.ts_bridge_safe_num(data->>'quantity',0)::integer)),0)
    into v_current
  from public.thinkstore_inventory_stock
  where workspace_key=p_workspace and data->>'product_id'=p_product_id;

  v_delta:=p_target-v_current;
  if v_delta=0 then return; end if;

  if v_delta>0 then
    select id,data into v_row
    from public.thinkstore_inventory_stock
    where workspace_key=p_workspace and data->>'product_id'=p_product_id
    order by case when lower(coalesce(data->>'location',''))='tienda chacao' then 0 else 1 end,id
    limit 1;

    if found then
      v_newq:=greatest(0,public.ts_bridge_safe_num(v_row.data->>'quantity',0)::integer)+v_delta;
      update public.thinkstore_inventory_stock
         set data=jsonb_set(v_row.data,'{quantity}',to_jsonb(v_newq),true)
       where workspace_key=p_workspace and id=v_row.id;
    else
      v_id:='bridge-stock-'||p_product_id;
      insert into public.thinkstore_inventory_stock(workspace_key,id,data)
      values(p_workspace,v_id,jsonb_build_object(
        'id',v_id,'product_id',p_product_id,'location','Tienda Chacao','quantity',v_delta,'source','unified_inventory_bridge'
      ))
      on conflict(workspace_key,id) do update
        set data=excluded.data;
    end if;
    return;
  end if;

  -- Negative delta: consume quantities, starting with Tienda Chacao and then other locations.
  v_delta:=abs(v_delta);
  for v_row in
    select id,data
    from public.thinkstore_inventory_stock
    where workspace_key=p_workspace and data->>'product_id'=p_product_id
    order by case when lower(coalesce(data->>'location',''))='tienda chacao' then 0 else 1 end,
             public.ts_bridge_safe_num(data->>'quantity',0) desc,
             id
  loop
    exit when v_delta<=0;
    v_newq:=greatest(0,public.ts_bridge_safe_num(v_row.data->>'quantity',0)::integer);
    v_take:=least(v_newq,v_delta);
    v_newq:=v_newq-v_take;
    v_delta:=v_delta-v_take;
    update public.thinkstore_inventory_stock
       set data=jsonb_set(v_row.data,'{quantity}',to_jsonb(v_newq),true)
     where workspace_key=p_workspace and id=v_row.id;
  end loop;
end;
$$;

-- Mirror a ThinkStore variant into Inventory Central.
create or replace function public.ts_bridge_variant_to_inventory(p_variant_id uuid, p_workspace text default 'main')
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  v public.inventory_variants%rowtype;
  v_product_id text;
  v_data jsonb;
  v_mode text;
  v_category text;
  v_before integer:=0;
  v_after integer:=0;
begin
  select * into v from public.inventory_variants where id=p_variant_id;
  if not found or coalesce(v.sku,'')='' then return null; end if;

  select inventory_product_id,tracking_mode into v_product_id,v_mode
  from public.thinkstore_inventory_bridge
  where workspace_key=p_workspace and (variant_id=v.id or lower(sku)=lower(v.sku))
  order by case when variant_id=v.id then 0 else 1 end
  limit 1;

  if v_product_id is null then
    select id,data into v_product_id,v_data
    from public.thinkstore_inventory_products
    where workspace_key=p_workspace and lower(coalesce(data->>'sku',''))=lower(v.sku)
    limit 1;
  else
    select data into v_data
    from public.thinkstore_inventory_products
    where workspace_key=p_workspace and id=v_product_id;
  end if;

  if v_product_id is null then
    v_product_id:='main-'||v.id::text;
  end if;

  if v_mode is null and v_data is not null then
    v_mode:=public.ts_bridge_tracking_mode(v_data);
  end if;
  if v_mode is null then
    v_mode:=case
      when lower(coalesce(v.product_name,'')) ~ '(cable|funda|case|vidrio|mica|protector|cargador|adaptador|correa|accesorio|repuesto)'
      then 'quantity' else 'serialized' end;
  end if;

  v_category:=case
    when lower(coalesce(v.product_name,'')) like '%iphone%' then 'iPhone'
    when lower(coalesce(v.product_name,'')) like '%ipad%' then 'iPad'
    when lower(coalesce(v.product_name,'')) like '%airpod%' then 'AirPods'
    when lower(coalesce(v.product_name,'')) like '%watch%' then 'Watch'
    when lower(coalesce(v.product_name,'')) like '%mac%' then 'Mac'
    when v_mode='quantity' then 'Accesorios'
    else 'Otros' end;

  select public.ts_bridge_safe_num(data->>'sync_stock_on_hand',0)::integer
    into v_before
  from public.thinkstore_inventory_products
  where workspace_key=p_workspace and id=v_product_id;

  v_data:=coalesce(v_data,'{}'::jsonb) || jsonb_build_object(
    'id',v_product_id,
    'name',coalesce(v.product_name,v.sku),
    'category',coalesce(nullif(v_data->>'category',''),v_category),
    'brand',coalesce(nullif(v_data->>'brand',''),'Apple'),
    'model',coalesce(v.model,''),
    'condition',coalesce(v.condition,'Nuevo'),
    'capacity',coalesce(v.capacity,''),
    'color',coalesce(v.color,''),
    'sku',v.sku,
    'product_barcode',coalesce(nullif(v_data->>'product_barcode',''),'TSP-'||upper(substr(md5(v.sku),1,10))),
    'tracking_mode',v_mode,
    'min_stock',coalesce(v.stock_min,case when v_mode='quantity' then 5 else 1 end),
    'sale_price',coalesce(v.price_usd,0),
    'sync_variant_id',v.id::text,
    'sync_stock_on_hand',coalesce(v.stock_on_hand,0),
    'sync_stock_reserved',coalesce(v.stock_reserved,0),
    'sync_stock_sold',coalesce(v.stock_sold,0),
    'sync_available',greatest(0,coalesce(v.stock_on_hand,0)-coalesce(v.stock_reserved,0)),
    'sync_updated_at',now(),
    'sync_source','thinkstore'
  );

  insert into public.thinkstore_inventory_products(workspace_key,id,data)
  values(p_workspace,v_product_id,v_data)
  on conflict(workspace_key,id) do update set data=excluded.data;

  insert into public.thinkstore_inventory_bridge(workspace_key,inventory_product_id,sku,variant_id,tracking_mode,updated_at)
  values(p_workspace,v_product_id,v.sku,v.id,v_mode,now())
  on conflict(workspace_key,inventory_product_id) do update
    set sku=excluded.sku,variant_id=excluded.variant_id,tracking_mode=excluded.tracking_mode,updated_at=now();

  if v_mode='quantity' then
    perform public.ts_bridge_adjust_inventory_quantity_stock(p_workspace,v_product_id,coalesce(v.stock_on_hand,0));
  end if;

  v_after:=coalesce(v.stock_on_hand,0);
  if v_after is distinct from v_before then
    perform public.ts_bridge_log_movement(p_workspace,v_product_id,'Sincronización ThinkStore','Stock actualizado desde ThinkStore / Staff POS',v_after-v_before);
  end if;

  return v_product_id;
end;
$$;

-- Mirror a ThinkStore serialized unit into Inventory Central.
create or replace function public.ts_bridge_unit_to_inventory(p_unit_id uuid, p_workspace text default 'main')
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  u public.inventory_units%rowtype;
  v_product_id text;
  v_sku text;
  v_inventory_unit_id text;
  v_existing jsonb;
  v_barcode text;
begin
  select * into u from public.inventory_units where id=p_unit_id;
  if not found then return; end if;

  if u.variant_id is not null then
    perform public.ts_bridge_variant_to_inventory(u.variant_id,p_workspace);
    select inventory_product_id,sku into v_product_id,v_sku
    from public.thinkstore_inventory_bridge
    where workspace_key=p_workspace and variant_id=u.variant_id
    limit 1;
  end if;
  if v_product_id is null then return; end if;

  select id,data into v_inventory_unit_id,v_existing
  from public.thinkstore_inventory_units
  where workspace_key=p_workspace
    and lower(coalesce(data->>'serial_number',''))=lower(coalesce(u.serial_number,''))
  limit 1;

  if v_inventory_unit_id is null then
    v_inventory_unit_id:='main-unit-'||u.id::text;
  end if;
  v_barcode:=coalesce(nullif(v_existing->>'barcode_value',''),'TSU-'||upper(substr(replace(u.id::text,'-',''),1,12)));

  insert into public.thinkstore_inventory_units(workspace_key,id,data)
  values(p_workspace,v_inventory_unit_id,
    coalesce(v_existing,'{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
      'id',v_inventory_unit_id,
      'product_id',v_product_id,
      'barcode_value',v_barcode,
      'serial_number',u.serial_number,
      'imei',u.imei,
      'status',public.ts_bridge_status_to_inventory(u.status),
      'location',coalesce(nullif(v_existing->>'location',''),'Tienda Chacao'),
      'general_condition',u.general_condition,
      'battery_health_pct',u.battery_health_pct,
      'notes',u.notes,
      'source','thinkstore',
      'sync_unit_id',u.id::text,
      'updated_at',coalesce(u.updated_at,now())
    )))
  on conflict(workspace_key,id) do update set data=excluded.data;

  perform public.ts_bridge_refresh_product_counters(p_workspace,v_product_id);
end;
$$;

-- Inventory Central -> ThinkStore serialized unit.
create or replace function public.ts_bridge_inventory_unit_to_store(p_workspace text, p_inventory_unit_id text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  d jsonb;
  p jsonb;
  v_product_id text;
  v_variant_id uuid;
  v_serial text;
  v_main_unit_id uuid;
begin
  select data into d from public.thinkstore_inventory_units
  where workspace_key=p_workspace and id=p_inventory_unit_id;
  if d is null then return; end if;

  v_product_id:=d->>'product_id';
  v_serial:=btrim(coalesce(d->>'serial_number',''));
  if v_product_id is null or v_serial='' then return; end if;

  v_variant_id:=public.ts_bridge_product_to_store(p_workspace,v_product_id);
  if v_variant_id is null then return; end if;
  select data into p from public.thinkstore_inventory_products
  where workspace_key=p_workspace and id=v_product_id;

  select id into v_main_unit_id
  from public.inventory_units
  where lower(serial_number)=lower(v_serial)
  limit 1;

  if v_main_unit_id is null then
    insert into public.inventory_units(
      variant_id,product_name,model,serial_number,imei,commercial_condition,
      general_condition,battery_health_pct,notes,status,created_by_email,updated_at
    ) values (
      v_variant_id,
      coalesce(p->>'name',v_serial),
      nullif(p->>'model',''),
      v_serial,
      nullif(d->>'imei',''),
      coalesce(nullif(p->>'condition',''),'Nuevo'),
      case when d->>'general_condition' in ('Excelente','Bueno','Bien','Nuevo') then d->>'general_condition' else null end,
      case when public.ts_bridge_safe_num(d->>'battery_health_pct',0) between 1 and 100 then public.ts_bridge_safe_num(d->>'battery_health_pct',0)::integer else null end,
      nullif(d->>'notes',''),
      public.ts_bridge_status_to_main(d->>'status'),
      'inventory@thinkstore.com.ve',now()
    ) returning id into v_main_unit_id;
  else
    update public.inventory_units
       set variant_id=v_variant_id,
           product_name=coalesce(p->>'name',product_name),
           model=coalesce(nullif(p->>'model',''),model),
           imei=nullif(d->>'imei',''),
           commercial_condition=coalesce(nullif(p->>'condition',''),commercial_condition),
           general_condition=case when d->>'general_condition' in ('Excelente','Bueno','Bien','Nuevo') then d->>'general_condition' else general_condition end,
           battery_health_pct=case when public.ts_bridge_safe_num(d->>'battery_health_pct',0) between 1 and 100 then public.ts_bridge_safe_num(d->>'battery_health_pct',0)::integer else battery_health_pct end,
           notes=coalesce(nullif(d->>'notes',''),notes),
           status=public.ts_bridge_status_to_main(d->>'status'),
           updated_at=now()
     where id=v_main_unit_id;
  end if;

  perform public.ts_bridge_recompute_store_stock(p_workspace,v_product_id);
end;
$$;

-- === Trigger handlers ===
create or replace function public.ts_bridge_trg_inventory_product()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if pg_trigger_depth()>1 then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if current_setting('ts.bridge_bulk',true)='1' then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if tg_op='DELETE' then
    update public.inventory_variants v set active=false
    from public.thinkstore_inventory_bridge b
    where b.workspace_key=old.workspace_key and b.inventory_product_id=old.id and v.id=b.variant_id;
    return old;
  end if;
  perform public.ts_bridge_product_to_store(new.workspace_key,new.id);
  perform public.ts_bridge_recompute_store_stock(new.workspace_key,new.id);
  return new;
end;
$$;

create or replace function public.ts_bridge_trg_inventory_stock()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare v_workspace text; v_product text;
begin
  if pg_trigger_depth()>1 then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if current_setting('ts.bridge_bulk',true)='1' then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if tg_op='DELETE' then
    v_workspace:=old.workspace_key;
    v_product:=old.data->>'product_id';
  else
    v_workspace:=new.workspace_key;
    v_product:=new.data->>'product_id';
  end if;
  if v_product is not null then perform public.ts_bridge_recompute_store_stock(v_workspace,v_product); end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;

create or replace function public.ts_bridge_trg_inventory_unit()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare v_workspace text; v_product text;
begin
  if pg_trigger_depth()>1 then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if current_setting('ts.bridge_bulk',true)='1' then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if tg_op='DELETE' then
    v_workspace:=old.workspace_key;
    v_product:=old.data->>'product_id';
    if v_product is not null then perform public.ts_bridge_recompute_store_stock(v_workspace,v_product); end if;
  else
    v_workspace:=new.workspace_key;
    v_product:=new.data->>'product_id';
    perform public.ts_bridge_inventory_unit_to_store(new.workspace_key,new.id);
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;

create or replace function public.ts_bridge_trg_store_variant()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare v_product text;
begin
  if pg_trigger_depth()>1 then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if current_setting('ts.bridge_bulk',true)='1' then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if tg_op='DELETE' then
    select inventory_product_id into v_product from public.thinkstore_inventory_bridge where variant_id=old.id limit 1;
    if v_product is not null then
      update public.thinkstore_inventory_products
         set data=data || jsonb_build_object('sync_deleted',true,'sync_updated_at',now())
       where workspace_key='main' and id=v_product;
      perform public.ts_bridge_touch_meta('main');
    end if;
    return old;
  end if;
  v_product:=public.ts_bridge_variant_to_inventory(new.id,'main');
  perform public.ts_bridge_touch_meta('main');
  return new;
end;
$$;

create or replace function public.ts_bridge_trg_store_unit()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare v_product text;
begin
  if pg_trigger_depth()>1 then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if current_setting('ts.bridge_bulk',true)='1' then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if tg_op='DELETE' then
    delete from public.thinkstore_inventory_units
    where workspace_key='main'
      and lower(coalesce(data->>'serial_number',''))=lower(coalesce(old.serial_number,''));
    if old.variant_id is not null then
      select inventory_product_id into v_product from public.thinkstore_inventory_bridge where variant_id=old.variant_id limit 1;
      if v_product is not null then perform public.ts_bridge_refresh_product_counters('main',v_product); end if;
    end if;
  else
    perform public.ts_bridge_unit_to_inventory(new.id,'main');
  end if;
  perform public.ts_bridge_touch_meta('main');
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;

-- Install triggers.
drop trigger if exists trg_ts_bridge_inventory_product on public.thinkstore_inventory_products;
create trigger trg_ts_bridge_inventory_product
after insert or update or delete on public.thinkstore_inventory_products
for each row execute function public.ts_bridge_trg_inventory_product();

drop trigger if exists trg_ts_bridge_inventory_stock on public.thinkstore_inventory_stock;
create trigger trg_ts_bridge_inventory_stock
after insert or update or delete on public.thinkstore_inventory_stock
for each row execute function public.ts_bridge_trg_inventory_stock();

drop trigger if exists trg_ts_bridge_inventory_unit on public.thinkstore_inventory_units;
create trigger trg_ts_bridge_inventory_unit
after insert or update or delete on public.thinkstore_inventory_units
for each row execute function public.ts_bridge_trg_inventory_unit();

drop trigger if exists trg_ts_bridge_store_variant on public.inventory_variants;
create trigger trg_ts_bridge_store_variant
after insert or update or delete on public.inventory_variants
for each row execute function public.ts_bridge_trg_store_variant();

do $$
begin
  if to_regclass('public.inventory_units') is not null then
    execute 'drop trigger if exists trg_ts_bridge_store_unit on public.inventory_units';
    execute 'create trigger trg_ts_bridge_store_unit after insert or update or delete on public.inventory_units for each row execute function public.ts_bridge_trg_store_unit()';
  end if;
end $$;

-- Initial merge. Existing Inventory Central products are linked first; then ThinkStore variants fill missing products.
create or replace function public.ts_inventory_bridge_bootstrap(p_workspace text default 'main')
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r record;
  v_products integer:=0;
  v_variants integer:=0;
  v_units integer:=0;
  v_orphans integer:=0;
begin
  perform set_config('ts.bridge_bulk','1',true);

  -- Existing ThinkStore sales inventory wins on the first merge for matching SKUs.
  for r in select id from public.inventory_variants where active is distinct from false loop
    perform public.ts_bridge_variant_to_inventory(r.id,p_workspace);
    v_variants:=v_variants+1;
  end loop;

  if to_regclass('public.inventory_units') is not null then
    for r in select id from public.inventory_units loop
      perform public.ts_bridge_unit_to_inventory(r.id,p_workspace);
      v_units:=v_units+1;
    end loop;
  end if;

  -- Existing Inventory-only records are intentionally NOT pushed into the live store during bootstrap.
  -- This avoids importing stale/demo stock. They will sync automatically when edited later, or can be
  -- imported explicitly with ts_inventory_bridge_import_orphans().
  select count(*)::integer into v_orphans
  from public.thinkstore_inventory_products p
  where p.workspace_key=p_workspace
    and not exists (
      select 1 from public.thinkstore_inventory_bridge b
      where b.workspace_key=p_workspace and b.inventory_product_id=p.id
    );

  select count(*)::integer into v_products
  from public.thinkstore_inventory_bridge
  where workspace_key=p_workspace;

  perform set_config('ts.bridge_bulk','0',true);
  perform public.ts_bridge_touch_meta(p_workspace);

  return jsonb_build_object(
    'ok',true,
    'workspace',p_workspace,
    'inventory_products_linked',v_products,
    'thinkstore_variants_linked',v_variants,
    'serialized_units_linked',v_units,
    'inventory_orphans_not_imported',v_orphans
  );
end;
$$;



-- Optional: import Inventory Central products that do not yet exist in ThinkStore.
-- Run this only after reviewing orphan SKUs if Inventory Central already contained historical/demo data.
create or replace function public.ts_inventory_bridge_import_orphans(p_workspace text default 'main')
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r record;
  v_imported integer:=0;
begin
  for r in
    select p.id
    from public.thinkstore_inventory_products p
    where p.workspace_key=p_workspace
      and not exists (
        select 1 from public.thinkstore_inventory_bridge b
        where b.workspace_key=p_workspace and b.inventory_product_id=p.id
      )
  loop
    perform public.ts_bridge_product_to_store(p_workspace,r.id);
    perform public.ts_bridge_recompute_store_stock(p_workspace,r.id);
    v_imported:=v_imported+1;
  end loop;
  perform public.ts_bridge_touch_meta(p_workspace);
  return jsonb_build_object('ok',true,'imported',v_imported);
end;
$$;

create or replace function public.ts_inventory_bridge_health(p_workspace text default 'main')
returns jsonb
language sql
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'workspace',p_workspace,
    'linked_products',(select count(*) from public.thinkstore_inventory_bridge where workspace_key=p_workspace),
    'inventory_products',(select count(*) from public.thinkstore_inventory_products where workspace_key=p_workspace),
    'store_variants',(select count(*) from public.inventory_variants where active is distinct from false),
    'unlinked_inventory_products',(
      select count(*) from public.thinkstore_inventory_products p
      where p.workspace_key=p_workspace
        and not exists(select 1 from public.thinkstore_inventory_bridge b where b.workspace_key=p_workspace and b.inventory_product_id=p.id)
    ),
    'duplicate_inventory_skus',(
      select count(*) from (
        select lower(data->>'sku') sku
        from public.thinkstore_inventory_products
        where workspace_key=p_workspace and coalesce(data->>'sku','')<>''
        group by lower(data->>'sku') having count(*)>1
      ) d
    ),
    'last_inventory_meta_update',(select updated_at from public.thinkstore_inventory_meta where workspace_key=p_workspace)
  )
$$;

-- Keep bridge mutation helpers private. They are executed by triggers / SQL migrations, not by browsers.
revoke all on function public.ts_bridge_touch_meta(text) from public, anon, authenticated;
revoke all on function public.ts_bridge_log_movement(text,text,text,text,integer) from public, anon, authenticated;
revoke all on function public.ts_bridge_refresh_product_counters(text,text) from public, anon, authenticated;
revoke all on function public.ts_bridge_product_to_store(text,text) from public, anon, authenticated;
revoke all on function public.ts_bridge_recompute_store_stock(text,text) from public, anon, authenticated;
revoke all on function public.ts_bridge_adjust_inventory_quantity_stock(text,text,integer) from public, anon, authenticated;
revoke all on function public.ts_bridge_variant_to_inventory(uuid,text) from public, anon, authenticated;
revoke all on function public.ts_bridge_unit_to_inventory(uuid,text) from public, anon, authenticated;
revoke all on function public.ts_bridge_inventory_unit_to_store(text,text) from public, anon, authenticated;
revoke all on function public.ts_inventory_bridge_bootstrap(text) from public, anon, authenticated;
revoke all on function public.ts_inventory_bridge_import_orphans(text) from public, anon, authenticated;
revoke all on function public.ts_inventory_bridge_health(text) from public, anon, authenticated;

-- Perform the safe initial merge now (ThinkStore wins existing SKU conflicts).
select public.ts_inventory_bridge_bootstrap('main');
select public.ts_inventory_bridge_health('main');

notify pgrst, 'reload schema';
commit;
