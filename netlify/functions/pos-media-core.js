'use strict';
const clean=v=>String(v??'').trim(),key=v=>clean(v).toLowerCase();
const safe=v=>/^https:\/\//i.test(clean(v))&&!/logo-thinkstore/i.test(clean(v))?clean(v):'';
function enrich(variants,products,links){
 const byId=new Map(),bySku=new Map(),byHint=new Map(),byVariant=new Map();
 const add=(map,k,v)=>{if(!k)return;const values=map.get(k)||[];if(!values.includes(v))values.push(v);map.set(k,values);};
 for(const p of products){if(!p?.data||p.data.active===false)continue;byId.set(String(p.id),p.data);add(bySku,key(p.data.sku),p.data);add(byHint,clean(p.data.sync_variant_id),p.data);}
 for(const l of links){const d=byId.get(String(l.inventory_product_id));if(d)add(byVariant,clean(l.variant_id),d);}
 return variants.map(v=>{
  const candidates=byVariant.get(clean(v.id))||byHint.get(clean(v.id))||bySku.get(key(v.sku))||[];
  // Do not pick a random photograph if multiple central records match the variant.
  if(candidates.length!==1)return v;
  const d=candidates[0],images=[d.image_url,...(Array.isArray(d.image_urls)?d.image_urls:[])].map(safe).filter(Boolean);
  return{...v,image_url:images[0]||'',image_urls:[...new Set(images)].slice(0,8),catalog_description:clean(d.catalog_description||d.description)};
 });
}
module.exports={enrich};
