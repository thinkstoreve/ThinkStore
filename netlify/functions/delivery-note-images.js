'use strict';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function imageUrl(value){
 const raw=typeof value==='string'?value.trim():'';if(!raw||/[<>]/.test(raw)||(/^[a-z][a-z\d+.-]*:/i.test(raw)&&!/^https?:/i.test(raw)))return '';
 try{const u=new URL(raw.startsWith('/')||/^https?:\/\//i.test(raw)?raw:raw.startsWith('assets/')?'/'+raw:'/assets/'+raw,'https://thinkstore.com.ve');return /^https?:$/.test(u.protocol)&&u.pathname!=='/'&&!/\.(?:html?|js|css|json)$/i.test(u.pathname)?u.href:'';}catch{return '';}
}
const pictures=r=>[r?.image_url,r?.image,r?.img,...(Array.isArray(r?.image_urls)?r.image_urls:[])].map(imageUrl).filter(Boolean);
const name=r=>norm(r?.producto||r?.product_name||r?.product_group||r?.name||r?.nombre);
function match(rows,item){const color=norm(item.color),named=rows.filter(r=>name(r)===name(item)&&name(item));const colored=color?named.filter(r=>norm(r.color||r.color_name)===color):named;if(color&&colored.length)return colored;return new Set(named.flatMap(pictures)).size===1?named:[];}
async function hydrate(items,read){
 if(!Array.isArray(items)||!items.length)return items||[];
 const paths=['thinkstore_inventory_products?select=id,data&workspace_key=eq.main&limit=5000','catalog_products?select=product_key,product_name,image_url&limit=2000','catalog_product_images?select=product_key,image_url,color_name,is_primary,sort_order&order=sort_order.asc&limit=3000'];
 const [raw,products,images]=await Promise.all(paths.map(async p=>{try{return await read(p)||[];}catch{return [];}}));
 const inventory=raw.map(r=>({...r.data,id:r.id}));
 return items.map(item=>{
  const exact=inventory.filter(r=>(item.sku&&r.sku===item.sku)||(item.inventory_variant_id&&r.inventory_variant_id===item.inventory_variant_id));
  const current=exact.length?exact:match(inventory,item);
  const catalog=products.filter(p=>(item.product_key&&p.product_key===item.product_key)||name(p)===name(item));
  const gallery=images.filter(im=>catalog.some(p=>p.product_key===im.product_key)&&(!im.color_name||!item.color||norm(im.color_name)===norm(item.color))).sort((a,b)=>Number(b.is_primary)-Number(a.is_primary));
  const candidates=[...new Set([...current.flatMap(pictures),...pictures(item),...gallery.flatMap(pictures),...catalog.flatMap(pictures)])];
  return {...item,image_url:candidates[0]||'',image_candidates:candidates};
 });
}
module.exports={hydrate,imageUrl};
