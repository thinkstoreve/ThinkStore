/* ThinkStore V15.27 — pagos mixtos Staff/Admin · máximo 3 métodos, cuenta destino y saldo automático. */
(function(win){
'use strict';
const OPTIONS=[
 ['Efectivo USD','USD'],['Zelle','USD'],['Transferencia USD','USD'],['USDT','USD'],
 ['Efectivo Bs','VES'],['Pago Móvil','VES'],['Transferencia Bs','VES'],['Punto de venta Bs','VES']
];
const METHODS=Object.fromEntries(OPTIONS);
const rnd=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const USD=n=>win.ThinkStoreFX?.usd(n)||'$'+rnd(n).toFixed(2);
const BS=n=>win.ThinkStoreFX?.ves(n)||'Bs. '+rnd(n).toFixed(2);
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const registry=()=>win.ThinkStorePaymentDestinations||null;
const destinationDefault=method=>registry()?.normalize?.(method,'')||'';
function mount(root,totalFn){
 if(typeof root==='string')root=document.getElementById(root);
 if(!root)return null;
 if(!document.getElementById('ts-split-styles')){
   const style=document.createElement('style');style.id='ts-split-styles';style.textContent=`
   .ts-split{padding:16px;border:1px solid #dbe5f1;background:#fafcff;border-radius:18px;margin:16px 0;color:#1d1d1f}
   .ts-split h3{margin:0 0 5px;font-size:17px}.ts-split p{font-size:13px;color:#606979;margin:0 0 14px;line-height:1.5}
   .ts-split-row{display:grid;grid-template-columns:minmax(135px,1.15fr) minmax(170px,1.45fr) minmax(110px,.85fr) minmax(135px,1.1fr) auto;gap:8px;align-items:end;padding:11px 0;border-bottom:1px solid #e5e8ef}
   .ts-split label{display:flex;flex-direction:column;gap:6px;font-size:11px;font-weight:750}.ts-split input,.ts-split select{width:100%;min-width:0;padding:10px;border:1px solid #d2d7e0;border-radius:10px;background:white;color:#202124;font:inherit}.ts-split input[readonly]{background:#eff6ff;color:#1d4ed8;font-weight:800;border-color:#bfdbfe}
   .ts-split button{border:1px solid #cbd5e1;background:white;border-radius:10px;padding:9px 11px;color:#1261a0;font-size:12px;font-weight:750;cursor:pointer}.ts-split button:disabled{opacity:.5}.ts-split .ts-split-remove{color:#c33731}
   .ts-split-actions{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:13px}.ts-split-saldo{border-radius:13px;padding:12px 14px;background:#edf4ff;line-height:1.6;font-size:13px;margin-top:12px}.ts-split-saldo strong{font-size:16px}.ts-split-saldo.warn{background:#fff0e8;color:#92361e}.ts-split-saldo.ok{background:#e9f8ee;color:#166534}
   .ts-split .ts-split-hint{font-size:11px;color:#596372;margin-top:9px}.ts-split[hidden]{display:none!important}.ts-split-dest-empty{font-size:11px;color:#7c838d;padding:10px;border:1px dashed #d6dce4;border-radius:10px;background:#fff}
   @media(max-width:920px){.ts-split-row{grid-template-columns:1fr 1fr}.ts-split-row label:nth-child(2){grid-column:1/-1}.ts-split-row label:nth-child(4){grid-column:1/-1}}
   @media(max-width:600px){.ts-split{padding:12px}.ts-split-row{grid-template-columns:1fr}.ts-split-row label:nth-child(2),.ts-split-row label:nth-child(4){grid-column:auto}}
   `;document.head.appendChild(style);
 }
 let rows=[
   {method:'Efectivo USD',amount:'',reference:'',destinationCode:''},
   {method:'Pago Móvil',amount:'',reference:'',destinationCode:destinationDefault('Pago Móvil')}
 ];
 let visible=false;
 root.classList.add('ts-split');root.hidden=true;
 function getQuote(){return win.ThinkStoreFX?.snapshot(1)||null}
 function currency(method){return METHODS[method]||'USD'}
 function rate(){const q=getQuote();return q&&!q.stale&&q.rate>0?q.rate:null}
 function normalizeRowDestination(row){const reg=registry();if(!reg)return row.destinationCode||'';row.destinationCode=reg.normalize(row.method,row.destinationCode);return row.destinationCode}
 function destinationField(row,i){
   const reg=registry();if(!reg||!reg.needsDestination(row.method))return '<div class="ts-split-dest-empty">No requiere cuenta bancaria.</div>';
   normalizeRowDestination(row);const list=reg.allowed(row.method),selected=reg.byCode(row.destinationCode);
   return `<div class="ts-split-dest-wrap">${selected?`<img src="${esc(selected.icon)}" alt="">`:''}<select data-split-destination="${i}"><option value="">Selecciona destino…</option>${list.map(d=>`<option value="${esc(d.code)}" ${d.code===row.destinationCode?'selected':''}>${esc(d.name)} · ${esc(d.currency)}</option>`).join('')}</select></div>`;
 }
 function syncAuto(){const price=rnd(totalFn()),r=rate();if(rows.length<2)return;const last=rows.length-1;let paid=0;for(let i=0;i<last;i++){const amount=Number(rows[i].amount||0);if(!(amount>0))continue;if(currency(rows[i].method)==='VES'){if(r)paid+=rnd(amount/r)}else paid+=rnd(amount)}const balance=Math.max(0,rnd(price-paid));if(currency(rows[last].method)==='VES')rows[last].amount=r?String(rnd(balance*r)):'';else rows[last].amount=balance>0?String(balance):'';const input=root.querySelector(`[data-line="${last}"] [data-split-amount]`);if(input)input.value=rows[last].amount}
 function getLines(){syncAuto();const reg=registry();return rows.filter(x=>Number(x.amount)>0).map(x=>{const code=normalizeRowDestination(x),d=reg?.byCode?.(code);return{method:x.method,currency:currency(x.method),amount:rnd(x.amount),reference:(x.reference||'').trim(),destination_code:d?.code||null,destination_name:d?.name||null}})}
 function totals(){syncAuto();const price=rnd(totalFn()),q=getQuote(),r=rate();let paid=0,paidBs=0;for(const line of getLines()){if(line.currency==='VES'){paidBs+=line.amount;if(r)paid+=rnd(line.amount/r)}else paid+=line.amount}paid=rnd(paid);const balance=rnd(price-paid);return{total:price,paid,paidBs:rnd(paidBs),balance,rate:r,quote:q,vesDue:r?rnd(Math.max(0,balance)*r):null}}
 function summary(){const t=totals(),box=root.querySelector('[data-split-summary]');if(!box)return t;const missingBcv=rows.some(x=>Number(x.amount)>0&&currency(x.method)==='VES')&&!t.rate;const bad=t.balance<0||missingBcv;box.className='ts-split-saldo'+(bad?' warn':t.balance===0&&getLines().length>=2?' ok':'');let msg=`Total de la venta: <strong>${USD(t.total)}</strong><br>Distribuido: <b>${USD(t.paid)}</b> · Restante: <strong>${USD(Math.max(0,t.balance))}</strong>`;msg+=`<br>Saldo por pagar en bolívares: <strong>${t.vesDue===null?'BCV por verificar':BS(t.vesDue)}</strong>`;msg+=t.rate?`<br><small>Tasa BCV: 1 USD = ${BS(t.rate)} · Vigencia ${t.quote.effective_date}</small>`:'';if(t.balance<0)msg+='<br>⚠ El importe registrado supera el total de la compra.';if(missingBcv)msg+='<br>⚠ No confirmar cobros en Bs. mientras el BCV no esté verificado.';box.innerHTML=msg;return t}
 function render(){
   rows.forEach(normalizeRowDestination);
   root.innerHTML='<h3>Distribuir pago entre varios métodos</h3><p>Registra cada tramo y la cuenta donde ingresará. El último monto se completa automáticamente.</p>'+rows.map((row,i)=>`
     <div class="ts-split-row" data-line="${i}">
       <label>Método<select data-split-method>${OPTIONS.map(([name,cur])=>`<option value="${name}" ${name===row.method?'selected':''}>${name} (${cur==='VES'?'Bs.':'USD'})</option>`).join('')}</select></label>
       <label>Destino${destinationField(row,i)}</label>
       <label>Monto (${currency(row.method)==='VES'?'Bs.':'USD'})${i===rows.length-1&&rows.length>1?' · automático':''}<input inputmode="decimal" type="number" min="0" step="0.01" placeholder="0,00" data-split-amount value="${esc(row.amount)}" ${i===rows.length-1&&rows.length>1?'readonly':''}></label>
       <label>Referencia${row.method.startsWith('Efectivo')?' (no aplica)':''}<input maxlength="120" placeholder="${row.method.startsWith('Efectivo')?'Pago en efectivo':'N.º de confirmación'}" data-split-ref ${row.method.startsWith('Efectivo')?'disabled':''} value="${esc(row.reference)}"></label>
       <button type="button" class="ts-split-remove" data-split-remove="${i}" title="Quitar abono" ${rows.length===2?'disabled':''}>Quitar</button>
     </div>`).join('')+`<div class="ts-split-actions">${rows.length<3?'<button type="button" data-split-add="1">+ Añadir tercer método</button>':''}</div><div data-split-summary class="ts-split-saldo" role="status" aria-live="polite"></div><div class="ts-split-hint">Máximo 3 métodos. Los pagos electrónicos quedan ligados a su banco/cuenta destino y el último importe se calcula solo.</div>`;summary();
 }
 root.addEventListener('input',e=>{const line=e.target.closest('[data-line]');if(!line)return;const i=Number(line.dataset.line);if(e.target.matches('[data-split-amount]'))rows[i].amount=e.target.value;if(e.target.matches('[data-split-ref]'))rows[i].reference=e.target.value;summary()});
 root.addEventListener('change',e=>{const line=e.target.closest('[data-line]');if(!line)return;const i=Number(line.dataset.line);if(e.target.matches('[data-split-method]')){rows[i].method=e.target.value;rows[i].reference='';rows[i].amount='';rows[i].destinationCode=destinationDefault(rows[i].method);render();return}if(e.target.matches('[data-split-destination]')){rows[i].destinationCode=e.target.value;render();}});
 root.addEventListener('click',e=>{if(e.target.matches('[data-split-add]')){if(rows.length>=3)return;rows[rows.length-1].amount='';rows.push({method:'Pago Móvil',amount:'',reference:'',destinationCode:destinationDefault('Pago Móvil')});render()}if(e.target.matches('[data-split-remove]')&&rows.length>2){rows.splice(Number(e.target.dataset.splitRemove),1);render()}});
 win.addEventListener('thinkstore:fx-updated',()=>{if(visible)summary()});
 function validate(fullyPaid=false){const t=summary(),lines=getLines(),reg=registry();if(lines.length<2)throw Error('Elige al menos dos abonos con un importe mayor a cero, o usa un pago único.');if(lines.length>3)throw Error('Máximo tres métodos por venta.');if(rows.some(x=>Number(x.amount)<0))throw Error('El monto de un abono no puede ser negativo.');if(lines.some(x=>x.currency==='VES')&&!t.rate)throw Error('Tasa BCV no verificada. No se pueden registrar abonos en bolívares.');if(lines.some(x=>!x.method.startsWith('Efectivo')&&!x.reference))throw Error('Agrega la referencia de cada abono que no sea efectivo.');if(reg){for(const x of lines)if(reg.needsDestination(x.method)&&!x.destination_code)throw Error(`Selecciona la cuenta destino para ${x.method}.`)}if(t.balance<0)throw Error('El pago mixto supera el monto de la venta.');if(fullyPaid&&Math.abs(t.balance)>0.001)throw Error(`Pago incompleto: faltan ${USD(t.balance)} (${t.vesDue===null?'BCV no disponible':BS(t.vesDue)}).`);return{payment_lines:lines,client_bcv_rate:t.quote?.rate??null,client_bcv_date:t.quote?.effective_date??null}}
 function setVisible(on){visible=!!on;root.hidden=!on;if(on){win.ThinkStoreFX?.refresh?.().catch(()=>{});summary()}}
 function reset(){rows=[{method:'Efectivo USD',amount:'',reference:'',destinationCode:''},{method:'Pago Móvil',amount:'',reference:'',destinationCode:destinationDefault('Pago Móvil')}];render();setVisible(false)}
 render();return{setVisible,reset,update:summary,validate,getLines,get quote(){return getQuote()}};
}
win.ThinkStoreSplit={mount,OPTIONS};
})(window);
