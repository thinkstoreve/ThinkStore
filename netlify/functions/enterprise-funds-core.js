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
function serviceProfit(orders=[],settlements=[],events=[]){
 const numeric=v=>v===null||v===undefined||v===''||typeof v==='boolean'||!Number.isFinite(Number(v))?null:Number(v);
 const byId=new Map(orders.map(o=>[String(o.id),o])),byCode=new Map(orders.map(o=>[String(o.code||o.order_code),o]));
 const recognized=new Set(),seen=new Set(),warnings=[];let profit=0;
 for(const s of settlements){
  const code=String(s.order_code||''),o=byId.get(String(s.service_order_id))||byCode.get(code);
  if(!o||!code||seen.has(code)||/cancel|rechaz|anulad|no aprobado/i.test(o.status||''))continue;seen.add(code);
  const meta=s.metadata?.payment_reconciliation||{},sub=numeric(s.subtotal_usd),disc=numeric(s.discount_usd);
  const invoice=numeric(meta.invoiced_usd)??(sub!==null&&disc!==null?round(sub-disc):null);
  const quote=numeric(o.quote_amount),paid=numeric(o.amount_paid),received=numeric(s.collected_usd);
  if(!(quote>0)||paid===null||paid<quote-.005||!(invoice>0)||received===null||received<invoice-.005)continue;
  if(String(o.quote_currency||'USD').toUpperCase()==='USD'&&Math.abs(quote-invoice)>.01){warnings.push('Liquidación no coincide con la orden '+code);continue;}
  const costs=[s.parts_cost_usd,s.store_product_cost_usd,s.service_direct_cost_usd,s.total_commission_usd].map(numeric);
  if(costs.some(v=>v===null||v<0)){warnings.push('Liquidación sin costos verificables: '+code);continue;}
  profit=round(profit+invoice-costs.reduce((a,b)=>a+b,0));recognized.add(String(o.id));recognized.add(code);
 }
 let held=0,unverifiedRefund=false;
 for(const e of events){const id=String(e.service_order_id||e.order_id||''),code=String(e.order_code||''),amount=numeric(e.amount_delta);if(amount===null)continue;
  if(!recognized.has(id)&&!recognized.has(code)){held=round(held+amount);if(amount<0)unverifiedRefund=true;}
 }
 if(unverifiedRefund)warnings.push('Hay devoluciones o anulaciones de servicios pendientes de conciliación; el reparto queda bloqueado.');
 return {profit,held:Math.max(0,held),orders:seen.size,recognized_orders:recognized.size/2,warnings,blocked:unverifiedRefund};
}

module.exports={storeCash,supportCashEvents,companyCapital,serviceProfit};
