/* Presentation only: reuse original nodes, listeners, forms and finance calculations. */
(function(){
 'use strict';
 let selected='summary';
 const groups=[['summary','Resumen'],['partners','Socios'],['pending','Pendientes'],['movements','Movimientos'],['expenses','Gastos'],['profit','Utilidades']];
 const descriptions={summary:'Tu dinero y accesos frecuentes, en una sola vista.',partners:'Aportes, gastos pagados por socios y devoluciones.',pending:'Proveedores, cuentas por cobrar y comisiones.',movements:'Métodos de cobro, registros y verificación de caja.',expenses:'Historial de gastos, responsables y comprobantes.',profit:'Liquidación de reparaciones y reparto de utilidades.'};
 function select(root,key,focus){
  if(!groups.some(x=>x[0]===key))return;
  selected=key;
  root.querySelectorAll('[data-tr-panel]').forEach(e=>{e.hidden=e.dataset.trPanel!==key;});
  root.querySelectorAll('[data-tr-tab]').forEach(e=>{const yes=e.dataset.trTab===key;e.setAttribute('aria-selected',String(yes));e.tabIndex=yes?0:-1;if(yes&&focus)e.focus();});
  root.querySelector('.tr-description').textContent=descriptions[key];
 }
 function enhance(root){
  if(!root.querySelector('.treasury-focus')||root.querySelector(':scope>.tr-head'))return;
  const original=Array.from(root.children);
  const head=document.createElement('header');head.className='tr-head';
  head.innerHTML='<div><span class="tr-kicker">THINKSTORE · TESORERÍA</span><h2>Tu dinero, bajo control</h2><p class="tr-description"></p></div><button type="button" data-tr-view="pettyCash">Cuentas USD / Bs ↗</button>';
  const tabs=document.createElement('div');tabs.className='tr-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Secciones de Tesorería');
  const panels={};
  groups.forEach(([key,label])=>{
   const tab=document.createElement('button');tab.type='button';tab.id='tr-tab-'+key;tab.dataset.trTab=key;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','tr-panel-'+key);tab.textContent=label;tabs.append(tab);
   const panel=document.createElement('div');panel.className='tr-panel';panel.dataset.trPanel=key;panel.id='tr-panel-'+key;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);panels[key]=panel;
  });
  const shortcut=(label,key,hint)=>'<button type="button" data-tr-open="'+key+'"><b>'+label+'</b><span>'+hint+' →</span></button>';
  const shortcuts=document.createElement('div');shortcuts.className='tr-shortcuts';shortcuts.innerHTML=shortcut('Socios','partners','Aportes y devoluciones')+shortcut('Pendientes','pending','Cobrar y pagar')+shortcut('Movimientos','movements','Rastrear el dinero')+shortcut('Utilidades','profit','Empresa y socios');
  panels.summary.append(shortcuts);
  const actions=original.find(e=>e.classList.contains('fin-actionbar'));
  if(actions){
   const moveAction=(selector,key)=>{const b=actions.querySelector(selector);if(b){let bar=panels[key].querySelector('.tr-actions');if(!bar){bar=document.createElement('div');bar.className='tr-actions';panels[key].prepend(bar);}bar.append(b);}};
   moveAction('[data-fin-new="expense"]','expenses');moveAction('[data-fin-new="partner_advance"]','partners');moveAction('[data-fin-new="partner_repayment"]','partners');moveAction('[data-fin-new="receivable"]','pending');moveAction('[data-fin-new="technician_commission"]','pending');moveAction('[data-fin-commission-settings]','profit');
  }
  const textKey=e=>e.textContent||'';
  original.forEach(e=>{
   if(e===actions){e.remove();return;}
   if(e.classList.contains('production-toolbar'))return;
   let key='summary';
   if(e.classList.contains('partner-ledger-grid'))key='partners';
   else if(e.classList.contains('expense-center'))key='expenses';
   else if(e.classList.contains('commission-grid'))key='pending';
   else if(e.classList.contains('service-profit-panel')||e.classList.contains('fin-split-card'))key='profit';
   else if(e.classList.contains('ts-audit-panel'))key='movements';
   else if(e.classList.contains('main-grid'))key=/Proveedores por pagar|Cuentas por cobrar/.test(textKey(e))?'pending':'movements';
   panels[key].append(e);
  });
  const quick=document.createElement('div');quick.className='tr-quick';
  quick.innerHTML='<button type="button" data-tr-open="expenses">Registrar gasto</button><button type="button" data-tr-open="partners">Aporte / devolución de socio</button><button type="button" data-tr-view="enMoves">Buscar entradas y salidas ↗</button><button type="button" data-tr-view="reconciliation">Conciliar cuentas ↗</button>';
  panels.summary.prepend(quick);
  const accountNote=document.createElement('p');accountNote.className='tr-note';accountNote.textContent='Consulta los saldos y movimientos por cuenta en Cuentas USD / Bs. Los cobros por método son movimientos del periodo, no saldos bancarios.';panels.movements.prepend(accountNote);
  const close=document.createElement('button');close.type='button';close.className='tr-link';close.dataset.trView='weeklyAudit';close.textContent='Consultar cierre semanal ↗';panels.profit.prepend(close);
  root.prepend(head,tabs);groups.forEach(([key])=>root.append(panels[key]));root.classList.add('tr-ready');select(root,selected);
 }
 function boot(){
  const root=document.getElementById('treasury');if(!root)return;
  root.addEventListener('click',e=>{const tab=e.target.closest('[data-tr-tab],[data-tr-open]');if(tab){select(root,tab.dataset.trTab||tab.dataset.trOpen);return;}const link=e.target.closest('[data-tr-view]');if(link)window.switchView?.(link.dataset.trView);});
  root.addEventListener('keydown',e=>{const tab=e.target.closest('[data-tr-tab]');if(!tab||!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();let i=groups.findIndex(x=>x[0]===tab.dataset.trTab);i=e.key==='Home'?0:e.key==='End'?groups.length-1:(i+(e.key==='ArrowRight'?1:-1)+groups.length)%groups.length;select(root,groups[i][0],true);});
  new MutationObserver(()=>enhance(root)).observe(root,{childList:true});enhance(root);
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();
