(function(root){
 'use strict';
 const categories={rent:'Alquiler',service:'Servicios',subscription:'Suscripciones',supplier:'Proveedor · Inventory',payroll:'Personal',tax:'Impuestos',other:'Otro gasto'};
 const clean=v=>String(v??'').trim();
 const today=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const date=v=>{try{return /^\d{4}-\d{2}-\d{2}$/.test(clean(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}catch{return false;}};
 const addDays=(v,n)=>{const d=new Date(v+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 const amount=v=>{const s=clean(v).replace(',','.');return /^\d+(\.\d{1,2})?$/.test(s)&&Number(s)>0&&Number(s)<=100000000?Number(s):null};
 function validate(v){
  if(clean(v.title).length<3||clean(v.title).length>160)throw Error('Escribe un concepto de 3 a 160 caracteres.');
  if(!categories[v.category])throw Error('Selecciona el tipo de gasto.');
  if(!date(v.due_date))throw Error('Indica una fecha de vencimiento válida.');
  if(!['USD','VES'].includes(v.currency)||amount(v.amount)===null)throw Error('Indica el importe y la moneda del pago.');
  const days=Number(v.remind_days);if(!Number.isInteger(days)||days<0||days>30)throw Error('La anticipación debe ser de 0 a 30 días.');
  return{title:clean(v.title),category:v.category,counterparty:clean(v.counterparty).slice(0,160),amount:amount(v.amount),currency:v.currency,due_date:v.due_date,remind_days:days,notes:clean(v.notes).slice(0,1000)};
 }
 function status(row,day=today()){
  if(row.status==='cancelled')return 'archived';
  if(row.status==='paid')return row.expense?.status==='void'?'review':'paid';
  if(!date(row.due_date))return 'review';
  if(row.due_date<day)return 'overdue';if(row.due_date===day)return 'today';
  return row.due_date<=addDays(day,Number(row.remind_days)||0)?'upcoming':'scheduled';
 }
 function alerts(rows,day=today()){return rows.filter(r=>['overdue','today','upcoming','review'].includes(status(r,day))).sort((a,b)=>a.due_date.localeCompare(b.due_date));}
 const api={categories,today,date,addDays,amount,validate,status,alerts};if(typeof module!=='undefined')module.exports=api;root.ThinkStoreScheduleModel=api;
})(typeof window==='undefined'?globalThis:window);
