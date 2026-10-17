/* ThinkStore Enterprise: visor independiente, estrictamente de solo lectura. */
(()=>{
'use strict';
const money=n=>Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD'});
const str=v=>String(v??'');
function modal(title,amount,description,rows=[]){
 document.getElementById('ts-origin-overlay')?.remove();
 const overlay=document.createElement('div');overlay.id='ts-origin-overlay';overlay.style.cssText='position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(4,12,22,.78)';
 const box=document.createElement('div');box.style.cssText='width:min(750px,96vw);max-height:88vh;overflow:auto;border-radius:18px;background:#fff;color:#182230;padding:22px;box-shadow:0 20px 70px #0007';
 const head=document.createElement('div');head.style.cssText='display:flex;justify-content:space-between;align-items:start;gap:14px';
 const h=document.createElement('h2');h.textContent=title;h.style.margin='0';const x=document.createElement('button');x.textContent='Cerrar ×';x.type='button';x.onclick=()=>overlay.remove();head.append(h,x);box.append(head);
 const total=document.createElement('h3');total.textContent=amount;total.style.margin='16px 0';box.append(total);
 const note=document.createElement('p');note.textContent=description;box.append(note);
 if(rows.length){const table=document.createElement('div');table.style.cssText='border-top:1px solid #ddd';for(const row of rows){const item=document.createElement('div');item.style.cssText='padding:11px 0;border-bottom:1px solid #ddd;display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px';const label=document.createElement('span');label.textContent=str(row[0]);const detail=document.createElement('strong');detail.textContent=str(row[1]);item.append(label,detail);table.append(item)}box.append(table)}
 overlay.append(box);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});overlay.addEventListener('keydown',e=>{if(e.key==='Escape')overlay.remove()});document.body.append(overlay);x.focus();
}
function details(ev){
 const button=ev.target?.closest?.('[data-trace-method],[data-trace-entry],[data-trace-summary]');
 const card=!button&&ev.target?.closest?.('#operations .exec-kpi-grid article,#executive .exec-kpi-grid article,#treasury .fin-kpis article,#pettyCash .book-kpis article,#enterpriseCharts .exec-kpi-grid article');
 if(!button&&!card)return;
 if(card&&ev.target.closest('button,a,input,select,textarea'))return;
 // Capture before older listeners; prevent two dialogs or financial actions.
 ev.preventDefault();ev.stopImmediatePropagation();
 const d=window.enterpriseFinanceData;
 if(!d){modal('Datos pendientes','—','Los datos de Enterprise todavía no están disponibles. Pulsa Actualizar y vuelve a intentar.');return}
 if(button?.dataset.traceMethod!==undefined){
  const method=button.dataset.traceMethod;
  const g=(d.payment_methods||[]).find(x=>x.method===method);
  const records=(d.audit_readonly?.payment_method_trace?.records||[]).filter(x=>x.method===method);
  const lines=records.map(r=>[`${r.direction==='out'?'Salida':'Entrada'} · ${r.source||'Origen no identificado'}`,`${money(r.amount_usd)} · ${r.occurred_at||'Sin fecha'} · ${r.order_id||r.source_id||'Sin ID'} · ${r.raw_method||'Sin método'}${r.reference?' · '+r.reference:''}`]);
  const grouped=Object.entries(g?.sources||{}).map(([source,value])=>[source,`${value} según respuesta agregada`]);
  modal('Método de cobro: '+method,money(g?.amount),records.length?'Movimientos de auditoría asociados. Pueden incluir reversos y no necesariamente reproducen el total semanal.':'Enterprise solo dispone del monto agregado; no hay movimientos individuales disponibles en esta respuesta.',lines.length?lines:grouped);return;
 }
 if(button?.dataset.traceEntry!==undefined){
  const r=(d.entries||[]).find(x=>str(x.id)===button.dataset.traceEntry);
  if(!r){modal('Movimiento financiero','—','No se encontró en los registros recibidos. Actualiza Enterprise.');return}
  modal('Movimiento '+(r.source_code||r.entry_type||''),money(r.amount_usd),'Registro original informado por Enterprise.',Object.entries({ID:r.id,Orden:r.source_code,Tipo:r.entry_type,Estado:r.status,Fecha:r.occurred_at,Método:r.payment_method,Referencia:r.reference,Proveedor:r.counterparty,Descripción:r.description}).map(([k,v])=>[k,v??'No informado']));return;
 }
 if(button?.dataset.traceSummary!==undefined){
  const suppliers=button.dataset.traceSummary==='suppliers';
  const records=suppliers?(d.inventory?.payables||[]):(d.receivables?.manual_rows||[]);
  const lines=records.map(r=>[r.supplier_name||r.counterparty||r.description||r.product_name||'Registro',`Pendiente ${money(r.pending_usd)} · total ${money(r.total_usd??r.amount_usd)} · pagado ${money(r.paid_usd??r.collected_usd)}`]);
  if(!suppliers)lines.unshift(['Soporte (agregado)',money(d.receivables?.support)],['Tienda (agregado)',money(d.receivables?.store)]);
  modal(suppliers?'Proveedores por pagar':'Cuentas por cobrar',money(suppliers?d.inventory?.supplier_payable:d.receivables?.total),'Los montos por fuente sin registros individuales se identifican como agregados; no se inventan movimientos.',lines);return;
 }
 if(card){const label=card.querySelector('span,h3')?.textContent?.trim()||'Indicador';const total=card.querySelector('b,strong')?.textContent?.trim()||'—';const note=card.querySelector('small,p')?.textContent?.trim()||'';const breakdown=label.toLowerCase().includes('cobrar')?[['Tienda',money(d.receivables?.store)],['Soporte',money(d.receivables?.support)],['Manuales',money(d.receivables?.manual_total)]]:label.toLowerCase().includes('cobrad')?[['Tienda',money(d.collections?.shop)],['Soporte',money(d.collections?.support)],['Otros',money(d.collections?.other)]]:[];modal(label,total,note||'Valor proporcionado por Enterprise. Si no hay desglose disponible, no puede atribuirse a operaciones individuales.',breakdown)}
}
document.addEventListener('click',details,true);
})();
