(() => {
'use strict';
// ThinkStore V14.82. Caja por turno real con BCV histórico en movimientos VES.
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const usd=n=>'$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const ves=n=>'Bs. '+Number(n||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});
const format=(v,currency)=>currency==='VES'?ves(v):usd(v);
const moneyCents=v=>Math.round(Number(v)*100);
const TIME_ZONE='America/Caracas';
const today=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=t=>parts.find(x=>x.type===t)?.value||'';return `${get('year')}-${get('month')}-${get('day')}`;};
const time=v=>{try{return new Intl.DateTimeFormat('es-VE',{hour:'2-digit',minute:'2-digit',timeZone:TIME_ZONE}).format(new Date(v))}catch{return'—'}};
const date=v=>{try{return new Intl.DateTimeFormat('es-VE',{day:'2-digit',month:'short',timeZone:TIME_ZONE}).format(new Date(v))}catch{return'—'}};
let api=null,notice=null,user=null,data=null,selected='',busy=false,loading=false;
const METHODS={'Efectivo USD':'USD','Efectivo Bs':'VES','Zelle':'USD','Pago Móvil':'VES','Transferencia USD':'USD','Transferencia Bs':'VES','Punto de venta Bs':'VES'};
const isManager=()=>['admin','superadmin'].includes(user?.role)||user?.permissions?.includes('*');
const isMine=()=>data?.session?.user_id===user?.id;
function show(id,yes=true){$(id)?.classList.toggle('hidden',!yes)}
function error(message){$('cashError').textContent=message||'';show('cashError',!!message);if(message)notice?.(message,4700)}
function setBusy(value){busy=value;['cashCloseBtn','cashSaveDraft','cashRefresh','cashAddMovement','cashReopenBtn'].forEach(id=>{if($(id))$(id).disabled=value})}
async function request(method='GET',params={},payload=null){
 const headers=await api.tokenHeaders(method!=='GET'),url=new URL('/.netlify/functions/staff-cash',location.origin);
 if(method==='GET')for(const [k,v]of Object.entries(params))url.searchParams.set(k,v);
 const res=await fetch(url,{method,headers,cache:'no-store',...(payload?{body:JSON.stringify(payload)}:{})});
 const json=await res.json().catch(()=>({}));if(!res.ok||!json.ok)throw Error(json.error||`Caja temporalmente no disponible (${res.status})`);
 return json;
}
function status(){
 const s=data?.session;
 if(!s){$('cashStatus').textContent='Sin apertura';return}
 $('cashStatus').textContent=s.status==='closed'?'● Cerrada':'● Abierta';
 $('cashStatus').classList.toggle('cash-closed',s.status==='closed');
}
function managerSelector(){
 const box=$('cashManagerArea');show(box,!!isManager());if(!isManager())return;
 const s=$('cashSessionSelect');const old=s.value;s.replaceChildren();
 const opt=new Option('Mi caja actual','');s.add(opt);
 (data?.sessions||[]).forEach(row=>{
   const label=`${row.user_id===user?.id?'Mi caja':(row.owner_name||'Vendedor')} · ${row.business_date} · ${row.status==='open'?'Abierta':'Cerrada'}`;
   s.add(new Option(label,row.id));
 });
 s.value=selected||'';
 if(![...s.options].some(o=>o.value===s.value))s.value='';
}
function render(){
 status();managerSelector();const s=data?.session,c=data?.cash;const canEdit=s&&s.status==='open'&&isMine();const closed=s?.status==='closed';
 const allowOpening=!s||(closed&&isMine()&&s.business_date!==today());
 show('cashOpenArea',allowOpening);show('cashBody',!!s&&!!c);
 $('cashOpenForm').classList.toggle('cash-readonly',!user);
 if(!s||!c)return;
 $('cashKpiOpenUsd').textContent=usd(s.opening_usd);$('cashKpiOpenVes').textContent=ves(s.opening_ves);
 $('cashKpiSales').textContent=usd(c.sold_usd);$('cashKpiSalesCount').textContent=`${c.sale_count} venta${c.sale_count===1?'':'s'} confirmada${c.sale_count===1?'':'s'}`;
 const manual=c.entries.filter(x=>x.kind==='manual');$('cashKpiMoves').textContent=String(manual.length);
 $('cashCollectedUsd').textContent=usd(c.collected_usd);$('cashCollectedVes').textContent=ves(c.collected_ves);
 $('cashExpectedUsd').textContent=usd(c.expected_usd);$('cashExpectedVes').textContent=ves(c.expected_ves);
 const issue=c.warnings.length>0;show('cashWarning',issue);if(issue)$('cashWarning').textContent='Revisa estos datos antes de cerrar: '+c.warnings.join(' · ');
 const rows=Object.entries(c.by_method).filter(([,m])=>m.net!==0||m.in!==0||m.out!==0);
 $('cashMethods').innerHTML=rows.length?rows.map(([method,m])=>`<div class="cash-method-row"><span>${esc(method)}<small>${m.out?'Entradas '+format(m.in,m.currency)+' · Salidas '+format(m.out,m.currency):'Cobros y movimientos registrados'}</small></span><b>${format(m.net,m.currency)}</b></div>`).join(''):'<div class="cash-empty-line">Todavía no hay cobros registrados.</div>';
 $('cashActivityCount').textContent=`${c.entries.length} operación${c.entries.length===1?'':'es'}`;
 $('cashLedger').innerHTML=c.entries.length?c.entries.map(e=>`<tr><td><strong>${esc(e.kind==='sale'?'Venta confirmada':e.type==='gasto'?'Gasto menor':e.type==='ingreso'?'Ingreso extra':e.type==='retiro'?'Retiro':e.type==='devolucion'?'Devolución':'Ajuste')}</strong><small>${esc(e.concept)}</small>${e.reference?`<small>Ref. ${esc(e.reference)}</small>`:''}</td><td>${esc(e.method)}</td><td>${esc(time(e.at))}</td><td class="cash-right ${e.sign<0?'cash-negative':''}">${e.sign<0?'−':'+'}${format(e.amount,e.currency)}</td></tr>`).join(''):'<tr><td colspan="4" class="cash-empty-line">No hay movimientos durante este turno.</td></tr>';
 show('cashManualPanel',!closed&&canEdit);show('cashAddMovement',canEdit);
 const old=$('cashClosePanel');old.classList.toggle('cash-readonly',!canEdit);
 const countUsd=$('cashCountUsd'),countVes=$('cashCountVes');
 countUsd.value=s.counted_usd??'';countVes.value=s.counted_ves??'';
 const note=$('cashClosingNote');note.value=s.closing_note||'';
 countUsd.disabled=!canEdit;countVes.disabled=!canEdit;note.disabled=!canEdit;
 $('cashClosingBadge').textContent=closed?'Cerrada · '+date(s.closed_at):'Turno · '+s.business_date;
 const verified=Array.isArray(s.verified_methods)?s.verified_methods:[];
 const electronic=rows.filter(([m,x])=>!m.startsWith('Efectivo')&&x.net!==0);
 $('cashVerifyMethods').innerHTML=electronic.length?electronic.map(([m,x])=>`<label class="cash-verify"><input type="checkbox" value="${esc(m)}" ${verified.includes(m)?'checked':''} ${!canEdit?'disabled':''}><span>${esc(m)}<small>${format(x.net,x.currency)}</small></span><span class="cash-verify-mark">✓</span></label>`).join(''):'<p class="cash-footnote">No hay pagos electrónicos en este turno.</p>';
 show('cashSaveDraft',canEdit);show('cashCloseBtn',canEdit);show('cashReopenBtn',closed&&isManager());
 updateDifferences();
}
function updateDifferences(){
 const c=data?.cash;if(!c)return;
 const a=$('cashCountUsd').value,b=$('cashCountVes').value;
 const du=a===''?null:(moneyCents(a)-moneyCents(c.expected_usd))/100;
 const dv=b===''?null:(moneyCents(b)-moneyCents(c.expected_ves))/100;
 const update=(id,d,currency)=>{const el=$(id);el.textContent=d===null?'—':(d>0?'+':'')+format(d,currency);el.classList.toggle('cash-negative',d!==null&&d<0);el.classList.toggle('cash-positive',d!==null&&d===0);};
 update('cashDiffUsd',du,'USD');update('cashDiffVes',dv,'VES');
 $('cashKpiDifference').textContent=du===null?'Por contar':(du?'Revisar':'Sin diferencia');
 $('cashKpiDifferenceVes').textContent=dv===null?'Completa el arqueo':(dv?'Revisar monto Bs.':'Bolívares conciliados');
}
async function load(){
 if(!api||!user||loading)return;loading=true;
 try{
   const d=await request('GET',selected?{session_id:selected}:{});
   data=d;render();
   if(!d.session&&d.stale_open_session){error(`Hay una caja anterior (${d.stale_open_session.business_date}) que quedó abierta. No se reutiliza como apertura de hoy; revísala desde el selector de administración antes de cerrar el período.`)}else error('');
 }catch(e){error(e.message);}
 finally{loading=false}
}
async function mutate(action,body){
 if(busy)return;setBusy(true);
 try{await request('POST',{}, {action,...body});notice?.(action==='open'?'Caja abierta':action==='movement'?'Movimiento registrado':action==='draft'?'Arqueo guardado':action==='close'?'Caja cerrada correctamente':'Cierre reabierto');
 if(action==='open'||action==='reopen')selected='';
 await load();
 if(action==='movement'){$('cashMoveAmount').value='';$('cashMoveRef').value='';$('cashMoveConcept').value='';}
 }catch(e){error(e.message)}finally{setBusy(false)}
}
function fields(){
 const a=$('cashCountUsd').value,b=$('cashCountVes').value;
 if(a.trim()===''||b.trim()==='')throw Error('Cuenta y escribe el efectivo USD y bolívares, incluso si alguno es cero.');
 const countUsd=Number(a),countVes=Number(b);
 if(!Number.isFinite(countUsd)||!Number.isFinite(countVes)||countUsd<0||countVes<0)throw Error('Los conteos no pueden ser negativos.');
 return{session_id:data.session.id,counted_usd:a,counted_ves:b,note:$('cashClosingNote').value.trim(),verified_methods:[...$('cashVerifyMethods').querySelectorAll('input:checked')].map(x=>x.value)};
}
function init(cfg){api=cfg;notice=cfg.toast;
 $('cashRefresh').addEventListener('click',()=>load());
 $('cashSessionSelect').addEventListener('change',e=>{selected=e.target.value;load()});
 $('cashOpenForm').addEventListener('submit',e=>{e.preventDefault();if(!confirm('¿Abrir una nueva caja para tu turno?'))return;mutate('open',{opening_usd:$('cashOpeningUsd').value,opening_ves:$('cashOpeningVes').value,note:$('cashOpeningNote').value})});
 $('cashMoveType').addEventListener('change',e=>{show('cashMoveDirectionLabel',e.target.value==='ajuste');});
 $('cashMoveMethod').addEventListener('change',e=>{show('cashMoveRefWrap',!e.target.value.startsWith('Efectivo'))});
 $('cashMovementForm').addEventListener('submit',async e=>{e.preventDefault();try{const type=$('cashMoveType').value,method=$('cashMoveMethod').value,currency=METHODS[method],amount=Number($('cashMoveAmount').value);const payload={session_id:data.session.id,type,direction:type==='ajuste'?$('cashMoveDirection').value:type==='ingreso'?'in':'out',method,currency,amount:$('cashMoveAmount').value,concept:$('cashMoveConcept').value,reference:$('cashMoveRef').value};if(currency==='VES'){if(!window.ThinkStoreFX?.requireFresh)throw Error('No se pudo verificar la tasa BCV. Intenta nuevamente.');const q=await window.ThinkStoreFX.requireFresh();payload.usd_equivalent=Math.round(((amount/Number(q.rate))+Number.EPSILON)*100)/100;payload.bcv_rate=q.rate;payload.bcv_effective_date=q.effective_date;payload.bcv_source=q.source;payload.bcv_checked_at=q.checked_at;}else payload.usd_equivalent=Math.round((amount+Number.EPSILON)*100)/100;await mutate('movement',payload)}catch(err){error(err.message)}});
 ['cashCountUsd','cashCountVes'].forEach(id=>$(id).addEventListener('input',updateDifferences));
 $('cashSaveDraft').addEventListener('click',()=>{try{mutate('draft',fields())}catch(e){error(e.message)}});
 $('cashCloseBtn').addEventListener('click',()=>{try{const payload=fields();const c=data.cash;if(c.warnings.length)throw Error('Corrige las advertencias antes de cerrar.');const du=moneyCents(payload.counted_usd)-moneyCents(c.expected_usd),dv=moneyCents(payload.counted_ves)-moneyCents(c.expected_ves);if((du||dv)&&payload.note.length<5)throw Error('Hay una diferencia de efectivo. Escribe el motivo en Observaciones.');if(!confirm('¿Cerrar esta caja? Se guardará el arqueo y no podrás modificarla sin autorización administrativa.'))return;mutate('close',payload)}catch(e){error(e.message)}});
 $('cashReopenBtn').addEventListener('click',()=>{if(!isManager())return;const reason=prompt('Motivo de reapertura (mínimo 8 caracteres):');if(reason===null)return;mutate('reopen',{session_id:data.session.id,reason});});
}
function reset(){data=null;selected='';user=null;error('')}
window.ThinkStoreCash={init,setUser:u=>{user=u},load,reset};
})();
