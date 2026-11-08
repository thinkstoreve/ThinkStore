(function(root){
 'use strict';
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
 const urls=row=>[...new Set([row.image_url,...(Array.isArray(row.image_urls)?row.image_urls:[])].filter(u=>/^https:\/\//i.test(String(u))))];
 const conditionKey=v=>/pre.?owned|renovado|usado|refurb/i.test(String(v))?'preowned':'new';
 function forSelection(product,color,condition){if(!product.inventory_media_managed)return null;const media=product.inventory_color_media?.[color]||Object.entries(product.inventory_color_media||{}).find(([name])=>norm(name)===norm(color))?.[1];return media?.images?.length?media:null;}
 function apply(base,rows){
  const groups=new Map();
  for(const row of rows){const key=norm(row.product_group||row.name),canonical=key==='iphone 18 ultra'?'iphone ultra':key;if(!groups.has(canonical))groups.set(canonical,[]);groups.get(canonical).push(row);}
  for(const [key,items] of groups){
   const target=base.find(p=>[p.name,p.family,p.model].some(n=>norm(n)===key));if(!target)continue;
   const managed=items.some(x=>x.media_replace_catalog===true),colorsManaged=items.some(x=>x.catalog_colors_managed===true);
   const ordered=items.slice().sort((a,b)=>Number(b.catalog_media_primary===true)-Number(a.catalog_media_primary===true)||Number(a.condition==='Pre-Owned')-Number(b.condition==='Pre-Owned')||String(a.id).localeCompare(String(b.id)));
   const primary=ordered.find(x=>x.catalog_media_primary===true)||ordered.find(x=>urls(x).length)||ordered[0];
   // Una galería por color, compartida por todas sus capacidades y condiciones.
   const galleries={};
   for(const row of ordered){
    const color=String(row.variant_color||row.color||'').trim();if(!color)continue;
    const label=Object.keys(galleries).find(x=>norm(x)===norm(color))||color;
    const media=galleries[label]||(galleries[label]={images:[],video:'',id:row.id});
    const incoming=urls(row);if(incoming.length>media.images.length)media.images=incoming.slice(0,24);
    if(!media.video&&String(row.video_url||'').toLowerCase().startsWith('https://'))media.video=row.video_url;
   }
   for(const [color,media] of Object.entries(galleries)){
    if(!media.images.length){const legacy=Object.entries(target.colors||{}).find(([name])=>norm(name)===norm(color))?.[1];if(legacy&&!managed)media.images=[legacy];}
   }
   const variantMedia={};for(const row of ordered){const color=String(row.variant_color||row.color||'').trim();variantMedia[norm(color)+'|'+conditionKey(row.condition)]=galleries[Object.keys(galleries).find(x=>norm(x)===norm(color))];}
   const cover=urls(primary)[0]||'';
   if(managed){target.main=cover||'assets/logo-thinkstore.png';target.gallery=[...new Set(ordered.flatMap(urls))].slice(0,24);target.video_url=String(primary.video_url||'');target.colors={};}
   else{if(cover)target.main=cover;const extra=ordered.flatMap(urls);if(extra.length)target.gallery=[...new Set([...extra,...(target.gallery||[])])].slice(0,24);const video=ordered.find(x=>/^https:\/\//i.test(String(x.video_url||'')));if(video)target.video_url=video.video_url;}
   if(colorsManaged)target.colors={};target.colors=target.colors||{};
   for(const [color,media] of Object.entries(galleries))target.colors[color]=media.images[0]||(managed?'assets/logo-thinkstore.png':target.colors[color]||target.main||'');
   const card=items.find(x=>/^https:\/\//i.test(String(x.catalog_card_image_url||'')));
   if(card){target.main=card.catalog_card_image_url;target.inventory_card_cover=card.catalog_card_image_url;}
   target.inventory_variant_media=variantMedia;target.inventory_color_media=galleries;target.inventory_media_managed=managed||ordered.some(x=>urls(x).length>0);target.inventory_media_product_id=primary.id;
  }
  return base;
 }
 if(typeof module==='object'&&module.exports)module.exports={apply,forSelection};else root.ThinkStoreCatalogMedia={apply,forSelection};
})(typeof window==='object'?window:this);
