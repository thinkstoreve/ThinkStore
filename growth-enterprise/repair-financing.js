(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ThinkStoreFinancing=api;})(typeof window==='object'?window:this,function(){
 'use strict';
 const amount=v=>Math.max(0,Math.round((Number(v)||0)*100)/100);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function validDate(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))return false;const d=new Date(v+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;}
 function snapshot(o,now=Date.now()){
  const f=o.financing||o.reception_checklist?.__financing||o.checklist?.__financing;
  if(!f?.enabled)return null;
  const total=amount(o.staff_invoice_total??o.quote_amount??o.quoteAmount),paid=amount(o.staff_paid??o.amount_paid??o.amountPaid),initial=amount(f.initial_amount),balance=amount(total-paid);
  const due=validDate(f.due_date)?f.due_date:null;
  // Vence al finalizar la fecha pactada en Caracas, no al comenzar ese día.
  const overdue=balance>0&&!!due&&now>=new Date(due+'T00:00:00-04:00').getTime()+86400000;
  return{enabled:true,initial_amount:initial,initial_paid:Math.min(initial,paid),initial_pending:amount(initial-paid),installments_paid:amount(paid-initial),paid,total,balance,due_date:due,overdue,status:balance<=0?'Pagado':overdue?'Crédito vencido':'Pago pendiente',currency:o.quote_currency||o.quoteCurrency||'USD'};
 }
 function html(o){const s=snapshot(o);if(!s)return'';const money=n=>esc(s.currency)+' '+Number(n).toFixed(2);return `<section style="background:#fff4b8;color:#503d00;border:1px solid #d8ad22;border-radius:12px;padding:12px;margin:8px 0" aria-label="Reparación financiada"><b>Reparación financiada · ${esc(s.status)}</b><div>Pago inicial: ${money(s.initial_amount)} · recibido: ${money(s.initial_paid)}</div><div>Abonos: ${money(s.installments_paid)}</div><div><strong>Pago pendiente: ${money(s.balance)}</strong></div><div>Vencimiento: ${esc(s.due_date||'Sin definir')}</div></section>`;}
 return{snapshot,html,validDate};
});
