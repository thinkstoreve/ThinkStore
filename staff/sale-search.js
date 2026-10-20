(function(root){
 'use strict';
 const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/(\d)\s+(gb|tb)\b/g,'$1$2').replace(/[^a-z0-9]+/g,' ').trim();
 function matches(query,name,category,v={}){const hay=normalize([name,category,v.sku,v.model,v.color,v.capacity,v.condition,v.chip,v.ram,v.style,v.brand].join(' '));return normalize(query).split(/\s+/).filter(Boolean).every(t=>hay.includes(t));}
 const api={normalize,matches};if(typeof module!=='undefined')module.exports=api;root.ThinkStoreSaleSearch=api;
})(typeof window==='undefined'?globalThis:window);
