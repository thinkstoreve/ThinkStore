-- ThinkStore V14.3 · Sync real Inventory -> Tienda + Barcode POS
-- Ejecutar UNA VEZ después de V14.2 / Inventory V3.2.5.
-- No borra pedidos, clientes, productos ni movimientos.

begin;

-- Índices para búsquedas rápidas de etiquetas TSP/TSU, SKU, serial e IMEI.
create index if not exists tsi_products_barcode_idx
  on public.thinkstore_inventory_products(workspace_key, lower((data->>'product_barcode')));
create index if not exists tsi_products_source_barcode_idx
  on public.thinkstore_inventory_products(workspace_key, lower((data->>'source_barcode')));
create index if not exists tsi_products_sku_idx
  on public.thinkstore_inventory_products(workspace_key, lower((data->>'sku')));
create index if not exists tsi_units_barcode_idx
  on public.thinkstore_inventory_units(workspace_key, lower((data->>'barcode_value')));
create index if not exists tsi_units_serial_idx
  on public.thinkstore_inventory_units(workspace_key, lower((data->>'serial_number')));
create index if not exists tsi_units_imei_idx
  on public.thinkstore_inventory_units(workspace_key, lower((data->>'imei')));

-- Crea/actualiza una ficha editorial interna para productos nacidos en Inventory Central.
-- Se crea como borrador (published=false), por lo que NO se publica automáticamente
-- en la tienda pública, pero sí queda visible en el panel y Staff POS por su variante.
create or replace function public.ts_bridge_inventory_product_to_catalog(
  p_workspace text,
  p_product_id text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  p jsonb;
  v_name text;
  v_key text;
  v_category text;
  v_description text;
  v_image text;
begin
  if to_regclass('public.catalog_products') is null then return; end if;

  select data into p
  from public.thinkstore_inventory_products
  where workspace_key=p_workspace and id=p_product_id;
  if p is null then return; end if;

  v_name:=btrim(coalesce(p->>'name',p->>'sku',''));
  if v_name='' then return; end if;
  v_key:=lower(regexp_replace(v_name,'[^a-zA-Z0-9]+','-','g'));
  v_key:=trim(both '-' from v_key);
  if v_key='' then v_key:='inventory-'||substr(md5(p_product_id),1,16); end if;
  v_category:=coalesce(nullif(p->>'category',''),'Otro');
  v_description:=coalesce(nullif(p->>'description',''),nullif(p->>'compatibility',''),nullif(p->>'subcategory',''));
  v_image:=nullif(p->>'image_url','');

  execute $q$
    insert into public.catalog_products(
      product_key,product_name,category,description,image_url,published,sort_order,updated_at
    ) values ($1,$2,$3,$4,$5,false,1000,now())
    on conflict(product_key) do update
      set product_name=excluded.product_name,
          category=excluded.category,
          description=coalesce(excluded.description,catalog_products.description),
          image_url=coalesce(excluded.image_url,catalog_products.image_url),
          updated_at=now()
  $q$ using v_key,v_name,v_category,v_description,v_image;
end;
$$;

-- Toda creación/edición en Inventory Central se refleja de inmediato en la variante
-- comercial y también en el inventario/catálogo administrativo de ThinkStore.
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
  perform public.ts_bridge_inventory_product_to_catalog(new.workspace_key,new.id);
  return new;
end;
$$;

-- V14.3 cambia la política inicial: los productos válidos de Inventory Central
-- con SKU ya deben formar parte del inventario comercial automáticamente.
create or replace function public.ts_inventory_bridge_import_orphans(p_workspace text default 'main')
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r record;
  v_imported integer:=0;
  v_skipped integer:=0;
begin
  for r in
    select p.id,p.data
    from public.thinkstore_inventory_products p
    where p.workspace_key=p_workspace
      and not exists (
        select 1 from public.thinkstore_inventory_bridge b
        where b.workspace_key=p_workspace and b.inventory_product_id=p.id
      )
  loop
    if btrim(coalesce(r.data->>'sku',''))='' then
      v_skipped:=v_skipped+1;
      continue;
    end if;
    perform public.ts_bridge_product_to_store(p_workspace,r.id);
    perform public.ts_bridge_recompute_store_stock(p_workspace,r.id);
    perform public.ts_bridge_inventory_product_to_catalog(p_workspace,r.id);
    v_imported:=v_imported+1;
  end loop;
  perform public.ts_bridge_touch_meta(p_workspace);
  return jsonb_build_object('ok',true,'imported',v_imported,'skipped_without_sku',v_skipped);
end;
$$;

-- Importar ahora mismo cualquier producto que ya estaba en Inventory y había quedado huérfano.
select public.ts_inventory_bridge_import_orphans('main');

-- Asegurar ficha administrativa para todos los productos ya enlazados.
do $$
declare r record;
begin
  for r in select id from public.thinkstore_inventory_products where workspace_key='main' loop
    perform public.ts_bridge_inventory_product_to_catalog('main',r.id);
  end loop;
end $$;

notify pgrst, 'reload schema';
commit;

-- Diagnóstico final
select public.ts_inventory_bridge_health('main');
