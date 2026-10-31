(function(root){
 'use strict';
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
 const urls=row=>[...new Set([row.image_url,...(Array.isArray(row.image_urls)?row.image_urls:[])].filter(u=>/^https:\/\//i.test(String(u))))];
 const conditionKey=v=>/pre.?owned|renovado|usado|refurb/i.test(String(v))?'preowned':'new';
 function forSelection(product,color,condition){if(!product.inventory_media_managed)return null;return product.inventory_variant_media?.[norm(color)+'|'+conditionKey(condition)]||product.inventory_color_media?.[color]||null;}
 function apply(base,rows){
  const groups=new Map();
  for(const row of rows){const key=norm(row.product_group||row.name),canonical=key==='iphone 18 ultra'?'iphone ultra':key;if(!groups.has(canonical))groups.set(canonical,[]);groups.get(canonical).push(row);}
  for(const [key,items] of groups){
   const target=base.find(p=>[p.name,p.family,p.model].some(n=>norm(n)===key));if(!target)continue;
   const managed=items.some(x=>x.media_replace_catalog===true),colorsManaged=items.some(x=>x.catalog_colors_managed===true);
   const ordered=items.slice().sort((a,b)=>Number(b.catalog_media_primary===true)-Number(a.catalog_media_primary===true)||Number(a.condition==='Pre-Owned')-Number(b.condition==='Pre-Owned')||String(a.id).localeCompare(String(b.id)));
   const primary=ordered.find(x=>x.catalog_media_primary===true)||ordered.find(x=>urls(x).length)||ordered[0];
   const variantMedia={};for(const row of ordered){const key=norm(row.variant_color||row.color)+'|'+conditionKey(row.condition);if(!Object.hasOwn(variantMedia,key))variantMedia[key]={images:urls(row),video:String(row.video_url||''),id:row.id};}
   const galleries={};for(const row of ordered){const color=String(row.variant_color||row.color||'').trim();if(color&&!Object.hasOwn(galleries,color))galleries[color]={images:urls(row),video:String(row.video_url||''),id:row.id};}
   const cover=urls(primary)[0]||'assets/logo-thinkstore.png';
   if(managed){target.main=cover;target.gallery=[...new Set(ordered.flatMap(urls))].slice(0,24);target.video_url=String(primary.video_url||'');target.colors={};}
   else{if(cover)target.main=cover;const extra=ordered.flatMap(urls);if(extra.length)target.gallery=[...new Set([...extra,...(target.gallery||[])])].slice(0,24);const video=ordered.find(x=>/^https:\/\//i.test(String(x.video_url||'')));if(video)target.video_url=video.video_url;}
   if(colorsManaged)target.colors={};target.colors=target.colors||{};
   for(const [color,media] of Object.entries(galleries))target.colors[color]=media.images[0]||(managed?'assets/logo-thinkstore.png':target.colors[color]||target.main||'');
   target.inventory_variant_media=variantMedia;target.inventory_color_media=galleries;target.inventory_media_managed=managed;target.inventory_media_product_id=primary.id;
  }
  return base;
 }
 if(typeof module==='object'&&module.exports)module.exports={apply,forSelection};else root.ThinkStoreCatalogMedia={apply,forSelection};
})(typeof window==='object'?window:this);
