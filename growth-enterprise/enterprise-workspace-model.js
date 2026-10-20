(function(root){
 'use strict';
 const number=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
 const date=v=>{if(!v)return '';try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));}catch{return '';}};
 const normal=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function filter(rows,f={}){return rows.filter(r=>{
  const d=date(r.date||r.occurred_at||r.created_at);
  return (!f.from||(d&&d>=f.from))&&(!f.to||(d&&d<=f.to))&&(!f.source||r.source===f.source)&&(!f.direction||r.direction===f.direction)&&(!f.method||r.method===f.method)&&(!f.query||normal(Object.values(r).filter(x=>typeof x!=='object').join(' ')).includes(normal(f.query)));
 });}
 function total(rows,key){let cents=0,unknown=0;rows.forEach(r=>{const n=number(r[key]);if(n===null)unknown++;else cents+=Math.round(n*100);});return {amount:cents/100,unknown,count:rows.length};}
 function movements(d){return (d?.movement_ledger?.records||[]).map((r,i)=>({...r,key:'movement:'+i,date:r.occurred_at,code:r.reference||r.order_id||r.source_id||'Sin referencia',description:r.source,amount:number(r.amount_usd)}));}
 function sales(d){return (d?.sales_ledger?.records||[]).map((r,i)=>({...r,key:'sale:'+i,source:r.source||r.kind,code:r.code||r.id,description:r.kind,amount:number(r.total_usd),collected:number(r.collected_usd),pending:number(r.pending_usd)}));}
 function expenses(d){return (d?.expenses?.rows||[]).map((r,i)=>({...r,key:'expense:'+i,date:r.occurred_at||r.created_at,source:r.source_system||'manual',method:r.payment_method||'Sin definir',code:r.reference||r.source_code||r.id,amount:number(r.amount_usd)}));}
 const api={number,date,normal,filter,total,movements,sales,expenses};if(typeof module!=='undefined')module.exports=api;root.ThinkStoreEnterpriseModel=api;
})(typeof window==='undefined'?globalThis:window);
