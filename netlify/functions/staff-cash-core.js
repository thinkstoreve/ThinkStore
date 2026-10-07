'use strict';
// Cálculos puros en centavos. Un pago mixto confirmado se cuenta por abono, nunca otra vez por pedido.
const METHODS={'Efectivo USD':'USD','Efectivo Bs':'VES','Zelle':'USD','Pago Móvil':'VES','Transferencia USD':'USD','Transferencia Bs':'VES','Punto de venta Bs':'VES'};
const PHYSICAL=['Efectivo USD','Efectivo Bs'];
const cents=n=>Math.round(Number(n||0)*100);
const money=c=>Math.round(c)/100;
function methodCurrency(method){return METHODS[method]||null}
function ledger(session,orders,paymentRows,movements){
 const entries=[], warnings=[], rates=[];const orderMap=new Map();
 for(const p of orders){
   if(!p?.id||String(p.payment_decision||'').toLowerCase()!=='approved' || !p.payment_decision_at)continue;
   orderMap.set(p.id,p);
 }
 const paidByOrder=new Map();
 for(const line of paymentRows){
   const p=orderMap.get(line.pedido_id);if(!p||p.metodo_pago!=='Pago mixto')continue;
   paidByOrder.set(p.id,(paidByOrder.get(p.id)||0)+cents(line.usd_equivalent));
   if(line.currency!==METHODS[line.method]){warnings.push(`Moneda/método inconsistente en ${p.codigo||'pedido'}`);continue}
   if(!Number.isFinite(Number(line.amount))||Number(line.amount)<=0){warnings.push(`Importe inválido en ${p.codigo||'pedido'}`);continue}
   entries.push({kind:'sale',order_id:p.id,code:p.codigo||'Pedido',method:line.method,currency:line.currency,amount:Number(line.amount),usd_equivalent:Number(line.usd_equivalent),reference:line.reference||'',at:line.confirmed_at||p.payment_decision_at,sign:1,concept:'Venta '+(p.codigo||'')});
 }
 for(const p of orderMap.values()){
   if(p.metodo_pago==='Pago mixto'){
     if((paidByOrder.get(p.id)||0)!==cents(p.total_usd))warnings.push(`Abonos mixtos no coinciden: ${p.codigo||'Pedido'}`);
     continue;
   }
   const method=p.metodo_pago,currency=methodCurrency(method);
   if(!currency){warnings.push(`Método sin clasificación: ${p.codigo||'Pedido'} (${method||'sin método'})`);continue}
   const usd=Number(p.total_usd||0);if(!(usd>0)){warnings.push(`Monto incompleto: ${p.codigo||'Pedido'}`);continue}
   const ves=Number(p.total_bs||0);const rate=Number(p.bcv_rate||0);
   const amount=currency==='USD'?usd:(ves>0?ves:(rate>0?money(Math.round(cents(usd)*rate)):0));
   if(!(amount>0)){warnings.push(`Sin monto BCV: ${p.codigo||'Pedido'}`);continue}
   entries.push({kind:'sale',order_id:p.id,code:p.codigo||'Pedido',method,currency,amount,usd_equivalent:usd,reference:p.referencia_pago||'',at:p.payment_decision_at,sign:1,concept:'Venta '+(p.codigo||'')});
 }
 for(const m of movements){
   if(!methodCurrency(m.method)||methodCurrency(m.method)!==m.currency){warnings.push(`Movimiento sin método: ${m.id}`);continue}
   const sign=['gasto','retiro','devolucion'].includes(m.type)?-1:(m.type==='ajuste'?(m.direction==='out'?-1:1):1);
   entries.push({kind:'manual',id:m.id,method:m.method,currency:m.currency,amount:Number(m.amount),usd_equivalent:null,reference:m.reference||'',at:m.created_at,sign,concept:m.concept,type:m.type});
 }
 entries.sort((a,b)=>new Date(b.at)-new Date(a.at));
 const byMethod={};for(const name of Object.keys(METHODS))byMethod[name]={currency:METHODS[name],in:0,out:0,net:0};
 let soldUsdCents=0,receivedUsdCents=0,receivedVesCents=0;
 const seen=new Set();
 for(const e of entries){
   const d=byMethod[e.method];d[e.sign>0?'in':'out']+=cents(e.amount);
   d.net+=cents(e.amount)*e.sign;
   if(e.kind==='sale'){
     receivedUsdCents+=cents(e.usd_equivalent);
     if(e.currency==='VES')receivedVesCents+=cents(e.amount);
     if(!seen.has(e.order_id)){soldUsdCents+=cents(orderMap.get(e.order_id).total_usd);seen.add(e.order_id)}
   }
 }
 for(const v of Object.values(byMethod)){v.in=money(v.in);v.out=money(v.out);v.net=money(v.net)}
 const expectedUsd=money(cents(session.opening_usd)+cents(byMethod['Efectivo USD'].net));
 const expectedVes=money(cents(session.opening_ves)+cents(byMethod['Efectivo Bs'].net));
 const discrepancyUsd=session.counted_usd==null?null:money(cents(session.counted_usd)-cents(expectedUsd));
 const discrepancyVes=session.counted_ves==null?null:money(cents(session.counted_ves)-cents(expectedVes));
 return{entries,by_method:byMethod,expected_usd:expectedUsd,expected_ves:expectedVes,difference_usd:discrepancyUsd,difference_ves:discrepancyVes,sold_usd:money(soldUsdCents),collected_usd:money(receivedUsdCents),collected_ves:money(receivedVesCents),sale_count:seen.size,warnings};
}
module.exports={METHODS,PHYSICAL,cents,money,methodCurrency,ledger};
