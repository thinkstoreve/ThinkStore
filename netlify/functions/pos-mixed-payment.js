'use strict';
const {normalize:normalizeDestination}=require('./payment-destinations');
// Normalización única en servidor: los importes de cliente NUNCA son autoridad contable.
const METHODS={
  'Efectivo USD':'USD','Zelle':'USD','Transferencia USD':'USD','USDT':'USD',
  'Efectivo Bs':'VES','Pago Móvil':'VES','Transferencia Bs':'VES','Punto de venta Bs':'VES'
};
const cents=n=>Math.round((Number(n)+Number.EPSILON)*100);
const money=c=>Math.round(c)/100;
function prepare(lines,totalUsd,quote,options={}){
  if(!Array.isArray(lines)||lines.length<2||lines.length>3)throw Error('El pago mixto requiere entre 2 y 3 abonos.');
  const target=cents(totalUsd);
  if(!Number.isSafeInteger(target)||target<=0)throw Error('El monto de venta debe ser mayor que cero.');
  const out=[];let paid=0,bsCents=0;
  for(let i=0;i<lines.length;i++){
    const entry=lines[i]||{},method=String(entry.method||'').trim();
    const currency=METHODS[method];
    if(!currency||String(entry.currency||currency)!==currency)throw Error(`Método o moneda inválida en el abono ${i+1}.`);
    const raw=entry.amount;
    if(raw===null||raw===''||raw===undefined||!Number.isFinite(Number(raw))||Number(raw)<0||Number(raw)>1000000000)throw Error(`Monto inválido en el abono ${i+1}.`);
    const original=cents(raw);
    if(original<=0)throw Error(`Coloca un monto positivo en el abono ${i+1}, o elimina esa línea.`);
    if(Math.abs(Number(raw)-money(original))>0.000001)throw Error(`Solo se aceptan dos decimales en el abono ${i+1}.`);
    const reference=String(entry.reference||'').trim().slice(0,120);
    if(!method.startsWith('Efectivo')&&!reference)throw Error(`Indica la referencia del abono ${i+1} (${method}).`);
    const destination=normalizeDestination(method,entry.destination_code,{required:true});
    let usdCents=original;
    if(currency==='VES'){
      if(!(Number(quote?.rate)>0)||quote?.stale||!quote?.effective_date)throw Error('No se pudo verificar la tasa BCV vigente. No registrar cobros en bolívares.');
      usdCents=Math.round(original/Number(quote.rate)); // céntimos VES / (Bs por USD) → céntimos USD
      bsCents+=original;
    }
    paid+=usdCents;
    if(!Number.isSafeInteger(usdCents)||usdCents<=0)throw Error(`El abono ${i+1} es demasiado pequeño para su conversión a USD.`);
    out.push({line_no:i+1,method,currency,amount:money(original),usd_equivalent:money(usdCents),reference,
      destination_code:destination.code,destination_name:destination.name,
      bcv_rate:currency==='VES'?quote.rate:null,bcv_effective_date:currency==='VES'?quote.effective_date:null});
  }
  if(paid>target)throw Error(`Los abonos superan el total de la venta en USD ${(paid-target)/100}.`);
  if(options.requireFull&&paid!==target)throw Error(`Pago incompleto: faltan USD ${money(target-paid).toFixed(2)}. Puedes guardar el pedido en espera.`);
  return{lines:out,paid_usd:money(paid),remaining_usd:money(target-paid),paid_ves:money(bsCents),total_usd:money(target),quote:bsCents?quote:null};
}
module.exports={METHODS,prepare,cents,money};
