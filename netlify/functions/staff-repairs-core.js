'use strict';
const METHOD_CURRENCY={
  'Efectivo USD':'USD','Zelle':'USD','Transferencia USD':'USD',
  'Efectivo Bs':'VES','Pago Móvil':'VES','Transferencia Bs':'VES','Punto de venta Bs':'VES'
};
const cents=n=>Math.round(Number(n)*100);
const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
function moneyNumber(value,name='Importe'){
  if(value===null||value===undefined||value===''||!Number.isFinite(Number(value))||Number(value)<=0||Number(value)>1e10||Math.abs(cents(value)/100-Number(value))>0.00001)throw Error(`${name} inválido: usa un monto positivo con máximo dos decimales.`);
  return round(value);
}
function account(order){
  const budget=Math.max(0,round(order.quote_amount||0));
  const paid=Math.max(0,round(order.amount_paid||0));
  const pending=Math.max(0,round(budget-paid));
  const cancelled=/cancel|rechaz|no aprobado/i.test(String(order.status||''));
  return{budget,paid,pending,cancelled,paidOff:budget>0&&!cancelled&&pending===0,partial:paid>0&&pending>0};
}
function paymentPlan(order,input,bcv){
  const balance=account(order);
  if(balance.cancelled)throw Error('No se puede cobrar una reparación cancelada o rechazada.');
  if(balance.budget<=0)throw Error('La orden no tiene presupuesto válido; registra la cotización desde Soporte.');
  if(balance.pending<=0)throw Error('La reparación ya está cobrada.');
  if(!['USD',''].includes(String(order.quote_currency||'USD').toUpperCase())&&String(order.quote_currency).toUpperCase()!=='USD')throw Error('Esta cotización no está expresada en USD. Requiere revisión manual en Soporte.');
  const method=String(input.method||'');const currency=METHOD_CURRENCY[method];if(!currency)throw Error('Selecciona un método de pago admitido.');
  const amount=moneyNumber(input.amount);
  const ref=String(input.reference||'').trim().slice(0,100);
  if(!method.startsWith('Efectivo')&&ref.length<3)throw Error('Indica la referencia de la transferencia o transacción.');
  let equivalent=amount,rate=null;
  if(currency==='VES'){
    if(!bcv||bcv.stale||!(Number(bcv.rate)>0)||!bcv.effective_date)throw Error('Tasa BCV no verificada. Intenta nuevamente.');
    rate=Number(bcv.rate); equivalent=round(amount/rate);
    if(equivalent<=0)throw Error('El abono equivale a menos de USD 0,01.');
  }
  if(cents(equivalent)>cents(balance.pending))throw Error(`El abono supera el saldo pendiente de $${balance.pending.toFixed(2)}.`);
  const after=round(balance.paid+equivalent);
  const status=cents(after)>=cents(balance.budget)?'Cobrado':'Abono';
  return{method,currency,amount,equivalent,reference:ref,rate,bcv_effective_date:bcv?.effective_date||null,bcv_source:bcv?.source||null,previous:balance.paid,after,status,budget:balance.budget,pending:round(balance.budget-after)};
}
function canAccessRepairs(auth,write=false){
  if(!auth?.ok||auth.profile?.is_internal!==true)return false;
  const r=auth.role,p=auth.profile||{};
  if((p.active??p.activo??true)===false)return false;
  const overrides=p.permission_overrides&&typeof p.permission_overrides==='object'?p.permission_overrides:{};
  const allowed=Array.isArray(overrides.allow)?overrides.allow:[];
  const denied=Array.isArray(overrides.deny)?overrides.deny:[];
  if(denied.includes('platform.support')||denied.includes('reparaciones')||denied.includes('pagos'))return false;
  if(['admin','superadmin'].includes(r))return true;
  if(r==='vendedor')return !denied.includes('staff.access')&&!denied.includes('ventas'); // rol de caja: ventas + pagos predeterminados
  if(['recepcion','soporte'].includes(r))return !write||allowed.includes('pagos');
  if(r==='tecnico')return !write;
  return allowed.includes('platform.support')&&(!write||allowed.includes('pagos'));
}
module.exports={METHOD_CURRENCY,round,cents,account,paymentPlan,canAccessRepairs};
