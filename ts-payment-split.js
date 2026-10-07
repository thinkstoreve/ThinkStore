/* ThinkStore V14.79 — componente compartido de pagos mixtos Staff/Admin. */
(function(win){
'use strict';
const OPTIONS=[
 ['Efectivo USD','USD'],['Zelle','USD'],['Transferencia USD','USD'],
 ['Efectivo Bs','VES'],['Pago Móvil','VES'],['Transferencia Bs','VES'],['Punto de venta Bs','VES']
];
const METHODS=Object.fromEntries(OPTIONS);
const rnd=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const USD=n=>win.ThinkStoreFX?.usd(n)||'$'+rnd(n).toFixed(2);
const BS=n=>win.ThinkStoreFX?.ves(n)||'Bs. '+rnd(n).toFixed(2);
function mount(root,totalFn){
 if(typeof root==='string')root=document.getElementById(root);
 if(!root)return null;
 if(!document.getElementById('ts-split-styles')){
   const style=document.createElement('style');style.id='ts-split-styles';style.textContent=`
   .ts-split{padding:18px;border:1px solid #dbe5f1;background:#fafcff;border-radius:18px;margin:16px 0;color:#1d1d1f}
   .ts-split h3{margin:0 0 5px;font-size:17px}.ts-split p{font-size:13px;color:#606979;margin:0 0 16px;line-height:1.5}
   .ts-split-row{display:grid;grid-template-columns:minmax(145px,1.5fr) minmax(110px,1fr) minmax(145px,1.4fr) auto;gap:9px;align-items:end;padding:12px 0;border-bottom:1px solid #e5e8ef}
   .ts-split label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:750}.ts-split input,.ts-split select{width:100%;min-width:0;padding:11px;border:1px solid #d2d7e0;border-radius:10px;background:white;color:#202124;font:inherit}
   .ts-split button{border:1px solid #cbd5e1;background:white;border-radius:10px;padding:10px 12px;color:#1261a0;font-size:13px;font-weight:750;cursor:pointer}
   .ts-split button:disabled{opacity:.5}.ts-split .ts-split-remove{color:#c33731}
   .ts-split-actions{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:14px}.ts-split-info{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:14px 0}
   .ts-split-info>div{border:1px solid #e1e7ed;border-radius:12px;background:white;padding:11px 13px;font-size:12px;color:#636d77}.ts-split-info b{font-size:17px;color:#1d1d1f;display:block;margin-top:6px}
   .ts-split-saldo{border-radius:13px;padding:13px 15px;background:#edf4ff;line-height:1.6;font-size:14px}.ts-split-saldo strong{font-size:17px}.ts-split-saldo.warn{background:#fff0e8;color:#92361e}.ts-split-saldo.ok{background:#e9f8ee;color:#166534}
   .ts-split .ts-split-hint{font-size:12px;color:#596372;margin-top:10px}.ts-split[hidden]{display:none!important}
   @media(max-width:760px){.ts-split{padding:13px}.ts-split-row{grid-template-columns:1fr 1fr}.ts-split-row label:first-child{grid-column:1/-1}.ts-split-row label:nth-child(3){grid-column:1/-1}.ts-split-info{grid-template-columns:1fr 1fr}}
   `;document.head.appendChild(style);
 }
 let rows=[{method:'Efectivo USD',amount:'',reference:''},{method:'Pago Móvil',amount:'',reference:''}];
 let visible=false;
 root.classList.add('ts-split');root.hidden=true;
 function getQuote(){return win.ThinkStoreFX?.snapshot(1)||null}
 function currency(method){return METHODS[method]||'USD'}
 function rate(){const q=getQuote();return q&&!q.stale&&q.rate>0?q.rate:null}
 function getLines(){return rows.filter(x=>Number(x.amount)>0).map(x=>({method:x.method,currency:currency(x.method),amount:rnd(x.amount),reference:(x.reference||'').trim()}))}
 function totals(){const price=rnd(totalFn()),q=getQuote(),r=rate();let paid=0,paidBs=0;for(const line of getLines()){
     if(line.currency==='VES'){paidBs+=line.amount;if(r)paid+=rnd(line.amount/r)}else paid+=line.amount;
   }paid=rnd(paid);const balance=rnd(price-paid);
   return{total:price,paid,paidBs:rnd(paidBs),balance,rate:r,quote:q,vesDue:r?rnd(Math.max(0,balance)*r):null};}
 function summary(){const t=totals(),box=root.querySelector('[data-split-summary]');if(!box)return t;
   const missingBcV=rows.some(x=>Number(x.amount)>0&&currency(x.method)==='VES')&&!t.rate;
   const bad=t.balance<0||missingBcV;
   box.className='ts-split-saldo'+(bad?' warn':t.balance===0&&getLines().length>=2?' ok':'');
   let msg=`Total de la venta: <strong>${USD(t.total)}</strong><br>Abonos registrados: <b>${USD(t.paid)}</b> · Saldo restante: <strong>${USD(Math.max(0,t.balance))}</strong>`;
   msg+=`<br>Saldo por pagar en bolívares: <strong>${t.vesDue===null?'BCV por verificar':BS(t.vesDue)}</strong>`;
   msg+=t.rate?`<br><small>Tasa BCV: 1 USD = ${BS(t.rate)} · Vigencia ${t.quote.effective_date}</small>`:'';
   if(t.balance<0)msg+='<br>⚠ El importe registrado supera el total de la compra.';
   if(missingBcV)msg+='<br>⚠ No confirmar cobros en Bs. mientras el BCV no esté verificado.';
   box.innerHTML=msg;return t;
 }
 function render(){
   root.innerHTML='<h3>Distribuir pago entre varios métodos</h3><p>Registra cada abono en la moneda que entrega el cliente. El equivalente y el saldo en bolívares se calculan con el BCV vigente.</p>'+rows.map((row,i)=>`
     <div class="ts-split-row" data-line="${i}">
       <label>Método<select data-split-method>${OPTIONS.map(([name,cur])=>`<option value="${name}" ${name===row.method?'selected':''}>${name} (${cur==='VES'?'Bs.':'USD'})</option>`).join('')}</select></label>
       <label>Monto (${currency(row.method)==='VES'?'Bs.':'USD'})<input inputmode="decimal" type="number" min="0" step="0.01" placeholder="0,00" data-split-amount value="${row.amount}"></label>
       <label>Referencia${row.method.startsWith('Efectivo')?' (no aplica)':''}<input maxlength="120" placeholder="${row.method.startsWith('Efectivo')?'Pago en efectivo':'N.º de confirmación'}" data-split-ref ${row.method.startsWith('Efectivo')?'disabled':''} value="${String(row.reference).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}"></label>
       <button type="button" class="ts-split-remove" data-split-remove="${i}" title="Quitar abono" ${rows.length===2?'disabled':''}>Quitar</button>
     </div>`).join('')+`<div class="ts-split-actions"><button type="button" data-split-add="1">+ Añadir otro método</button><button type="button" data-split-fill="1">Completar saldo en el último abono</button></div>
     <div data-split-summary class="ts-split-saldo" role="status" aria-live="polite"></div>
     <div class="ts-split-hint">Los abonos en bolívares usan la tasa BCV del momento de confirmar. Si falta dinero, guarda la venta en espera.</div>`;
   summary();
 }
 root.addEventListener('input',e=>{const line=e.target.closest('[data-line]');if(!line)return;const i=Number(line.dataset.line);if(e.target.matches('[data-split-amount]'))rows[i].amount=e.target.value;if(e.target.matches('[data-split-ref]'))rows[i].reference=e.target.value;summary()});
 root.addEventListener('change',e=>{if(!e.target.matches('[data-split-method]'))return;const i=Number(e.target.closest('[data-line]').dataset.line);rows[i].method=e.target.value;rows[i].reference='';rows[i].amount='';render()});
 root.addEventListener('click',e=>{if(e.target.matches('[data-split-add]')){if(rows.length>=12)return;rows.push({method:'Pago Móvil',amount:'',reference:''});render()}
 if(e.target.matches('[data-split-remove]')&&rows.length>2){rows.splice(Number(e.target.dataset.splitRemove),1);render()}
 if(e.target.matches('[data-split-fill]')){const i=rows.length-1;const r=rate();const t=totals();if(t.balance<=0)return;if(currency(rows[i].method)==='VES'&&!r){alert('Primero verifica la tasa BCV.');return}rows[i].amount=String(rnd(currency(rows[i].method)==='VES'?t.balance*r:t.balance));render()}});
 win.addEventListener('thinkstore:fx-updated',()=>{if(visible)summary()});
 function validate(fullyPaid=false){const t=summary(),lines=getLines();if(lines.length<2)throw Error('Elige al menos dos abonos con un importe mayor a cero, o usa un pago único.');
  if(lines.length>12)throw Error('Máximo doce métodos por venta.');if(rows.some(x=>Number(x.amount)<0))throw Error('El monto de un abono no puede ser negativo.');
  if(lines.some(x=>x.currency==='VES')&&!t.rate)throw Error('Tasa BCV no verificada. No se pueden registrar abonos en bolívares.');
  if(lines.some(x=>!x.method.startsWith('Efectivo')&&!x.reference))throw Error('Agrega la referencia de cada abono que no sea efectivo.');
  if(t.balance<0)throw Error('El pago mixto supera el monto de la venta.');
  if(fullyPaid&&Math.abs(t.balance)>0.001)throw Error(`Pago incompleto: faltan ${USD(t.balance)} (${t.vesDue===null?'BCV no disponible':BS(t.vesDue)}).`);
  return{payment_lines:lines,client_bcv_rate:t.quote?.rate??null,client_bcv_date:t.quote?.effective_date??null};}
 function setVisible(on){visible=!!on;root.hidden=!on;if(on){win.ThinkStoreFX?.refresh?.().catch(()=>{});summary()}}
 function reset(){rows=[{method:'Efectivo USD',amount:'',reference:''},{method:'Pago Móvil',amount:'',reference:''}];render();setVisible(false)}
 render();return{setVisible,reset,update:summary,validate,getLines,get quote(){return getQuote()}};
}
win.ThinkStoreSplit={mount,OPTIONS};
})(window);
