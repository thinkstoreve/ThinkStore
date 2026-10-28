(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TSPartsCatalog=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 function searchText(part){
  const m=part?.catalog_details||{};
  return [part?.sku,part?.name,part?.category,part?.compatible_models,part?.location,m.model,m.series,m.model_type,m.repair,m.quality,m.inventory_group,m.item_type,m.description].filter(Boolean).join(' ');
 }
 function matches(part,query){const haystack=normalize(searchText(part));return normalize(query).split(/\s+/).filter(Boolean).every(word=>haystack.includes(word));}
 function displayName(part){
  const m=part?.catalog_details||{};
  const model=m.model||m.series||part?.compatible_models||'';
  const details=[m.repair,model].filter(Boolean).join(' ');
  const name=String(part?.name||'').trim();
  if(details&&(!name||/^(estandar|original|aaa|oem|premium|repuesto|pantalla|bateria)$/.test(normalize(name))))return details+(m.quality?' · '+m.quality:'');
  return name||details||'Repuesto';
 }
 async function loadAll(client){
  const pageSize=500,rows=[],seen=new Set();
  // Stable ordering and explicit ranges avoid Supabase's default response limit.
  for(let offset=0;offset<100000;offset+=pageSize){
   const result=await client.from('service_parts').select('*').order('name',{ascending:true}).order('id',{ascending:true}).range(offset,offset+pageSize-1);
   if(result.error)throw Error('No se pudo cargar el inventario técnico: '+result.error.message);
   if(!Array.isArray(result.data))throw Error('Respuesta inválida del inventario técnico.');
   let added=0;for(const row of result.data){if(!seen.has(String(row.id))){seen.add(String(row.id));rows.push(row);added++;}}
   if(result.data.length<pageSize)return {data:rows,error:null};
   if(!added)throw Error('El inventario devolvió una página repetida. Actualiza antes de seleccionar repuestos.');
  }
  throw Error('El inventario excede el límite de carga. No se mostrará una lista incompleta.');
 }
 return {normalize,searchText,matches,displayName,loadAll};
});
