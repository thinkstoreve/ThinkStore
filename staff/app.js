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
const state={user:null,canSell:false,variants:[],catalog:[],images:[],categories:[],recent:[],metrics:{},cart:[],category:'',query:'',selectedProduct:'',selectedVariantKey:'',payment:'Efectivo USD',saleStep:1,savedCode:'',loading:false,scanBusy:false};
let installPrompt=null,mixedStaff=null;

function initials(name){const parts=String(name||'TS').trim().split(/\s+/).filter(Boolean);return(parts.slice(0,2).map(x=>x[0]).join('')||'TS').toUpperCase()}
function firstName(name){return String(name||'').trim().split(/\s+/)[0]||'Usuario'}
function show(el,on=true){if(typeof el==='string')el=$(el);if(el)el.classList.toggle('hidden',!on)}
function toast(msg,ms=2800){const el=$('toast');if(!el)return;el.textContent=msg;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,ms)}
function setBusy(on){state.loading=on;['loginButton','holdSaleButton','confirmSaleButton','checkoutButton'].forEach(id=>{const el=$(id);if(el)el.disabled=on})}
async function tokenHeaders(json=false){const h={};const {data}=await sb.auth.getSession();const t=data?.session?.access_token;if(t)h.Authorization='Bearer '+t;if(json)h['Content-Type']='application/json';return h}
function openModal(id){const el=$(id);if(!el)return;el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function closeModal(id){const el=$(id);if(!el)return;el.classList.remove('open');el.setAttribute('aria-hidden','true');if(!document.querySelector('.modal.open'))document.body.style.overflow=''}

async function login(email,password){if(!sb)throw Error('Supabase no está configurado.');const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;await bootstrap()}
async function logout(){try{await sb?.auth?.signOut()}catch{}state.user=null;state.cart=[];window.ThinkStoreCash?.reset();show('appShell',false);show('loginScreen',true);$('loginPassword').value='';history.replaceState(null,'','/staff/')}
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
    show('loginScreen',false);show('appShell',true);show('boot',false);renderIdentity();renderHome();renderStore();renderSales();renderAccount();window.ThinkStoreCash?.setUser(state.user);navigate(location.hash.replace('#','')||'home',false);
  }catch(e){show('boot',false);show('appShell',false);show('loginScreen',true);messageLogin(e.message||String(e));}
}

async function refreshData(silent=false){
  const {data:{session}}=await sb.auth.getSession();if(!session)return logout();
  if(!silent)toast('Actualizando…',1200);
  try{const r=await fetch('/.netlify/functions/staff-pos',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||'No se pudo actualizar');state.user=d.user;state.canSell=!!d.can_sell;state.variants=d.variants||[];state.catalog=d.catalog_products||[];state.images=d.catalog_images||[];state.categories=d.catalog_categories||[];state.recent=d.recent_sales||[];state.metrics=d.metrics||{};renderIdentity();renderHome();renderStore();renderSales();renderAccount();window.ThinkStoreCash?.setUser(state.user);if(document.querySelector('#view-cash.active'))window.ThinkStoreCash?.load();if(!silent)toast('Datos actualizados');}catch(e){if(!silent)toast(e.message||'No se pudo actualizar')}
}

function navigate(view,push=true){
  const allowed=['home','sell','sales','cash','account'];if(!allowed.includes(view)||(view==='cash'&&!state.canSell))view='home';
  document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+view));
  document.querySelectorAll('.nav-item[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
  const titles={home:['Inicio','ThinkStore Staff'],sell:['Punto de venta','Tienda interna'],sales:['Historial','Ventas'],cash:['Caja diaria','Caja Staff'],account:['Perfil','Mi cuenta']};
  $('headerContext').textContent=titles[view][0];$('headerTitle').textContent=titles[view][1];
  if(view==='cash'&&state.canSell)window.ThinkStoreCash?.load();if(push)history.replaceState(null,'','#'+view);window.scrollTo({top:0,behavior:'smooth'});if(view==='sell'&&state.canSell&&state.saleStep===2)setTimeout(()=>$('barcodeScanInput')?.focus(),80);
}

function renderIdentity(){
  const u=state.user||{},name=u.name||'Usuario',role=u.role_name||ROLE_LABELS[u.role]||u.role||'Usuario interno',ini=initials(name);
  $('topName').textContent=name;$('topRole').textContent=role;$('accountName').textContent=name;$('accountEmail').textContent=u.email||'';$('accountRole').textContent=role;
  [$('topAvatar'),$('accountAvatar')].forEach(el=>{el.textContent=ini;el.style.backgroundImage='none';if(u.avatar_url){el.style.backgroundImage=`url("${String(u.avatar_url).replace(/["\\]/g,'')}")`;el.textContent=''}});
  show('photoControl',['vendedor','admin','superadmin'].includes(u.role));
  $('removeProfilePhoto').disabled=!u.staff_avatar_path;
  $('welcomeTitle').textContent=`Hola, ${firstName(name)}.`;$('welcomeText').textContent=state.canSell?'Todo listo para vender y atender clientes desde tu cuenta.':'Tu sesión interna está activa. Verás únicamente las funciones autorizadas para tu rol.';$('roleBadge').textContent=role;$('roleCardTitle').textContent=role;
  const isManager=['admin','superadmin'].includes(u.role)||u.permissions?.includes('*');$('salesScopeText').textContent=isManager?'Ventas presenciales recientes del equipo.':'Tus ventas presenciales recientes.';
  $('cashNav').classList.toggle('hidden',!state.canSell);$('cashBottomNav').classList.toggle('hidden',!state.canSell);$('sellNav').classList.toggle('hidden',!state.canSell);$('sellBottomNav').classList.toggle('hidden',!state.canSell);$('heroSellButton').classList.toggle('hidden',!state.canSell);document.querySelectorAll('[data-view="sales"]').forEach(el=>el.classList.toggle('hidden',!state.canSell));
}
function renderHome(){const m=state.metrics||{};$('metricSales').textContent=Number(m.today_sales||0);$('metricTotal').textContent=money(m.today_total||0);$('metricPending').textContent=Number(m.pending||0);$('roleCardText').textContent=state.canSell?(m.attribution_ready===false?'Tu permiso de ventas está activo. Ejecuta supabase_v14_0_staff_pos.sql para activar la atribución individual de ventas.':'Tu cuenta tiene acceso a Venta presencial. Las operaciones quedan registradas a tu nombre.'):'Tu rol no tiene permiso de Venta presencial. Puedes seguir usando los módulos habilitados desde el panel completo.';renderSaleRows('homeRecentSales',(state.recent||[]).slice(0,5));}
function renderSales(){renderSaleRows('salesList',state.recent||[])}
function renderSaleRows(id,rows){const box=$(id);if(!box)return;if(!rows.length){box.innerHTML='<div class="empty-state">Todavía no hay ventas presenciales para mostrar.</div>';return}box.innerHTML=rows.map(s=>`<article class="sale-row"><div class="sale-main"><b>${esc(s.codigo||'Pedido')}</b><span>${esc(s.guest_name||s.guest_email||'Cliente')} · ${formatDate(s.created_at)}</span></div><div class="sale-detail"><b>${esc(s.metodo_pago||'Pago')}</b><span>${esc(s.salesperson_name||s.salesperson_email||'ThinkStore')}</span></div><div class="sale-total">${money(s.total_usd)}<span class="sale-status">${esc(s.estado||'Pedido')}</span></div></article>`).join('')}
function formatDate(v){try{return new Intl.DateTimeFormat('es-VE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return''}}
function renderAccount(){const p=state.user?.permissions||[];const box=$('permissions');if(!box)return;box.innerHTML=(p.includes('*')?['Acceso completo']:p.map(k=>PERM_LABELS[k]||k)).map(x=>`<span class="permission-pill">${esc(x)}</span>`).join('')||'<span class="permission-pill">Sin permisos adicionales</span>';}

/* Fotos de perfil: conversión local (no se envía el archivo original), acceso al propio usuario. */
function photoBusy(on,message=''){
  ['uploadProfilePhoto','removeProfilePhoto','profilePhotoInput'].forEach(id=>{if($(id))$(id).disabled=on});
  if(!on)$('removeProfilePhoto').disabled=!state.user?.staff_avatar_path;
  $('photoStatus').textContent=message;
}
async function normalizeProfilePhoto(file){
  if(!file||!file.type.startsWith('image/')||file.type==='image/svg+xml')throw Error('Selecciona una foto JPG, PNG o compatible.');
  if(file.size>18*1024*1024)throw Error('La foto original debe pesar menos de 18 MB.');
  let bitmap=null,image=null,tempUrl=null;
  try{
    if(window.createImageBitmap){try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'})}catch{}}
    if(!bitmap){tempUrl=URL.createObjectURL(file);image=new Image();image.decoding='async';await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('No pudimos abrir esta imagen en tu dispositivo. Usa JPG o PNG.'));image.src=tempUrl})}
    const w=bitmap?.width||image?.naturalWidth,h=bitmap?.height||image?.naturalHeight;
    if(!w||!h)throw Error('Imagen no válida.');
    const canvas=document.createElement('canvas'),scale=Math.min(1,512/Math.max(w,h));
    canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Tu navegador no pudo procesar la foto.');
    ctx.drawImage(bitmap||image,0,0,canvas.width,canvas.height);
    let blob=null;
    for(const quality of [.85,.73,.6]){
      const next=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
      if(next?.type==='image/webp'){blob=next;if(blob.size<=300*1024)break}
    }
    if(!blob||blob.type!=='image/webp'){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.78))}
    if(!blob||blob.size>400*1024)throw Error('No se pudo optimizar la foto. Prueba con otra imagen.');
    return{mime:blob.type,base64:await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('No se pudo leer la foto'));reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(blob)})};
  }finally{bitmap?.close?.();if(tempUrl)URL.revokeObjectURL(tempUrl)}
}
async function updateProfilePhoto(file,remove=false){
  if(!state.user||!['vendedor','admin','superadmin'].includes(state.user.role))return;
  photoBusy(true,remove?'Quitando foto…':'Preparando foto…');
  try{
    const payload=remove?{action:'remove'}:{action:'upload',...await normalizeProfilePhoto(file)};
    if(!remove)$('photoStatus').textContent='Guardando foto…';
    const res=await fetch('/.netlify/functions/staff-avatar',{method:'POST',headers:await tokenHeaders(true),body:JSON.stringify(payload),cache:'no-store'});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok)throw Error(data.error||'No se pudo guardar la foto.');
    if(!state.user||data.user_id!==state.user.id)throw Error('La sesión cambió. Actualiza la app.');
    state.user.avatar_url=data.avatar_url||'';
    state.user.staff_avatar_path=data.staff_avatar_path||'';
    renderIdentity();toast(remove?'Foto eliminada':'Foto de perfil actualizada');
    photoBusy(false,remove?'Foto eliminada.':'Foto guardada correctamente.');
  }catch(e){photoBusy(false,e.message||'No se pudo actualizar la foto.');toast(e.message||'Error al actualizar foto',4800)}
  finally{$('profilePhotoInput').value=''}
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
function renderStore(){show('sellDenied',!state.canSell);show('staffSaleWizard',state.canSell);if(!state.canSell)return;renderCategories();const grid=$('productGrid');const rows=filteredProducts();grid.innerHTML=rows.map(name=>{const cp=productRecord(name),st=productStats(name),cat=cp.category||catFor(name);return`<article class="product-card" data-product="${encodeURIComponent(name)}"><div class="product-image"><img loading="lazy" src="${esc(imageFor(name))}" onerror="this.src='../logo-thinkstore.png'" alt="${esc(name)}"></div><div class="product-copy"><h3>${esc(name)}</h3><div class="product-meta">${esc(cat)} · ${st.variants||'Pre-Order'}</div><div class="product-footer"><span class="product-price">${st.from?`Desde ${money(st.from)}`:'Consultar'}</span><span class="stock-pill ${st.stock?'':'out'}">${st.stock?`${st.stock} disponibles`:'Pre-Order'}</span></div></div></article>`}).join('')||'<div class="empty-state">No encontramos productos con esos filtros.</div>';grid.querySelectorAll('.product-card').forEach(el=>el.addEventListener('click',()=>openProduct(decodeURIComponent(el.dataset.product))))}
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
function validateSaleCustomer(){const form=$('staffCustomerForm');if(!form)return false;if(!form.reportValidity())return false;return true}
function showSaleStep(target){
  if(!state.canSell)return false;
  const step=Number(target);if(![1,2,3].includes(step))return false;
  if(step>1&&!validateSaleCustomer()){toast('Completa los datos del cliente para continuar.',3800);return false}
  if(step===3&&!state.cart.length){toast('Añade al menos un producto al carrito.',3500);return false}
  state.saleStep=step;
  for(let i=1;i<=3;i++){
    $('staffSaleStep'+i)?.classList.toggle('active',i===step);
    const b=document.querySelector('.staff-sale-step[data-sale-step="'+i+'"]');if(b){b.classList.toggle('active',i===step);b.classList.toggle('done',i<step);if(i===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')}
  }
  if(step===3)updateCheckoutTotals();
  if(step===2)setTimeout(()=>$('barcodeScanInput')?.focus(),120);
  const el=$('staffSaleWizard');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  return true;
}
function clearSaleDraft(){
  state.cart=[];state.savedCode='';state.payment='Efectivo USD';renderCart();
  $('staffCustomerForm')?.reset();$('checkoutForm')?.reset();
  document.querySelectorAll('#paymentChoices [data-payment]').forEach(x=>x.classList.toggle('active',x.dataset.payment==='Efectivo USD'));
  show('paymentRefWrap',false);show('paymentFx',false);show('shippingWrap',false);mixedStaff?.reset();updateCheckoutTotals();
  state.saleStep=1;for(let i=1;i<=3;i++){$('staffSaleStep'+i)?.classList.toggle('active',i===1);const b=document.querySelector('.staff-sale-step[data-sale-step="'+i+'"]');if(b){b.classList.toggle('active',i===1);b.classList.remove('done');if(i===1)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')}}
}
function renderCart(){$('cartCount').textContent=state.cart.length;$('cartItems').innerHTML=state.cart.map((x,i)=>`<div class="cart-line"><img src="${esc(x.image_url)}" onerror="this.src='../logo-thinkstore.png'"><div><b>${esc(x.product_name)}</b><small>${esc([x.color,x.capacity,x.condition].filter(Boolean).join(' · '))}<br>${money(x.price)}${x.serial_number?`<span class="scan-cart-unit">${esc(x.inventory_unit_barcode||'Unidad')} · ${esc(x.serial_number)}</span>`:''}</small></div><button class="remove-cart" data-remove="${i}" type="button">Quitar</button></div>`).join('')||'<div class="empty-state">El carrito está vacío.</div>';$('cartTotal').textContent=money(cartSubtotal());if($('staffCartOverview'))$('staffCartOverview').textContent=state.cart.length?`${state.cart.length} producto(s) · ${money(cartSubtotal())} · ${state.cart.map(x=>x.product_name).join(' · ')}`:'Aún no hay productos seleccionados.';$('checkoutButton').disabled=!state.cart.length;$('cartItems').querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{state.cart.splice(Number(b.dataset.remove),1);renderCart()}));updateCheckoutTotals()}
function cartSubtotal(){return state.cart.reduce((n,x)=>n+Number(x.price||0),0)}
function discountSnapshot(){const subtotal=cartSubtotal(),type=$('discountType')?.value||'usd',value=Math.max(0,Number($('discountValue')?.value||0));const raw=type==='percent'?subtotal*Math.min(value,100)/100:Math.min(value,subtotal),discount=Math.round(raw*100)/100;return{subtotal,discount,total:Math.round((subtotal-discount)*100)/100,type,value}}
function updateCheckoutTotals(){if(!$('checkoutSubtotal'))return;const d=discountSnapshot();$('checkoutSubtotal').textContent=money(d.subtotal);$('checkoutDiscount').textContent='-'+money(d.discount);$('checkoutTotal').textContent=money(d.total);updateFxQuote(d.total);if(state.payment==='Pago mixto')mixedStaff?.update()}
function renderFxQuote(total){const box=$('paymentFx');if(!box)return;if(state.payment!=='Pago Móvil'){show(box,false);return}show(box,true);
  const q=window.ThinkStoreFX?.snapshot(total);box.textContent=q?`${money(total)} × ${q.rate} = ${window.ThinkStoreFX.ves(q.total_ves)} · ${q.source} · Vigente ${q.effective_date}${q.stale?' · No verificada: no cobrar en Bs.':''}`:'Consultando tasa oficial BCV…';
}
async function updateFxQuote(total){renderFxQuote(total);if(state.payment!=='Pago Móvil')return;try{await window.ThinkStoreFX?.refresh();renderFxQuote(total)}catch{renderFxQuote(total);if(!window.ThinkStoreFX?.quote)$('paymentFx').textContent='No se pudo consultar la tasa BCV. No cobrar en Bs.'}}
function checkoutPayload(){const d=discountSnapshot();return{customer_name:$('customerName').value.trim(),customer_email:$('customerEmail').value.trim(),customer_document:$('customerDocument').value.trim(),customer_phone:$('customerPhone').value.trim(),customer_address:$('customerAddress').value.trim(),customer_city:$('customerCity').value.trim(),customer_state:$('customerState').value.trim(),items:state.cart,payment_method:state.payment,payment_ref:$('paymentRef').value.trim(),delivery_method:$('deliveryMethod').value,shipping_company:$('shippingCompany').value,sale_note:$('saleNote').value.trim(),discount_type:d.type,discount_value:d.value,discount_usd:d.discount,discount_reason:$('discountReason').value.trim(),subtotal_usd:d.subtotal,total_final_usd:d.total,pos_source:'staff_app',...(state.payment==='Pago mixto'?mixedStaff.validate(false):{})}}
function validateCheckout(){const p=checkoutPayload();if(!p.customer_name||!p.customer_email.includes('@')||!p.customer_document||!p.customer_phone||!p.customer_address)throw Error('Completa nombre, correo, cédula/RIF, teléfono y dirección del cliente.');if(!state.cart.length)throw Error('El carrito está vacío.');if(state.payment!=='Pago mixto'&&!/efectivo/i.test(state.payment)&&!p.payment_ref)throw Error('Indica la referencia del pago.');return p}
async function createSale(){if(state.savedCode)return state.savedCode;const payload=validateCheckout();setBusy(true);try{const r=await fetch('/.netlify/functions/admin-create-sale',{method:'POST',headers:await tokenHeaders(true),body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||'No se pudo registrar la venta');state.savedCode=d.pedido?.codigo||'';return state.savedCode}finally{setBusy(false)}}
async function holdSale(){if(state.loading)return;try{if(!showSaleStep(3))return;const code=await createSale();closeModal('cartDrawer');toast(`Venta ${code} guardada en espera`);clearSaleDraft();await refreshData(true);navigate('sales')}catch(e){toast(e.message||'No se pudo guardar la venta',4500)}}
async function confirmSale(ev){ev?.preventDefault();if(state.loading)return;try{if(!showSaleStep(3))return;
  if(state.payment==='Pago Móvil'||(state.payment==='Pago mixto'&&mixedStaff.getLines().some(x=>x.currency==='VES')))await window.ThinkStoreFX.requireFresh();
  if(state.payment==='Pago mixto')mixedStaff.validate(true);
  const code=await createSale();setBusy(true);
  let r=await fetch('/.netlify/functions/admin-update-order',{method:'POST',headers:await tokenHeaders(true),body:JSON.stringify({code,action:'payment_decision',approved:true,...(state.payment==='Pago mixto'?mixedStaff.validate(true):{})})});
  let d=await r.json().catch(()=>({}));
  if(r.status===409&&d.rate_changed&&state.payment==='Pago mixto'){await window.ThinkStoreFX.refresh(true);mixedStaff.update();throw Error('Cambió la tasa BCV. Verifica el saldo en bolívares y vuelve a confirmar el pago.');}
  if(r.status===409&&d.rate_changed){
    setBusy(false);
    const approve=confirm(`La tasa BCV cambió.\nMonto anterior: ${window.ThinkStoreFX.ves(d.previous_total_bs)}\nMonto vigente: ${window.ThinkStoreFX.ves(d.current_total_bs)}\n\n¿Comprobaste que el cliente pagó el monto vigente?`);
    if(!approve)throw Error('Pago pendiente: verifica el monto BCV y vuelve a confirmar.');
    setBusy(true);
    r=await fetch('/.netlify/functions/admin-update-order',{method:'POST',headers:await tokenHeaders(true),body:JSON.stringify({code,action:'payment_decision',approved:true,acknowledge_bcv_change:true})});
    d=await r.json().catch(()=>({}));
  }
  if(!r.ok||!d.ok)throw Error(d.error||'No se pudo confirmar el pago');const total=discountSnapshot().total;closeModal('cartDrawer');$('successMessage').textContent=`Pedido ${code} por ${money(total)}. El pago quedó confirmado y la venta quedó registrada a nombre de ${state.user?.name||'tu usuario'}.`;show('successModal',true);clearSaleDraft();await refreshData(true)}catch(e){toast(e.message||'No se pudo confirmar la venta',5000)}finally{setBusy(false)}}
function resetSale(){show('successModal',false);clearSaleDraft();navigate('sell')}

function wire(){
  window.ThinkStoreCash?.init({tokenHeaders,toast});
  $('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginMessage').hidden=true;setBusy(true);try{await login($('loginEmail').value.trim(),$('loginPassword').value)}catch(err){messageLogin(err.message||'No se pudo iniciar sesión')}finally{setBusy(false)}});
  $('forgotButton').addEventListener('click',resetPassword);$('logoutButton').addEventListener('click',logout);
  $('uploadProfilePhoto').addEventListener('click',()=>$('profilePhotoInput').click());
  $('profilePhotoInput').addEventListener('change',e=>{if(e.target.files?.[0])updateProfilePhoto(e.target.files[0])});
  $('removeProfilePhoto').addEventListener('click',()=>{if(state.user?.staff_avatar_path&&confirm('¿Quieres quitar tu foto de perfil?'))updateProfilePhoto(null,true)});
  document.addEventListener('click',e=>{const nav=e.target.closest('[data-view]');if(nav){e.preventDefault();const v=nav.dataset.view;if(['sell','cash'].includes(v)&&!state.canSell)return toast('Tu rol no tiene permiso de ventas');show('successModal',false);navigate(v)}const close=e.target.closest('[data-close]');if(close)closeModal(close.dataset.close)});
  $('productSearch').addEventListener('input',e=>{state.query=e.target.value;renderStore()});$('refreshStore').addEventListener('click',()=>refreshData());$('refreshSales').addEventListener('click',()=>refreshData());$('cartButton').addEventListener('click',()=>{renderCart();openModal('cartDrawer')});$('checkoutButton').addEventListener('click',()=>{closeModal('cartDrawer');showSaleStep(3)});$('staffCustomerForm').addEventListener('submit',e=>{e.preventDefault();showSaleStep(2)});$('staffGoPayment').addEventListener('click',()=>showSaleStep(3));$('staffBackClient').addEventListener('click',()=>showSaleStep(1));$('staffBackProducts').addEventListener('click',()=>showSaleStep(2));$('staffReviewCart').addEventListener('click',()=>{renderCart();openModal('cartDrawer')});document.querySelectorAll('[data-sale-step]').forEach(b=>b.addEventListener('click',()=>showSaleStep(b.dataset.saleStep)));$('barcodeScanForm')?.addEventListener('submit',e=>{e.preventDefault();scanToCart($('barcodeScanInput')?.value)});wireHardwareScanner();
  window.addEventListener('thinkstore:fx-updated',()=>renderFxQuote(discountSnapshot().total));
  mixedStaff=window.ThinkStoreSplit?.mount('staffSplitPayment',()=>discountSnapshot().total);
  $('paymentChoices').addEventListener('click',e=>{const b=e.target.closest('[data-payment]');if(!b)return;state.payment=b.dataset.payment;document.querySelectorAll('#paymentChoices [data-payment]').forEach(x=>x.classList.toggle('active',x===b));mixedStaff?.setVisible(state.payment==='Pago mixto');show('paymentRefWrap',state.payment!=='Pago mixto'&&!/efectivo/i.test(state.payment));if(state.payment==='Pago mixto'||/efectivo/i.test(state.payment))$('paymentRef').value='';updateCheckoutTotals()});
  $('deliveryMethod').addEventListener('change',()=>show('shippingWrap',$('deliveryMethod').value==='Envío nacional'));$('discountType').addEventListener('change',updateCheckoutTotals);$('discountValue').addEventListener('input',updateCheckoutTotals);$('checkoutForm').addEventListener('submit',confirmSale);$('holdSaleButton').addEventListener('click',holdSale);$('newSaleButton').addEventListener('click',resetSale);
  $('installButton').addEventListener('click',async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installButton').textContent='App instalada / disponible';return}if(/iphone|ipad|ipod/i.test(navigator.userAgent))toast('En iPhone/iPad: Compartir → Añadir a pantalla de inicio',5000);else toast('Usa el menú del navegador → Instalar aplicación',4500)});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
}

async function start(){wire();renderCart();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});if(!sb){show('boot',false);show('loginScreen',true);messageLogin('No se pudo cargar Supabase.');return}try{const {data:{session}}=await sb.auth.getSession();if(session)await bootstrap();else{show('boot',false);show('loginScreen',true)}}catch(e){show('boot',false);show('loginScreen',true);messageLogin(e.message||String(e))}}
start();
})();
