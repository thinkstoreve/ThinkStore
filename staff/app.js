(() => {
'use strict';
const cfg=window.THINKSTORE_SUPABASE||{};
const sb=window.supabase&&cfg.SUPABASE_URL&&cfg.SUPABASE_PUBLISHABLE_KEY?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY):null;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const slug=v=>normalize(v).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)||'producto';
const ROLE_LABELS={vendedor:'Vendedor',recepcion:'Recepción / Soporte',soporte:'Soporte',tecnico:'Técnico',logistica:'Logística',admin:'Administrador',superadmin:'Socio Administrador'};
const PERM_LABELS={dashboard:'Dashboard',ventas:'Ventas',cotizaciones:'Cotizaciones',clientes:'Clientes / CRM',pagos:'Pagos',preordenes:'Preórdenes',crm:'CRM',recomendaciones:'Recomendaciones',comisiones:'Comisiones',recepcion:'Recepción',tickets:'Tickets',garantias:'Garantías',citas:'Citas',tecnico:'Técnico',diagnostico:'Diagnóstico',repuestos:'Repuestos',pruebas:'Pruebas',logistica:'Logística',guias:'Guías',entregas:'Entregas',pedidos:'Pedidos'};
const state={user:null,canSell:false,variants:[],catalog:[],images:[],categories:[],recent:[],metrics:{},cart:[],category:'',query:'',selectedProduct:'',selectedVariantKey:'',payment:'Efectivo USD',savedCode:'',loading:false,scanBusy:false,service:{orders:[],metrics:{},methods:[],events:[],canCharge:false,error:''},serviceNoteHtml:'',serviceNoteCode:''};
let installPrompt=null;

function initials(name){const parts=String(name||'TS').trim().split(/\s+/).filter(Boolean);return(parts.slice(0,2).map(x=>x[0]).join('')||'TS').toUpperCase()}
function firstName(name){return String(name||'').trim().split(/\s+/)[0]||'Usuario'}
function show(el,on=true){if(typeof el==='string')el=$(el);if(el)el.classList.toggle('hidden',!on)}
function toast(msg,ms=2800){const el=$('toast');if(!el)return;el.textContent=msg;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,ms)}
function setBusy(on){state.loading=on;['loginButton','holdSaleButton','confirmSaleButton','checkoutButton','servicePartialButton','servicePaidButton'].forEach(id=>{const el=$(id);if(el)el.disabled=on})}
async function tokenHeaders(json=false){const h={};const {data}=await sb.auth.getSession();const t=data?.session?.access_token;if(t)h.Authorization='Bearer '+t;if(json)h['Content-Type']='application/json';return h}
function openModal(id){const el=$(id);if(!el)return;el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function closeModal(id){const el=$(id);if(!el)return;el.classList.remove('open');el.setAttribute('aria-hidden','true');if(!document.querySelector('.modal.open'))document.body.style.overflow=''}

async function login(email,password){if(!sb)throw Error('Supabase no está configurado.');const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;await bootstrap()}
async function logout(){try{await sb?.auth?.signOut()}catch{}state.user=null;state.cart=[];show('appShell',false);show('loginScreen',true);$('loginPassword').value='';history.replaceState(null,'','/staff/')}
async function resetPassword(){const email=$('loginEmail').value.trim();if(!email||!email.includes('@'))return messageLogin('Escribe primero tu correo.');const redirect=(cfg.SITE_URL||location.origin).replace(/\/$/,'')+'/panel-login.html?view=recovery';const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:redirect});if(error)return messageLogin(error.message);messageLogin('Te enviamos un enlace para crear una nueva contraseña.',false)}
function messageLogin(text,error=true){const m=$('loginMessage');m.hidden=false;m.textContent=text;m.style.background=error?'#fff4f4':'#edf9f3';m.style.color=error?'#a31b0b':'#006e52'}

async function bootstrap(){
  if(!sb)throw Error('Supabase no está disponible.');
  const {data:{session}}=await sb.auth.getSession();
  if(!session){show('boot',false);show('appShell',false);show('loginScreen',true);return;}
  try{
    const r=await fetch('/.netlify/functions/staff-pos',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    if(r.status===401){await sb.auth.signOut();throw Error(d.error||'Tu sesión venció. Inicia sesión nuevamente.');}
    if(r.status===403){await sb.auth.signOut();throw Error(d.error||'Esta cuenta no tiene acceso a ThinkStore Staff.');}
    if(!r.ok||!d.ok)throw Error(d.error||'No se pudo abrir ThinkStore Staff.');
    state.user=d.user;state.canSell=!!d.can_sell;state.variants=d.variants||[];state.catalog=d.catalog_products||[];state.images=d.catalog_images||[];state.categories=d.catalog_categories||[];state.recent=d.recent_sales||[];state.metrics=d.metrics||{};
    await refreshServiceData(true);
    show('loginScreen',false);show('appShell',true);show('boot',false);renderIdentity();renderHome();renderStore();renderSales();renderRepairs();renderAccount();
    const startView=location.hash.replace('#','')||'home';navigate(startView,false);
    const serviceOrder=new URL(location.href).searchParams.get('service_order');if(serviceOrder&&serviceAccessAllowed()){const q=$('repairSearch');if(q)q.value=serviceOrder;renderRepairs();setTimeout(()=>openServicePayment(serviceOrder),250)}
  }catch(e){show('boot',false);show('appShell',false);show('loginScreen',true);messageLogin(e.message||String(e));}
}

async function refreshData(silent=false){
  const {data:{session}}=await sb.auth.getSession();if(!session)return logout();
  if(!silent)toast('Actualizando…',1200);
  try{const r=await fetch('/.netlify/functions/staff-pos',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||'No se pudo actualizar');state.user=d.user;state.canSell=!!d.can_sell;state.variants=d.variants||[];state.catalog=d.catalog_products||[];state.images=d.catalog_images||[];state.categories=d.catalog_categories||[];state.recent=d.recent_sales||[];state.metrics=d.metrics||{};await refreshServiceData(true);renderIdentity();renderHome();renderStore();renderSales();renderRepairs();renderAccount();if(!silent)toast('Datos actualizados');}catch(e){if(!silent)toast(e.message||'No se pudo actualizar')}
}

function navigate(view,push=true){
  const allowed=['home','sell','repairs','sales','account'];if(!allowed.includes(view))view='home';if(view==='repairs'&&!serviceAccessAllowed())view='home';
  document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+view));
  document.querySelectorAll('.nav-item[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
  const titles={home:['Inicio','ThinkStore Staff'],sell:['Punto de venta','Tienda interna'],repairs:['Caja','Reparaciones'],sales:['Historial','Ventas'],account:['Perfil','Mi cuenta']};
  $('headerContext').textContent=titles[view][0];$('headerTitle').textContent=titles[view][1];
  if(push)history.replaceState(null,'','#'+view);window.scrollTo({top:0,behavior:'smooth'});if(view==='sell'&&state.canSell)setTimeout(()=>$('barcodeScanInput')?.focus(),80);if(view==='repairs'){renderRepairs();setTimeout(()=>$('repairSearch')?.focus(),80)};
}

function renderIdentity(){
  const u=state.user||{},name=u.name||'Usuario',role=u.role_name||ROLE_LABELS[u.role]||u.role||'Usuario interno',ini=initials(name);
  $('topName').textContent=name;$('topRole').textContent=role;$('topAvatar').textContent=ini;$('accountAvatar').textContent=ini;$('accountName').textContent=name;$('accountEmail').textContent=u.email||'';$('accountRole').textContent=role;
  if(u.avatar_url){[$('topAvatar'),$('accountAvatar')].forEach(el=>{el.style.backgroundImage=`url("${String(u.avatar_url).replace(/"/g,'%22')}")`;el.textContent=''})}
  $('welcomeTitle').textContent=`Hola, ${firstName(name)}.`;$('welcomeText').textContent=state.canSell?'Todo listo para vender y atender clientes desde tu cuenta.':'Tu sesión interna está activa. Verás únicamente las funciones autorizadas para tu rol.';$('roleBadge').textContent=role;$('roleCardTitle').textContent=role;
  const isManager=['admin','superadmin'].includes(u.role)||u.permissions?.includes('*');$('salesScopeText').textContent=isManager?'Ventas presenciales recientes del equipo.':'Tus ventas presenciales recientes.';
  $('sellNav').classList.toggle('hidden',!state.canSell);$('sellBottomNav').classList.toggle('hidden',!state.canSell);$('heroSellButton').classList.toggle('hidden',!state.canSell);document.querySelectorAll('[data-view="sales"]').forEach(el=>el.classList.toggle('hidden',!state.canSell));document.querySelectorAll('[data-view="repairs"]').forEach(el=>el.classList.toggle('hidden',!serviceAccessAllowed()));
}
function renderHome(){const m=state.metrics||{},s=state.service?.metrics||{};const unified=Number(s.combined_total_today);$('metricSales').textContent=Number(s.combined_operations_today??m.today_sales??0);if($('metricStoreTotal'))$('metricStoreTotal').textContent=money(s.product_collected_today??m.today_total??0);if($('metricServiceTotal'))$('metricServiceTotal').textContent=money(s.service_collected_today||0);$('metricTotal').textContent=money(Number.isFinite(unified)?unified:(m.today_total||0));$('roleCardText').textContent=state.canSell?(m.attribution_ready===false?'Tu permiso de ventas está activo. Ejecuta supabase_v14_0_staff_pos.sql para activar la atribución individual de ventas.':'Tu cuenta tiene acceso a Venta presencial. Las operaciones quedan registradas a tu nombre.'):'Tu rol no tiene permiso de Venta presencial. Puedes seguir usando los módulos habilitados desde el panel completo.';renderSaleRows('homeRecentSales',(state.recent||[]).slice(0,5));}
function renderSales(){renderSaleRows('salesList',state.recent||[])}
function renderSaleRows(id,rows){const box=$(id);if(!box)return;if(!rows.length){box.innerHTML='<div class="empty-state">Todavía no hay ventas presenciales para mostrar.</div>';return}box.innerHTML=rows.map(s=>`<article class="sale-row"><div class="sale-main"><b>${esc(s.codigo||'Pedido')}</b><span>${esc(s.guest_name||s.guest_email||'Cliente')} · ${formatDate(s.created_at)}</span></div><div class="sale-detail"><b>${esc(s.metodo_pago||'Pago')}</b><span>${esc(s.salesperson_name||s.salesperson_email||'ThinkStore')}</span></div><div class="sale-total">${money(s.total_usd)}<span class="sale-status">${esc(s.estado||'Pedido')}</span></div></article>`).join('')}
function formatDate(v){try{return new Intl.DateTimeFormat('es-VE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return''}}
function renderAccount(){const p=state.user?.permissions||[];const box=$('permissions');if(!box)return;box.innerHTML=(p.includes('*')?['Acceso completo']:p.map(k=>PERM_LABELS[k]||k)).map(x=>`<span class="permission-pill">${esc(x)}</span>`).join('')||'<span class="permission-pill">Sin permisos adicionales</span>';}

function serviceAccessAllowed(){const p=state.user?.permissions||[];return !!state.canSell||p.includes('*')||p.includes('pagos')}
async function refreshServiceData(silent=false){
  if(!serviceAccessAllowed()||!sb){state.service={orders:[],metrics:{},methods:[],events:[],canCharge:false,error:''};return}
  try{
    const h=await tokenHeaders();
    const r=await fetch('/.netlify/functions/service-sales?action=bootstrap',{headers:h,cache:'no-store'}),d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw Error(d.error||'No se pudo cargar Servicio Técnico');
    state.service={orders:d.orders||[],metrics:d.metrics||{},methods:d.methods||[],events:d.events_today||[],canCharge:!!d.can_charge,error:''};
  }catch(e){
    state.service={...state.service,error:e.message||'Servicio Técnico no disponible'};
    if(!silent)toast(state.service.error,4500);
  }
}
function repairRows(){
  const q=normalize($('repairSearch')?.value||''),filter=$('repairFilter')?.value||'pending';
  return (state.service?.orders||[]).filter(o=>{
    if(filter==='pending'&&!(Number(o.balance||0)>0))return false;
    if(filter==='paid'&&!o.paid)return false;
    if(q&&!normalize([o.code,o.client_name,o.client_email,o.client_phone,o.device_model,o.device_type,o.serial_imei,o.status,o.payment_method].join(' ')).includes(q))return false;
    return true;
  });
}
function renderRepairs(){
  const box=$('repairList');if(!box)return;
  const s=state.service||{},m=s.metrics||{};
  if($('repairTodayTotal'))$('repairTodayTotal').textContent=money(m.service_collected_today||0);
  if($('repairTodayCount'))$('repairTodayCount').textContent=`${Number(m.service_payments_today||0)} movimiento${Number(m.service_payments_today||0)===1?'':'s'}`;
  if($('repairPendingTotal'))$('repairPendingTotal').textContent=money(m.service_pending_usd||0);
  if($('repairPendingCount'))$('repairPendingCount').textContent=`${Number(m.service_pending_count||0)} reparación${Number(m.service_pending_count||0)===1?'':'es'}`;
  if($('combinedTodayTotal'))$('combinedTodayTotal').textContent=money(m.combined_total_today||0);
  renderRepairMethods();
  if(s.error){box.innerHTML=`<div class="empty-state service-error"><b>No pude conectar la caja con Servicio Técnico.</b><br>${esc(s.error)}</div>`;return}
  const rows=repairRows();
  box.innerHTML=rows.length?rows.map(o=>{
    const pct=o.quote_amount>0?Math.min(100,Math.max(0,Math.round(Number(o.amount_paid||0)/Number(o.quote_amount)*100))):0;
    const status=o.paid?'Pagado':Number(o.amount_paid||0)>0?'Abono parcial':'Pendiente';
    return `<article class="repair-row ${o.paid?'is-paid':''}"><div class="repair-order-main"><div class="repair-code"><b>${esc(o.code)}</b><span class="repair-status ${o.paid?'paid':''}">${esc(status)}</span></div><h3>${esc(o.device_model||o.device_type||'Equipo')}</h3><p>${esc(o.client_name||'Cliente')} · ${esc(o.client_phone||o.client_email||'Sin contacto')}</p><small>${esc(o.status||'Servicio')} · ${esc(o.serial_imei||'Serial no indicado')}</small></div><div class="repair-money"><span>Total</span><b>${money(o.quote_amount)}</b><small>Abonado ${money(o.amount_paid)}</small><div class="repair-progress"><i style="width:${pct}%"></i></div><strong>${o.paid?'Saldo pagado':`Pendiente ${money(o.balance)}`}</strong>${o.payment_method?`<em>${esc(o.payment_method)}</em>`:''}</div><div class="repair-actions">${o.paid?`<button class="secondary compact-button" data-note="${esc(o.code)}" type="button">Nota / imprimir</button><button class="text-action compact-button" data-resend="${esc(o.code)}" type="button">Reenviar correo</button>`:`<button class="primary compact-button" data-charge="${esc(o.code)}" type="button">Cobrar</button>`}</div></article>`;
  }).join(''):'<div class="empty-state">No hay reparaciones que coincidan con este filtro.</div>';
  box.querySelectorAll('[data-charge]').forEach(b=>b.addEventListener('click',()=>openServicePayment(b.dataset.charge)));
  box.querySelectorAll('[data-note]').forEach(b=>b.addEventListener('click',()=>openServiceNote(b.dataset.note)));
  box.querySelectorAll('[data-resend]').forEach(b=>b.addEventListener('click',()=>resendServiceNote(b.dataset.resend)));
}
function renderRepairMethods(){
  const box=$('repairMethodSummary');if(!box)return;const rows=state.service?.methods||[],total=Number(state.service?.metrics?.combined_total_today||0);
  box.innerHTML=rows.length?rows.map(x=>{const pct=total>0?Math.round(Number(x.total_usd||0)/total*100):0;return`<div class="method-row"><div><b>${esc(x.method)}</b><small>${esc(x.currency||'USD')} · ${Number(x.count||0)} mov.</small></div><div class="method-bar"><i style="width:${pct}%"></i></div><strong>${pct}% · ${money(x.total_usd)}</strong></div>`}).join(''):'<div class="empty-state compact-empty">Sin cobros confirmados hoy.</div>';
}
function currentRepair(code){return(state.service?.orders||[]).find(o=>String(o.code).toUpperCase()===String(code||'').toUpperCase())}
function inferredCurrency(method){
  const m=normalize(method);if(/pago movil|punto de venta|\bpos\b|efectivo bs|transferencia bs|bolivar/.test(m))return'VES';if(/eur|euro/.test(m))return'EUR';if(/usdt|binance|tether/.test(m))return'USDT';return'USD';
}
function syncServiceCurrency(){const cur=inferredCurrency($('servicePaymentMethod')?.value||'');if($('serviceCurrency'))$('serviceCurrency').value=cur}
function openServicePayment(code){
  const o=currentRepair(code);if(!o){toast('No encontré esa reparación.');return}
  if(!state.service?.canCharge){toast('Tu rol no tiene permiso para cobrar reparaciones.');return}
  $('servicePayCode').value=o.code;$('servicePayTitle').textContent=o.code;$('servicePaySubtitle').textContent=`${o.client_name||'Cliente'} · ${o.device_model||o.device_type||'Equipo'}`;$('serviceQuote').textContent=money(o.quote_amount);$('servicePaid').textContent=money(o.amount_paid);$('serviceBalance').textContent=money(o.balance);
  $('serviceAmountUsd').value=Number(o.balance||0)>0?Number(o.balance).toFixed(2):'';$('servicePaymentMethod').value=o.payment_method||'Efectivo USD';syncServiceCurrency();$('serviceOriginalAmount').value='';$('servicePaymentRef').value='';$('servicePaymentNote').value='';
  $('servicePaidButton').disabled=!(Number(o.balance||0)>0);openModal('servicePaymentModal');
}
function servicePaymentPayload(action){
  const method=$('servicePaymentMethod').value,currency=$('serviceCurrency').value,code=$('servicePayCode').value;
  return{action,code,payment_method:method,currency,amount_usd:Number($('serviceAmountUsd').value||0),original_amount:$('serviceOriginalAmount').value.trim(),reference:$('servicePaymentRef').value.trim(),notes:$('servicePaymentNote').value.trim()};
}
async function submitServicePayment(action){
  const payload=servicePaymentPayload(action);if(action==='payment'&&!(payload.amount_usd>0))return toast('Indica el monto del abono.');
  if(!/efectivo/i.test(payload.payment_method)&&!payload.reference)return toast('Indica la referencia o número de transacción.');
  setBusy(true);
  try{
    const r=await fetch('/.netlify/functions/service-sales',{method:'POST',headers:await tokenHeaders(true),body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw Error(d.error||'No se pudo registrar el pago');
    closeModal('servicePaymentModal');await refreshServiceData(true);renderHome();renderRepairs();
    if(d.payment?.paid){
      const email=d.delivery_note_email||{};
      const inv=d.inventory_sync||{};const invText=Number(inv.units||0)>0?` · ${inv.units} unidad${Number(inv.units)===1?'':'es'} descontada${Number(inv.units)===1?'':'s'} del inventario`:'';toast((email.sent?'Reparación pagada. Nota enviada al correo del cliente.':'Reparación pagada. Nota generada; revisa el estado del correo.')+invText,5200);
      if(d.note_html)openServiceNote(payload.code,d.note_html);
    }else toast(`Abono registrado. Saldo pendiente ${money(d.payment?.balance_after||0)}.`);
  }catch(e){toast(e.message||'No se pudo registrar el cobro',5200)}
  finally{setBusy(false)}
}
async function openServiceNote(code,html){
  try{
    let noteHtml=html;
    if(!noteHtml){const r=await fetch('/.netlify/functions/service-sales?action=note&code='+encodeURIComponent(code),{headers:await tokenHeaders(),cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||'No se pudo generar la nota');noteHtml=d.html}
    state.serviceNoteHtml=noteHtml||'';state.serviceNoteCode=code;$('serviceNoteTitle').textContent=code;$('serviceNoteBody').innerHTML=state.serviceNoteHtml;openModal('serviceNoteModal');
  }catch(e){toast(e.message||'No se pudo abrir la Nota de Entrega',4800)}
}
function printCurrentServiceNote(){
  if(!state.serviceNoteHtml)return;const w=window.open('','_blank');if(!w)return toast('Permite ventanas emergentes para imprimir la nota.');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Nota de entrega ${esc(state.serviceNoteCode)}</title></head><body>${state.serviceNoteHtml}<script>setTimeout(function(){window.print()},250)<\/script></body></html>`);w.document.close();
}
async function resendServiceNote(code){
  try{
    const r=await fetch('/.netlify/functions/service-sales',{method:'POST',headers:await tokenHeaders(true),body:JSON.stringify({action:'resend_note',code})}),d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw Error(d.error||d.email?.error||'No se pudo reenviar');
    toast(`Nota reenviada a ${d.email?.to||'correo del cliente'}.`,4000);
  }catch(e){toast(e.message||'No se pudo reenviar la nota',4800)}
}

function catFor(name){const cp=state.catalog.find(c=>normalize(c.product_name)===normalize(name));if(cp?.category)return cp.category;return /iphone/i.test(name)?'iPhone':/ipad/i.test(name)?'iPad':/airpod|audio/i.test(name)?'Audio':/watch/i.test(name)?'Apple Watch':/macbook/i.test(name)?'MacBook':/\bmac\b|mac mini|mac pro|imac/i.test(name)?'Mac':/acces|cable|pencil|mouse|keyboard|airtag|case|vidrio|cargador/i.test(name)?'Accesorios Apple':'Otro'}
function staticProduct(name){try{return typeof PRODUCTS!=='undefined'&&Array.isArray(PRODUCTS)?PRODUCTS.find(p=>normalize(p.name||p.model)===normalize(name))||null:null}catch{return null}}
function productRecord(name){return state.catalog.find(c=>normalize(c.product_name)===normalize(name))||(()=>{const p=staticProduct(name);return p?{product_name:p.name||p.model,category:p.category||catFor(name),description:p.desc||''}:{product_name:name,category:catFor(name)}})()}
function variantsFor(name){return state.variants.filter(v=>normalize(v.product_name)===normalize(name))}
function available(v){return Math.max(0,Number(v.available??(Number(v.stock_on_hand||0)-Number(v.stock_reserved||0))))}
function imageFor(name){const cp=productRecord(name);if(cp?.image_url)return cp.image_url;const key=cp?.product_key||slug(name);const imgs=state.images.filter(x=>x.product_key===key).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));const live=imgs.find(x=>x.is_primary)?.image_url||imgs[0]?.image_url;if(live)return live;const sp=staticProduct(name),raw=sp?.main||sp?.image||'';if(raw)return /^https?:|^data:|^\.\.|^\//i.test(raw)?raw:'../assets/'+String(raw).replace(/^assets\//,'');return'../logo-thinkstore.png'}
function allProductNames(){const s=new Set();state.catalog.filter(c=>c.active!==false&&c.published!==false).forEach(c=>c.product_name&&s.add(c.product_name));state.variants.forEach(v=>v.product_name&&s.add(v.product_name));try{if(typeof PRODUCTS!=='undefined'&&Array.isArray(PRODUCTS))PRODUCTS.forEach(p=>(p.name||p.model)&&s.add(p.name||p.model))}catch{}return[...s].sort((a,b)=>a.localeCompare(b,'es'))}
function productStats(name){const vs=variantsFor(name),stock=vs.reduce((n,v)=>n+available(v),0),prices=vs.map(v=>Number(v.price_usd||0)).filter(n=>n>0);const sp=staticProduct(name);if(!prices.length&&sp){const n=Number(sp.price||sp.from||0);if(n>0)prices.push(n)}return{stock,variants:vs.length,from:prices.length?Math.min(...prices):0}}
function filteredProducts(){const q=normalize(state.query),cat=state.category;return allProductNames().filter(name=>{const cp=productRecord(name),vs=variantsFor(name),category=cp.category||catFor(name);if(cat&&category!==cat)return false;const hay=normalize([name,category,cp.description,...vs.flatMap(v=>[v.model,v.color,v.capacity,v.condition,v.chip,v.ram])].join(' '));return!q||hay.includes(q)})}
function renderStore(){show('sellDenied',!state.canSell);show('storeArea',state.canSell);if(!state.canSell)return;renderCategories();const grid=$('productGrid');const rows=filteredProducts();grid.innerHTML=rows.map(name=>{const cp=productRecord(name),st=productStats(name),cat=cp.category||catFor(name);return`<article class="product-card" data-product="${encodeURIComponent(name)}"><div class="product-image"><img loading="lazy" src="${esc(imageFor(name))}" onerror="this.src='../logo-thinkstore.png'" alt="${esc(name)}"></div><div class="product-copy"><h3>${esc(name)}</h3><div class="product-meta">${esc(cat)} · ${st.variants||'Pre-Order'}</div><div class="product-footer"><span class="product-price">${st.from?`Desde ${money(st.from)}`:'Consultar'}</span><span class="stock-pill ${st.stock?'':'out'}">${st.stock?`${st.stock} disponibles`:'Pre-Order'}</span></div></div></article>`}).join('')||'<div class="empty-state">No encontramos productos con esos filtros.</div>';grid.querySelectorAll('.product-card').forEach(el=>el.addEventListener('click',()=>openProduct(decodeURIComponent(el.dataset.product))))}
function renderCategories(){const configured=state.categories.filter(c=>c.active!==false).map(c=>c.name).filter(Boolean),inferred=allProductNames().map(catFor),cats=['Todos',...[...new Set([...configured,...inferred])].filter(Boolean)];$('categoryChips').innerHTML=cats.map(c=>`<button class="category-chip ${(!state.category&&c==='Todos')||state.category===c?'active':''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');$('categoryChips').querySelectorAll('.category-chip').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.cat==='Todos'?'':b.dataset.cat;renderStore()}))}

function openProduct(name){state.selectedProduct=name;const vs=variantsFor(name),cp=productRecord(name),img=imageFor(name);let variants=vs.length?vs:staticVariants(name);if(!variants.length)variants=[{_pseudo:true,id:'',sku:'',product_name:name,color:'',capacity:'',condition:'Pre-Order',price_usd:productStats(name).from||0,available:0}];state.selectedVariantKey=variantKey(variants[0]);$('productModalBody').innerHTML=`<div class="modal-product-image"><img src="${esc(img)}" onerror="this.src='../logo-thinkstore.png'"></div><span class="eyebrow">${esc(cp.category||catFor(name))}</span><h2>${esc(name)}</h2><p class="product-desc">${esc(cp.description||'Selecciona la configuración que desea el cliente.')}</p><div class="variant-list">${variants.map((v,i)=>variantHtml(v,i===0)).join('')}</div><div class="product-controls"><label>Tipo de venta<select id="modalSaleMode"><option value="stock">Desde stock</option><option value="preorder">Pre-Order</option></select></label><label>Garantía<select id="modalWarranty"><option value="90">90 días</option><option value="180">180 días</option><option value="365">1 año</option><option value="0">Sin garantía</option></select></label><label>Precio USD<input id="modalPrice" type="number" min="0.01" step="0.01"></label><label>Nota<input id="modalNote" placeholder="Opcional"></label></div><button id="modalAddCart" class="primary wide add-cart" type="button">Añadir al carrito</button>`;const first=variants[0];$('modalSaleMode').value=(!first._pseudo&&available(first)>0)?'stock':'preorder';fillModalPrice(first);$('productModalBody').querySelectorAll('.variant-option').forEach(el=>el.addEventListener('click',()=>{state.selectedVariantKey=el.dataset.key;document.querySelectorAll('.variant-option').forEach(x=>x.classList.toggle('active',x===el));const v=currentModalVariant();fillModalPrice(v);$('modalSaleMode').value=(!v?true:v._pseudo||available(v)<1)?'preorder':'stock'}));$('modalSaleMode').addEventListener('change',()=>{const v=currentModalVariant();if($('modalSaleMode').value==='stock'&&(v?available(v):0)<1){toast('Esta variante no tiene stock. Usa Pre-Order.');$('modalSaleMode').value='preorder'}});$('modalAddCart').addEventListener('click',addSelectedProduct);openModal('productModal')}
function staticVariants(name){const sp=staticProduct(name);if(!sp)return[];const colors=sp.colors&&typeof sp.colors==='object'?Object.keys(sp.colors):[''];const caps=Array.isArray(sp.storage)&&sp.storage.length?sp.storage:[''];const out=[];for(const color of colors)for(const capacity of caps)out.push({_pseudo:true,id:'',sku:'',product_name:name,color,capacity,condition:'Pre-Order',price_usd:Number(sp.price||sp.from||0)||0,available:0});return out}
function variantKey(v){return String(v.sku||v.id||[v.product_name,v.color,v.capacity,v.condition,v._pseudo?'preorder':''].join('|'))}
function variantHtml(v,active){const stock=v._pseudo?0:available(v),meta=[v.color,v.capacity,v.condition].filter(Boolean).join(' · ')||'Configuración estándar';return`<div class="variant-option ${active?'active':''}" data-key="${esc(variantKey(v))}"><div class="variant-copy"><b>${esc(meta)}</b><small>${esc([v.model,v.chip,v.ram].filter(Boolean).join(' · '))}</small></div><div class="variant-price"><b>${money(v.price_usd||0)}</b><small>${v._pseudo?'Pre-Order':stock?`${stock} en stock`:'Sin stock'}</small></div></div>`}
function currentModalVariant(){const all=[...variantsFor(state.selectedProduct),...staticVariants(state.selectedProduct)];return all.find(v=>variantKey(v)===state.selectedVariantKey)||all[0]||null}
function fillModalPrice(v){$('modalPrice').value=Number(v?.price_usd||productStats(state.selectedProduct).from||0)||''}
function addSelectedProduct(){const v=currentModalVariant(),mode=$('modalSaleMode').value,price=Number($('modalPrice').value||0);if(!(price>0))return toast('Indica un precio válido');if(mode==='stock'&&(!v||v._pseudo||available(v)<1))return toast('No hay stock disponible para esa variante');state.cart.push({sku:v?.sku||'',variant_id:v?._pseudo?null:(v?.id||null),product_name:state.selectedProduct,is_preorder:mode==='preorder',serial_number:'',imei:'',warranty_days:Number($('modalWarranty').value||90),price,condition:mode==='preorder'?'Pre-Order':(v?.condition||'Nuevo'),model_code:v?.model||'',features:[v?.chip,v?.ram].filter(Boolean).join(' · '),note:$('modalNote').value.trim(),image_url:imageFor(state.selectedProduct),color:v?.color||'',capacity:v?.capacity||'',model:v?.model||'',chip:v?.chip||'',ram:v?.ram||'',general_condition:'',battery_health_pct:null});closeModal('productModal');renderCart();toast('Producto añadido al carrito')}
function scannedCartItem(d){
  const v=d?.variant||{},u=d?.unit||{},name=v.product_name||d?.product?.name||d?.product?.product_name||'Producto';
  return{sku:v.sku||d?.sku||'',variant_id:v.id||null,product_name:name,is_preorder:false,serial_number:u.serial_number||'',imei:u.imei||'',warranty_days:90,price:Number(v.price_usd||d?.product?.sale_price||0),condition:v.condition||d?.product?.condition||'Nuevo',model_code:v.model||d?.product?.model||'',features:[v.chip,v.ram].filter(Boolean).join(' · '),note:u.barcode_value?`Escaneado ${u.barcode_value}`:`Escaneado ${d?.code||''}`,image_url:imageFor(name),color:v.color||d?.product?.color||'',capacity:v.capacity||d?.product?.capacity||'',model:v.model||d?.product?.model||'',chip:v.chip||'',ram:v.ram||'',general_condition:u.general_condition||'',battery_health_pct:u.battery_health_pct??null,inventory_unit_barcode:u.barcode_value||''};
}
async function scanToCart(raw){
  const code=String(raw||'').trim();if(!code||state.scanBusy)return;
  if(!state.canSell)return toast('Tu rol no tiene permiso de ventas.');
  state.scanBusy=true;const input=$('barcodeScanInput');if(input)input.disabled=true;
  try{
    const {data:{session}}=await sb.auth.getSession();if(!session)throw Error('Tu sesión venció.');
    const r=await fetch('/.netlify/functions/staff-pos?action=scan&code='+encodeURIComponent(code),{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'}),d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw Error(d.error||`No encontré ${code}`);
    const v=d.variant;if(!v)throw Error('El código existe, pero todavía no está enlazado al inventario de venta.');
    if(d.kind==='unit'){
      const st=normalize(d.unit?.status||'');if(!['disponible','available'].includes(st))throw Error(`La unidad ${code} no está disponible (${d.unit?.status||'estado desconocido'}).`);
      const serial=String(d.unit?.serial_number||'').trim();if(serial&&state.cart.some(x=>normalize(x.serial_number)===normalize(serial)))throw Error('Esa unidad ya está en el carrito.');
    }
    if(available(v)<1)throw Error(`${v.product_name||code} no tiene stock disponible.`);
    const item=scannedCartItem(d);if(!(item.price>0)){
      state.selectedProduct=item.product_name;openProduct(item.product_name);toast('Producto encontrado. Define el precio antes de añadirlo.',4200);return;
    }
    state.cart.push(item);renderCart();toast(`${d.kind==='unit'?'Unidad':'Producto'} añadido: ${item.product_name}`,2600);
    if(input){input.value='';input.focus()}
  }catch(e){toast(e.message||'No se pudo leer el código',4500);if(input){input.select?.();input.focus?.()}}
  finally{state.scanBusy=false;if(input)input.disabled=false}
}
let hardwareScanBuffer='',hardwareScanAt=0,hardwareScanTimer=null;
function wireHardwareScanner(){
  document.addEventListener('keydown',e=>{
    if(!document.querySelector('#view-sell.active')||!state.canSell)return;
    const tag=String(document.activeElement?.tagName||'').toUpperCase();
    if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;
    const now=performance.now();
    if(e.key==='Enter'){
      if(hardwareScanBuffer.length>=4){const code=hardwareScanBuffer;hardwareScanBuffer='';clearTimeout(hardwareScanTimer);e.preventDefault();scanToCart(code)}
      return;
    }
    if(e.key.length!==1||e.ctrlKey||e.metaKey||e.altKey)return;
    if(now-hardwareScanAt>90)hardwareScanBuffer='';
    hardwareScanAt=now;hardwareScanBuffer+=e.key;clearTimeout(hardwareScanTimer);hardwareScanTimer=setTimeout(()=>hardwareScanBuffer='',180);
  });
}
function renderCart(){$('cartCount').textContent=state.cart.length;$('cartItems').innerHTML=state.cart.map((x,i)=>`<div class="cart-line"><img src="${esc(x.image_url)}" onerror="this.src='../logo-thinkstore.png'"><div><b>${esc(x.product_name)}</b><small>${esc([x.color,x.capacity,x.condition].filter(Boolean).join(' · '))}<br>${money(x.price)}${x.serial_number?`<span class="scan-cart-unit">${esc(x.inventory_unit_barcode||'Unidad')} · ${esc(x.serial_number)}</span>`:''}</small></div><button class="remove-cart" data-remove="${i}" type="button">Quitar</button></div>`).join('')||'<div class="empty-state">El carrito está vacío.</div>';$('cartTotal').textContent=money(cartSubtotal());$('checkoutButton').disabled=!state.cart.length;$('cartItems').querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{state.cart.splice(Number(b.dataset.remove),1);renderCart()}));updateCheckoutTotals()}
function cartSubtotal(){return state.cart.reduce((n,x)=>n+Number(x.price||0),0)}
function discountSnapshot(){const subtotal=cartSubtotal(),type=$('discountType')?.value||'usd',value=Math.max(0,Number($('discountValue')?.value||0));const raw=type==='percent'?subtotal*Math.min(value,100)/100:Math.min(value,subtotal),discount=Math.round(raw*100)/100;return{subtotal,discount,total:Math.round((subtotal-discount)*100)/100,type,value}}
function updateCheckoutTotals(){if(!$('checkoutSubtotal'))return;const d=discountSnapshot();$('checkoutSubtotal').textContent=money(d.subtotal);$('checkoutDiscount').textContent='-'+money(d.discount);$('checkoutTotal').textContent=money(d.total);updateFxQuote(d.total)}
async function updateFxQuote(total){const box=$('paymentFx');if(!box)return;if(state.payment!=='Pago Móvil'){show(box,false);return}show(box,true);box.textContent='Consultando tasa oficial…';try{if(!window.ThinkStoreFX)throw Error('Tasa no disponible');await window.ThinkStoreFX.refresh();const q=window.ThinkStoreFX.snapshot(total);box.textContent=q?`${money(total)} × ${q.rate} = ${window.ThinkStoreFX.ves(q.total_ves)} · ${q.source}`:'Tasa no disponible';}catch{box.textContent='No se pudo consultar la tasa oficial en este momento.'}}
function checkoutPayload(){const d=discountSnapshot();return{customer_name:$('customerName').value.trim(),customer_email:$('customerEmail').value.trim(),customer_document:$('customerDocument').value.trim(),customer_phone:$('customerPhone').value.trim(),customer_address:$('customerAddress').value.trim(),customer_city:$('customerCity').value.trim(),customer_state:$('customerState').value.trim(),items:state.cart,payment_method:state.payment,payment_ref:$('paymentRef').value.trim(),delivery_method:$('deliveryMethod').value,shipping_company:$('shippingCompany').value,sale_note:$('saleNote').value.trim(),discount_type:d.type,discount_value:d.value,discount_usd:d.discount,discount_reason:$('discountReason').value.trim(),subtotal_usd:d.subtotal,total_final_usd:d.total,pos_source:'staff_app'}}
function validateCheckout(){const p=checkoutPayload();if(!p.customer_name||!p.customer_email.includes('@')||!p.customer_document||!p.customer_phone||!p.customer_address)throw Error('Completa nombre, correo, cédula/RIF, teléfono y dirección del cliente.');if(!state.cart.length)throw Error('El carrito está vacío.');if(!/efectivo/i.test(state.payment)&&!p.payment_ref)throw Error('Indica la referencia del pago.');return p}
async function createSale(){if(state.savedCode)return state.savedCode;const payload=validateCheckout();setBusy(true);try{const r=await fetch('/.netlify/functions/admin-create-sale',{method:'POST',headers:await tokenHeaders(true),body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||'No se pudo registrar la venta');state.savedCode=d.pedido?.codigo||'';return state.savedCode}finally{setBusy(false)}}
async function holdSale(){try{const code=await createSale();closeModal('checkoutModal');closeModal('cartDrawer');toast(`Venta ${code} guardada en espera`);state.cart=[];state.savedCode='';renderCart();await refreshData(true);navigate('sales')}catch(e){toast(e.message||'No se pudo guardar la venta',4500)}}
async function confirmSale(ev){ev?.preventDefault();try{const code=await createSale();setBusy(true);const r=await fetch('/.netlify/functions/admin-update-order',{method:'POST',headers:await tokenHeaders(true),body:JSON.stringify({code,action:'payment_decision',approved:true})}),d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||'No se pudo confirmar el pago');const total=discountSnapshot().total;closeModal('checkoutModal');closeModal('cartDrawer');$('successMessage').textContent=`Pedido ${code} por ${money(total)}. El pago quedó confirmado y la venta quedó registrada a nombre de ${state.user?.name||'tu usuario'}.`;show('successModal',true);state.cart=[];state.savedCode='';renderCart();await refreshData(true)}catch(e){toast(e.message||'No se pudo confirmar la venta',5000)}finally{setBusy(false)}}
function resetSale(){show('successModal',false);state.cart=[];state.savedCode='';renderCart();['customerName','customerEmail','customerDocument','customerPhone'].forEach(id=>{$(id).value=''});navigate('sell')}

function wire(){
  $('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginMessage').hidden=true;setBusy(true);try{await login($('loginEmail').value.trim(),$('loginPassword').value)}catch(err){messageLogin(err.message||'No se pudo iniciar sesión')}finally{setBusy(false)}});
  $('forgotButton').addEventListener('click',resetPassword);$('logoutButton').addEventListener('click',logout);
  document.addEventListener('click',e=>{const nav=e.target.closest('[data-view]');if(nav){e.preventDefault();const v=nav.dataset.view;if(v==='sell'&&!state.canSell)return toast('Tu rol no tiene permiso de ventas');if(v==='repairs'&&!serviceAccessAllowed())return toast('Tu rol no tiene permiso de cobros');show('successModal',false);navigate(v)}const close=e.target.closest('[data-close]');if(close)closeModal(close.dataset.close)});
  $('productSearch').addEventListener('input',e=>{state.query=e.target.value;renderStore()});$('refreshStore').addEventListener('click',()=>refreshData());$('refreshSales').addEventListener('click',()=>refreshData());$('refreshRepairs')?.addEventListener('click',async()=>{await refreshServiceData();renderHome();renderRepairs()});$('repairSearch')?.addEventListener('input',renderRepairs);$('repairFilter')?.addEventListener('change',renderRepairs);$('cartButton').addEventListener('click',()=>{renderCart();openModal('cartDrawer')});$('checkoutButton').addEventListener('click',()=>{if(!state.cart.length)return;closeModal('cartDrawer');updateCheckoutTotals();openModal('checkoutModal')});$('barcodeScanForm')?.addEventListener('submit',e=>{e.preventDefault();scanToCart($('barcodeScanInput')?.value)});wireHardwareScanner();
  $('paymentChoices').addEventListener('click',e=>{const b=e.target.closest('[data-payment]');if(!b)return;state.payment=b.dataset.payment;document.querySelectorAll('[data-payment]').forEach(x=>x.classList.toggle('active',x===b));show('paymentRefWrap',!/efectivo/i.test(state.payment));if(/efectivo/i.test(state.payment))$('paymentRef').value='';updateCheckoutTotals()});
  $('deliveryMethod').addEventListener('change',()=>show('shippingWrap',$('deliveryMethod').value==='Envío nacional'));$('discountType').addEventListener('change',updateCheckoutTotals);$('discountValue').addEventListener('input',updateCheckoutTotals);$('checkoutForm').addEventListener('submit',confirmSale);$('holdSaleButton').addEventListener('click',holdSale);$('newSaleButton').addEventListener('click',resetSale);
  $('servicePaymentMethod')?.addEventListener('change',syncServiceCurrency);$('servicePaymentForm')?.addEventListener('submit',e=>{e.preventDefault();submitServicePayment('payment')});$('servicePaidButton')?.addEventListener('click',()=>submitServicePayment('mark_paid'));$('printServiceNote')?.addEventListener('click',printCurrentServiceNote);
  $('installButton').addEventListener('click',async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installButton').textContent='App instalada / disponible';return}if(/iphone|ipad|ipod/i.test(navigator.userAgent))toast('En iPhone/iPad: Compartir → Añadir a pantalla de inicio',5000);else toast('Usa el menú del navegador → Instalar aplicación',4500)});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
}

async function start(){wire();renderCart();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});if(!sb){show('boot',false);show('loginScreen',true);messageLogin('No se pudo cargar Supabase.');return}try{const {data:{session}}=await sb.auth.getSession();if(session)await bootstrap();else{show('boot',false);show('loginScreen',true)}}catch(e){show('boot',false);show('loginScreen',true);messageLogin(e.message||String(e))}}
start();
})();
