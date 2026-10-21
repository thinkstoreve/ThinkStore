'use strict';
const cash=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
function storeCash(orders,payments,range){
 const inside=v=>v&&new Date(v)>=new Date(range.startIso)&&new Date(v)<=new Date(range.endIso),rows=[],seen=new Set(),linked=new Set();
 for(const p of payments||[]){if(p.status!=='confirmed')continue;linked.add(String(p.pedido_id));const id=String(p.id||'');if(!id||seen.has(id)||!inside(p.confirmed_at||p.created_at))continue;seen.add(id);const n=cash(p.usd_equivalent??p.amount_usd);if(n===null||n<=0)continue;rows.push({...p,amount_usd:round(n),method:p.method||'Sin definir',legacy:false});}
 for(const o of orders||[]){if(linked.has(String(o.id)))continue;const n=cash(o.paid_usd??o.amount_paid??o.monto_pagado);if(!(n>0)||!inside(o.payment_decision_at||o.paid_at))continue;if(o.payment_decision!=='approved'&&!/pagad|pago verificado|entregado|cancel/i.test(o.estado||o.status||''))continue;rows.push({...o,id:'legacy-'+o.id,pedido_id:o.id,amount_usd:round(n),method:o.metodo_pago||o.payment_method||'Sin definir',confirmed_at:o.payment_decision_at||o.paid_at,legacy:true});}
 return rows;
}
function supportCashEvents(orders,events,range){
 const rows=[],seen=new Set(),linked=new Set(),inside=v=>v&&new Date(v)>=new Date(range.startIso)&&new Date(v)<=new Date(range.endIso);
 for(const e of events||[]){linked.add(String(e.service_order_id||e.order_id||''));if(e.order_code)linked.add(String(e.order_code));if(['void','cancelled','rejected'].includes(e.status))continue;const id=String(e.id||'');if(!id||seen.has(id)||!inside(e.occurred_at||e.created_at)||cash(e.amount_delta)===null)continue;seen.add(id);rows.push(e)}
 for(const o of orders||[]){const n=cash(o.amount_paid);if(linked.has(String(o.id))||linked.has(String(o.code||o.order_code))||!(n>0)||!inside(o.paid_at))continue;rows.push({id:'legacy-support-'+o.id,service_order_id:o.id,order_code:o.code||o.order_code,amount_delta:round(n),payment_method:o.payment_method,occurred_at:o.paid_at,legacy:true})}return rows;
}
function companyCapital(audits=[]){const periods=new Set(),accepted=[],pending=[];for(const a of audits){if(a.status!=='closed')continue;const key=a.week_start+'|'+a.week_end;if(periods.has(key))continue;periods.add(key);const s=a.snapshot||{},r=s.reconciliation||{},n=cash(a.company_share);const ok=r.current?.status==='closed'&&r.totals?.completed===true&&cash(r.totals?.difference)===0&&n!==null&&n>=0;(ok?accepted:pending).push({id:a.id,start:a.week_start,end:a.week_end,amount_usd:n,closed_at:a.closed_at});}return {definition:'company_profit_allocated_in_reconciled_closings',allocated_usd:round(accepted.reduce((n,a)=>n+a.amount_usd,0)),unverified_closings:pending.length,closings:accepted,pending,limited:audits.length>=5000,note:'Utilidad asignada a la empresa en cierres conciliados. No equivale a saldo bancario disponible ni incluye repartos pendientes.'};}
module.exports={storeCash,supportCashEvents,companyCapital};
