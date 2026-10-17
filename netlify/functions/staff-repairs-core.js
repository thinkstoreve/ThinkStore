'use strict';
const METHOD_CURRENCY={
  'Efectivo USD':'USD','Zelle':'USD','Transferencia USD':'USD','USDT':'USD',
  'Efectivo Bs':'VES','Pago Móvil':'VES','Transferencia Bs':'VES','Punto de venta Bs':'VES',
  'EUR':'CUSTOM','Otro':'CUSTOM'
};
const REF_REQUIRED=new Set(['Zelle','Pago Móvil','Transferencia USD','Transferencia Bs','Punto de venta Bs','USDT']);
const cents=n=>Math.round(Number(n)*100);
const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
function moneyNumber(value,name='Importe'){
  if(value===null||value===undefined||value===''||!Number.isFinite(Number(value))||Number(value)<=0||Number(value)>1e10||Math.abs(cents(value)/100-Number(value))>0.00001)throw Error(`${name} inválido: usa un monto positivo con máximo dos decimales.`);
  return round(value);
}
function account(order){
  const budget=Math.max(0,round(order.quote_amount||0));const paid=Math.max(0,round(order.amount_paid||0));const pending=Math.max(0,round(budget-paid));const cancelled=/cancel|rechaz|no aprobado/i.test(String(order.status||''));
  return{budget,paid,pending,cancelled,paidOff:budget>0&&!cancelled&&pending===0,partial:paid>0&&pending>0};
}
function paymentPlan(order,input,bcv){
  const balance=account(order);if(balance.cancelled)throw Error('No se puede cobrar una reparación cancelada o rechazada.');
  const method=String(input.method||'');const currency=METHOD_CURRENCY[method];if(!currency)throw Error('Selecciona un método de pago admitido.');const amount=moneyNumber(input.amount);const ref=String(input.reference||'').trim().slice(0,100);if(REF_REQUIRED.has(method)&&ref.length<3)throw Error('Indica la referencia de la transferencia o transacción.');
  let equivalent=amount,rate=null,originalCurrency=currency;
  if(currency==='VES'){
    if(!bcv||bcv.stale||!(Number(bcv.rate)>0)||!bcv.effective_date)throw Error('Tasa BCV no verificada. Intenta nuevamente.');rate=Number(bcv.rate);equivalent=round(amount/rate);if(equivalent<=0)throw Error('El abono equivale a menos de USD 0,01.');
  }else if(currency==='CUSTOM'){
    equivalent=moneyNumber(input.usd_equivalent,'Equivalente USD');originalCurrency=method==='EUR'?'EUR':'OTHER';
  }
  const bootstrap=balance.budget<=0&&input.finalize_no_quote===true&&balance.paid<=0;
  if(balance.budget<=0&&!bootstrap)throw Error('La orden no tiene un total definido. Usa “Cobrar + Nota de Entrega” e indica el monto final recibido.');
  if(!bootstrap&&String(order.quote_currency||'USD').toUpperCase()!=='USD')throw Error('Esta cotización no está expresada en USD. Requiere revisión manual en Soporte.');
  if(bootstrap&&String(order.quote_currency||'USD').toUpperCase()!=='USD'&&String(order.quote_currency||'').trim())throw Error('La orden tiene una moneda de cotización distinta a USD. Requiere revisión manual en Soporte.');
  const budget=bootstrap?equivalent:balance.budget;const pending=bootstrap?equivalent:balance.pending;
  if(pending<=0)throw Error('La reparación ya está cobrada.');
  if(cents(equivalent)>cents(pending))throw Error(`El abono supera el saldo pendiente de $${pending.toFixed(2)}.`);
  const previous=bootstrap?0:balance.paid;const after=round(previous+equivalent),status=cents(after)>=cents(budget)?'Cobrado':'Abono';
  return{method,currency:originalCurrency,amount,equivalent,reference:ref,rate,bcv_effective_date:bcv?.effective_date||null,bcv_source:bcv?.source||null,previous,after,status,budget,pending:round(budget-after),bootstrap_quote:bootstrap};
}
function canAccessRepairs(auth,write=false){
  if(!auth?.ok||auth.profile?.is_internal!==true)return false;const r=auth.role,p=auth.profile||{};if((p.active??p.activo??true)===false)return false;const overrides=p.permission_overrides&&typeof p.permission_overrides==='object'?p.permission_overrides:{};const allowed=Array.isArray(overrides.allow)?overrides.allow:[];const denied=Array.isArray(overrides.deny)?overrides.deny:[];if(denied.includes('platform.support')||denied.includes('reparaciones')||denied.includes('pagos'))return false;if(['admin','superadmin'].includes(r))return true;if(r==='vendedor')return !denied.includes('staff.access')&&!denied.includes('ventas');if(['recepcion','soporte'].includes(r))return !write||allowed.includes('pagos');if(r==='tecnico')return !write;return allowed.includes('platform.support')&&(!write||allowed.includes('pagos'));
}
module.exports={METHOD_CURRENCY,REF_REQUIRED,round,cents,account,paymentPlan,canAccessRepairs};
