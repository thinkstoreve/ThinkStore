
let activeCat='Todos';
let selectedProduct=null;
let selectedColor='';
let selectedConfig={};
let selectedCondition='';
let selectedGallery='';
let cart=JSON.parse(localStorage.getItem('ts_cart')||'[]');
let customer=JSON.parse(localStorage.getItem('ts_customer')||'null');
let currentUser=JSON.parse(localStorage.getItem('ts_current_user')||'null');
if(currentUser){ customer=currentUser; }
let lastNote='';

const $=id=>document.getElementById(id);
const asset=p=>{ const v=String(p||'').trim(); if(!v) return ''; if(v.startsWith('http')||v.startsWith('data:')||v.startsWith('assets/')) return v; return 'assets/'+v; };
const getCat=p=>p.category||p.cat||'Catálogo';
const getDesc=p=>p.description||p.desc||'';
const getConfigs=p=>p.storage||p.variants||p.capacities||['Consultar configuración'];
const getConditions=p=>p.condition||['Nuevo','Como nuevo','Renovado','Preorden'];

function count(){
  if($('cartCount')) $('cartCount').textContent=cart.length;
  localStorage.setItem('ts_cart',JSON.stringify(cart));
}
function safe(s){return String(s||'').replaceAll("'","\\'").replaceAll('"','&quot;');}

function buildGroups(p){
  if(p.configGroups) return p.configGroups;
  const opts=getConfigs(p);
  if(getCat(p).includes('Mac')) return [{label:'Modelo / chip / RAM / SSD',options:opts}];
  if(getCat(p).includes('iPad')) return [{label:'Tamaño / capacidad / conexión',options:opts}];
  if(getCat(p).includes('iPhone')) return [{label:'Modelo / capacidad',options:opts}];
  if(getCat(p).includes('Watch')) return [{label:'Tamaño / conexión',options:opts}];
  return [{label:'Versión / configuración',options:opts}];
}

function productCard(p){
  const colors=Object.keys(p.colors||{});
  const dots=colors.slice(0,8).map(c=>`<span class="dot" title="${c}"></span>`).join('\n');
  return `<div class="prod" onclick="openProduct('${p.id}')">
    <div class="prod-head"><span class="tag">${p.badge||getCat(p)}</span><small>${p.brand||'Apple'} · ${getCat(p)}</small></div>
    <div class="photo"><img loading="lazy" decoding="async" fetchpriority="low" src="${asset(p.main)}" alt="${p.name}"></div>
    <h3>${p.name}</h3>
    <p>${(getDesc(p)||'Producto Apple disponible bajo consulta.').slice(0,115)}...</p>
    <div class="model-line"><b>${p.family||p.model||p.name}</b><span>${colors.length} colores · ${getConfigs(p).length} configuraciones</span></div>
    <div class="dots">${dots}</div>
  </div>`;
}

function render(){
  const q=($('search')?.value||'').toLowerCase();
  const list=PRODUCTS.filter(p=>{
    const text=`${p.name} ${getDesc(p)} ${getCat(p)} ${p.family||''} ${Object.keys(p.colors||{}).join('\n')} ${getConfigs(p).join('\n')}`.toLowerCase();
    return (activeCat=='Todos'||getCat(p)==activeCat||p.family==activeCat) && text.includes(q);
  });
  if($('grid')) $('grid').innerHTML=list.map(productCard).join('\n') || '<p>No encontré productos con esa búsqueda.</p>';
}
function clearProductSearch(){
  const search = $('search');
  if(search){
    search.value = '';
    search.blur();
  }
}

function selectCategory(cat){
  activeCat = cat || 'Todos';
  clearProductSearch();
  document.querySelectorAll('.filter').forEach(x=>{
    x.classList.toggle('active', (x.dataset.cat || 'Todos') === activeCat);
  });
  render();
  const catalogo = $('catalogo');
  if(catalogo) setTimeout(()=>catalogo.scrollIntoView({behavior:'smooth', block:'start'}), 30);
}

function categoryProducts(cat){
  if(!cat || cat === 'Todos') return PRODUCTS.slice();
  return PRODUCTS.filter(p => getCat(p) === cat || p.family === cat || (cat === 'Audio' && /airpods|audio/i.test(`${p.name} ${getCat(p)} ${p.family||''}`)));
}

function categoryLabel(cat,label){
  if(label) return label;
  if(cat === 'Audio') return 'AirPods';
  if(cat === 'Apple Watch') return 'Watch';
  return cat || 'Todos';
}

function openCategoryWindow(cat,label){
  activeCat = cat || 'Todos';
  clearProductSearch();
  document.querySelectorAll('.filter').forEach(x=>{
    x.classList.toggle('active', (x.dataset.cat || 'Todos') === activeCat);
  });
  // No renderizamos todo el catálogo al abrir una categoría: hace la página más rápida.

  const title = categoryLabel(cat,label);
  const list = categoryProducts(cat);
  if($('categoryTitle')) $('categoryTitle').textContent = title;
  if($('categoryDesc')) $('categoryDesc').textContent = list.length
    ? `${list.length} productos disponibles en ${title}. Selecciona un modelo para ver colores y capacidades.`
    : `No hay productos disponibles todavía en ${title}.`;
  const grid = $('categoryGrid');
  if(grid){
    grid.innerHTML = '<div class="ts-loading-products">Cargando productos…</div>';
    requestAnimationFrame(()=>{
      grid.innerHTML = list.length ? list.map(productCard).join('\n') : '<p class="muted">No encontré productos en esta categoría.</p>';
    });
  }

  const modal = $('categoryModal');
  if(modal){
    modal.style.display = 'flex';
    modal.classList.add('open');
  }
}

function closeCategoryWindow(){
  const modal = $('categoryModal');
  if(modal){
    modal.classList.remove('open');
    modal.style.display = 'none';
    modal.style.zIndex = '';
    document.body.classList.remove('ts-category-front-lock');
  }
}

document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{
  const cat = b.dataset.cat || 'Todos';
  if(cat === 'Todos') selectCategory('Todos');
  else openCategoryWindow(cat, b.textContent.trim());
});

function optButtons(id,arr,sel,fn){
  const el=$(id);
  if(!el) return;
  el.innerHTML=(arr||[]).map(x=>`<button class="opt ${x==sel?'sel':''}" onclick="${fn}('${safe(x)}')">${x}</button>`).join('\n');
}

function openProduct(id){
  selectedProduct=(typeof productsV2==='function' ? productsV2() : PRODUCTS).find(p=>p.id==id);
  if(!selectedProduct) return;
  const colors=Object.keys(selectedProduct.colors||{});
  selectedColor=colors[0]||'Disponible';
  selectedCondition=getConditions(selectedProduct)[0];
  selectedConfig={};
  buildGroups(selectedProduct).forEach(g=>selectedConfig[g.label]=(g.options||[])[0]||'Consultar');
  selectedGallery=(selectedProduct.gallery||[])[0]||selectedProduct.main;
  $('pname').textContent=selectedProduct.name;
  $('pdesc').textContent=getDesc(selectedProduct);
  $('badge').textContent=`${selectedProduct.brand||'Apple'} · ${getCat(selectedProduct)}`;
  drawDetail();
  $('modal').classList.add('open');
}

function drawDetail(){
  const p=selectedProduct;
  const colorMap = p.colors || {};
  const colorEntries = Object.entries(colorMap);
  optButtons('colors',Object.keys(colorMap),selectedColor,'setColor');

  const groups=buildGroups(p);
  $('vars').innerHTML=groups.map(g=>`<div class="config-block"><strong>${g.label}</strong><div class="opts inner">${(g.options||[]).map(x=>`<button class="opt ${selectedConfig[g.label]==x?'sel':''}" onclick="setConfig('${safe(g.label)}','${safe(x)}')">${x}</button>`).join('\n')}</div></div>`).join('\n');

  optButtons('conditions',getConditions(p),selectedCondition,'setCond');

  const img = colorMap[selectedColor] || selectedGallery || p.main;
  selectedGallery = img;
  $('mainImg').src=asset(img);
  $('mainImg').alt=p.name;

  let thumbEntries = colorEntries.length ? colorEntries : (p.gallery||[p.main]).map((g,i)=>[`Vista ${i+1}`,g]);
  $('thumbs').innerHTML=thumbEntries.map(([color,g])=>`<button class="thumb ${g==img?'sel':''}" title="${color}" onclick="setGal('${safe(g)}','${safe(color)}')"><img loading="lazy" src="${asset(g)}" alt="${p.name} ${color}"><span>${color}</span></button>`).join('\n');

  const details=p.details||{};
  $('features').innerHTML=Object.entries(details).length
    ? Object.entries(details).map(([k,v])=>`<li><b>${k}:</b> ${v}</li>`).join('\n')
    : (p.features||[]).map(f=>`<li>${f}</li>`).join('\n');

  const meta=$('productMeta');
  if(meta){
    meta.innerHTML=`<span>Marca: <b>${p.brand||'Apple'}</b></span><span>Categoría: <b>${getCat(p)}</b></span><span>Modelo: <b>${p.model||p.family||p.name}</b></span>`;
  }
}

function setGal(g,color){
  selectedGallery=g;
  const found = color || Object.entries((selectedProduct&&selectedProduct.colors)||{}).find(([name,img])=>img===g)?.[0];
  if(found) selectedColor=found;
  drawDetail();
}
function setColor(c){selectedColor=c;selectedGallery=(selectedProduct.colors||{})[c]||selectedProduct.main;drawDetail();}
function setConfig(label,value){selectedConfig[label]=value;drawDetail();}
function setCond(c){selectedCondition=c;drawDetail();}
function closeProduct(){$('modal').classList.remove('open');}
function selectionText(){return Object.entries(selectedConfig).map(([k,v])=>`${k}: ${v}`).join(' · ');}

function addCart(){
  if(!currentUser){
    alert('Para comprar debes iniciar sesión o registrarte primero.');
    openClientLogin();
    return;
  }
  if(!selectedProduct) return;
  cart.push({
    product:selectedProduct.name,
    category:getCat(selectedProduct),
    model:selectedProduct.family||selectedProduct.model||selectedProduct.name,
    color:selectedColor,
    config:selectionText(),
    condition:selectedCondition,
    qty:1,
    price:selectedProduct.price||0,
    image:(selectedProduct.colors||{})[selectedColor]||selectedProduct.main
  });
  count();
  closeProduct();
  openCart();
}


function waProduct(){
  let msg=`Hola ThinkStore, estoy interesado en:\nProducto: ${selectedProduct.name}\nModelo: ${selectedProduct.family||selectedProduct.name}\nColor: ${selectedColor}\n${selectionText()}\nEstado: ${selectedCondition}\n¿Disponibilidad y precio?`;
  open('https://wa.me/584141032030?text='+encodeURIComponent(msg),'_blank');
}

function openCart(){drawCart();$('cart').classList.add('open');syncCheckoutCards();}
function closeCart(){$('cart').classList.remove('open');}
function clearCart(){cart=[];count();drawCart();}
function continueShoppingFromCart(){
  const lastCategory = (cart && cart.length && (cart[cart.length-1].category || cart[cart.length-1].model)) || 'Todos';
  closeCart();
  setTimeout(()=>{
    const normalized = (typeof normalizeCategoryV2 === 'function') ? normalizeCategoryV2(lastCategory) : lastCategory;
    if(typeof openCategoryModalV2 === 'function' && normalized && normalized !== 'Todos'){
      openCategoryModalV2(normalized);
    }else if(typeof openCategoryWindow === 'function'){
      openCategoryWindow(normalized || 'Todos');
    }else if(typeof scrollToCatalogV2 === 'function'){
      scrollToCatalogV2();
    }else{
      const el=document.getElementById('catalogo')||document.querySelector('.cats')||document.body;
      el.scrollIntoView({behavior:'smooth',block:'start'});
    }
  },180);
}

function formatCheckoutMoney(value){
  const n=Number(value||0);
  return n ? '$'+n.toLocaleString('es-VE') : 'Por confirmar';
}
function cartSubtotalValue(){return cart.reduce((sum,i)=>sum+(Number(i.price||0)*Number(i.qty||1)),0);}

function checkoutColorHex(color){
  const c=String(color||'').toLowerCase();
  const map=[
    ['azul galaxia','#5f7dff'],['azul cielo','#9fd7ff'],['azul','#5f7dff'],
    ['negro espacial','#2b2d33'],['negro','#1c1c1e'],['blanco','#f5f5f7'],
    ['plata','#d8d9dc'],['silver','#d8d9dc'],['natural','#c8b8a6'],
    ['desert','#c79a6b'],['titanio','#b9b1a7'],['rosa','#f7a6c6'],
    ['verde','#7fd36b'],['amarillo','#ffd35c'],['naranja','#ff7a2f'],
    ['morado','#9b7cff'],['púrpura','#9b7cff'],['rojo','#ff4b4b']
  ];
  const found=map.find(([name])=>c.includes(name));
  return found?found[1]:'#8f96ff';
}
function drawCart(){
  const items=$('cartItems');
  if(!items) return;
  items.innerHTML=cart.length?cart.map((i,n)=>{
    const colorName=i.color||'Color por confirmar';
    const colorHex=checkoutColorHex(colorName);
    const rawConfig=i.config||'Configuración por confirmar';
    const compactConfig=String(rawConfig).replace(/(^| · )[^:·]+:\s*/g,'$1').replace(/^ · /,'').trim() || rawConfig;
    return `<div class="cartrow premium-cartrow ts-selected-row" style="--product-color:${colorHex}">
    <div class="cart-index ts-qty-badge">${Number(i.qty||1)}</div>
    <div class="ts-thumb-stage"><span class="ts-color-halo"></span><span class="ts-color-chip" title="${colorName}"><i></i>${colorName}</span><img class="cart-product-img js-remove-white-bg" data-original-src="${asset(i.image)}" src="${asset(i.image)}" alt="${i.product}"></div>
    <div class="cart-info"><b>${i.product}</b><span>${i.model||''}</span><div class="cart-chips ts-cart-chips-v23"><em class="cart-color-pill" style="--chip-color:${colorHex}"><i></i>${colorName}</em><em class="cart-config-pill">📦 ${compactConfig}</em><em class="cart-status-pill"><span class="ts-status-dot"></span>${i.condition||'Nuevo'}</em></div></div>
    <div class="cart-price"><strong>${formatCheckoutMoney(i.price)}</strong><small>USD</small></div>
    <button class="cart-remove" onclick="removeCart(${n})" title="Eliminar">×</button>
  </div>`}).join('\n'):'<div class="empty-cart-premium">🛒<b>Tu carrito está vacío</b><small>Agrega un producto para iniciar tu pedido.</small></div>';

  const summary=$('cartSummaryItems');
  if(summary){
    summary.innerHTML=cart.length?cart.map(i=>`<div class="summary-item"><img src="${asset(i.image)}"><div><b>${i.product}</b><small>${i.color||''} · ${i.config||''}</small></div><strong>${formatCheckoutMoney(i.price)}</strong></div>`).join('\n'):'<p class="muted">Sin productos seleccionados.</p>';
  }
  const subtotal=cartSubtotalValue();
  if($('cartSubtotal')) $('cartSubtotal').textContent=formatCheckoutMoney(subtotal);
  if($('cartTotal')) $('cartTotal').textContent=subtotal?'USD '+formatCheckoutMoney(subtotal):'USD —';
  drawCustomerSummary();
  syncCheckoutCards();
  polishCartProductImages();
}
function removeCart(n){cart.splice(n,1);count();drawCart();}


function selectPayMethod(value){
  if($('payMethod')) $('payMethod').value=value;
  syncCheckoutCards();
}
function tsCopyText(text){
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(()=>tsToastCopied()).catch(()=>tsFallbackCopy(text));
  }else{
    tsFallbackCopy(text);
  }
}
function tsFallbackCopy(text){
  const ta=document.createElement('textarea');
  ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); tsToastCopied(); }catch(e){ alert(text); }
  ta.remove();
}
function tsToastCopied(){
  tsShowToast('✅ Datos copiados');
}
function tsShowToast(message){
  let t=document.getElementById('tsCopyToast');
  if(!t){ t=document.createElement('div'); t.id='tsCopyToast'; t.className='ts-copy-toast'; document.body.appendChild(t); }
  t.textContent=message || '✅ Listo';
  t.classList.add('show');
  clearTimeout(window.__tsToastTimer);
  window.__tsToastTimer=setTimeout(()=>t.classList.remove('show'),2600);
}
function renderPaymentDetails(pay){
  const box=document.getElementById('paymentDetailsCard');
  const inputs=document.getElementById('paymentInputs');
  const upload=document.getElementById('paymentUploadPanel');
  if(!box) return;
  const method=String(pay||'Pago Móvil');
  let html='';
  let needsProof=true;
  if(method==='Pago Móvil'){
    html=`<div class="pay-details-head"><img src="assets/bancamiga.svg" alt="Bancamiga"><span class="pay-status">Esperando comprobante</span></div>
      <div class="pay-data-grid">
        <div><small>Banco</small><b>Bancamiga</b></div>
        <div><small>Teléfono</small><b>0412-0142898</b></div>
        <div><small>C.I./RIF</small><b>E-84554142</b></div>
      </div>
      <button type="button" class="copy-pay-btn" onclick="tsCopyText('Pago Móvil Bancamiga\\nTeléfono: 0412-0142898\\nC.I./RIF: E-84554142')">📋 Copiar datos de pago</button>`;
  }else if(method==='Zelle'){
    html=`<div class="pay-details-head"><div class="zelle-mark">Zelle</div><span class="pay-status">Esperando comprobante</span></div>
      <div class="pay-data-grid one"><div><small>Número Zelle</small><b>(954) 445-9161</b></div></div>
      <button type="button" class="copy-pay-btn" onclick="tsCopyText('(954) 445-9161')">📋 Copiar número</button>`;
  }else if(method==='Efectivo'){
    needsProof=false;
    html=`<div class="pay-details-head"><div class="cash-mark">💵 Efectivo</div><span class="pay-status cash">Sin comprobante requerido</span></div>
      <p class="cash-note">Pagar en tienda o en el lugar de destino en caso de envío por Delivery.</p>`;
  }else if(method==='USDT'){
    needsProof=false;
    html=`<div class="pay-details-head"><div class="usdt-mark">₮ USDT</div><span class="pay-status pending">Próximamente</span></div>
      <p class="cash-note">Este método queda visible para configurar la wallet más adelante.</p>`;
  }
  box.innerHTML=html;
  if(inputs) inputs.style.display=needsProof?'grid':'none';
  if(upload) upload.style.display=needsProof?'block':'none';
}

function selectDeliveryType(value){ if($('deliveryType')) $('deliveryType').value=value; syncCheckoutCards(); }
function syncCheckoutCards(){
  const pay=$('payMethod')?.value || 'Pago Móvil';
  document.querySelectorAll('.pay-choice').forEach(b=>b.classList.toggle('active', b.dataset.pay===pay));
  renderPaymentDetails(pay);
  const delivery=$('deliveryType')?.value;
  document.querySelectorAll('.delivery-choice').forEach(b=>b.classList.toggle('active', b.dataset.delivery===delivery));
}

function openRegister(){
  if(customer){
    $('rname').value=customer.name||'';
    $('rid').value=customer.id||'';
    $('rphone').value=customer.phone||'';
    $('remail').value=customer.email||'';
    $('rstate').value=customer.state||'';
    $('rcity').value=customer.city||'';
    $('raddress').value=customer.address||'';
    $('rref').value=customer.ref||'';
    $('rshipping').value=customer.shipping||'Delivery ThinkStore';
    $('ragency').value=customer.agency||'';
  }
  $('registerModal').classList.add('open');
}
function closeRegister(){$('registerModal').classList.remove('open');}
function saveCustomer(e){
  e.preventDefault();
  customer={
    name:$('rname').value.trim(),
    id:$('rid').value.trim(),
    phone:$('rphone').value.trim(),
    email:$('remail').value.trim(),
    state:$('rstate').value.trim(),
    city:$('rcity').value.trim(),
    address:$('raddress').value.trim(),
    ref:$('rref').value.trim(),
    shipping:$('rshipping').value,
    agency:$('ragency').value.trim()
  };
  localStorage.setItem('ts_customer',JSON.stringify(customer));
  closeRegister();
  drawCustomerSummary();
  openCart();
}

function drawCustomerSummary(){
  const el=$('customerSummary');
  if(!el) return;
  if(!customer){
    el.innerHTML='<div class="customer-empty">👤 <b>Aún no hay cliente registrado</b><small>Presiona “Registrar cliente” para completar los datos.</small></div>';
    return;
  }
  const locationLine=[customer.city, customer.state].filter(Boolean).join(' · ');
  el.innerHTML=`<div class="customer-grid-premium customer-grid-v19">
    <div class="customer-card customer-name"><span>👤 Nombre</span><b>${customer.name||'Por definir'}</b></div>
    <div class="customer-card customer-id"><span>🪪 C.I / RIF</span><b>${customer.id||'Por definir'}</b></div>
    <div class="customer-card customer-phone"><span>📞 Teléfono</span><b>${customer.phone||'Por definir'}</b></div>
    <div class="customer-card customer-ship"><span>🚚 Envío</span><b>${customer.shipping||'Por definir'}</b><small>${customer.agency||''}</small></div>
    <div class="customer-card customer-address"><span>📍 Dirección</span><b>${customer.address||'Por definir'}</b><small>${locationLine||'Sin ciudad / estado'}</small></div>
  </div>`;
}

function noteText(){
  const date=new Date();
  const number='TS-'+date.getFullYear()+String(date.getMonth()+1).padStart(2,'0')+String(date.getDate()).padStart(2,'0')+'-'+String(date.getHours()).padStart(2,'0')+String(date.getMinutes()).padStart(2,'0');
  const pay=$('payMethod') ? $('payMethod').value : 'Por confirmar';
  const lines=[];
  lines.push('NOTA DE ENTREGA THINKSTORE');
  lines.push('N° '+number);
  lines.push('Fecha: '+date.toLocaleString('es-VE'));
  lines.push('');
  if(customer){
    lines.push('CLIENTE');
    lines.push('Nombre: '+customer.name);
    lines.push('Cédula/RIF: '+customer.id);
    lines.push('Teléfono: '+customer.phone);
    lines.push('Correo: '+(customer.email||'No indicado'));
    lines.push('Dirección: '+customer.address+', '+customer.city+', '+customer.state);
    lines.push('Referencia: '+(customer.ref||'No indicada'));
    lines.push('Envío: '+customer.shipping+(customer.agency?' / '+customer.agency:''));
  } else {
    lines.push('CLIENTE: Pendiente por registrar');
  }
  lines.push('');
  lines.push('PRODUCTOS');
  cart.forEach((i,n)=>{
    lines.push(`${n+1}. ${i.product}`);
    lines.push(`   Modelo: ${i.model}`);
    lines.push(`   Color: ${i.color}`);
    lines.push(`   Configuración: ${i.config}`);
    lines.push(`   Estado: ${i.condition}`);
  });
  lines.push('');
  lines.push('Método de pago: '+pay);
  lines.push('Total: A confirmar por ThinkStore');
  lines.push('');
  lines.push('Observación: disponibilidad, precio final y despacho sujetos a confirmación.');
  return lines.join('\n');
}

function generateDeliveryNote(){
  if(!cart.length){alert('Agrega productos al carrito primero.');return;}
  lastNote=noteText();
  $('deliveryNote').innerHTML='<pre>'+lastNote.replace(/[&<]/g,m=>({'&':'&amp;','<':'&lt;'}[m]))+'</pre>';
  $('noteModal').style.display='flex'; $('noteModal').classList.add('open');
}
function closeNote(){ window.closeNote(); }
function copyNote(){navigator.clipboard.writeText(lastNote || noteText());}
function sendNoteWhatsApp(){
  const msg=lastNote || noteText();
  open('https://wa.me/584141032030?text='+encodeURIComponent(msg),'_blank');
}
function checkoutWhatsApp(){
  if(!cart.length){alert('Tu carrito está vacío.');return;}
  if(!customer){openRegister();return;}
  lastNote=noteText();
  open('https://wa.me/584141032030?text='+encodeURIComponent(lastNote),'_blank');
}

function toggleTheme(){document.body.classList.toggle('dark');}

render();
count();
drawCustomerSummary();

/* ===== ThinkStore Final: clientes, pedidos, estatus y panel privado demo ===== */
let orders = JSON.parse(localStorage.getItem('ts_orders') || '[]');
let customers = JSON.parse(localStorage.getItem('ts_customers') || '[]');
const ADMIN_KEY = null; // La clave real se escribe manualmente y se valida en Netlify

function saveAll(){
  localStorage.setItem('ts_orders', JSON.stringify(orders));
  localStorage.setItem('ts_customers', JSON.stringify(customers));
}
function orderCode(){
  const d = new Date();
  const n = String(orders.length + 1).padStart(4,'0');
  return `TS-${d.getFullYear()}-${n}`;
}

function saveCustomer(e){
  e.preventDefault();
  customer={
    name:$('rname').value.trim(),
    id:$('rid').value.trim(),
    phone:$('rphone').value.trim(),
    email:$('remail').value.trim(),
    state:$('rstate').value.trim(),
    city:$('rcity').value.trim(),
    address:$('raddress').value.trim(),
    ref:$('rref').value.trim(),
    shipping:$('rshipping').value,
    agency:$('ragency').value.trim(),
    user:$('ruser') ? $('ruser').value.trim() : '',
    pass:$('rpass') ? $('rpass').value.trim() : ''
  };
  localStorage.setItem('ts_customer',JSON.stringify(customer));
  const exists = customers.findIndex(c=>c.id===customer.id || (customer.phone && c.phone===customer.phone));
  if(exists>=0) customers[exists]=customer; else customers.push(customer);
  saveAll();
  closeRegister();
  drawCustomerSummary();
  openCart();
}

function openRegister(){
  if(customer){
    ['name','id','phone','email','state','city','address','ref','agency','user','pass'].forEach(k=>{
      const el=$('r'+(k==='name'?'name':k));
      if(el) el.value=customer[k]||'';
    });
    if($('rshipping')) $('rshipping').value=customer.shipping||'Delivery ThinkStore';
  }
  $('registerModal').classList.add('open');
}

function buildOrder(status='Recibido', persist=true){
  if(!cart.length){alert('Agrega productos al carrito primero.');return null;}
  if(!currentUser){alert('Debes iniciar sesión o registrarte antes de finalizar la compra.'); openClientLogin(); return null;}
  customer=currentUser;
  const code = orderCode();
  const pay=$('payMethod') ? $('payMethod').value : 'Por confirmar';
  const order={
    code,
    date:new Date().toLocaleString('es-VE'),
    status: cart.some(i=>String(i.condition).toLowerCase().includes('pre')) ? 'Preorden recibida' : status,
    customer:{...customer},
    payment:pay,
    paymentRef:$('paymentRef') ? $('paymentRef').value.trim() : '',
    paymentAmount:$('paymentAmount') ? $('paymentAmount').value.trim() : '',
    deliveryType:$('deliveryType') ? $('deliveryType').value : 'Envío nacional',
    guideNumber:$('guideNumber') ? $('guideNumber').value.trim() : '',
    updatedAt:new Date().toLocaleString('es-VE'),
    items:cart.map(i=>({...i})),
    note:''
  };
  order.note = createNote(order);
  orders.push(order);
  saveAll();
  return order;
}


function moneyFmt(v){
  if(v===undefined || v===null || v==='' || Number.isNaN(Number(v)) || Number(v)===0) return 'A confirmar';
  return '$' + Number(v).toLocaleString('es-VE');
}
function getTrackingUrl(code){
  const base = location.origin && location.origin !== 'null' ? location.origin : 'https://thinkstore.com.ve';
  return `${base}/?tracking=${encodeURIComponent(code)}#estatus`;
}
function currentOrderStep(status){
  const s = String(status||'').toLowerCase();
  if(s.includes('entregado')) return 5;
  if(s.includes('enviado')) return 4;
  if(s.includes('prepar') || s.includes('verificado')) return 3;
  if(s.includes('pago')) return 2;
  return 1;
}
function statusTimelineHTML(order){
  const step = currentOrderStep(order.status);
  const steps = ['Pedido recibido','Pago verificado','En preparación','Enviado','Entregado'];
  return `<div class="note-timeline apple-timeline">${steps.map((label,i)=>{
    const active = i+1 <= step;
    const icon = i===2 ? '▣' : (i===3 ? '▤' : '✓');
    return `<div class="note-step ${active?'active':''}"><div class="note-dot">${active?icon:''}</div><span>${label}</span><small>${active?(order.updatedAt||order.date||''):'Pendiente'}</small></div>`;
  }).join('\n')}</div>`;
}

function paymentIconHTML(method){
  const m = String(method||'').toLowerCase();
  if(m.includes('pago')) return '<span class="pay-badge pago">Pago Móvil</span>';
  if(m.includes('zelle')) return '<span class="pay-badge zelle">Zelle</span>';
  if(m.includes('binance')) return '<span class="pay-badge binance">Binance</span>';
  
  if(m.includes('tarjeta')) return '<span class="pay-badge card">Tarjeta</span>';
  if(m.includes('efect')) return '<span class="pay-badge cash">Efectivo</span>';
  return `<span class="pay-badge">${method||'A confirmar'}</span>`;
}
function shippingLogoHTML(ship){
  const s = String(ship||'').toLowerCase();
  if(s.includes('mrw')) return '<span class="ship-logo mrw">MRW</span>';
  if(s.includes('zoom')) return '<span class="ship-logo zoom">ZOOM</span>';
  if(s.includes('tealca')) return '<span class="ship-logo tealca">TEALCA</span>';
  if(s.includes('retiro')) return '<span class="ship-logo store">RETIRO EN TIENDA</span>';
  return `<span class="ship-logo">${ship||'A confirmar'}</span>`;
}
function buildPremiumNoteHTML(order){
  const subtotal = order.items.reduce((sum,i)=>sum+(Number(i.price||0)*Number(i.qty||1)),0);
  const deliveryType = order.deliveryType || order.customer.deliveryType || 'Envío nacional';
  const shippingLabel = deliveryType === 'Retiro en tienda' ? 'Retiro en tienda' : (order.customer.shipping || 'A confirmar');
  const firstImg = order.items[0]?.image ? asset(order.items[0].image) : 'assets/thinkstore_logo_custom.jpeg';
  return `
  <div class="note-page apple-note">
    <header class="note-header apple-note-header">
      <div class="note-brand apple-note-brand">
        <div class="note-logo apple-note-logo"><img src="assets/thinkstore_logo_custom.jpeg" alt="ThinkStore"></div>
        <div>
          <h1>THINK<span>STORE</span></h1>
          <p>ThinkStore.com.ve</p>
        </div>
      </div>
      <div class="note-divider"></div>
      <div class="note-title apple-note-title">
        <h2>NOTA DE ENTREGA</h2>
        <p><b>Orden:</b> <strong>${order.code}</strong></p>
        <p><b>Fecha:</b> ${order.date}</p>
        <p><b>Estado:</b> <span class="status-pill">${order.status}</span></p>
      </div>
    </header>

    <section class="note-section apple-section">
      <h3><span class="line-icon">♙</span> DATOS DEL CLIENTE</h3>
      <div class="note-grid two apple-client-grid">
        <p><b>Nombre:</b><span>${order.customer.name||''}</span></p>
        <p><b>Correo:</b><span>${order.customer.email||''}</span></p>
        <p><b>Cédula / RIF:</b><span>${order.customer.id||''}</span></p>
        <p><b>Dirección:</b><span>${order.customer.address||''}</span></p>
        <p><b>Teléfono:</b><span>${order.customer.phone||''}</span></p>
        <p><b>Ciudad / Estado:</b><span>${order.customer.city||''}, ${order.customer.state||''}</span></p>
      </div>
    </section>

    <section class="note-section apple-section">
      <h3><span class="line-icon">▢</span> PRODUCTOS</h3>
      <table class="note-table apple-table">
        <thead><tr><th>Producto</th><th>Color</th><th>Capacidad</th><th>Cantidad</th><th>Precio Unit.</th><th>Total</th></tr></thead>
        <tbody>${order.items.map(i=>`<tr><td class="product-cell"><img src="${asset(i.image)}"><div><b>${i.product}</b><small>${i.model||''}</small></div></td><td>${i.color||''}</td><td>${i.config||''}</td><td>${i.qty||1}</td><td>${moneyFmt(i.price)}</td><td>${moneyFmt((Number(i.price||0)*Number(i.qty||1))||'')}</td></tr>`).join('\n')}</tbody>
        <tfoot><tr><td colspan="5">TOTAL</td><td>${subtotal ? moneyFmt(subtotal) : 'A confirmar'}</td></tr></tfoot>
      </table>
    </section>

    <section class="note-grid two note-cards apple-cards">
      <div class="note-box apple-box">
        <h3><span class="line-icon">▤</span> INFORMACIÓN DE PAGO</h3>
        <p><b>Método de pago:</b> ${paymentIconHTML(order.payment)}</p>
        <p><b>Referencia:</b> <span>${order.paymentRef || 'Pendiente'}</span></p>
        <p><b>Fecha de pago:</b> <span>${order.updatedAt || order.date}</span></p>
        <p><b>Monto pagado:</b> <span>${order.paymentAmount || 'A confirmar'}</span></p>
        <div class="pay-icons apple-pay-icons"><span>Pago Móvil</span><span>Zelle</span><span>Zelle</span><span>Pago Móvil</span><span>Efectivo</span><span>USDT</span></div>
      </div>
      <div class="note-box apple-box">
        <h3><span class="line-icon">▤</span> INFORMACIÓN DE ENVÍO</h3>
        <p><b>Empresa de envío:</b> ${shippingLogoHTML(shippingLabel)}</p>
        <p><b>Dirección de entrega:</b> <span>${deliveryType === 'Retiro en tienda' ? 'Retiro coordinado en tienda ThinkStore' : (order.customer.address||'A confirmar')}</span></p>
        <p><b>Número de guía:</b> <span>${order.guideNumber || 'Pendiente'}</span></p>
        <p><b>Fecha estimada de entrega:</b> <span>Pendiente</span></p>
        <div class="shipping-icons apple-shipping-icons"><span class="ship-logo mrw">MRW</span><span class="ship-logo zoom">ZOOM</span><span class="ship-logo tealca">TEALCA</span></div>
      </div>
    </section>

    <section class="note-section apple-section">
      <h3><span class="line-icon">▣</span> ESTADO DEL PEDIDO</h3>
      ${statusTimelineHTML(order)}
    </section>

    <section class="note-footer-grid apple-note-bottom">
      <div class="note-observations apple-observations"><b>OBSERVACIONES</b><p>Gracias por confiar en ThinkStore. Pronto recibirás un correo con la actualización de tu pedido.</p></div>
      <div class="note-qr-wrap apple-qr-wrap"><div id="noteQR"></div><div><p>Escanea para ver tu pedido</p><b>ThinkStore.com.ve/seguimiento</b></div></div>
    </section>

    <footer class="note-footer apple-note-footer"><div><img src="assets/thinkstore_logo_custom.jpeg"><b>THINK<span>STORE</span></b></div><div>✉ ventas@thinkstore.com.ve</div><div>☎ 0412-123.45.67</div><div>Instagram · WhatsApp · Web</div></footer>
  </div>`;
}

function showPremiumNote(order){
  const modal = $('premiumNoteModal'); const holder = $('premiumNote');
  if(!modal || !holder) return;
  holder.innerHTML = buildPremiumNoteHTML(order);
  modal.classList.add('open');
  setTimeout(()=>{ const q = $('noteQR'); if(q && window.QRCode){ q.innerHTML=''; new QRCode(q,{text:getTrackingUrl(order.code),width:92,height:92}); } },80);
}
function closePremiumNote(){ $('premiumNoteModal').classList.remove('open'); }
function printPremiumNote(){ window.print(); }
function copyPremiumNoteText(){ const txt=$('premiumNote')?$('premiumNote').innerText:''; navigator.clipboard.writeText(txt).then(()=>alert('Nota copiada.')); }

function createNote(order){
  const lines=[];
  lines.push('NOTA DE ENTREGA THINKSTORE');
  lines.push('N° '+order.code);
  lines.push('Fecha: '+order.date);
  lines.push('Estatus: '+order.status);
  lines.push('');
  lines.push('CLIENTE');
  lines.push('Nombre: '+order.customer.name);
  lines.push('Cédula/RIF: '+order.customer.id);
  lines.push('Teléfono: '+order.customer.phone);
  lines.push('Correo: '+(order.customer.email||'No indicado'));
  lines.push('Dirección: '+order.customer.address+', '+order.customer.city+', '+order.customer.state);
  lines.push('Referencia: '+(order.customer.ref||'No indicada'));
  lines.push('Envío: '+order.customer.shipping+(order.customer.agency?' / '+order.customer.agency:''));
  lines.push('');
  lines.push('PRODUCTOS');
  order.items.forEach((i,n)=>{
    lines.push(`${n+1}. ${i.product}`);
    lines.push(`   Modelo: ${i.model}`);
    lines.push(`   Color: ${i.color}`);
    lines.push(`   Configuración: ${i.config}`);
    lines.push(`   Estado del equipo: ${i.condition}`);
  });
  lines.push('');
  lines.push('Método de pago: '+order.payment);
  lines.push('Total: A confirmar por ThinkStore');
  lines.push('');
  lines.push('Seguimiento: usa el código '+order.code+' en la sección Estatus de compra.');
  lines.push('Observación: disponibilidad, precio final y despacho sujetos a confirmación.');
  return lines.join('\n');
}

function generateDeliveryNote(){
  const order = buildOrder();
  if(!order) return;
  lastNote=order.note;
  showPremiumNote(order);
  drawCart();
}
function checkoutWhatsApp(){
  const order = buildOrder('Recibido', true);
  if(!order) return;
  lastNote=order.note;
  open('https://wa.me/584141032030?text='+encodeURIComponent(lastNote),'_blank');
  cart=[]; count(); drawCart();
}


function formatLongDate(dateStr){
  if(!dateStr) return 'Por confirmar';
  try{
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-VE', { day:'numeric', month:'long', year:'numeric' });
  }catch(e){ return dateStr; }
}
function premiumProgressLines(status){
  const current = String(status || '').toLowerCase();
  const steps = ['Pedido recibido','Pago confirmado','Compra realizada','En tránsito internacional','Llegó a Venezuela','En reparto','Entregado'];
  const aliases = {
    'preorden recibida':0,
    'pedido recibido':0,
    'recibido':0,
    'pago por verificar':0,
    'pago verificado':1,
    'pago confirmado':1,
    'producto solicitado':2,
    'compra realizada':2,
    'en tránsito a tienda':3,
    'en transito a tienda':3,
    'en tránsito internacional':3,
    'en transito internacional':3,
    'llegó a venezuela':4,
    'llego a venezuela':4,
    'disponible para entrega':5,
    'en reparto':5,
    'entregado':6
  };
  const idx = aliases[current] ?? steps.findIndex(s=>s.toLowerCase()===current);
  return steps.map((s,i)=>`${i <= idx ? '✅' : '⬜'} ${s}`).join('\n');
}
function premiumEmailTemplate({customerName='cliente', code='TS-000', title='Actualización de tu pedido', product='Producto por confirmar', status='Pedido recibido', estimatedDate='Por confirmar', note=''}){
  return `THINKSTORE
Todo lo que deseas en un mismo lugar
Apple • Accesorios • Soporte Técnico
Altamira, Caracas

━━━━━━━━━━━━━━━━━━━━━━
${title}
━━━━━━━━━━━━━━━━━━━━━━

Hola ${customerName},

Tenemos novedades sobre tu compra.

📦 Pedido
${code}

📱 Producto
${product}

📍 Estado actual
${status}

📅 Fecha estimada
${estimatedDate}

━━━━━━━━━━━━━━━━━━━━━━
PROGRESO DEL PEDIDO
━━━━━━━━━━━━━━━━━━━━━━
${premiumProgressLines(status)}

${note ? note + '\n\n' : ''}Puedes consultar el estado actualizado desde tu cuenta ThinkStore o desde la sección Estatus usando tu código de orden.

Gracias por confiar en ThinkStore.

ThinkStore
📍 Altamira, Caracas
📦 Envíos nacionales
🛠️ Soporte especializado Apple
🌐 ThinkStore.com.ve

━━━━━━━━━━━━━━━━━━━━━━
Este correo fue generado automáticamente por ThinkStore.`;
}
function emailBodyForOrder(order){
  order = order || {};
  const customer = order.customer || {};
  const itemsArr = Array.isArray(order.items) ? order.items : [];
  const product = itemsArr.length
    ? itemsArr.map(i=>`${i.product || i.name || 'Producto'} · ${[i.color, i.config || i.capacity, i.condition].filter(Boolean).join(' · ')}`).join('\n')
    : 'Producto por confirmar';
  return premiumEmailTemplate({
    customerName: customer.name || 'cliente',
    code: order.code || 'TS-000',
    title: '📦 Actualización de tu pedido ThinkStore',
    product,
    status: order.status || 'Pedido recibido',
    estimatedDate: order.estimatedDate ? formatLongDate(order.estimatedDate) : 'Por confirmar',
    note: 'Tu pedido continúa avanzando. Recibirás una nueva actualización cuando cambie el estatus.'
  });
}

async function openEmail(to, subject, body, department='pedidos'){
  if(!to){
    alert('Este cliente no tiene correo registrado.');
    return;
  }

  const payload = {
    to,
    subject: subject || 'ThinkStore',
    text: body || '',
    logoUrl: new URL('assets/thinkstore-email-logo.jpeg', window.location.href).href,
    brand: 'ThinkStore',
    department: department || 'pedidos'
  };

  try{
    const res = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(()=>({}));
    if(res.ok && data.ok){
      alert('✅ Correo enviado correctamente al cliente.');
      return;
    }
    throw new Error(data.error || 'No se pudo enviar automáticamente');
  }catch(err){
    console.warn('ThinkStore email fallback:', err);
    const useMail = confirm('No se pudo enviar automáticamente porque falta configurar el servicio de correo en Netlify. ¿Quieres abrir el correo listo para enviar manualmente?');
    if(useMail){
      const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = url;
    }
  }
}

function findOrderByCode(code){
  const token = window.tsTrackingToken || '';
  const all = tsOrders ? tsOrders() : orders;

  return (all || []).find(o =>
    String(o.code || '').trim().toUpperCase() === String(code || '').trim().toUpperCase() &&
    String(o.tracking_token || '').trim() === String(token || '').trim()
  );
}

function sendOrderEmail(iOrCode){
  const order = typeof iOrCode === 'number' ? (orders[iOrCode] || (tsOrders ? tsOrders()[iOrCode] : null)) : findOrderByCode(iOrCode);
  if(!order){ alert('No se encontró este pedido.'); return; }
  openEmail(order.customer?.email, `ThinkStore | Estatus de orden ${order.code}`, emailBodyForOrder(order), String(order.status||'').toLowerCase().includes('preorden') ? 'preordenes' : 'pedidos');
}

function sendStoredOrderEmail(code){
  const order = findOrderByCode(code);
  if(!order){ alert('No se encontró este pedido.'); return; }
  openEmail(order.customer?.email, `ThinkStore | Estatus de orden ${order.code}`, emailBodyForOrder(order), String(order.status||'').toLowerCase().includes('preorden') ? 'preordenes' : 'pedidos');
}

function updateOrderStatusAndEmail(i,v){
  updateOrderStatus(i,v);
  if(confirm('Estatus actualizado. ¿Abrir correo para avisar al cliente?')){
    sendOrderEmail(i);
  }
}

function openMassEmail(){
  $('massEmailModal').classList.add('open');
  if($('massSubject') && !$('massSubject').value) $('massSubject').value='Novedades ThinkStore';
  if($('massMessage') && !$('massMessage').value) $('massMessage').value='Hola, tenemos novedades disponibles en ThinkStore. Puedes responder este correo para consultar disponibilidad, precios y preórdenes.';
}
function closeMassEmail(){ $('massEmailModal').classList.remove('open'); }
function sendMassEmail(){
  const emails=[...new Set(customers.map(c=>c.email).filter(Boolean))];
  if(!emails.length){ alert('No hay clientes con correo registrado.'); return; }
  const subject=($('massSubject').value||'Novedades ThinkStore').trim();
  const body=($('massMessage').value||'Hola, tenemos novedades disponibles en ThinkStore.').trim();
  const url=`mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href=url;
}

function openAdmin(){ $('adminModal').classList.add('open'); renderAdmin(); }
function closeAdmin(){ $('adminModal').classList.remove('open'); }
function loginAdmin(){
  const pass = String(($('adminPass').value||'')).trim();
  if(!pass){alert('Ingresa la clave de administrador');return;}
  sessionStorage.setItem('thinkstore_admin_secret', pass);
  $('adminLogin').style.display='none';
  $('adminContent').style.display='block';
  renderAdmin();
}
function renderAdmin(){
  if(!$('adminCustomers')||!$('adminOrders')) return;

  if($('kpiCustomers')) $('kpiCustomers').textContent = customers.length;
  if($('kpiOrders')) $('kpiOrders').textContent = orders.length;
  if($('kpiPreorders')) $('kpiPreorders').textContent = orders.filter(o=>String(o.status).toLowerCase().includes('preorden')).length;

  $('adminCustomers').innerHTML = customers.length ? customers.map((c,i)=>`
    <div class="admin-row">
      <b>${c.name}</b><br>
      C.I/RIF: ${c.id}<br>
      Tel: ${c.phone}<br>
      Correo: ${c.email||'No registrado'}<br>
      ${c.city}, ${c.state}<br>
      <small>${c.address||''}</small><br>
      <button class="btn ghost" onclick="openEmail('${String(c.email||'').replaceAll("'","\'")}','ThinkStore','Hola ${String(c.name||'cliente').replaceAll("'","\'")}, gracias por registrarte en ThinkStore.','ventas')">Enviar correo</button>
    </div>`).join('\n') : '<p class="muted">Aún no hay clientes registrados.</p>';

  $('adminOrders').innerHTML = orders.length ? orders.map((o,i)=>`
    <div class="admin-row">
      <b>${o.code}</b> · ${o.date}<br>
      ${o.customer.name} · ${o.customer.phone}<br>
      Correo: ${o.customer.email||'No registrado'}<br>
      <b>Estatus:</b>
      <select onchange="updateOrderStatusAndEmail(${i},this.value)">
        <option ${o.status==='Recibido'?'selected':''}>Recibido</option>
        <option ${o.status==='Preorden recibida'?'selected':''}>Preorden recibida</option>
        <option ${o.status==='En preparación'?'selected':''}>En preparación</option>
        <option ${o.status==='Pago recibido'?'selected':''}>Pago recibido</option><option ${o.status==='Pago verificado'?'selected':''}>Pago verificado</option>
        <option ${o.status==='Enviado'?'selected':''}>Enviado</option>
        <option ${o.status==='Entregado'?'selected':''}>Entregado</option>
      </select><br>
      <small>${o.items.map(x=>x.product+' · '+x.color+' · '+x.config).join('<br>')}</small><br>
      <div class="admin-row-actions">
        <button class="btn ghost" onclick="showOrderNote(${i})">Ver nota</button>
        <button class="btn ghost" onclick="sendOrderEmail(${i})">Enviar estatus por correo</button>
      </div>
    </div>`).join('\n') : '<p class="muted">Aún no hay pedidos.</p>';
}
function updateOrderStatus(i,v){ orders[i].status=v; orders[i].note=createNote(orders[i]); saveAll(); renderAdmin(); }
function showOrderNote(i){ const order = orders[i]; if(order) showPremiumNote(order); }
function clearOrders(){ if(confirm('¿Limpiar pedidos demo?')){orders=[]; saveAll(); renderAdmin();} }
function exportCSV(name, rows){
  const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download=name; a.click();
}
function exportCustomers(){ exportCSV('thinkstore_clientes.csv', [['Nombre','Cédula/RIF','Teléfono','Correo','Estado','Ciudad','Dirección','Envío'], ...customers.map(c=>[c.name,c.id,c.phone,c.email,c.state,c.city,c.address,c.shipping])]); }
function exportOrders(){ exportCSV('thinkstore_pedidos.csv', [['Orden','Fecha','Estatus','Cliente','Teléfono','Productos','Pago'], ...orders.map(o=>[o.code,o.date,o.status,o.customer.name,o.customer.phone,o.items.map(i=>i.product+' '+i.color+' '+i.config).join(' | '),o.payment])]); }

function openStatus(){ $('statusModal').classList.add('open'); }
function closeStatus(){ $('statusModal').classList.remove('open'); }
function checkStatus(){
  const code=($('statusCode').value||'').trim().toUpperCase();
  const o=orders.find(x=>x.code.toUpperCase()===code);
  $('statusResult').innerHTML=o ? `<b>${o.code}</b><br>Estatus: <b>${o.status}</b><br>Cliente: ${o.customer.name}<br>Productos:<br>${o.items.map(i=>'• '+i.product+' · '+i.color+' · '+i.config).join('<br>')}` : '<p class="muted">No encontré esa orden en este dispositivo.</p>';
}

count(); drawCustomerSummary();

window.addEventListener('load', ()=>{
  try{
    const params = new URLSearchParams(location.search);
    const code = params.get('tracking');
    const token = params.get('token');

    if(code && !token){
  alert('Enlace de seguimiento no válido o incompleto.');
  return;
}

if(code && token && typeof trackOrder === 'function'){
      setTimeout(()=>{
        if($('trackCode')) $('trackCode').value = code;
        window.tsTrackingToken = token || '';
        trackOrder();
      }, 500);
    }
  }catch(e){}
});


/* ===== ThinkStore V9: login de cliente, cuenta y nota premium ===== */
function syncCurrentUser(){
  currentUser = JSON.parse(localStorage.getItem('ts_current_user')||'null');
  if(currentUser){ customer=currentUser; localStorage.setItem('ts_customer', JSON.stringify(customer)); }
}
function openClientLogin(){ $('clientLoginModal').classList.add('open'); showLoginTab(); }
function closeClientLogin(){ $('clientLoginModal').classList.remove('open'); }
function showLoginTab(){
  if($('loginTab')) $('loginTab').style.display='block';
  if($('registerTab')) $('registerTab').style.display='none';
  if($('loginTabBtn')) $('loginTabBtn').classList.add('sel');
  if($('registerTabBtn')) $('registerTabBtn').classList.remove('sel');
}
function showRegisterTab(){
  if($('loginTab')) $('loginTab').style.display='none';
  if($('registerTab')) $('registerTab').style.display='block';
  if($('loginTabBtn')) $('loginTabBtn').classList.remove('sel');
  if($('registerTabBtn')) $('registerTabBtn').classList.add('sel');
}
function customerFrom(prefix){
  return {
    name:$(prefix+'name')?.value.trim()||'',
    id:$(prefix+'id')?.value.trim()||'',
    phone:$(prefix+'phone')?.value.trim()||'',
    email:$(prefix+'email')?.value.trim()||'',
    state:$(prefix+'state')?.value.trim()||'',
    city:$(prefix+'city')?.value.trim()||'',
    address:$(prefix+'address')?.value.trim()||'',
    ref:$(prefix+'ref')?.value.trim()||'',
    shipping:$(prefix+'shipping')?.value||'Delivery ThinkStore',
    agency:$(prefix+'agency')?.value.trim()||'',
    user:$(prefix+'user')?.value.trim()||'',
    pass:$(prefix+'pass')?.value.trim()||''
  };
}
function saveCustomer(e){
  e.preventDefault();
  const prefix = e.target && e.target.id==='quickRegisterForm' ? 'qr' : 'r';
  customer = customerFrom(prefix);
  if(!customer.email || !customer.pass){ alert('Debes colocar correo y contraseña.'); return; }
  const exists = customers.findIndex(c=>c.id===customer.id || c.email===customer.email || (customer.user && c.user===customer.user));
  if(exists>=0) customers[exists]=customer; else customers.push(customer);
  currentUser=customer;
  localStorage.setItem('ts_current_user', JSON.stringify(currentUser));
  localStorage.setItem('ts_customer', JSON.stringify(customer));
  saveAll();
  closeRegister();
  closeClientLogin();
  drawCustomerSummary();
  renderAccount();
  alert('Cuenta creada. Ya puedes comprar y ver tus pedidos.');
}
function loginClient(){
  const u=($('loginUser')?.value||'').trim().toLowerCase();
  const p=($('loginPass')?.value||'').trim();
  const found=customers.find(c=>[c.email,c.phone,c.user].filter(Boolean).map(x=>String(x).toLowerCase()).includes(u) && String(c.pass||'')===p);
  if(!found){ alert('No encontré esa cuenta o la clave no coincide.'); return; }
  currentUser=found; customer=found;
  localStorage.setItem('ts_current_user', JSON.stringify(found));
  localStorage.setItem('ts_customer', JSON.stringify(found));
  closeClientLogin();
  drawCustomerSummary();
  openAccount();
}
function logoutClient(){
  currentUser=null; customer=null;
  localStorage.removeItem('ts_current_user');
  localStorage.removeItem('ts_customer');
  drawCustomerSummary();
  renderAccount();
}
function openAccount(){ $('accountModal').classList.add('open'); renderAccount(); }
function closeAccount(){ const m=$('accountModal'); if(m){m.classList.remove('open');} document.body.style.overflow='auto'; }
function myOrders(){
  if(!currentUser) return [];
  return orders.filter(o=>o.customer && (o.customer.id===currentUser.id || o.customer.email===currentUser.email || o.customer.phone===currentUser.phone)).slice(-20);
}
function renderAccount(){
  syncCurrentUser();
  const out=$('accountLoggedOut'), inn=$('accountLoggedIn');
  if(!out || !inn) return;
  if(!currentUser){ out.style.display='block'; inn.style.display='none'; if($('accountWelcome')) $('accountWelcome').textContent='Inicia sesión para ver tus pedidos.'; return; }
  out.style.display='none'; inn.style.display='block';
  if($('accountWelcome')) $('accountWelcome').textContent='Hola, '+currentUser.name+'. Aquí puedes ver tus pedidos y notas de entrega.';
  if($('accountCustomer')) $('accountCustomer').innerHTML=`<b>${currentUser.name}</b><br>${currentUser.email}<br>${currentUser.phone}<br>${currentUser.city}, ${currentUser.state}`;
  const mine=myOrders();
  $('myOrders').innerHTML = mine.length ? mine.slice(-10).reverse().map(o=>{
    const idx=orders.findIndex(x=>x.code===o.code);
    return `<div class="admin-row"><b>${o.code}</b> · ${o.date}<br><b>Estatus:</b> ${o.status}<br><small>${o.items.map(i=>i.product+' · '+i.color+' · '+i.config).join('<br>')}</small><div class="admin-row-actions"><button class="btn ghost" onclick="showOrderNote(${idx})">Ver nota de entrega completa</button><button class="btn ghost danger" onclick="deleteMyOrder('${o.code}')">Quitar de mi cuenta</button></div></div>`;
  }).join('\n') : '<p class="muted">Aún no tienes pedidos registrados.</p>';
}
function deleteMyOrder(code){
  syncCurrentUser();
  if(!currentUser) return;
  const order = orders.find(o=>o.code===code);
  if(!order) return;
  const isMine = order.customer && (order.customer.id===currentUser.id || order.customer.email===currentUser.email || order.customer.phone===currentUser.phone);
  if(!isMine){ alert('Este pedido no pertenece a tu cuenta.'); return; }
  if(!confirm('¿Quitar este pedido de tu cuenta?')) return;
  orders = orders.filter(o=>o.code!==code);
  localStorage.setItem('ts_orders', JSON.stringify(orders));
  try{ localStorage.setItem('thinkstore_orders', JSON.stringify(orders)); }catch(e){}
  renderAccount();
  if(typeof renderAdmin === 'function') renderAdmin();
  if(typeof renderAdminSuite === 'function') renderAdminSuite();
}

function buildOrder(status='Recibido', persist=true){
  syncCurrentUser();
  if(!cart.length){alert('Agrega productos al carrito primero.');return null;}
  if(!currentUser){alert('Debes iniciar sesión o registrarte antes de finalizar la compra.'); openClientLogin(); return null;}
  customer=currentUser;
  const code = orderCode();
  const pay=$('payMethod') ? $('payMethod').value : 'Por confirmar';
  const order={
    code,
    date:new Date().toLocaleString('es-VE'),
    status: cart.some(i=>String(i.condition).toLowerCase().includes('pre')) ? 'Preorden recibida' : status,
    customer:{...customer},
    payment:pay,
    paymentRef:$('paymentRef') ? $('paymentRef').value.trim() : '',
    paymentAmount:$('paymentAmount') ? $('paymentAmount').value.trim() : '',
    deliveryType:$('deliveryType') ? $('deliveryType').value : 'Envío nacional',
    guideNumber:$('guideNumber') ? $('guideNumber').value.trim() : '',
    updatedAt:new Date().toLocaleString('es-VE'),
    items:cart.map(i=>({...i})),
    note:''
  };
  order.note = createNote(order);
  if(persist){
    orders.push(order);
    saveAll();
    renderAccount();
  }
  return order;
}
function generateDeliveryNote(){
  // Genera la nota y registra el pedido en la cuenta del cliente.
  const order = buildOrder('Recibido', true);
  if(!order) return;
  lastNote=order.note;
  showPremiumNote(order);
  count();
  drawCart();
  renderAccount();
  if(typeof tsShowToast === 'function'){
    tsShowToast('✅ Se creó tu pedido, puedes verlo en tu cuenta ThinkStore');
  }
}
function checkoutWhatsApp(){
  const order = buildOrder('Recibido', true);
  if(!order) return;
  lastNote=order.note;
  const simpleEmail=`Hola ${order.customer.name},\n\nTu pedido ${order.code} fue recibido correctamente.\n\nEstatus actual: ${order.status}\n\nPuedes ver la nota de entrega completa iniciando sesión en tu cuenta ThinkStore.\n\nGracias por confiar en ThinkStore.`;
  if(order.customer.email) openEmail(order.customer.email, `ThinkStore | Pedido ${order.code}`, simpleEmail, String(order.status||'').toLowerCase().includes('preorden') ? 'preordenes' : 'pedidos');
  open('https://wa.me/584141032030?text='+encodeURIComponent(lastNote),'_blank');
  cart=[]; count(); drawCart(); renderAccount();
}
function checkStatus(){
  syncCurrentUser();
  if(!currentUser){ alert('Para ver el estatus debes iniciar sesión.'); closeStatus(); openClientLogin(); return; }
  const code=($('statusCode').value||'').trim().toUpperCase();
  const o=orders.find(x=>x.code.toUpperCase()===code && (x.customer.id===currentUser.id || x.customer.email===currentUser.email || x.customer.phone===currentUser.phone));
  $('statusResult').innerHTML=o ? `<b>${o.code}</b><br>Estatus: <b>${o.status}</b><br>Cliente: ${o.customer.name}<br><button class="btn ghost" onclick="showOrderNote(${orders.findIndex(x=>x.code===o.code)})">Ver nota de entrega completa</button>` : '<p class="muted">No encontré esa orden en tu cuenta.</p>';
}
async function handlePasswordRecovery(){
  const url = new URL(window.location.href);
  const hash = window.location.hash || '';
  const isRecovery =
    hash.includes('type=recovery') ||
    url.searchParams.get('type') === 'recovery' ||
    url.searchParams.has('code');

  if(!isRecovery || !window.tsSupabase) return false;

  try{
    const code = url.searchParams.get('code');
    if(code && window.tsSupabase.auth.exchangeCodeForSession){
      await window.tsSupabase.auth.exchangeCodeForSession(code);
    }
  }catch(e){
    console.warn('ThinkStore recovery session:', e);
  }

  setTimeout(()=>{
    tsOpenPremiumPasswordModal({
      mode:'update',
      title:'Restablece tu contraseña',
      text:'Ingresa tu nueva contraseña ThinkStore para volver a acceder a tu cuenta.',
      label:'Nueva contraseña',
      placeholder:'Mínimo 6 caracteres',
      submitText:'Actualizar'
    });
  }, 650);

  return true;
}

function tsPremiumAuthEls(){
  return {
    modal: $('tsPremiumAuthModal'), title: $('tsPremiumAuthTitle'), text: $('tsPremiumAuthText'),
    form: $('tsPremiumAuthForm'), input: $('tsPremiumAuthInput'), label: $('tsPremiumAuthLabel'),
    hint: $('tsPremiumAuthHint'), submit: $('tsPremiumAuthSubmit')
  };
}
function tsClosePremiumAuthModal(){
  const el = tsPremiumAuthEls();
  if(el.modal) el.modal.classList.remove('is-open');
}
function tsOpenPremiumPasswordModal(opts={}){
  const el = tsPremiumAuthEls();
  if(!el.modal || !el.form || !el.input) return;
  const mode = opts.mode || 'update';
  el.title.textContent = opts.title || 'Restablece tu contraseña';
  el.text.textContent = opts.text || 'Ingresa tu nueva contraseña ThinkStore.';
  el.label.textContent = opts.label || 'Nueva contraseña';
  el.input.value = '';
  el.input.type = mode === 'request' ? 'email' : 'password';
  el.input.placeholder = opts.placeholder || (mode === 'request' ? 'tu-correo@ejemplo.com' : 'Mínimo 6 caracteres');
  el.input.autocomplete = mode === 'request' ? 'email' : 'new-password';
  el.hint.textContent = mode === 'request' ? 'Te enviaremos un correo desde ThinkStore.' : 'Usa mínimo 6 caracteres.';
  el.submit.textContent = opts.submitText || (mode === 'request' ? 'Enviar enlace' : 'Actualizar');
  el.form.dataset.mode = mode;
  el.modal.classList.add('is-open');
  setTimeout(()=>el.input.focus(),80);
}
async function tsPremiumAuthSubmit(e){
  e.preventDefault();
  const el = tsPremiumAuthEls();
  const mode = el.form?.dataset.mode || 'update';
  const value = (el.input?.value || '').trim();
  if(!value) return;
  if(!window.tsSupabase){ alert('Supabase aún no está conectado.'); return; }
  el.submit.disabled = true;
  try{
    if(mode === 'request'){
      const redirectTo = (window.THINKSTORE_SUPABASE?.SITE_URL || location.origin).replace(/\/$/,'') + '/reset-password';
      const { error } = await window.tsSupabase.auth.resetPasswordForEmail(value, { redirectTo });
      if(error) throw error;
      tsClosePremiumAuthModal();
      if(typeof tsShowToast === 'function') tsShowToast('📩 Revisa tu correo para restablecer la contraseña.');
      else alert('Listo. Revisa tu correo para restablecer la contraseña.');
    }else{
      if(value.length < 6){ alert('La contraseña debe tener mínimo 6 caracteres.'); return; }
      const { error } = await window.tsSupabase.auth.updateUser({ password:value });
      if(error) throw error;
      tsClosePremiumAuthModal();
      if(typeof tsShowToast === 'function') tsShowToast('✅ Contraseña actualizada correctamente.');
      else alert('Contraseña actualizada correctamente. Ya puedes iniciar sesión.');
      window.history.replaceState({}, document.title, location.origin + '/');
    }
  }catch(error){
    alert('No se pudo completar la operación: ' + (error?.message || error));
  }finally{
    el.submit.disabled = false;
  }
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>{$('tsPremiumAuthForm')?.addEventListener('submit', tsPremiumAuthSubmit);});
else $('tsPremiumAuthForm')?.addEventListener('submit', tsPremiumAuthSubmit);
window.addEventListener('load', async ()=>{
  await handlePasswordRecovery();
  syncCurrentUser();
  renderAccount();
});


/* ===== ThinkStore V9.1 A4 exact note override ===== */

function tsMoney(v){
  const n = Number(v || 0);
  if(!n) return 'A confirmar';
  return '$' + n.toLocaleString('es-VE');
}

function tsTrackingUrl(code){
  const base = location.origin && location.origin !== 'null' ? location.origin : 'https://thinkstore.com.ve';
  return `${base}/?tracking=${encodeURIComponent(code)}#estatus`;
}

function tsOrderStep(status){
  const s = String(status || '').toLowerCase();
  if(s.includes('entregado')) return 5;
  if(s.includes('enviado')) return 4;
  if(s.includes('prepar')) return 3;
  if(s.includes('verificado') || s.includes('pago')) return 2;
  return 1;
}

function tsPaymentBadge(method){
  const m = String(method || '').toLowerCase();
  if(m.includes('pago')) return `<span class="ts-pay-mini ts-pago">▣</span> Pago Móvil`;
  if(m.includes('zelle')) return `<span class="ts-pay-mini ts-zelle">Zelle</span>`;
  if(m.includes('binance')) return `<span class="ts-pay-mini ts-binance">◆</span> Binance`;
  
  if(m.includes('tarjeta')) return `<span class="ts-pay-mini ts-card">VISA</span> Tarjeta`;
  if(m.includes('efectivo')) return `<span class="ts-pay-mini ts-cash">$</span> Efectivo`;
  return method || 'A confirmar';
}

function tsShipLogo(ship){
  const s = String(ship || '').toLowerCase();
  if(s.includes('mrw')) return `<span class="ts-ship-logo ts-mrw">MRW</span>`;
  if(s.includes('zoom')) return `<span class="ts-ship-logo ts-zoom">ZOOM</span>`;
  if(s.includes('tealca')) return `<span class="ts-ship-logo ts-tealca">TEALCA</span>`;
  if(s.includes('retiro')) return `<span class="ts-ship-logo ts-store">RETIRO EN TIENDA</span>`;
  return `<span class="ts-ship-logo ts-store">${ship || 'A confirmar'}</span>`;
}

function tsTimeline(order){
  const current = tsOrderStep(order.status);
  const labels = ['Pedido recibido','Pago verificado','En preparación','Enviado','Entregado'];
  const icons = ['✓','✓','▧','▤','□'];
  return `<div class="ts-timeline">
    ${labels.map((label,idx)=>{
      const active = idx + 1 <= current;
      return `<div class="ts-step ${active ? 'active' : ''}">
        <div class="ts-step-dot">${active ? icons[idx] : ''}</div>
        <b>${label}</b>
        <span>${active ? (order.updatedAt || order.date || '') : 'Pendiente'}</span>
      </div>`;
    }).join('\n')}
  </div>`;
}

function buildPremiumNoteHTML(order){
  const customer = order.customer || {};
  const items = order.items || [];
  const subtotal = items.reduce((acc,i)=>acc + (Number(i.price || 0) * Number(i.qty || 1)), 0);
  const deliveryType = customer.deliveryType || (String(customer.shipping || '').toLowerCase().includes('retiro') ? 'Retiro en tienda' : 'Envío nacional');
  const shipping = deliveryType === 'Retiro en tienda' ? 'Retiro en tienda' : (customer.shipping || 'MRW');
  const first = items[0] || {};
  const productImg = first.img || first.image || '';
  return `
  <article class="ts-note-sheet">
    <header class="ts-note-header">
      <div class="ts-note-brand">
        <div class="ts-logo-box">
          <img src="assets/logo.png" alt="ThinkStore" onerror="this.style.display='none';this.parentElement.classList.add('fallback-logo')" />
        </div>
        <div>
          <h1>THINK<span>STORE</span></h1>
          <p>ThinkStore.com.ve</p>
        </div>
      </div>
      <div class="ts-note-separator"></div>
      <div class="ts-note-title">
        <h2>NOTA DE ENTREGA</h2>
        <p><span>Orden:</span> <b>${order.code || 'TS-000000'}</b></p>
        <p><span>Fecha:</span> ${order.date || new Date().toLocaleString('es-VE')}</p>
        <p><span>Estado:</span> <strong>${order.status || 'Recibido'}</strong></p>
      </div>
    </header>

    <section class="ts-section">
      <h3><span>♙</span> DATOS DEL CLIENTE</h3>
      <div class="ts-client-grid">
        <div><b>Nombre:</b><p>${customer.name || ''}</p></div>
        <div><b>Correo:</b><p>${customer.email || ''}</p></div>
        <div><b>Cédula / RIF:</b><p>${customer.id || ''}</p></div>
        <div><b>Dirección:</b><p>${customer.address || ''}</p></div>
        <div><b>Teléfono:</b><p>${customer.phone || ''}</p></div>
        <div><b>Ciudad / Estado:</b><p>${customer.city || ''}${customer.state ? ', ' + customer.state : ''}</p></div>
      </div>
    </section>

    <section class="ts-section">
      <h3><span>▢</span> PRODUCTOS</h3>
      <table class="ts-products-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Color</th>
            <th>Capacidad</th>
            <th>Cantidad</th>
            <th>Precio Unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(i=>`
          <tr>
            <td class="ts-product-cell">
              ${i.img || i.image ? `<img src="${i.img || i.image}" alt="${i.product || ''}">` : `<span class="ts-prod-placeholder"></span>`}
              <b>${i.product || ''}</b>
            </td>
            <td>${i.color || ''}</td>
            <td>${i.config || i.capacity || ''}</td>
            <td>${i.qty || 1}</td>
            <td>${tsMoney(i.price)}</td>
            <td>${tsMoney((Number(i.price || 0) * Number(i.qty || 1)))}</td>
          </tr>`).join('\n')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5">TOTAL</td>
            <td>${subtotal ? tsMoney(subtotal) : 'A confirmar'}</td>
          </tr>
        </tfoot>
      </table>
    </section>

    <section class="ts-info-grid">
      <div class="ts-info-card">
        <h3><span>▤</span> INFORMACIÓN DE PAGO</h3>
        <div class="ts-info-row"><b>Método de pago:</b><p>${tsPaymentBadge(order.payment)}</p></div>
        <div class="ts-info-row"><b>Referencia:</b><p>${order.paymentRef || 'Pendiente'}</p></div>
        <div class="ts-info-row"><b>Fecha de pago:</b><p>${order.paymentDate || order.date || 'Pendiente'}</p></div>
        <div class="ts-info-row"><b>Monto pagado:</b><p>${order.paymentAmount || (subtotal ? tsMoney(subtotal) : 'A confirmar')}</p></div>
        <div class="ts-pay-strip">
          <span class="ts-pago">PAGO<br>MÓVIL</span>
          <span class="ts-zelle-text">Zelle</span>
          <span class="ts-binance-text">◆ BINANCE</span>
          <span class="ts-visa">VISA</span>
          <span class="ts-master"><i></i><i></i></span>
          
        </div>
      </div>

      <div class="ts-info-card">
        <h3><span>▥</span> INFORMACIÓN DE ENVÍO</h3>
        <div class="ts-info-row"><b>Empresa de envío:</b><p>${tsShipLogo(shipping)}</p></div>
        <div class="ts-info-row"><b>Dirección de entrega:</b><p>${deliveryType === 'Retiro en tienda' ? 'Retiro coordinado directamente con ThinkStore.' : (customer.address || 'A confirmar')}</p></div>
        <div class="ts-info-row"><b>Número de guía:</b><p>${order.guideNumber || 'Pendiente'}</p></div>
        <div class="ts-info-row"><b>Fecha estimada:</b><p>${order.estimatedDelivery || 'Pendiente'}</p></div>
        <div class="ts-ship-strip">
          <span class="ts-ship-logo ts-mrw">MRW</span>
          <span class="ts-ship-logo ts-zoom">ZOOM</span>
          <span class="ts-ship-logo ts-tealca">TEALCA</span>
        </div>
      </div>
    </section>

    <section class="ts-section ts-status-section">
      <h3><span>▣</span> ESTADO DEL PEDIDO</h3>
      ${tsTimeline(order)}
    </section>

    <section class="ts-bottom-grid">
      <div class="ts-observations">
        <b>OBSERVACIONES</b>
        <p>Gracias por confiar en ThinkStore. Pronto recibirás un correo con la actualización de tu pedido.</p>
      </div>
      <div class="ts-qr-area">
        <div id="noteQR"></div>
        <p>Escanea para ver tu pedido</p>
        <a>${tsTrackingUrl(order.code || 'TS-000000').replace(/^https?:\/\//,'')}</a>
      </div>
    </section>

    <footer class="ts-note-footer">
      <div class="ts-footer-brand">
        <img src="assets/logo.png" alt="ThinkStore" onerror="this.style.display='none'">
        <b>THINK<span>STORE</span></b>
      </div>
      <p>✉ ventas@thinkstore.com.ve</p>
      <p>☏ 0412-123.45.67</p>
      <p>◎ WhatsApp · Instagram · Web</p>
    </footer>
    <p class="ts-final-note">Gracias por elegir ThinkStore. Tu tienda Apple en Venezuela.</p>
  </article>`;
}

function showPremiumNote(order){
  const modal = document.getElementById('premiumNoteModal') || document.getElementById('noteModal');
  const holder = document.getElementById('premiumNote') || document.getElementById('noteContent');
  if(!modal || !holder){
    alert('No se encontró el contenedor de nota de entrega.');
    return;
  }
  holder.innerHTML = buildPremiumNoteHTML(order);
  document.body.classList.add('ts-category-front-lock');
  modal.classList.add('open');
  modal.style.display = 'flex';
  modal.style.zIndex = '2147483000';
  setTimeout(()=>{
    const q = document.getElementById('noteQR');
    if(q && window.QRCode){
      q.innerHTML = '';
      new QRCode(q, { text: tsTrackingUrl(order.code || ''), width: 82, height: 82 });
    }
  },80);
}

function printPremiumNote(){
  window.print();
}



/* ===== ThinkStore V10 - Panel administrador completo demo ===== */
let adminProducts = JSON.parse(localStorage.getItem('ts_admin_products') || 'null') || (typeof PRODUCTS !== 'undefined' ? JSON.parse(JSON.stringify(PRODUCTS)) : []);
let adminInventory = JSON.parse(localStorage.getItem('ts_admin_inventory') || 'null') || buildInitialInventory();
let adminSettings = JSON.parse(localStorage.getItem('ts_admin_settings') || 'null') || {
  rate: 36,
  whatsapp: '584141032030',
  email: 'ventas@thinkstore.com.ve',
  instagram: '@thinkstore',
  payments: 'Pago Móvil Bancamiga: 0412-0142898 / E-84554142\nZelle: (954) 445-9161\nEfectivo: Pagar en tienda o delivery\nUSDT: Por configurar',
  shipping: {MRW:true, Zoom:true, Tealca:true, Pickup:true}
};

function buildInitialInventory(){
  const list = [];
  if(typeof PRODUCTS === 'undefined') return list;
  PRODUCTS.forEach(p=>{
    const colors = Object.keys(p.colors || {'Disponible':p.main});
    const storage = p.storage || p.variants || ['Consultar'];
    colors.forEach(color=>{
      storage.forEach(cap=>{
        list.push({
          sku: `${p.id}-${color}-${cap}`.replace(/\s+/g,'-').toLowerCase(),
          productId:p.id,
          product:p.name,
          category:p.category || 'Catálogo',
          color,
          capacity:cap,
          stock: 2,
          status:'Disponible',
          price:Number(p.price || 0)
        });
      });
    });
  });
  return list;
}
function saveAdminState(){
  localStorage.setItem('ts_admin_products', JSON.stringify(adminProducts));
  localStorage.setItem('ts_admin_inventory', JSON.stringify(adminInventory));
  localStorage.setItem('ts_admin_settings', JSON.stringify(adminSettings));
}
const TS_ADMIN_SECRET_CODE = null; // Sin clave fija en el frontend
let tsAdminTapCount = 0;
let tsAdminTapTimer = null;
let tsAdminKeyBuffer = '';

function openAdminSuite(){
  const pass = prompt('Código especial de administrador');
  const secret = String(pass || '').trim();
  if(!secret){ alert('Ingresa la clave de administrador.'); return; }
  sessionStorage.setItem('thinkstore_admin_secret', secret);
  document.getElementById('adminSuiteModal').classList.add('open');
  loadAdminSettings();
  renderAdminSuite();
}

function hiddenAdminTap(event){
  // Acceso oculto: tocar/clickear el logo ThinkStore 5 veces.
  tsAdminTapCount++;
  clearTimeout(tsAdminTapTimer);
  tsAdminTapTimer = setTimeout(()=>{ tsAdminTapCount = 0; }, 2500);
  if(tsAdminTapCount >= 5){
    event.preventDefault();
    tsAdminTapCount = 0;
    openAdminSuite();
  }
}

document.addEventListener('keydown', (event)=>{
  const key = event.key || '';
  if(key.length !== 1) return;
  tsAdminKeyBuffer = (tsAdminKeyBuffer + key).toUpperCase().slice(-7);
  if(tsAdminKeyBuffer === 'PANELTS'){
    tsAdminKeyBuffer = '';
    openAdminSuite();
  }
});
function closeAdminSuite(){ document.getElementById('adminSuiteModal').classList.remove('open'); }
function adminTab(tab){
  document.querySelectorAll('.admin-tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.admin-view').forEach(v=>v.classList.remove('active'));
  const btn = [...document.querySelectorAll('.admin-tab')].find(b=>b.getAttribute('onclick')?.includes(`'${tab}'`));
  if(btn) btn.classList.add('active');
  const view = document.getElementById('admin-'+tab);
  if(view) view.classList.add('active');
  renderAdminSuite();
}
function tsOrders(){
  try{ return JSON.parse(localStorage.getItem('ts_orders') || localStorage.getItem('thinkstore_orders') || '[]'); }catch(e){ return []; }
}
function tsCustomers(){
  const out=[];
  const add=(c)=>{
    if(!c || typeof c!=='object') return;
    const normalized={
      name:c.name||c.nombre||c.customerName||'',
      id:c.id||c.cedula_rif||c.rif||'',
      phone:c.phone||c.telefono||'',
      email:c.email||c.correo||'',
      state:c.state||c.estado||'',
      city:c.city||c.ciudad||'',
      address:c.address||c.direccion||'',
      ref:c.ref||c.referencia||'',
      shipping:c.shipping||c.metodo_envio_preferido||'',
      agency:c.agency||c.agencia_destino||'',
      user:c.user||''
    };
    const key=String(normalized.email||normalized.phone||normalized.id||normalized.name).toLowerCase().trim();
    if(!key) return;
    const i=out.findIndex(x=>String(x.email||x.phone||x.id||x.name).toLowerCase().trim()===key || (normalized.email && x.email===normalized.email) || (normalized.phone && x.phone===normalized.phone) || (normalized.id && x.id===normalized.id));
    if(i>=0) out[i]={...out[i],...normalized}; else out.push(normalized);
  };
  const read=(key)=>{ try{ return JSON.parse(localStorage.getItem(key)||'null'); }catch(e){ return null; } };
  ['ts_customers','thinkstore_customers'].forEach(key=>{ const arr=read(key); if(Array.isArray(arr)) arr.forEach(add); });
  ['ts_customer','ts_current_user'].forEach(key=>add(read(key)));
  tsOrders().forEach(o=>add(o.customer));
  try{ localStorage.setItem('ts_customers', JSON.stringify(out)); }catch(e){}
  return out;
}
function setText(id,value){ const el=document.getElementById(id); if(el) el.textContent=value; }
function tsUsd(n){ return '$' + Number(n||0).toLocaleString('es-VE'); }
function renderAdminSuite(){
  renderDashboard(); renderAdminProducts(); renderInventory(); renderAdminOrders(); renderAdminPayments(); renderAdminCustomers(); renderAdminPreorders(); renderAdminShipping();
}
function renderDashboard(){
  const orders = tsOrders(), customers = tsCustomers();
  const sales = orders.reduce((sum,o)=>sum + (o.items||[]).reduce((a,i)=>a + Number(i.price||0)*Number(i.qty||1),0),0);
  const preorders = orders.filter(o=>String(o.status||'').toLowerCase().includes('preorden') || (o.items||[]).some(i=>String(i.condition||'').toLowerCase().includes('pre'))).length;
  setText('dashSalesUsd', tsUsd(sales)); setText('dashOrders', orders.length); setText('dashCustomers', customers.length); setText('dashPreorders', preorders);
  const recentEl=document.getElementById('dashRecentOrders');
  if(recentEl) recentEl.innerHTML = orders.slice(-5).reverse().map(o=>`<div class="mini-row"><b>${o.code||'TS'}</b><span>${o.customer?.name||'Cliente'} · ${o.status||'Recibido'}</span></div>`).join('\n') || '<p class="muted">Sin pedidos todavía.</p>';
  const alertsEl=document.getElementById('dashStockAlerts');
  const low=adminInventory.filter(i=>Number(i.stock)<=1).slice(0,8);
  if(alertsEl) alertsEl.innerHTML = low.map(i=>`<div class="mini-row"><b>${i.product}</b><span>${i.color} · ${i.capacity} · Stock ${i.stock}</span></div>`).join('\n') || '<p class="muted">No hay alertas de stock.</p>';
}
function renderAdminProducts(){
  const box=document.getElementById('adminProductsList'); if(!box) return;
  const q=(document.getElementById('adminProductSearch')?.value||'').toLowerCase();
  const cat=document.getElementById('adminProductCategory')?.value||'';
  const list=adminProducts.filter(p=>(!cat || p.category===cat) && JSON.stringify(p).toLowerCase().includes(q));
  box.innerHTML=`<table class="admin-table"><thead><tr><th>Producto</th><th>Categoría</th><th>Precio USD</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${list.map(p=>{
    const i=adminProducts.indexOf(p);
    return `<tr><td><b>${p.name}</b><small>${(p.storage||[]).length} configuraciones · ${Object.keys(p.colors||{}).length} colores</small></td><td>${p.category||''}</td><td><input type="number" value="${p.price||0}" onchange="adminProducts[${i}].price=this.value;saveAdminState();renderAdminSuite()"></td><td><select onchange="adminProducts[${i}].active=this.value==='Activo';saveAdminState()"><option ${p.active!==false?'selected':''}>Activo</option><option ${p.active===false?'selected':''}>Inactivo</option></select></td><td><button onclick="editAdminProduct(${i})">Editar</button><button onclick="duplicateAdminProduct(${i})">Duplicar</button></td></tr>`;
  }).join('\n')}</tbody></table>`;
}
let editingProductIndex=null;
function openAdminProductForm(){
  editingProductIndex=null;
  ['apName','apBadge','apPrice','apMain','apColors','apStorage','apStock','apDesc','apFeatures'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
  const upload=document.getElementById('apUpload'); if(upload) upload.value='';
  updateAdminImagePreview('');
  document.getElementById('adminProductFormTitle').textContent='Nuevo producto';
  document.getElementById('adminProductModal').classList.add('open');
}
function closeAdminProductForm(){ document.getElementById('adminProductModal').classList.remove('open'); }

function adminResolveImage(value){
  const v=String(value||'').trim();
  if(!v) return '';
  if(v.startsWith('http') || v.startsWith('data:') || v.startsWith('assets/')) return v;
  return 'assets/'+v;
}
function updateAdminImagePreview(value){
  const box=document.getElementById('apImagePreview');
  if(!box) return;
  const src=adminResolveImage(value || document.getElementById('apMain')?.value || '');
  box.innerHTML = src ? `<img src="${src}" alt="Vista previa" onerror="this.parentElement.innerHTML='<span>No se pudo cargar la imagen</span>'">` : '<span>Sin imagen</span>';
}
function handleAdminImageUpload(event){
  const file=event?.target?.files?.[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){ alert('Selecciona una imagen JPG, PNG o WEBP.'); return; }
  const maxMb=4;
  if(file.size > maxMb*1024*1024){ alert('La imagen pesa demasiado. Usa una imagen menor a '+maxMb+'MB.'); return; }
  const reader=new FileReader();
  reader.onload=()=>{
    const value=reader.result;
    const input=document.getElementById('apMain');
    if(input){ input.value=value; input.dispatchEvent(new Event('input')); }
    updateAdminImagePreview(value);
  };
  reader.readAsDataURL(file);
}

function editAdminProduct(i){
  editingProductIndex=i; const p=adminProducts[i];
  document.getElementById('adminProductFormTitle').textContent='Editar producto';
  document.getElementById('apName').value=p.name||''; document.getElementById('apCategory').value=p.category||'iPhone'; document.getElementById('apBadge').value=p.badge||''; document.getElementById('apPrice').value=p.price||0; document.getElementById('apMain').value=p.main||''; updateAdminImagePreview(p.main||'');
  document.getElementById('apColors').value=Object.entries(p.colors||{}).map(([k,v])=>`${k}=${v}`).join(', ');
  document.getElementById('apStorage').value=(p.storage||[]).join(', ');
  document.getElementById('apDesc').value=p.desc||''; document.getElementById('apFeatures').value=(p.features||[]).join('\n');
  document.getElementById('adminProductModal').classList.add('open');
}
function saveAdminProduct(){
  const colors={};
  (document.getElementById('apColors').value||'').split(',').map(x=>x.trim()).filter(Boolean).forEach(x=>{ const [k,v]=x.split('='); if(k) colors[k.trim()] = (v||document.getElementById('apMain').value).trim(); });
  const p={ id:(document.getElementById('apName').value||'producto').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+Date.now(), name:document.getElementById('apName').value, category:document.getElementById('apCategory').value, badge:document.getElementById('apBadge').value, price:Number(document.getElementById('apPrice').value||0), main:document.getElementById('apMain').value, colors:Object.keys(colors).length?colors:{Disponible:document.getElementById('apMain').value}, storage:(document.getElementById('apStorage').value||'').split(',').map(x=>x.trim()).filter(Boolean), condition:['New','Pre-Owned','Pre-Order'], desc:document.getElementById('apDesc').value, features:(document.getElementById('apFeatures').value||'').split('\n').map(x=>x.trim()).filter(Boolean), active:true };
  if(editingProductIndex!==null){ p.id=adminProducts[editingProductIndex].id; adminProducts[editingProductIndex]=p; } else adminProducts.push(p);
  const stock=Number(document.getElementById('apStock').value||0);
  Object.keys(p.colors).forEach(color=>p.storage.forEach(cap=>adminInventory.push({sku:`${p.id}-${color}-${cap}`.replace(/\s+/g,'-').toLowerCase(),productId:p.id,product:p.name,category:p.category,color,capacity:cap,stock,status:stock>0?'Disponible':'Preorden',price:p.price})));
  saveAdminState(); closeAdminProductForm(); renderAdminSuite(); if(typeof renderFeaturedV2==='function') renderFeaturedV2();
}
function duplicateAdminProduct(i){ const p=JSON.parse(JSON.stringify(adminProducts[i])); p.id=p.id+'-copy-'+Date.now(); p.name=p.name+' copia'; adminProducts.push(p); saveAdminState(); renderAdminProducts(); }
function renderInventory(){
  const box=document.getElementById('inventoryList'); if(!box) return;
  const q=(document.getElementById('inventorySearch')?.value||'').toLowerCase(); const f=document.getElementById('stockFilter')?.value||'';
  let list=adminInventory.filter(i=>JSON.stringify(i).toLowerCase().includes(q));
  if(f==='low') list=list.filter(i=>Number(i.stock)>0 && Number(i.stock)<=1); if(f==='zero') list=list.filter(i=>Number(i.stock)<=0); if(f==='preorder') list=list.filter(i=>String(i.status).toLowerCase().includes('pre'));
  box.innerHTML=`<table class="admin-table"><thead><tr><th>SKU</th><th>Producto</th><th>Color</th><th>Capacidad</th><th>Stock</th><th>Estado</th></tr></thead><tbody>${list.map(i=>{const idx=adminInventory.indexOf(i);return `<tr><td>${i.sku}</td><td><b>${i.product}</b><small>${i.category}</small></td><td>${i.color}</td><td>${i.capacity}</td><td><input type="number" value="${i.stock}" onchange="adminInventory[${idx}].stock=Number(this.value);adminInventory[${idx}].status=Number(this.value)>0?'Disponible':'Preorden';saveAdminState();renderInventory();renderDashboard();"></td><td><select onchange="adminInventory[${idx}].status=this.value;saveAdminState();"><option ${i.status==='Disponible'?'selected':''}>Disponible</option><option ${i.status==='Preorden'?'selected':''}>Preorden</option><option ${i.status==='Agotado'?'selected':''}>Agotado</option></select></td></tr>`}).join('\n')}</tbody></table>`;
}
function renderAdminOrders(){
  const box=document.getElementById('adminOrdersList'); if(!box) return;
  const q=(document.getElementById('orderSearch')?.value||'').toLowerCase(); const f=document.getElementById('orderStatusFilter')?.value||'';
  const list=tsOrders().filter(o=>(!f||o.status===f) && JSON.stringify(o).toLowerCase().includes(q));
  if(!list.length){
    box.innerHTML='<div class="admin-order-empty"><b>Sin pedidos todavía.</b><small>Cuando un cliente genere una nota o confirme un pedido, aparecerá aquí.</small></div>';
    return;
  }
  const statuses=['Pedido recibido','Pago por verificar','Pago recibido','Pago verificado','Preparando pedido','Comprando proveedor','En tránsito','Disponible para entrega','Enviado','Entregado','Cancelado'];
  const statusIcon=(st)=>({
    'Pedido recibido':'🟡','Pago por verificar':'🟠','Pago verificado':'🟢','Preparando pedido':'🔵','Comprando proveedor':'🛒','En tránsito':'🚚','Disponible para entrega':'🏪','Enviado':'📦','Entregado':'✅','Cancelado':'⚫'
  }[st]||'🟡');
  box.innerHTML=`<div class="admin-order-head"><span>Orden</span><span>Cliente</span><span>Productos</span><span>Estatus</span><span>Acciones</span></div>` + list.map((o,idx)=>{
    const safe=JSON.stringify(o).replaceAll('"','&quot;');
    const items=(o.items||[]).slice(0,2).map(i=>`${i.product||i.name||'Producto'} · ${[i.color,i.config||i.capacity,i.condition].filter(Boolean).join(' · ')}`).join('<br>');
    const extra=(o.items||[]).length>2?`<small>+${(o.items||[]).length-2} producto(s) más</small>`:'';
    return `<div class="admin-order-card">
      <div><b class="order-code">${o.code||'TS-000'}</b><small>${o.date||''}</small><span class="admin-order-badge">${statusIcon(o.status)} ${o.status||'Pedido recibido'}</span></div>
      <div><b>${o.customer?.name||'Cliente'}</b><small>${o.customer?.email||''}</small><small>${o.customer?.phone||''}</small></div>
      <div class="admin-order-items"><b>${(o.items||[]).length||1} artículo(s)</b>${items||'Producto por confirmar'}${extra}</div>
      <div><select onchange="changeStoredOrderStatus('${o.code}',this.value)">${statuses.map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('\n')}</select></div>
      <div class="admin-row-actions"><button onclick="showPremiumNote ? showPremiumNote(${safe}) : alert('Nota demo')">Nota</button><button onclick="sendStoredOrderEmail ? sendStoredOrderEmail('${o.code}') : alert('Correo demo')">Correo</button></div>
    </div>`;
  }).join('\n');
}
async function changeStoredOrderStatus(code,status){
  for(const key of ['ts_orders','thinkstore_orders']){
    let arr=JSON.parse(localStorage.getItem(key)||'[]'); const idx=arr.findIndex(o=>o.code===code);
    if(idx>=0){ arr[idx].status=status; arr[idx].updatedAt=new Date().toLocaleString('es-VE'); localStorage.setItem(key,JSON.stringify(arr)); break; }
  }
  renderAdminSuite();

  try{
    const secret = localStorage.getItem('thinkstore_admin_secret') || prompt('Clave de administrador para actualizar Supabase:') || '';
    if(secret) localStorage.setItem('thinkstore_admin_secret', secret);
    const res = await fetch('/.netlify/functions/admin-update-order', {
      method:'POST',
      headers:{'Content-Type':'application/json','x-admin-secret':secret},
      body:JSON.stringify({ code, status, note:'Estado actualizado desde Dashboard ThinkStore' })
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok || !data.ok){
      console.warn('ThinkStore Admin Sync:', data.error || 'No se pudo sincronizar con Supabase');
      alert('Estado actualizado localmente. Aviso: no se pudo sincronizar con Supabase todavía. Revisa variables de Netlify.');
      return;
    }
    alert('Estado actualizado en Supabase y correo automático enviado si el cliente tiene email.');
  }catch(error){
    console.warn('ThinkStore Admin Sync:', error);
    alert('Estado actualizado localmente. Cuando Netlify Functions esté activo, se sincronizará con Supabase.');
  }
}
function renderAdminPayments(){
  const box=document.getElementById('adminPaymentsList'); if(!box) return;
  const orders=tsOrders();
  if(!orders.length){ box.innerHTML='<div class="admin-empty"><b>Sin pagos registrados.</b><small>Cuando existan pedidos con método de pago, aparecerán aquí.</small></div>'; return; }
  const chip=(status)=>`<span class="pay-status ${String(status||'').toLowerCase().includes('verificado')?'ok':'wait'}">${status||'Recibido'}</span>`;
  box.innerHTML=`<div class="pay-grid-head"><span>Orden / Cliente</span><span>Método</span><span>Referencia</span><span>Monto</span><span>Estado</span><span>Acciones</span></div>`+
    orders.map(o=>{
      const customer=o.customer||{};
      return `<div class="pay-card">
        <div class="pay-main"><b>${o.code||'TS-000'}</b><small>${customer.name||'Cliente'}</small><small>${customer.email||''}</small></div>
        <div><small>Método</small><b>${o.payment||o.paymentMethod||'Por confirmar'}</b></div>
        <div><small>Referencia</small><b>${o.paymentRef||o.reference||'Pendiente'}</b></div>
        <div><small>Monto</small><b>${o.paymentAmount||o.total||'Por confirmar'}</b></div>
        <div>${chip(o.status)}</div>
        <div class="pay-actions"><button onclick="changeStoredOrderStatus('${o.code}','Pago verificado')">Aprobar pago</button><button class="ghost" onclick="changeStoredOrderStatus('${o.code}','Pago por verificar')">Pendiente</button></div>
      </div>`;
    }).join('');
}
function renderAdminCustomers(){
  const box=document.getElementById('adminCustomersList'); if(!box) return;
  const q=(document.getElementById('customerSearch')?.value||'').toLowerCase();
  const list=tsCustomers().filter(c=>JSON.stringify(c).toLowerCase().includes(q));
  if(!list.length){
    box.innerHTML='<div class="admin-empty"><b>No hay clientes visibles todavía.</b><small>Cuando un cliente se registre o genere un pedido, aparecerá aquí automáticamente.</small></div>';
    return;
  }
  box.innerHTML=`<table class="admin-table"><thead><tr><th>Cliente</th><th>Contacto</th><th>Ubicación</th><th>Acciones</th></tr></thead><tbody>${list.map(c=>`<tr><td><b>${c.name||'Cliente'}</b><small>${c.id||''}</small></td><td>${c.email||''}<small>${c.phone||''}</small></td><td>${[c.city,c.state].filter(Boolean).join(', ')}<small>${c.address||''}</small></td><td><button onclick="openEmail ? openEmail('${c.email||''}','ThinkStore','Hola ${c.name||'cliente'}') : alert('Correo demo')">Correo</button></td></tr>`).join('\n')}</tbody></table>`;
}
function renderAdminPreorders(){
  const box=document.getElementById('adminPreordersList'); if(!box) return;
  const q=(document.getElementById('preorderSearch')?.value||'').toLowerCase();
  const pre=tsOrders().filter(o=>String(o.status||'').toLowerCase().includes('preorden') || (o.items||[]).some(i=>String(i.condition||'').toLowerCase().includes('pre'))).filter(o=>JSON.stringify(o).toLowerCase().includes(q));
  const preorderStatuses=['Preorden recibida','Pago por verificar','Pago verificado','Producto solicitado','En tránsito a tienda','Disponible para entrega','Entregado','Cancelado'];
  if(!pre.length){ box.innerHTML='<div class="admin-empty"><b>Sin preórdenes visibles.</b><small>Cuando un pedido tenga estado Preorden o un producto Pre-Order, aparecerá aquí.</small></div>'; return; }
  box.innerHTML=`<div class="preorder-head"><span>Orden</span><span>Cliente</span><span>Producto</span><span>Calendario</span><span>Estatus</span><span>Acciones</span></div>` + pre.map(o=>{
    const items=(o.items||[]).map(i=>`${i.product||i.name||'Producto'} · ${[i.color,i.config||i.capacity,i.condition].filter(Boolean).join(' · ')}`).join('<br>') || 'Producto por confirmar';
    const date=o.estimatedDate||o.preorderDate||'';
    return `<div class="preorder-card">
      <div><b class="order-code">${o.code||'TS-000'}</b><small>${o.date||''}</small></div>
      <div><b>${o.customer?.name||'Cliente'}</b><small>${o.customer?.email||''}</small><small>${o.customer?.phone||''}</small></div>
      <div class="preorder-items">${items}</div>
      <div><label>Fecha estimada</label><input type="date" value="${date}" onchange="updatePreorderField('${o.code}','estimatedDate',this.value)"></div>
      <div><label>Estatus</label><select onchange="updatePreorderField('${o.code}','status',this.value)">${preorderStatuses.map(s=>`<option ${String(o.status||'')===s?'selected':''}>${s}</option>`).join('\n')}</select></div>
      <div class="admin-row-actions preorder-actions"><button onclick="savePreorderStatus('${o.code}')">Guardar</button><button onclick="sendPreorderStatus('${o.code}')">Enviar estatus</button></div>
    </div>`;
  }).join('\n');
}
function updatePreorderField(code,field,value){
  for(const key of ['ts_orders','thinkstore_orders']){
    let arr=JSON.parse(localStorage.getItem(key)||'[]'); const idx=arr.findIndex(o=>o.code===code);
    if(idx>=0){ arr[idx][field]=value; arr[idx].updatedAt=new Date().toLocaleString('es-VE'); localStorage.setItem(key,JSON.stringify(arr)); }
  }
}
function savePreorderStatus(code){
  const order=tsOrders().find(o=>o.code===code);
  if(order){ changeStoredOrderStatus(code, order.status||'Preorden recibida'); }
  alert('Preorden actualizada correctamente.');
}
function preorderStatusMessage(order){
  const customer = order.customer || {};
  const items=(order.items||[]).map(i=>`${i.product||i.name||'Producto'} · ${[i.color,i.config||i.capacity,i.condition].filter(Boolean).join(' · ')}`).join('\n') || 'Producto por confirmar';
  return premiumEmailTemplate({
    customerName: customer.name || 'cliente',
    code: order.code || 'TS-000',
    title: '📦 Actualización de tu preorden ThinkStore',
    product: items,
    status: order.status || 'Preorden recibida',
    estimatedDate: formatLongDate(order.estimatedDate),
    note: 'Tu preorden continúa en seguimiento por nuestro equipo. Te avisaremos cuando tengamos una nueva actualización.'
  });
}
function cleanPhoneForWhatsApp(phone){
  let p=String(phone||'').replace(/\D/g,'');
  if(!p) return '';
  if(p.startsWith('0')) p='58'+p.slice(1);
  if(!p.startsWith('58') && p.length===10) p='58'+p;
  return p;
}
function sendPreorderStatus(code){
  const order=tsOrders().find(o=>o.code===code);
  if(!order){ alert('No se encontró esta preorden.'); return; }
  const msg=preorderStatusMessage(order);
  const email=order.customer?.email||'';
  if(email){
    openEmail(email, `Actualización de tu preorden ${order.code || ''} | ThinkStore`, msg);
    return;
  }
  const phone=cleanPhoneForWhatsApp(order.customer?.phone);
  if(phone){ window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank'); return; }
  alert('Este cliente no tiene correo ni teléfono para enviar el estatus.');
}
function renderAdminShipping(){
  const box=document.getElementById('adminShippingList'); if(!box) return;
  const orders=tsOrders().filter(o=>['Preparando pedido','Enviado','Disponible para entrega','Disponible para retiro','En tránsito','Pago verificado','Pago recibido'].includes(o.status));
  if(!orders.length){ box.innerHTML='<div class="admin-empty"><b>Sin envíos pendientes.</b><small>Los pedidos listos para preparar, enviar o retirar aparecerán aquí.</small></div>'; return; }
  box.innerHTML=`<div class="ship-grid-head"><span>Orden / Cliente</span><span>Destino</span><span>Empresa</span><span>Guía</span><span>Estado</span><span>Acciones</span></div>`+
    orders.map(o=>{
      const c=o.customer||{};
      const company=o.shippingCompany||c.shipping||o.shipping||'Por definir';
      const address=[c.address,c.city,c.state].filter(Boolean).join(', ') || 'Dirección por confirmar';
      return `<div class="ship-card">
        <div class="ship-main"><b>${o.code||'TS-000'}</b><small>${c.name||'Cliente'}</small><small>${c.email||''}</small></div>
        <div><small>Destino</small><b>${address}</b></div>
        <div><small>Empresa</small><b>${company}</b></div>
        <div><small>N° guía</small><input placeholder="Ej: MRW-000000" value="${o.guideNumber||o.guide||''}" onchange="updateGuide('${o.code}',this.value)"></div>
        <div><span class="ship-status">${o.status||'Pendiente'}</span></div>
        <div class="ship-actions"><button onclick="changeStoredOrderStatus('${o.code}','Enviado')">Marcar enviado</button><button class="ghost" onclick="changeStoredOrderStatus('${o.code}','Disponible para entrega')">Disponible</button></div>
      </div>`;
    }).join('');
}
function updateGuide(code,guide){
  for(const key of ['ts_orders','thinkstore_orders']){
    let arr=JSON.parse(localStorage.getItem(key)||'[]'); const idx=arr.findIndex(o=>o.code===code);
    if(idx>=0){ arr[idx].guideNumber=guide; localStorage.setItem(key,JSON.stringify(arr)); break; }
  }
}
function loadAdminSettings(){
  const set=(id,val)=>{const el=document.getElementById(id); if(el) el.value=val||'';}
  set('settingRate',adminSettings.rate||36); set('settingWhatsApp',adminSettings.whatsapp); set('settingEmail',adminSettings.email); set('settingInstagram',adminSettings.instagram); set('settingPayments',adminSettings.payments);
}
function saveAdminSettings(){
  adminSettings.rate=Number(document.getElementById('settingRate')?.value||36); adminSettings.whatsapp=document.getElementById('settingWhatsApp')?.value||''; adminSettings.email=document.getElementById('settingEmail')?.value||''; adminSettings.instagram=document.getElementById('settingInstagram')?.value||''; adminSettings.payments=document.getElementById('settingPayments')?.value||''; saveAdminState(); alert('Configuración guardada.');
}
function exportAdminInventory(){
  const rows=[['SKU','Producto','Categoría','Color','Capacidad','Stock','Estado','Precio USD'],...adminInventory.map(i=>[i.sku,i.product,i.category,i.color,i.capacity,i.stock,i.status,i.price])];
  downloadCsvV10('thinkstore_inventario.csv', rows);
}
function downloadCsvV10(filename, rows){
  const csv=rows.map(r=>r.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
}
function seedDemoAdminData(){
  if(!localStorage.getItem('ts_orders')) localStorage.setItem('ts_orders',JSON.stringify([{code:'TS-000125',date:new Date().toLocaleString('es-VE'),status:'Pago por verificar',payment:'Pago Móvil',paymentRef:'123456',paymentAmount:'$1299',customer:{name:'Cliente Demo',email:'cliente@correo.com',phone:'0412-0000000',id:'V-00000000',city:'Caracas',state:'Distrito Capital',address:'Dirección demo',shipping:'MRW'},items:[{product:'iPhone 17 Pro',model:'iPhone',color:'Azul',config:'512GB',condition:'New',qty:1,price:1299}]}]));
  if(!localStorage.getItem('ts_customers')) localStorage.setItem('ts_customers',JSON.stringify([{name:'Cliente Demo',email:'cliente@correo.com',phone:'0412-0000000',id:'V-00000000',city:'Caracas',state:'Distrito Capital',address:'Dirección demo'}]));
  renderAdminSuite();
}


/* ===== ThinkStore V11 - Supabase preparado + admin oculto ===== */
(function(){
  const cfg = window.THINKSTORE_SUPABASE || {};
  const hasRealKey = cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY && !String(cfg.SUPABASE_PUBLISHABLE_KEY).includes('PEGA_AQUI');
  window.tsSupabaseReady = Boolean(window.supabase && hasRealKey);
  window.tsSupabase = window.tsSupabaseReady ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY) : null;
})();

function tsSafeId(email){
  return String(email || '').trim().toLowerCase();
}
function tsConfigMissing(){
  return !window.tsSupabaseReady;
}

async function resetPassword(){
  if(tsConfigMissing()){
    alert('Supabase aún no está conectado. Coloca la Publishable Key en supabase-config.js para activar recuperación por correo.');
    return;
  }
  tsOpenPremiumPasswordModal({
    mode:'request',
    title:'Recuperar contraseña',
    text:'Coloca el correo registrado en ThinkStore y te enviaremos un enlace seguro para restablecerla.',
    label:'Correo electrónico',
    placeholder:'tu-correo@ejemplo.com',
    submitText:'Enviar enlace'
  });
}

const tsLocalSaveCustomer = typeof saveCustomer === 'function' ? saveCustomer : null;
async function saveCustomer(e){
  e.preventDefault();
  const prefix = e.target && e.target.id === 'quickRegisterForm' ? 'qr' : 'r';
  const c = customerFrom(prefix);
  if(!c.email || !c.pass){ alert('Debes colocar correo y contraseña.'); return; }

  if(tsConfigMissing()){
    if(tsLocalSaveCustomer) return tsLocalSaveCustomer(e);
    return;
  }

  try{
    const { data, error } = await window.tsSupabase.auth.signUp({
      email: c.email,
      password: c.pass,
      options: { data: { name: c.name, phone: c.phone } }
    });
    if(error) throw error;

    const userId = data?.user?.id;
    if(userId){
      await window.tsSupabase.from('clientes').upsert({
        id: userId,
        nombre: c.name,
        correo: c.email,
        telefono: c.phone,
        cedula_rif: c.id,
        direccion: c.address,
        ciudad: c.city,
        estado: c.state,
        referencia: c.ref,
        metodo_envio_preferido: c.shipping,
        agencia_destino: c.agency
      });
    }

    currentUser = c; customer = c;
    localStorage.setItem('ts_current_user', JSON.stringify(currentUser));
    localStorage.setItem('ts_customer', JSON.stringify(customer));
    try{
      const arr=JSON.parse(localStorage.getItem('ts_customers')||'[]');
      const idx=arr.findIndex(x=>(c.email&&x.email===c.email)||(c.phone&&x.phone===c.phone)||(c.id&&x.id===c.id));
      if(idx>=0) arr[idx]={...arr[idx],...c}; else arr.push(c);
      localStorage.setItem('ts_customers', JSON.stringify(arr));
    }catch(e){}
    closeRegister(); closeClientLogin(); drawCustomerSummary(); renderAccount();
    alert(data?.session ? 'Cuenta creada. Ya puedes comprar.' : 'Cuenta creada. Revisa tu correo para confirmar el registro antes de iniciar sesión.');
  }catch(err){
    alert('Error creando cuenta: ' + (err.message || err));
  }
}

const tsLocalLoginClient = typeof loginClient === 'function' ? loginClient : null;
async function loginClient(){
  const email = ($('loginUser')?.value || '').trim().toLowerCase();
  const password = ($('loginPass')?.value || '').trim();
  if(!email || !password){ alert('Coloca correo y contraseña.'); return; }

  if(tsConfigMissing()){
    if(tsLocalLoginClient) return tsLocalLoginClient();
    return;
  }

  try{
    const { data, error } = await window.tsSupabase.auth.signInWithPassword({ email, password });
    if(error) throw error;
    const uid = data.user.id;
    let c = null;
    const { data: profile } = await window.tsSupabase.from('clientes').select('*').eq('id', uid).single();
    if(profile){
      c = {
        id: profile.cedula_rif || uid,
        supabase_id: uid,
        name: profile.nombre || data.user.user_metadata?.name || email,
        email: profile.correo || email,
        phone: profile.telefono || '',
        address: profile.direccion || '',
        city: profile.ciudad || '',
        state: profile.estado || '',
        ref: profile.referencia || '',
        shipping: profile.metodo_envio_preferido || '',
        agency: profile.agencia_destino || ''
      };
    }else{
      c = { id: uid, supabase_id: uid, name: data.user.user_metadata?.name || email, email, phone:'' };
    }
    currentUser = c; customer = c;
    localStorage.setItem('ts_current_user', JSON.stringify(c));
    localStorage.setItem('ts_customer', JSON.stringify(c));
    closeClientLogin(); drawCustomerSummary(); openAccount();
  }catch(err){
    alert('No pude iniciar sesión: ' + (err.message || err));
  }
}

const tsLocalLogoutClient = typeof logoutClient === 'function' ? logoutClient : null;
async function logoutClient(){
  try {
    if (window.tsSupabaseReady && window.tsSupabase?.auth) {
      await Promise.race([
        window.tsSupabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
    }
  } catch (err) {
    console.warn('No se pudo cerrar sesión en Supabase:', err);
  }

  try {
    localStorage.removeItem('ts_current_user');
    localStorage.removeItem('thinkstore_current_user');
    sessionStorage.clear();
  } catch (err) {}

  window.location.href = '/';
}

async function saveOrderToSupabase(order){
  if(tsConfigMissing() || !order) return;

  try{
    const session = await window.tsSupabase.auth.getSession();
    const userId = session?.data?.session?.user?.id || currentUser?.supabase_id || null;

    const total = (order.items || []).reduce((a,i)=>a + Number(i.price || 0) * Number(i.qty || 1), 0);

    const { data: inserted, error } = await window.tsSupabase.from('pedidos').insert({
      codigo: order.code,
      cliente_id: userId,
      estado: order.status,
      metodo_pago: order.payment,
      referencia_pago: order.paymentRef,
      metodo_envio: order.deliveryType,
      empresa_envio: order.customer?.shipping,
      numero_guia: order.guideNumber,
      total_usd: total
    }).select('id').single();

    if(error) throw error;

    if(inserted?.id && order.items?.length){
      await window.tsSupabase.from('pedido_items').insert(order.items.map(i=>({
        pedido_id: inserted.id,
        producto: i.product,
        color: i.color,
        capacidad: i.config,
        cantidad: Number(i.qty || 1),
        precio_usd: Number(i.price || 0)
      })));
    }

    const file = document.getElementById('paymentFile')?.files?.[0];

    if(file && inserted?.id){
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const filePath = `private/${userId}/${inserted.id}-${Date.now()}.${ext}`;

      const status = document.getElementById('paymentFileStatus');
      if(status) status.textContent = 'Subiendo comprobante...';

      const { error: uploadError } = await window.tsSupabase
        .storage
        .from('comprobantes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if(uploadError) throw uploadError;

      await window.tsSupabase.from('comprobantes').insert({
        pedido_id: inserted.id,
        url_archivo: filePath,
        referencia: order.paymentRef || '',
        monto: Number(String(order.paymentAmount || '').replace(',', '.')) || null
      });

      if(status) status.textContent = 'Comprobante subido correctamente ✅';
    }

  }catch(err){
    console.warn('No se pudo guardar el pedido/comprobante en Supabase:', err.message || err);
    alert('No se pudo subir el comprobante: ' + (err.message || err));
  }
}

if(typeof buildOrder === 'function'){
  const tsLocalBuildOrder = buildOrder;
  buildOrder = function(status='Recibido'){
    const order = tsLocalBuildOrder(status);
    if(order) saveOrderToSupabase(order);
    return order;
  }
}

window.addEventListener('load', async ()=>{
  if(location.hash === '#admin' || new URLSearchParams(location.search).get('admin') === '1'){
    setTimeout(()=>openAdminSuite(), 500);
  }
  if(window.tsSupabaseReady){
    const { data } = await window.tsSupabase.auth.getSession();
    if(data?.session?.user && !currentUser){
      const u = data.session.user;
      currentUser = { id:u.id, supabase_id:u.id, name:u.user_metadata?.name || u.email, email:u.email, phone:'' };
      localStorage.setItem('ts_current_user', JSON.stringify(currentUser));
      renderAccount();
    }
  }
});


/* ===== ThinkStore V2 Premium UI ===== */
function normalizeCategoryV2(cat){
  const c = String(cat || '').toLowerCase();
  if(c.includes('iphone')) return 'iPhone';
  if(c.includes('mac')) return 'Mac';
  if(c.includes('ipad')) return 'iPad';
  if(c.includes('airpod') || c.includes('audio')) return 'AirPods';
  if(c.includes('watch')) return 'Watch';
  if(c.includes('acces')) return 'Accesorios';
  return cat || '';
}
function productCategoryV2(p){
  const raw = String(p.category || p.cat || p.type || p.name || '').toLowerCase();
  if(raw.includes('iphone')) return 'iPhone';
  if(raw.includes('mac')) return 'Mac';
  if(raw.includes('ipad')) return 'iPad';
  if(raw.includes('airpod') || raw.includes('audio')) return 'AirPods';
  if(raw.includes('watch')) return 'Watch';
  if(raw.includes('pencil') || raw.includes('mouse') || raw.includes('keyboard') || raw.includes('airtag') || raw.includes('cable') || raw.includes('acces')) return 'Accesorios';
  return p.category || 'Catálogo';
}
function productsV2(){
  // V33: primero usa productos editados desde el administrador.
  try{
    if(typeof adminProducts !== 'undefined' && Array.isArray(adminProducts) && adminProducts.length){
      return adminProducts.filter(p=>p.active!==false);
    }
  }catch(e){}
  if(typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) return PRODUCTS;
  if(typeof products !== 'undefined' && Array.isArray(products)) return products;
  return [];
}
function productImageV2(p){
  const raw = p.main || p.image || p.img || (p.colors ? Object.values(p.colors)[0] : '') || 'iphone_assets_sheet.jpg';
  const value = String(raw || '').trim();
  if(!value) return 'assets/iphone_assets_sheet.jpg';
  if(value.startsWith('http') || value.startsWith('data:') || value.startsWith('assets/')) return value;
  return `assets/${value}`;
}
function productPriceV2(p){
  const price = Number(p.price || p.from || p.basePrice || 0);
  return price ? `Desde $${price.toLocaleString('es-VE')}` : 'Precio a consultar';
}
function openProductFromV2(id){
  if(typeof openProduct === 'function') return openProduct(id);
  if(typeof showProduct === 'function') return showProduct(id);
  if(typeof viewProduct === 'function') return viewProduct(id);
  alert('Producto seleccionado. Consulta disponibilidad por WhatsApp.');
}

function featuredImageForProductV2(p){
  const name = String(p.name || p.title || '').toLowerCase();
  const cat = String(productCategoryV2(p) || '').toLowerCase();
  if(name.includes('iphone 17 pro max')) return 'assets/featured_iphone_card_premium.png';
  if(name.includes('macbook pro')) return 'assets/featured_macbook_card_premium.png';
  if(name.includes('airpods pro')) return 'assets/featured_airpods_card_premium.png';
  if(name.includes('ipad a16') || cat.includes('ipad')) return 'assets/featured_ipad_card_premium.png';
  return productImageV2(p);
}

function cardV2(p){
  const img = featuredImageForProductV2(p);
  const name = p.name || p.title || 'Producto ThinkStore';
  const desc = p.desc || p.description || productCategoryV2(p);
  const id = p.id || name;
  const featuredClass = String(productCategoryV2(p) || '').toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const productClass = String(id || name).toLowerCase().replace(/[^a-z0-9]+/g,'-');
  return `
    <article class="ts-v2-product-card ts-featured-card ts-featured-${featuredClass} ts-product-${productClass}">
      <div class="ts-v2-product-img"><img loading="lazy" decoding="async" fetchpriority="low" src="${img}" alt="${name}" onerror="this.src='assets/iphone_assets_sheet.jpg';this.onerror=null;"></div>
      <div class="ts-v2-product-body">
        <span>${productCategoryV2(p)}</span>
        <h3>${name}</h3>
        <p>${desc}</p>
        <b>${productPriceV2(p)}</b>
        <div class="ts-v2-card-actions">
          <button class="btn" onclick="openProductFromV2('${String(id).replaceAll("'","\\'")}')">Ver producto</button>
          <button class="btn ghost" onclick="openWhatsApp()">Consultar</button>
        </div>
      </div>
    </article>`;
}
function renderFeaturedV2(){
  const box = document.getElementById('v2FeaturedProducts');
  if(!box) return;
  const list = productsV2();
  const preferred = ['iPhone 17 Pro Max','MacBook Pro','AirPods Pro','iPad A16'];
  let featured = [];
  preferred.forEach(k=>{
    const found = list.find(p=>String(p.name||'').toLowerCase().includes(k.toLowerCase()));
    if(found && !featured.includes(found)) featured.push(found);
  });
  if(featured.length < 4) featured = [...featured, ...list.filter(p=>!featured.includes(p)).slice(0, 4-featured.length)];
  box.innerHTML = featured.slice(0,4).map(cardV2).join('\n');
}
function openCategoryModalV2(cat){
  const category = normalizeCategoryV2(cat);
  const modal = document.getElementById('categoryModalV2');
  const title = document.getElementById('categoryModalV2Title');
  const desc = document.getElementById('categoryModalV2Desc');
  const kicker = document.getElementById('categoryModalV2Kicker');
  const box = document.getElementById('categoryModalV2Products');
  if(!modal || !box) return;

  const descriptions = {
    'iPhone':'Explora iPhone por modelo, color y capacidad.',
    'Mac':'MacBook Air y Pro para trabajo, diseño y potencia.',
    'iPad':'iPad para estudiar, crear y trabajar.',
    'AirPods':'Audio Apple con experiencia premium.',
    'Watch':'Apple Watch para salud, deporte y conexión.',
    'Accesorios':'Accesorios originales y compatibles para tu ecosistema Apple.'
  };
  if(title) title.textContent = category;
  if(kicker) kicker.textContent = 'Categoría ThinkStore';
  if(desc) desc.textContent = descriptions[category] || 'Productos disponibles';

  const list = productsV2().filter(p=>productCategoryV2(p) === category);
  box.innerHTML = '<div class="ts-loading-products">Cargando productos…</div>';
  requestAnimationFrame(()=>{
    box.innerHTML = list.length ? list.map(cardV2).join('\n') : `<div class="ts-v2-empty">No hay productos en esta categoría todavía.</div>`;
  });

  modal.classList.add('open');
  modal.style.display = 'flex';

  // También limpia buscador viejo si existe y evita que usuarios como FreddyS88 queden como filtro
  const search = document.getElementById('search') || document.getElementById('q') || document.querySelector('input[type="search"]');
  if(search) search.value = '';
}
function closeCategoryModalV2(){
  const modal = document.getElementById('categoryModalV2');
  if(modal){
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}
function scrollToCatalogV2(){
  const el = document.getElementById('catalogo') || document.getElementById('catalog') || document.querySelector('.catalog') || document.querySelector('#products');
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}
window.addEventListener('load', ()=>{ setTimeout(renderFeaturedV2, 300); });


/* ===== ThinkStore FIX: cierre robusto de nota de entrega ===== */
window.closeNote = function(){
  const modal =
    document.getElementById('noteModal') ||
    document.querySelector('#noteModal') ||
    document.querySelector('.note-modal') ||
    document.querySelector('.modal.open .note-card')?.closest('.modal');

  if(modal){
    modal.classList.remove('open');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  const note =
    document.getElementById('deliveryNote') ||
    document.querySelector('#deliveryNote');

  if(note){
    // No borramos la nota para que copiar/imprimir siga funcionando si se reabre.
    // Solo aseguramos que no bloquee la pantalla.
  }

  document.body.classList.remove('modal-open', 'no-scroll');
  document.documentElement.classList.remove('modal-open', 'no-scroll');
};

/* Cerrar nota al tocar fuera del papel */
document.addEventListener('click', function(e){
  const modal = document.getElementById('noteModal');
  if(modal && modal.classList.contains('open') && e.target === modal){
    window.closeNote();
  }
});

/* Cerrar nota con tecla Escape */
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){
    const modal = document.getElementById('noteModal');
    if(modal && modal.classList.contains('open')){
      window.closeNote();
    }
  }
});


/* ===== ThinkStore: miniatura de comprobante en checkout ===== */
function tsFormatFileSize(bytes){
  const n = Number(bytes || 0);
  if(!n) return '';
  if(n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB';
  return (n / (1024 * 1024)).toFixed(1).replace('.0','') + ' MB';
}
function renderPaymentFilePreview(file){
  const preview = document.getElementById('paymentPreview');
  const status = document.getElementById('paymentFileStatus');
  if(!preview) return;
  if(!file){
    preview.className = 'payment-preview-content';
    const uploadBox=document.getElementById('paymentUploadBox'); if(uploadBox) uploadBox.classList.remove('has-file');
    preview.innerHTML = `<span class="upload-cloud">☁️</span><b>Arrastra tu comprobante aquí</b><small id="paymentFileStatus" class="muted">o selecciona un archivo</small>`;
    return;
  }
  const safeName = String(file.name || 'Comprobante').replace(/[<>&"]/g, ch => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[ch]));
  const size = tsFormatFileSize(file.size);
  const info = `<div class="payment-file-info"><b>${safeName}</b><small>${file.type === 'application/pdf' ? 'Documento PDF' : 'Imagen cargada'}${size ? ' · ' + size : ''}</small><em>Comprobante listo ✅</em></div>`;
  preview.className = 'payment-preview-content has-file';
  const uploadBox=document.getElementById('paymentUploadBox'); if(uploadBox) uploadBox.classList.add('has-file');
  if(file.type && file.type.startsWith('image/')){
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<div class="payment-thumb-wrap"><img src="${url}" alt="Vista previa del comprobante"></div>${info}`;
    const img = preview.querySelector('img');
    if(img) img.onload = () => URL.revokeObjectURL(url);
  }else{
    preview.innerHTML = `<div class="payment-thumb-wrap"><span class="payment-pdf-icon">📄</span></div>${info}`;
  }
  if(status) status.textContent = safeName;
}
function setupPaymentFilePreview(){
  const input = document.getElementById('paymentFile');
  const box = document.getElementById('paymentUploadBox');
  if(!input || input.dataset.previewReady === '1') return;
  input.dataset.previewReady = '1';
  input.addEventListener('change', () => renderPaymentFilePreview(input.files && input.files[0]));
  if(box){
    ['dragenter','dragover'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.remove('dragover'); }));
    box.addEventListener('drop', e => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if(!file) return;
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      renderPaymentFilePreview(file);
    });
  }
}
window.addEventListener('load', setupPaymentFilePreview);

/* ===== ThinkStore V15 - FIX cierre robusto de nota de entrega premium ===== */
(function(){
  function unlockPageAfterModal(){
    document.body.classList.remove('modal-open','no-scroll','overflow-hidden');
    document.documentElement.classList.remove('modal-open','no-scroll','overflow-hidden');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }

  window.closePremiumNote = function(){
    const modal = document.getElementById('premiumNoteModal');
    if(modal){
      modal.classList.remove('open');
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden','true');
    }
    unlockPageAfterModal();
  };

  window.closeNote = function(){
    const modal = document.getElementById('noteModal');
    if(modal){
      modal.classList.remove('open');
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden','true');
    }
    const premium = document.getElementById('premiumNoteModal');
    if(premium && premium.classList.contains('open')){
      window.closePremiumNote();
    }
    unlockPageAfterModal();
  };

  document.addEventListener('click', function(e){
    const premium = document.getElementById('premiumNoteModal');
    const legacy = document.getElementById('noteModal');
    if(premium && premium.classList.contains('open') && e.target === premium){
      window.closePremiumNote();
    }
    if(legacy && legacy.classList.contains('open') && e.target === legacy){
      window.closeNote();
    }
  }, true);

  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape') return;
    const premium = document.getElementById('premiumNoteModal');
    const legacy = document.getElementById('noteModal');
    if(premium && premium.classList.contains('open')) window.closePremiumNote();
    if(legacy && legacy.classList.contains('open')) window.closeNote();
  }, true);
})();


function polishCartProductImages(){
  document.querySelectorAll('.js-remove-white-bg').forEach(img=>{
    if(img.dataset.polished==='1') return;
    const src=img.dataset.originalSrc || img.src;
    const picture=new Image();
    picture.crossOrigin='anonymous';
    picture.onload=()=>{
      try{
        const canvas=document.createElement('canvas');
        canvas.width=picture.naturalWidth || picture.width;
        canvas.height=picture.naturalHeight || picture.height;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(picture,0,0);
        const data=ctx.getImageData(0,0,canvas.width,canvas.height);
        const px=data.data;
        for(let i=0;i<px.length;i+=4){
          const r=px[i], g=px[i+1], b=px[i+2];
          const nearWhite = r>238 && g>238 && b>238 && Math.abs(r-g)<18 && Math.abs(r-b)<18 && Math.abs(g-b)<18;
          if(nearWhite){ px[i+3]=0; }
        }
        ctx.putImageData(data,0,0);
        img.src=canvas.toDataURL('image/png');
        img.dataset.polished='1';
        img.classList.add('is-polished');
      }catch(e){
        img.dataset.polished='1';
        img.classList.add('is-polished');
      }
    };
    picture.onerror=()=>{ img.dataset.polished='1'; };
    picture.src=src;
  });
}


/* V33 - Vista previa en vivo de imagen principal en admin */
window.addEventListener('load', ()=>{
  const main=document.getElementById('apMain');
  if(main && !main.dataset.previewReady){
    main.dataset.previewReady='1';
    main.addEventListener('input', ()=>updateAdminImagePreview(main.value));
  }
});

/* ===== ThinkStore V44 - Mis Pedidos conectado a Supabase ===== */
(function(){
  const TS_ORDER_STEPS = [
    ['Pedido recibido','Pedido recibido'],
    ['Pago verificado','Pago verificado'],
    ['En preparación','Preparando pedido'],
    ['Enviado','Pedido enviado'],
    ['Entregado','Entregado']
  ];

  function tsNormalizeStatus(st){
    const s = String(st || '').toLowerCase();
    if(s.includes('entreg')) return 'Entregado';
    if(s.includes('enviado') || s.includes('guía') || s.includes('guia')) return 'Enviado';
    if(s.includes('prepar')) return 'En preparación';
    if(s.includes('verificado') || s.includes('aprob')) return 'Pago verificado';
    return 'Pedido recibido';
  }

  function tsStepIndex(st){
    const n = tsNormalizeStatus(st);
    return Math.max(0, TS_ORDER_STEPS.findIndex(x => x[0] === n));
  }

  function tsMoney(v){
    const n = Number(v || 0);
    if(!n) return 'Por confirmar';
    return '$' + n.toLocaleString('es-VE', { maximumFractionDigits: 2 });
  }

  function tsDate(v){
    if(!v) return '';
    try { return new Date(v).toLocaleString('es-VE'); } catch(e){ return String(v); }
  }

  function tsMapSupabaseOrder(p){
    const items = (p.pedido_items || []).map(i => ({
      product: i.producto || 'Producto',
      color: i.color || '',
      config: i.capacidad || '',
      qty: i.cantidad || 1,
      price: i.precio_usd || 0
    }));
    return {
      id: p.id,
      code: p.codigo || 'TS',
      status: p.estado || 'Pedido recibido',
      date: tsDate(p.created_at),
      updatedAt: tsDate(p.updated_at),
      total: p.total_usd || 0,
      payment: p.metodo_pago || '',
      deliveryType: p.metodo_envio || '',
      shippingCompany: p.empresa_envio || '',
      guideNumber: p.numero_guia || '',
      items,
      customer: currentUser || {}
    };
  }

  async function tsFetchMySupabaseOrders(){
    if(!window.tsSupabaseReady || !window.tsSupabase) return null;
    const { data: sessionData } = await window.tsSupabase.auth.getSession();
    const uid = sessionData?.session?.user?.id || currentUser?.supabase_id;
    if(!uid) return null;
    const { data, error } = await window.tsSupabase
      .from('pedidos')
      .select('id,codigo,estado,metodo_pago,metodo_envio,empresa_envio,numero_guia,total_usd,created_at,updated_at,pedido_items(producto,color,capacidad,cantidad,precio_usd)')
      .eq('cliente_id', uid)
      .order('created_at', { ascending:false });
    if(error) throw error;
    return (data || []).map(tsMapSupabaseOrder);
  }

  function tsOrderProgressHTML(status){
    const active = tsStepIndex(status);
    return `<div class="ts-order-progress">${TS_ORDER_STEPS.map((step, i) => `
      <div class="ts-order-step ${i <= active ? 'done' : ''}">
        <span class="ts-order-dot">${i < active ? '✓' : (i === active ? '•' : '')}</span>
        <small>${step[1]}</small>
      </div>`).join('')}</div>`;
  }

  function tsRenderOrderCards(list, loading){
    const box = document.getElementById('myOrders');
    if(!box) return;
    if(loading){ box.innerHTML = '<div class="ts-myorders-loading">Cargando tus pedidos...</div>'; return; }
    if(!list || !list.length){
      box.innerHTML = '<div class="ts-myorders-empty"><b>Aún no tienes pedidos registrados.</b><small>Cuando realices una compra, aparecerá aquí con su seguimiento.</small></div>';
      return;
    }
    box.innerHTML = list.map(o => {
      const items = (o.items || []).map(i => `${i.product}${i.color ? ' · '+i.color : ''}${i.config ? ' · '+i.config : ''}`).join('<br>') || 'Producto por confirmar';
      const normalized = tsNormalizeStatus(o.status);
      return `<div class="ts-myorder-card">
        <div class="ts-myorder-top">
          <div><span class="ts-order-label">Pedido</span><b>${o.code}</b><small>${o.date || ''}</small></div>
          <span class="ts-status-pill">${normalized}</span>
        </div>
        ${tsOrderProgressHTML(o.status)}
        <div class="ts-myorder-info">
          <div><small>Productos</small><b>${items}</b></div>
          <div><small>Total</small><b>${tsMoney(o.total || (o.items||[]).reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||1),0))}</b></div>
          <div><small>Envío</small><b>${[o.deliveryType,o.shippingCompany].filter(Boolean).join(' · ') || 'Por confirmar'}</b></div>
          <div><small>Guía</small><b>${o.guideNumber || 'Pendiente'}</b></div>
        </div>
        <div class="ts-myorder-actions">
          <button class="btn ghost" onclick="showPremiumNote ? showPremiumNote(${JSON.stringify(o).replaceAll('"','&quot;')}) : alert('Nota no disponible')">Ver nota</button>
        </div>
      </div>`;
    }).join('');
  }

  const oldRenderAccountV44 = window.renderAccount || renderAccount;
  window.renderAccount = function(){
    oldRenderAccountV44();
    if(!currentUser) return;
    tsRenderOrderCards(null, true);
    tsFetchMySupabaseOrders()
      .then(list => {
        if(list && list.length) tsRenderOrderCards(list, false);
        else tsRenderOrderCards(typeof myOrders === 'function' ? myOrders() : [], false);
      })
      .catch(err => {
        console.warn('No se pudieron cargar pedidos desde Supabase:', err.message || err);
        tsRenderOrderCards(typeof myOrders === 'function' ? myOrders() : [], false);
      });
  };

  window.tsRenderOrderCards = tsRenderOrderCards;
  window.tsFetchMySupabaseOrders = tsFetchMySupabaseOrders;
})();



/* ===== ThinkStore V46 - Admin Dashboard Profesional Supabase ===== */
(function(){
  const oldTsOrders = typeof window.tsOrders === 'function' ? window.tsOrders : (typeof tsOrders === 'function' ? tsOrders : null);
  const oldTsCustomers = typeof window.tsCustomers === 'function' ? window.tsCustomers : (typeof tsCustomers === 'function' ? tsCustomers : null);

  window.tsAdminRemoteCustomers = [];
  window.tsAdminRemoteOrders = [];
  window.tsAdminLastRefresh = null;

  function tsClient(){
    if(window.tsSupabase) return window.tsSupabase;
    if(window.tsSupabaseClient) return window.tsSupabaseClient;
    if(window.supabase && window.THINKSTORE_SUPABASE){
      const cfg = window.THINKSTORE_SUPABASE;
      if(cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY){
        try{
          window.tsSupabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
          window.tsSupabaseReady = true;
          return window.tsSupabase;
        }catch(e){ console.warn('ThinkStore V46 Supabase init:', e); }
      }
    }
    return null;
  }

  function safeText(v){ return String(v ?? '').trim(); }
  function money(v){ return '$' + Number(v || 0).toLocaleString('es-VE'); }
  function dateVE(v){
    if(!v) return '';
    try{ return new Date(v).toLocaleString('es-VE'); }catch(e){ return String(v); }
  }

  function normalizeDbClient(c){
    return {
      source:'supabase',
      supabase_id:c.id || '',
      id:c.cedula_rif || c.id || '',
      name:c.nombre || c.name || 'Cliente',
      email:c.correo || c.email || '',
      phone:c.telefono || c.phone || '',
      state:c.estado || c.state || '',
      city:c.ciudad || c.city || '',
      address:c.direccion || c.address || '',
      ref:c.referencia || c.ref || '',
      shipping:c.metodo_envio_preferido || c.shipping || '',
      agency:c.agencia_destino || c.agency || '',
      created_at:c.created_at || c.createdAt || ''
    };
  }

  function normalizeDbOrder(p){
    const cli = p.clientes || p.cliente || p.customer || {};
    const items = (p.pedido_items || p.items || []).map(i=>({
      product:i.producto || i.product || i.name || 'Producto',
      color:i.color || '',
      config:i.capacidad || i.config || i.capacity || '',
      qty:Number(i.cantidad || i.qty || 1),
      price:Number(i.precio_usd || i.price || 0),
      condition:i.condicion || i.condition || ''
    }));
    return {
      source:'supabase',
      db_id:p.id,
      code:p.codigo || p.order_code || p.code || 'TS',
      date:dateVE(p.created_at || p.date),
      status:p.estado || p.status || 'Pedido recibido',
      payment:p.metodo_pago || p.payment || 'Por confirmar',
      paymentRef:p.referencia_pago || p.paymentRef || '',
      paymentAmount:p.monto_pago || p.paymentAmount || '',
      deliveryType:p.metodo_envio || p.deliveryType || '',
      guideNumber:p.numero_guia || p.guideNumber || '',
      updatedAt:dateVE(p.updated_at || p.created_at),
      total_usd:Number(p.total_usd || 0),
      customer: normalizeDbClient(cli),
      items:items.length ? items : [{product:'Producto por confirmar', qty:1, price:Number(p.total_usd || 0)}]
    };
  }

  async function fetchClientes(){
    const client = tsClient();
    if(!client) return [];
    const { data, error } = await client.from('clientes').select('*').order('created_at', { ascending:false });
    if(error) throw error;
    return (data || []).map(normalizeDbClient);
  }

  async function fetchPedidos(){
    const client = tsClient();
    if(!client) return [];
    let res = await client
      .from('pedidos')
      .select('*, clientes(*), pedido_items(*)')
      .order('created_at', { ascending:false });
    if(res.error){
      res = await client.from('pedidos').select('*').order('created_at', { ascending:false });
      if(res.error) throw res.error;
    }
    return (res.data || []).map(normalizeDbOrder);
  }

  window.tsRefreshAdminData = async function({silent=false}={}){
    try{
      const [clientes, pedidos] = await Promise.all([fetchClientes(), fetchPedidos()]);
      window.tsAdminRemoteCustomers = clientes;
      window.tsAdminRemoteOrders = pedidos;
      window.tsAdminLastRefresh = new Date();
      if(!silent && typeof tsShowToast === 'function') tsShowToast('✅ Admin actualizado desde Supabase');
      return { clientes, pedidos };
    }catch(err){
      console.warn('ThinkStore V46 admin refresh:', err.message || err);
      if(!silent && typeof tsShowToast === 'function') tsShowToast('⚠️ No se pudo actualizar Supabase');
      return { clientes: window.tsAdminRemoteCustomers || [], pedidos: window.tsAdminRemoteOrders || [] };
    }
  };

  window.tsCustomers = function(){
    const local = oldTsCustomers ? oldTsCustomers() : [];
    const out = [];
    const add = c=>{
      if(!c) return;
      const n = normalizeDbClient(c);
      const key = String(n.email || n.phone || n.id || n.supabase_id || n.name).toLowerCase();
      if(!key) return;
      const idx = out.findIndex(x=>String(x.email || x.phone || x.id || x.supabase_id || x.name).toLowerCase() === key || (n.email && x.email===n.email));
      if(idx>=0) out[idx] = {...out[idx], ...n}; else out.push(n);
    };
    (window.tsAdminRemoteCustomers || []).forEach(add);
    (local || []).forEach(add);
    return out;
  };

  window.tsOrders = function(){
    const local = oldTsOrders ? oldTsOrders() : [];
    const remote = window.tsAdminRemoteOrders || [];
    const out=[];
    [...remote, ...(local||[])].forEach(o=>{
      if(!o) return;
      const key = String(o.code || o.codigo || o.db_id || '').toLowerCase();
      if(key && out.some(x=>String(x.code||x.codigo||x.db_id||'').toLowerCase()===key)) return;
      out.push(o);
    });
    return out;
  };

  window.renderDashboard = function(){
    const orders = window.tsOrders(), customers = window.tsCustomers();
    const sales = orders.reduce((sum,o)=>sum + (Number(o.total_usd || 0) || (o.items||[]).reduce((a,i)=>a+Number(i.price||0)*Number(i.qty||1),0)),0);
    const preorders = orders.filter(o=>String(o.status||'').toLowerCase().includes('preorden') || (o.items||[]).some(i=>String(i.condition||'').toLowerCase().includes('pre'))).length;
    if(typeof setText === 'function'){
      setText('dashSalesUsd', money(sales));
      setText('dashOrders', orders.length);
      setText('dashCustomers', customers.length);
      setText('dashPreorders', preorders);
    }
    const recentEl=document.getElementById('dashRecentOrders');
    if(recentEl) recentEl.innerHTML = orders.slice(0,6).map(o=>`<div class="mini-row"><b>${safeText(o.code||o.codigo||'TS')}</b><span>${safeText(o.customer?.name||'Cliente')} · ${safeText(o.status||'Pedido recibido')}</span></div>`).join('') || '<p class="muted">Sin pedidos todavía.</p>';
    const alertsEl=document.getElementById('dashStockAlerts');
    if(alertsEl){
      const last = window.tsAdminLastRefresh ? dateVE(window.tsAdminLastRefresh) : 'Pendiente';
      alertsEl.innerHTML = `<div class="mini-row"><b>Supabase</b><span>Clientes: ${customers.length} · Pedidos: ${orders.length}</span></div><div class="mini-row"><b>Última actualización</b><span>${last}</span></div><button class="btn ghost" onclick="tsRefreshAdminData().then(()=>renderAdminSuite())">Actualizar datos</button>`;
    }
  };

  window.renderAdminCustomers = function(){
    const box=document.getElementById('adminCustomersList') || document.getElementById('adminCustomers');
    if(!box) return;
    const q=(document.getElementById('customerSearch')?.value||'').toLowerCase();
    const list=window.tsCustomers().filter(c=>JSON.stringify(c).toLowerCase().includes(q));
    if(!list.length){
      box.innerHTML='<div class="admin-empty"><b>No hay clientes visibles todavía.</b><small>Presiona “Actualizar datos” o verifica la tabla clientes en Supabase.</small></div>';
      return;
    }
    box.innerHTML=`<table class="admin-table"><thead><tr><th>Cliente</th><th>Contacto</th><th>Ubicación</th><th>Registro</th><th>Acciones</th></tr></thead><tbody>${list.map(c=>`<tr><td><b>${safeText(c.name)||'Cliente'}</b><small>${safeText(c.id)}</small></td><td>${safeText(c.email)}<small>${safeText(c.phone)}</small></td><td>${[c.city,c.state].filter(Boolean).join(', ')}<small>${safeText(c.address)}</small></td><td>${dateVE(c.created_at)}</td><td><button onclick="tsCopyText('${safeText(c.email)}')">Copiar correo</button><button onclick="tsCopyText('${safeText(c.phone)}')">Copiar teléfono</button><button onclick="openEmail ? openEmail('${safeText(c.email)}','ThinkStore','Hola ${safeText(c.name)||'cliente'}') : null">Correo</button></td></tr>`).join('')}</tbody></table>`;
  };

  window.renderAdminOrders = function(){
    const box=document.getElementById('adminOrdersList') || document.getElementById('adminOrders');
    if(!box) return;
    const q=(document.getElementById('orderSearch')?.value||'').toLowerCase();
    const f=document.getElementById('orderStatusFilter')?.value||'';
    const list=window.tsOrders().filter(o=>(!f||o.status===f) && JSON.stringify(o).toLowerCase().includes(q));
    if(!list.length){ box.innerHTML='<div class="admin-order-empty"><b>Sin pedidos todavía.</b><small>Cuando un cliente complete el checkout aparecerá aquí desde Supabase.</small></div>'; return; }
    const statuses=['Pedido recibido','Pago por verificar','Pago recibido','Pago verificado','En preparación','Enviado','Disponible para retiro','Entregado','Cancelado'];
    const icon=st=>({'Pedido recibido':'🟡','Pago por verificar':'🟠','Pago verificado':'🟢','En preparación':'🔵','Enviado':'🚚','Disponible para retiro':'🏪','Entregado':'✅','Cancelado':'⚫'}[st]||'🟡');
    box.innerHTML=`<div class="admin-order-head"><span>Orden</span><span>Cliente</span><span>Productos</span><span>Estatus</span><span>Acciones</span></div>` + list.map(o=>{
      const safe=JSON.stringify(o).replaceAll('"','&quot;');
      const items=(o.items||[]).slice(0,2).map(i=>`${safeText(i.product||i.name||'Producto')} · ${[i.color,i.config||i.capacity,i.condition].filter(Boolean).join(' · ')}`).join('<br>');
      return `<div class="admin-order-card"><div><b class="order-code">${safeText(o.code||'TS-000')}</b><small>${safeText(o.date)}</small><span class="admin-order-badge">${icon(o.status)} ${safeText(o.status||'Pedido recibido')}</span></div><div><b>${safeText(o.customer?.name||'Cliente')}</b><small>${safeText(o.customer?.email)}</small><small>${safeText(o.customer?.phone)}</small></div><div class="admin-order-items"><b>${(o.items||[]).length||1} artículo(s)</b>${items||'Producto por confirmar'}</div><div><select onchange="changeStoredOrderStatus('${safeText(o.code)}',this.value)">${statuses.map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="admin-row-actions"><button onclick="showPremiumNote ? showPremiumNote(${safe}) : alert('Nota no disponible')">Nota</button><button onclick="sendStoredOrderEmail ? sendStoredOrderEmail('${safeText(o.code)}') : alert('Correo no disponible')">Correo</button></div></div>`;
    }).join('');
  };

  window.renderAdminPayments = function(){
    const box=document.getElementById('adminPaymentsList'); if(!box) return;
    const list=window.tsOrders();
    box.innerHTML=list.map(o=>`<div class="admin-order-card"><div><b>${safeText(o.code)}</b><small>${safeText(o.customer?.name)}</small></div><div><b>${safeText(o.payment||'Pago no indicado')}</b><small>Ref: ${safeText(o.paymentRef||'Pendiente')} · Total: ${money(o.total_usd || (o.items||[]).reduce((a,i)=>a+Number(i.price||0)*Number(i.qty||1),0))}</small></div><div><span class="status-chip">${safeText(o.status||'Recibido')}</span></div><div class="admin-row-actions"><button onclick="changeStoredOrderStatus('${safeText(o.code)}','Pago verificado')">Aprobar</button><button onclick="changeStoredOrderStatus('${safeText(o.code)}','Pago por verificar')">Pendiente</button></div></div>`).join('') || '<p class="muted">Sin pagos registrados.</p>';
  };

  window.renderAdminPreorders = function(){
    const box=document.getElementById('adminPreordersList'); if(!box) return;
    const pre=window.tsOrders().filter(o=>String(o.status||'').toLowerCase().includes('preorden') || (o.items||[]).some(i=>String(i.condition||'').toLowerCase().includes('pre')));
    if(!pre.length){ box.innerHTML='<div class="admin-empty"><b>Sin preórdenes visibles.</b><small>Cuando un pedido sea preorden aparecerá aquí.</small></div>'; return; }
    box.innerHTML=pre.map(o=>`<div class="preorder-card"><div><b class="order-code">${safeText(o.code)}</b><small>${safeText(o.date)}</small></div><div><b>${safeText(o.customer?.name)}</b><small>${safeText(o.customer?.email)}</small></div><div class="preorder-items">${(o.items||[]).map(i=>safeText(i.product)).join('<br>')}</div><div><label>Estatus</label><select onchange="changeStoredOrderStatus('${safeText(o.code)}',this.value)"><option ${o.status==='Preorden recibida'?'selected':''}>Preorden recibida</option><option ${o.status==='Pago recibido'?'selected':''}>Pago recibido</option><option ${o.status==='Pago verificado'?'selected':''}>Pago verificado</option><option ${o.status==='Producto solicitado'?'selected':''}>Producto solicitado</option><option ${o.status==='En tránsito a tienda'?'selected':''}>En tránsito a tienda</option><option ${o.status==='Disponible para entrega'?'selected':''}>Disponible para entrega</option><option ${o.status==='Entregado'?'selected':''}>Entregado</option></select></div><div class="admin-row-actions"><button onclick="sendPreorderStatus && sendPreorderStatus('${safeText(o.code)}')">Enviar estatus</button></div></div>`).join('');
  };

  window.renderAdminShipping = function(){
    const box=document.getElementById('adminShippingList'); if(!box) return;
    const list=window.tsOrders().filter(o=>['Preparando pedido','Enviado','Disponible para entrega','En tránsito'].includes(o.status));
    box.innerHTML=list.map(o=>`<div class="admin-order-card"><div><b>${safeText(o.code)}</b><small>${safeText(o.customer?.shipping||o.deliveryType||'Envío')}</small></div><div>${safeText(o.customer?.name)}<small>${safeText(o.customer?.address)}</small></div><div><input placeholder="N° de guía" value="${safeText(o.guideNumber)}" onchange="updateGuide('${safeText(o.code)}',this.value)"></div><div><button onclick="changeStoredOrderStatus('${safeText(o.code)}','Enviado')">Marcar enviado</button></div></div>`).join('') || '<p class="muted">Sin envíos pendientes.</p>';
  };

  window.tsCopyText = function(text){
    text = String(text || '');
    if(!text) return;
    navigator.clipboard?.writeText(text).then(()=>{ if(typeof tsShowToast==='function') tsShowToast('✅ Copiado'); }).catch(()=>alert(text));
  };

  const oldChangeStatus = typeof window.changeStoredOrderStatus === 'function' ? window.changeStoredOrderStatus : (typeof changeStoredOrderStatus === 'function' ? changeStoredOrderStatus : null);
  window.changeStoredOrderStatus = async function(code,status){
    if(oldChangeStatus) oldChangeStatus(code,status);
    const order = window.tsOrders().find(o=>String(o.code)===String(code));
    if(order?.source==='supabase' && order.db_id){
      const client = tsClient();
      if(client){
        const { error } = await client.from('pedidos').update({ estado:status, updated_at:new Date().toISOString() }).eq('id', order.db_id);
        if(error) console.warn('No se actualizó estado en Supabase:', error.message);
      }
    }
    await window.tsRefreshAdminData({silent:true});
    window.renderAdminSuite();
  };

  const oldRenderSuite = typeof window.renderAdminSuite === 'function' ? window.renderAdminSuite : (typeof renderAdminSuite === 'function' ? renderAdminSuite : null);
  window.renderAdminSuite = async function(){
    if(!window.__tsAdminRefreshing){
      window.__tsAdminRefreshing = true;
      await window.tsRefreshAdminData({silent:true});
      window.__tsAdminRefreshing = false;
    }
    if(typeof renderDashboard === 'function') renderDashboard();
    if(typeof renderAdminProducts === 'function') renderAdminProducts();
    if(typeof renderInventory === 'function') renderInventory();
    window.renderAdminOrders(); window.renderAdminPayments(); window.renderAdminCustomers(); window.renderAdminPreorders(); window.renderAdminShipping();
  };

  const oldOpenSuite = typeof window.openAdminSuite === 'function' ? window.openAdminSuite : (typeof openAdminSuite === 'function' ? openAdminSuite : null);
  window.openAdminSuite = function(){
    if(oldOpenSuite) oldOpenSuite();
    setTimeout(()=>window.renderAdminSuite(), 250);
  };

  const oldRenderAdmin = typeof window.renderAdmin === 'function' ? window.renderAdmin : (typeof renderAdmin === 'function' ? renderAdmin : null);
  window.renderAdmin = async function(){
    await window.tsRefreshAdminData({silent:true});
    const customers = window.tsCustomers();
    const orders = window.tsOrders();
    if(document.getElementById('kpiCustomers')) document.getElementById('kpiCustomers').textContent = customers.length;
    if(document.getElementById('kpiOrders')) document.getElementById('kpiOrders').textContent = orders.length;
    if(document.getElementById('kpiPreorders')) document.getElementById('kpiPreorders').textContent = orders.filter(o=>String(o.status||'').toLowerCase().includes('preorden')).length;
    window.renderAdminCustomers();
    window.renderAdminOrders();
  };

  window.addEventListener('load', ()=>{
    setTimeout(()=>window.tsRefreshAdminData({silent:true}).then(()=>{
      if(document.getElementById('adminSuiteModal')?.classList.contains('open')) window.renderAdminSuite();
      if(document.getElementById('adminModal')?.classList.contains('open')) window.renderAdmin();
    }), 1200);
  });
})();

/* ===== ThinkStore V50 - Consolidación: pedidos, estados, correos, notas, historial y admin real ===== */
(function(){
  const FLOW = [
    ['pedido_recibido','Pedido recibido'],
    ['pago_verificado','Pago verificado'],
    ['preparando_pedido','Preparando pedido'],
    ['enviado','Enviado'],
    ['entregado','Entregado']
  ];
  const STATUS_OPTIONS = ['Pedido recibido','Pago por verificar','Pago recibido','Pago verificado','Preparando pedido','En preparación','Enviado','Disponible para retiro','Entregado','Cancelado','Preorden recibida','Producto solicitado','En tránsito a tienda','Disponible para entrega'];

  const esc = (v)=>String(v ?? '').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const text = (v)=>String(v ?? '').trim();
  const money = (v)=> Number(v||0) ? '$' + Number(v||0).toLocaleString('es-VE') : 'Por confirmar';
  const dateVE = (v)=>{ try{ return v ? new Date(v).toLocaleString('es-VE') : ''; }catch(e){ return String(v||''); } };

  function client(){
    if(window.tsSupabase) return window.tsSupabase;
    if(window.supabase && window.THINKSTORE_SUPABASE){
      const cfg = window.THINKSTORE_SUPABASE;
      if(cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY){
        window.tsSupabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
        window.tsSupabaseReady = true;
        return window.tsSupabase;
      }
    }
    return null;
  }

  function normalizedStatus(s){
    const raw = text(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(raw.includes('cancel')) return 'Cancelado';
    if(raw.includes('entreg')) return 'Entregado';
    if(raw.includes('enviado') || raw.includes('transito') || raw.includes('reparto')) return 'Enviado';
    if(raw.includes('prepar') || raw.includes('solicitado') || raw.includes('disponible')) return 'Preparando pedido';
    if(raw.includes('verificado') || raw.includes('confirmado') || raw.includes('aprobado')) return 'Pago verificado';
    if(raw.includes('pago')) return 'Pago por verificar';
    if(raw.includes('preorden')) return 'Preorden recibida';
    return s || 'Pedido recibido';
  }
  function stepIndex(status){
    const n = normalizedStatus(status).toLowerCase();
    if(n.includes('entregado')) return 4;
    if(n.includes('enviado')) return 3;
    if(n.includes('prepar')) return 2;
    if(n.includes('verificado')) return 1;
    return 0;
  }
  window.tsNormalizeOrderStatus = normalizedStatus;

  function mapClient(c){
    c = c || {};
    return {
      source: c.source || 'supabase',
      supabase_id: c.supabase_id || c.id || '',
      id: c.cedula_rif || c.document || c.id || '',
      name: c.nombre || c.name || c.full_name || 'Cliente',
      email: c.correo || c.email || '',
      phone: c.telefono || c.phone || '',
      state: c.estado || c.state || '',
      city: c.ciudad || c.city || '',
      address: c.direccion || c.address || '',
      ref: c.referencia || c.ref || '',
      shipping: c.metodo_envio_preferido || c.shipping || '',
      agency: c.agencia_destino || c.agency || '',
      created_at: c.created_at || c.createdAt || ''
    };
  }
  function mapOrder(p){
    p = p || {};
    const cli = p.clientes || p.cliente || p.customer || {};
    const items = (p.pedido_items || p.order_items || p.items || []).map(i=>({
      product: i.producto || i.product_name || i.product || i.name || 'Producto',
      color: i.color || '',
      config: i.capacidad || i.capacity || i.config || '',
      qty: Number(i.cantidad || i.quantity || i.qty || 1),
      price: Number(i.precio_usd || i.price_usd || i.price || 0),
      condition: i.condicion || i.condition || ''
    }));
    return {
      source: p.source || 'supabase',
      db_id: p.db_id || p.id || '',
      code: p.codigo || p.order_code || p.code || 'TS',
      date: p.date || dateVE(p.created_at),
      created_at: p.created_at || '',
      updatedAt: p.updatedAt || dateVE(p.updated_at || p.created_at),
      status: normalizedStatus(p.estado || p.status || 'Pedido recibido'),
      payment: p.metodo_pago || p.payment_method || p.payment || 'Por confirmar',
      paymentRef: p.referencia_pago || p.paymentRef || '',
      paymentAmount: p.monto_pago || p.paymentAmount || '',
      deliveryType: p.metodo_envio || p.shipping_method || p.deliveryType || '',
      shippingCompany: p.empresa_envio || p.shipping_company || p.shippingCompany || '',
      guideNumber: p.numero_guia || p.guideNumber || '',
      total_usd: Number(p.total_usd || 0),
      customer: mapClient(cli),
      items: items.length ? items : [{ product:'Producto por confirmar', qty:1, price:Number(p.total_usd||0) }],
      history: p.order_status_history || p.status_history || []
    };
  }
  window.tsMapOrder = mapOrder;

  async function fetchClientes(){
    const sb = client(); if(!sb) return [];
    const { data, error } = await sb.from('clientes').select('*').order('created_at', { ascending:false });
    if(error) throw error;
    return (data||[]).map(mapClient);
  }
  async function fetchPedidos(){
    const sb = client(); if(!sb) return [];
    let res = await sb.from('pedidos').select('*, clientes(*), pedido_items(*), order_status_history(*)').order('created_at', { ascending:false });
    if(res.error) res = await sb.from('pedidos').select('*, clientes(*), pedido_items(*)').order('created_at', { ascending:false });
    if(res.error) res = await sb.from('pedidos').select('*').order('created_at', { ascending:false });
    if(res.error) throw res.error;
    return (res.data||[]).map(mapOrder);
  }
  window.tsRefreshAdminData = async function({silent=false}={}){
    try{
      const [clientes, pedidos] = await Promise.all([fetchClientes(), fetchPedidos()]);
      window.tsAdminRemoteCustomers = clientes;
      window.tsAdminRemoteOrders = pedidos;
      window.tsAdminLastRefresh = new Date();
      if(!silent && typeof tsShowToast==='function') tsShowToast('✅ Datos actualizados');
      return {clientes, pedidos};
    }catch(e){
      console.warn('ThinkStore V50 refresh:', e.message || e);
      if(!silent && typeof tsShowToast==='function') tsShowToast('⚠️ No se pudo leer Supabase');
      return { clientes: window.tsAdminRemoteCustomers||[], pedidos: window.tsAdminRemoteOrders||[] };
    }
  };

  const oldTsCustomers = typeof window.tsCustomers === 'function' ? window.tsCustomers : null;
  const oldTsOrders = typeof window.tsOrders === 'function' ? window.tsOrders : null;
  window.tsCustomers = function(){
    const out=[];
    const add=(c)=>{ const n=mapClient(c); const key=(n.email||n.phone||n.id||n.supabase_id||n.name).toLowerCase(); if(!key) return; const i=out.findIndex(x=>((x.email||x.phone||x.id||x.supabase_id||x.name).toLowerCase()===key)||(n.email&&x.email===n.email)); if(i>=0) out[i]={...out[i],...n}; else out.push(n); };
    (window.tsAdminRemoteCustomers||[]).forEach(add);
    try{ (oldTsCustomers?oldTsCustomers():JSON.parse(localStorage.getItem('ts_customers')||'[]')).forEach(add); }catch(e){}
    return out;
  };
  window.tsOrders = function(){
    const out=[];
    const add=(o)=>{ const n=o?.source==='supabase'?o:mapOrder(o); const key=String(n.code||n.db_id||'').toLowerCase(); if(!key) return; if(!out.some(x=>String(x.code||x.db_id||'').toLowerCase()===key)) out.push(n); };
    (window.tsAdminRemoteOrders||[]).forEach(add);
    try{ (oldTsOrders?oldTsOrders():JSON.parse(localStorage.getItem('ts_orders')||'[]')).forEach(add); }catch(e){}
    return out;
  };

  function progressHTML(status){
    const active = stepIndex(status);
    return `<div class="ts-order-progress">${FLOW.map((st,i)=>`<div class="ts-order-step ${i<=active?'done':''}"><span class="ts-order-dot">${i<active?'✓':(i===active?'•':'')}</span><small>${st[1]}</small></div>`).join('')}</div>`;
  }
  window.tsOrderProgressHTML = progressHTML;

  async function fetchMyOrders(){
    const sb = client();
    const uid = currentUser?.supabase_id || currentUser?.id;
    if(sb && uid){
      let res = await sb.from('pedidos').select('*, pedido_items(*), order_status_history(*)').eq('cliente_id', uid).order('created_at',{ascending:false});
      if(res.error) res = await sb.from('pedidos').select('*, pedido_items(*)').eq('cliente_id', uid).order('created_at',{ascending:false});
      if(!res.error) return (res.data||[]).map(mapOrder);
    }
    return typeof myOrders==='function' ? myOrders().map(mapOrder) : [];
  }
  window.tsFetchMyOrdersV50 = fetchMyOrders;

  window.tsRenderOrderCardsV50 = function(list, loading=false){
    const box=document.getElementById('myOrders'); if(!box) return;
    if(loading){ box.innerHTML='<div class="ts-myorders-loading">Cargando tus pedidos...</div>'; return; }
    if(!list?.length){ box.innerHTML='<div class="ts-myorders-empty"><b>Aún no tienes pedidos registrados.</b><small>Cuando realices una compra, aparecerá aquí con seguimiento, historial y nota de entrega.</small></div>'; return; }
    box.innerHTML = list.map(o=>{
      const total = o.total_usd || (o.items||[]).reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||1),0);
      const items = (o.items||[]).map(i=>`${esc(i.product)}${i.color?' · '+esc(i.color):''}${i.config?' · '+esc(i.config):''}`).join('<br>');
      const hist = (o.history||[]).slice(-4).reverse().map(h=>`<li><b>${esc(normalizedStatus(h.status||h.estado))}</b><small>${esc(dateVE(h.created_at))}${h.note?' · '+esc(h.note):''}</small></li>`).join('');
      const safe = esc(JSON.stringify(o));
      return `<div class="ts-myorder-card"><div class="ts-myorder-top"><div><span class="ts-order-label">Pedido</span><b>${esc(o.code)}</b><small>${esc(o.date)}</small></div><span class="ts-status-pill">${esc(o.status)}</span></div>${progressHTML(o.status)}<div class="ts-myorder-info"><div><small>Productos</small><b>${items||'Producto por confirmar'}</b></div><div><small>Total</small><b>${money(total)}</b></div><div><small>Envío</small><b>${esc([o.deliveryType,o.shippingCompany].filter(Boolean).join(' · ')||'Por confirmar')}</b></div><div><small>Guía</small><b>${esc(o.guideNumber||'Pendiente')}</b></div></div>${hist?`<div class="ts-order-history"><b>Historial</b><ul>${hist}</ul></div>`:''}<div class="ts-myorder-actions"><button class="btn ghost" onclick="showPremiumNote(${safe})">Ver nota</button></div></div>`;
    }).join('');
  };

  const oldRenderAccount = window.renderAccount || (typeof renderAccount==='function' ? renderAccount : null);
  window.renderAccount = function(){
    if(oldRenderAccount) oldRenderAccount();
    if(!currentUser) return;
    window.tsRenderOrderCardsV50(null,true);
    fetchMyOrders().then(list=>window.tsRenderOrderCardsV50(list,false)).catch(e=>{ console.warn(e); window.tsRenderOrderCardsV50(typeof myOrders==='function'?myOrders().map(mapOrder):[],false); });
  };

  function buildStatusEmail(order){
    const products = (order.items||[]).map(i=>`${i.product}${i.color?' · '+i.color:''}${i.config?' · '+i.config:''}`).join('\n') || 'Producto por confirmar';
    return `Hola ${order.customer?.name || 'cliente'},\n\nTu pedido ${order.code} fue actualizado.\n\nEstado actual: ${order.status}\n\nProducto(s):\n${products}\n\nProgreso:\n${FLOW.map((st,i)=>(i<=stepIndex(order.status)?'✅':'⬜')+' '+st[1]).join('\n')}\n\nPuedes revisar tu historial y nota de entrega iniciando sesión en tu cuenta ThinkStore.\n\nThinkStore\nAltamira, Caracas - Venezuela\nhttps://thinkstore.com.ve`;
  }
  async function sendStatusEmail(order, {manual=false}={}){
    const to = order.customer?.email || order.customer?.correo;
    if(!to){ if(manual) alert('Este cliente no tiene correo.'); return false; }
    const subject = `ThinkStore - Estado de tu pedido ${order.code}`;
    const body = buildStatusEmail(order);
    // En modo manual también usamos Resend para mantener remitentes corporativos.
    // No abrimos el cliente de correo local porque rompe la experiencia premium.
    try{
      const res = await fetch('/.netlify/functions/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to,subject,text:body,logoUrl:new URL('assets/thinkstore-email-logo.jpg', location.href).href,department:String(order.status||'').toLowerCase().includes('preorden')?'preordenes':'pedidos',actionUrl:new URL('?tracking='+encodeURIComponent(order.code||''), location.href).href,actionLabel:'Ver estado del pedido'})});
      const data = await res.json().catch(()=>({}));
      if(!res.ok || !data.ok) throw new Error(data.error||'No enviado');
      if(typeof tsShowToast==='function') tsShowToast('📧 Correo de estado enviado');
      return true;
    }catch(e){ console.warn('Correo automático no enviado:', e.message||e); if(typeof tsShowToast==='function') tsShowToast('⚠️ Estado guardado; correo automático pendiente'); return false; }
  }
  window.tsSendOrderStatusEmail = sendStatusEmail;
  window.sendStoredOrderEmail = function(code){ const o=window.tsOrders().find(x=>String(x.code)===String(code)); if(!o) return alert('No se encontró este pedido.'); return sendStatusEmail(o,{manual:true}); };

  async function addStatusHistory(order,status,note=''){
    const sb = client(); if(!sb || !order?.db_id) return;
    try{ await sb.from('order_status_history').insert({ order_id: order.db_id, status, note }); }catch(e){ /* tabla opcional */ }
  }

  const oldChange = window.changeStoredOrderStatus || (typeof changeStoredOrderStatus==='function'?changeStoredOrderStatus:null);
  window.changeStoredOrderStatus = async function(code,status){
    const before = window.tsOrders().find(o=>String(o.code)===String(code));
    if(oldChange) try{ oldChange(code,status); }catch(e){}
    const sb = client();
    if(before?.source==='supabase' && before.db_id && sb){
      await sb.from('pedidos').update({ estado:status, updated_at:new Date().toISOString() }).eq('id', before.db_id);
      await addStatusHistory(before,status,'Actualizado desde panel administrador');
    }
    await window.tsRefreshAdminData({silent:true});
    const updated = window.tsOrders().find(o=>String(o.code)===String(code)) || {...before,status};
    if(status && normalizedStatus(status)!==normalizedStatus(before?.status)) sendStatusEmail(updated,{manual:false});
    if(typeof window.renderAdminSuite==='function') window.renderAdminSuite();
    if(typeof window.renderAccount==='function') window.renderAccount();
  };

  window.renderDashboard = function(){
    const orders = window.tsOrders(), customers = window.tsCustomers();
    const sales = orders.reduce((sum,o)=>sum+(Number(o.total_usd||0)||((o.items||[]).reduce((a,i)=>a+Number(i.price||0)*Number(i.qty||1),0))),0);
    const pre = orders.filter(o=>String(o.status||'').toLowerCase().includes('preorden')||(o.items||[]).some(i=>String(i.condition||'').toLowerCase().includes('pre'))).length;
    if(typeof setText==='function'){ setText('dashSalesUsd',money(sales)); setText('dashOrders',orders.length); setText('dashCustomers',customers.length); setText('dashPreorders',pre); }
    const recent=document.getElementById('dashRecentOrders'); if(recent) recent.innerHTML=orders.slice(0,6).map(o=>`<div class="mini-row"><b>${esc(o.code)}</b><span>${esc(o.customer?.name||'Cliente')} · ${esc(o.status)}</span></div>`).join('')||'<p class="muted">Sin pedidos todavía.</p>';
    const alerts=document.getElementById('dashStockAlerts'); if(alerts) alerts.innerHTML=`<div class="mini-row"><b>Supabase</b><span>Clientes: ${customers.length} · Pedidos: ${orders.length}</span></div><div class="mini-row"><b>Última actualización</b><span>${window.tsAdminLastRefresh?dateVE(window.tsAdminLastRefresh):'Pendiente'}</span></div><button class="btn ghost" onclick="tsRefreshAdminData().then(()=>renderAdminSuite())">Actualizar datos</button>`;
  };

  window.renderAdminCustomers = function(){
    const box=document.getElementById('adminCustomersList')||document.getElementById('adminCustomers'); if(!box) return;
    const q=(document.getElementById('customerSearch')?.value||'').toLowerCase();
    const list=window.tsCustomers().filter(c=>JSON.stringify(c).toLowerCase().includes(q));
    if(!list.length){ box.innerHTML='<div class="admin-empty"><b>No hay clientes visibles todavía.</b><small>Presiona “Actualizar datos” o verifica la tabla clientes en Supabase.</small></div>'; return; }
    box.innerHTML=`<table class="admin-table"><thead><tr><th>Cliente</th><th>Contacto</th><th>Ubicación</th><th>Registro</th><th>Acciones</th></tr></thead><tbody>${list.map(c=>`<tr><td><b>${esc(c.name)}</b><small>${esc(c.id)}</small></td><td>${esc(c.email)}<small>${esc(c.phone)}</small></td><td>${esc([c.city,c.state].filter(Boolean).join(', '))}<small>${esc(c.address)}</small></td><td>${esc(dateVE(c.created_at))}</td><td><button onclick="tsCopyText('${esc(c.email)}')">Copiar correo</button><button onclick="tsCopyText('${esc(c.phone)}')">Copiar teléfono</button></td></tr>`).join('')}</tbody></table>`;
  };

  window.renderAdminOrders = function(){
    const box=document.getElementById('adminOrdersList')||document.getElementById('adminOrders'); if(!box) return;
    const q=(document.getElementById('orderSearch')?.value||'').toLowerCase(); const f=document.getElementById('orderStatusFilter')?.value||'';
    const list=window.tsOrders().filter(o=>(!f||o.status===f)&&JSON.stringify(o).toLowerCase().includes(q));
    if(!list.length){ box.innerHTML='<div class="admin-order-empty"><b>Sin pedidos todavía.</b><small>Cuando un cliente complete el checkout aparecerá aquí desde Supabase.</small></div>'; return; }
    box.innerHTML=`<div class="admin-order-head"><span>Orden</span><span>Cliente</span><span>Productos</span><span>Estatus</span><span>Acciones</span></div>`+list.map(o=>{ const safe=esc(JSON.stringify(o)); const items=(o.items||[]).slice(0,2).map(i=>`${esc(i.product)} · ${esc([i.color,i.config,i.condition].filter(Boolean).join(' · '))}`).join('<br>'); return `<div class="admin-order-card"><div><b class="order-code">${esc(o.code)}</b><small>${esc(o.date)}</small><span class="admin-order-badge">${esc(o.status)}</span></div><div><b>${esc(o.customer?.name||'Cliente')}</b><small>${esc(o.customer?.email)}</small><small>${esc(o.customer?.phone)}</small></div><div class="admin-order-items"><b>${(o.items||[]).length||1} artículo(s)</b>${items||'Producto por confirmar'}</div><div><select onchange="changeStoredOrderStatus('${esc(o.code)}',this.value)">${STATUS_OPTIONS.map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="admin-row-actions"><button onclick="showPremiumNote(${safe})">Nota</button><button onclick="sendStoredOrderEmail('${esc(o.code)}')">Correo</button></div></div>`; }).join('');
  };

  window.renderAdminPayments = function(){
    const box=document.getElementById('adminPaymentsList'); if(!box) return;
    const list=window.tsOrders();
    box.innerHTML=list.map(o=>`<div class="admin-order-card"><div><b>${esc(o.code)}</b><small>${esc(o.customer?.name)}</small></div><div><b>${esc(o.payment)}</b><small>Ref: ${esc(o.paymentRef||'Pendiente')} · Total: ${money(o.total_usd)}</small></div><div><span class="status-chip">${esc(o.status)}</span></div><div class="admin-row-actions"><button onclick="changeStoredOrderStatus('${esc(o.code)}','Pago verificado')">Aprobar</button><button onclick="changeStoredOrderStatus('${esc(o.code)}','Pago por verificar')">Pendiente</button></div></div>`).join('')||'<p class="muted">Sin pagos registrados.</p>';
  };

  window.renderAdminPreorders = function(){
    const box=document.getElementById('adminPreordersList'); if(!box) return;
    const list=window.tsOrders().filter(o=>String(o.status||'').toLowerCase().includes('preorden')||(o.items||[]).some(i=>String(i.condition||'').toLowerCase().includes('pre')));
    box.innerHTML=list.length?list.map(o=>`<div class="preorder-card"><div><b class="order-code">${esc(o.code)}</b><small>${esc(o.date)}</small></div><div><b>${esc(o.customer?.name)}</b><small>${esc(o.customer?.email)}</small></div><div class="preorder-items">${(o.items||[]).map(i=>esc(i.product)).join('<br>')}</div><div><label>Estatus</label><select onchange="changeStoredOrderStatus('${esc(o.code)}',this.value)"><option ${o.status==='Preorden recibida'?'selected':''}>Preorden recibida</option><option ${o.status==='Pago recibido'?'selected':''}>Pago recibido</option><option ${o.status==='Pago verificado'?'selected':''}>Pago verificado</option><option ${o.status==='Producto solicitado'?'selected':''}>Producto solicitado</option><option ${o.status==='En tránsito a tienda'?'selected':''}>En tránsito a tienda</option><option ${o.status==='Disponible para entrega'?'selected':''}>Disponible para entrega</option><option ${o.status==='Entregado'?'selected':''}>Entregado</option></select></div><div class="admin-row-actions"><button onclick="sendStoredOrderEmail('${esc(o.code)}')">Enviar estatus</button></div></div>`).join(''):'<div class="admin-empty"><b>Sin preórdenes visibles.</b><small>Cuando un pedido sea preorden aparecerá aquí.</small></div>';
  };

  window.renderAdminShipping = function(){
    const box=document.getElementById('adminShippingList'); if(!box) return;
    const list=window.tsOrders().filter(o=>['Preparando pedido','En preparación','Enviado','Disponible para retiro'].includes(o.status));
    box.innerHTML=list.map(o=>`<div class="admin-order-card"><div><b>${esc(o.code)}</b><small>${esc(o.deliveryType||'Envío')}</small></div><div>${esc(o.customer?.name)}<small>${esc(o.customer?.address)}</small></div><div><input placeholder="N° de guía" value="${esc(o.guideNumber)}" onchange="updateGuide('${esc(o.code)}',this.value)"></div><div><button onclick="changeStoredOrderStatus('${esc(o.code)}','Enviado')">Marcar enviado</button></div></div>`).join('')||'<p class="muted">Sin envíos pendientes.</p>';
  };

  window.tsCopyText = function(t){ t=String(t||''); if(!t) return; navigator.clipboard?.writeText(t).then(()=>typeof tsShowToast==='function'&&tsShowToast('✅ Copiado')).catch(()=>alert(t)); };

  window.renderAdminSuite = async function(){
    if(!window.__tsV50Refreshing){ window.__tsV50Refreshing=true; await window.tsRefreshAdminData({silent:true}); window.__tsV50Refreshing=false; }
    window.renderDashboard();
    if(typeof renderAdminProducts==='function') renderAdminProducts();
    if(typeof renderInventory==='function') renderInventory();
    window.renderAdminOrders(); window.renderAdminPayments(); window.renderAdminCustomers(); window.renderAdminPreorders(); window.renderAdminShipping();
  };
  const oldOpenAdminSuite = window.openAdminSuite || (typeof openAdminSuite==='function'?openAdminSuite:null);
  window.openAdminSuite = function(){ if(oldOpenAdminSuite) oldOpenAdminSuite(); setTimeout(()=>window.renderAdminSuite(),300); };
  window.renderAdmin = async function(){ await window.tsRefreshAdminData({silent:true}); window.renderAdminCustomers(); window.renderAdminOrders(); const c=window.tsCustomers(), o=window.tsOrders(); if(document.getElementById('kpiCustomers')) document.getElementById('kpiCustomers').textContent=c.length; if(document.getElementById('kpiOrders')) document.getElementById('kpiOrders').textContent=o.length; if(document.getElementById('kpiPreorders')) document.getElementById('kpiPreorders').textContent=o.filter(x=>String(x.status).toLowerCase().includes('preorden')).length; };
  window.addEventListener('load',()=>setTimeout(()=>window.tsRefreshAdminData({silent:true}),1200));
})();

/* ===== ThinkStore V50 Dashboard Seguro - Netlify Functions + Supabase Service Role ===== */
(function(){
  // La clave real NO vive en el código. Se escribe al abrir el panel y Netlify la valida.
  const adminSecret = () => sessionStorage.getItem('thinkstore_admin_secret') || localStorage.getItem('thinkstore_admin_secret') || '';
  const saveAdminSecret = (secret) => {
    const value = String(secret || '').trim();
    if(value){
      sessionStorage.setItem('thinkstore_admin_secret', value);
      localStorage.setItem('thinkstore_admin_secret', value);
    }
    return value;
  };

  const oldMapOrder = window.tsMapOrder || ((x)=>x);
  const oldRefresh = window.tsRefreshAdminData;
  const oldChange = window.changeStoredOrderStatus;

  window.openAdminSuite = function(){
    const pass = prompt('Código especial de administrador');
    const secret = saveAdminSecret(pass);
    if(!secret){ alert('Ingresa la clave de administrador'); return; }
    const modal = document.getElementById('adminSuiteModal');
    if(modal) modal.classList.add('open');
    window.tsRefreshAdminData({silent:false}).then(()=>window.renderAdminSuite && window.renderAdminSuite());
  };

  window.tsRefreshAdminData = async function({silent=false}={}){
    try{
      const res = await fetch('/.netlify/functions/admin-data', { headers:{ 'x-admin-secret': adminSecret() } });
      const data = await res.json().catch(()=>({}));
      if(!res.ok || !data.ok) throw new Error(data.error || 'Dashboard seguro no disponible');
      window.tsAdminRemoteCustomers = (data.clientes || []).map(c => ({
        supabase_id: c.id || '',
        id: c.cedula_rif || c.document || c.id || '',
        name: c.nombre || c.name || c.full_name || 'Cliente',
        email: c.correo || c.email || '',
        phone: c.telefono || c.phone || '',
        state: c.estado || c.state || '',
        city: c.ciudad || c.city || '',
        address: c.direccion || c.address || '',
        ref: c.referencia || c.ref || '',
        shipping: c.metodo_envio_preferido || c.shipping || '',
        agency: c.agencia_destino || c.agency || '',
        created_at: c.created_at || ''
      }));
      window.tsAdminRemoteOrders = (data.pedidos || []).map(oldMapOrder);
      window.tsAdminRemotePayments = data.comprobantes || [];
      window.tsAdminLastRefresh = data.refreshed_at || new Date().toISOString();
      if(!silent && typeof tsShowToast==='function') tsShowToast('✅ Dashboard actualizado desde Supabase');
      return { clientes: window.tsAdminRemoteCustomers, pedidos: window.tsAdminRemoteOrders };
    }catch(e){
      console.warn('Dashboard seguro:', e.message || e);
      if(typeof oldRefresh === 'function') return oldRefresh({silent});
      if(!silent && typeof tsShowToast==='function') tsShowToast('⚠️ No se pudo actualizar dashboard');
      return { clientes:[], pedidos:[] };
    }
  };

  window.changeStoredOrderStatus = async function(code,status){
    const before = (window.tsOrders ? window.tsOrders() : []).find(o=>String(o.code)===String(code));
    const secret = adminSecret() || saveAdminSecret(prompt('Código especial de administrador para sincronizar Supabase'));
    let changedSecurely = false;
    let result = null;
    let secureError = '';

    if(before?.db_id || before?.code){
      try{
        const res = await fetch('/.netlify/functions/admin-update-order', {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'x-admin-secret': secret },
          body: JSON.stringify({ id: before.db_id, code: before.code, status, note:'Actualizado desde dashboard ThinkStore' })
        });
        result = await res.json().catch(()=>({}));
        if(!res.ok || !result.ok) throw new Error(result.error || 'No actualizado');
        changedSecurely = true;
      }catch(e){
        secureError = e.message || String(e);
        console.warn('Actualización segura falló:', secureError);
      }
    }

    if(!changedSecurely){
      // Actualización visual local sin disparar el flujo antiguo, para mostrar el error real de Supabase/Resend.
      for(const key of ['ts_orders','thinkstore_orders']){
        const arr = JSON.parse(localStorage.getItem(key)||'[]');
        const idx = arr.findIndex(o=>String(o.code)===String(code));
        if(idx >= 0){
          arr[idx].status = status;
          arr[idx].updatedAt = new Date().toLocaleString('es-VE');
          localStorage.setItem(key, JSON.stringify(arr));
        }
      }
      alert('Estado actualizado localmente, pero Supabase no confirmó el cambio: ' + (secureError || 'Error desconocido'));
    }else if(result?.email?.sent){
      const nota = result?.deliveryNoteEmail?.sent ? ' También se envió la nota de entrega.' : '';
      alert('Estado actualizado en Supabase y correo enviado al cliente.' + nota);
    }else if(result?.email?.skipped){
      const reason = result.email.reason === 'missing_customer_email' ? 'el cliente no tiene correo registrado' : 'falta RESEND_API_KEY o RESEND_APY_KEY';
      alert('Estado actualizado en Supabase. No se envió correo porque ' + reason + '.');
    }else if(result?.email?.error){
      alert('Estado actualizado en Supabase, pero Resend no envió el correo: ' + result.email.error);
    }else{
      alert('Estado actualizado en Supabase.');
    }

    await window.tsRefreshAdminData({silent:true});
    if(typeof window.renderAdminSuite === 'function') window.renderAdminSuite();
    if(typeof window.renderAccount === 'function') window.renderAccount();
  };

  const oldRenderDashboard = window.renderDashboard;
  window.renderDashboard = function(){
    if(typeof oldRenderDashboard === 'function') oldRenderDashboard();
    const box = document.getElementById('dashStockAlerts');
    if(box){
      const last = window.tsAdminLastRefresh ? new Date(window.tsAdminLastRefresh).toLocaleString('es-VE') : 'Pendiente';
      const secure = adminSecret() ? 'Activo' : 'Pendiente';
      box.innerHTML = `<div class="mini-row"><b>Dashboard seguro</b><span>${secure}</span></div><div class="mini-row"><b>Supabase</b><span>${(window.tsCustomers?window.tsCustomers():[]).length} clientes · ${(window.tsOrders?window.tsOrders():[]).length} pedidos</span></div><div class="mini-row"><b>Última actualización</b><span>${last}</span></div><button class="btn ghost" onclick="tsRefreshAdminData().then(()=>renderAdminSuite())">Actualizar datos</button>`;
    }
  };
})();

/* ===== ThinkStore V50 Final - Notas Premium, Historial y Notificaciones ===== */
(function(){
  const esc = (v)=>String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = (n)=> Number(n||0) ? '$' + Number(n||0).toLocaleString('es-VE') : 'A confirmar';
  const orderTotal = (o)=> Number(o?.total_usd || o?.total || 0) || (o?.items||[]).reduce((s,i)=>s + Number(i.price || i.precio_usd || 0) * Number(i.qty || i.quantity || i.cantidad || 1), 0);
  const allStatuses = ['Pedido recibido','Pago por verificar','Pago recibido','Pago verificado','Preparando pedido','Comprando proveedor','En tránsito','Disponible para entrega','Enviado','Entregado'];
  const normalizedStatus = (st)=>{
    const s=String(st||'Pedido recibido').toLowerCase();
    if(s.includes('cancel')) return 'Cancelado';
    if(s.includes('entreg')) return 'Entregado';
    if(s.includes('enviado')) return 'Enviado';
    if(s.includes('disponible') || s.includes('retiro')) return 'Disponible para entrega';
    if(s.includes('tránsito') || s.includes('transito') || s.includes('camino')) return 'En tránsito';
    if(s.includes('proveedor') || s.includes('solicitado')) return 'Comprando proveedor';
    if(s.includes('prepar')) return 'Preparando pedido';
    if(s.includes('verificado') || s.includes('aprob')) return 'Pago verificado';
    if(s.includes('pago')) return 'Pago por verificar';
    return 'Pedido recibido';
  };
  const statusIcon = (st)=>({
    'Pedido recibido':'🟡','Pago por verificar':'🟠','Pago verificado':'🟢','Preparando pedido':'🔵','Comprando proveedor':'🛒','En tránsito':'🚚','Disponible para entrega':'🏪','Enviado':'📦','Entregado':'✅','Cancelado':'⚫'
  }[normalizedStatus(st)]||'🟡');
  window.tsEnterpriseTimeline = function(order){
    const active = normalizedStatus(order?.status);
    if(active==='Cancelado') return `<div class="ts-enterprise-cancel">⚫ Pedido cancelado</div>`;
    const current = Math.max(0, allStatuses.indexOf(active));
    return `<div class="ts-enterprise-progress">${allStatuses.map((s,i)=>`<div class="ts-step ${i<current?'done':i===current?'active':''}"><span>${i<current?'✓':i===current?'●':'○'}</span><b>${esc(s)}</b></div>`).join('')}</div>`;
  };
  window.tsOrderTrackingUrl = function(code, token){
  const c = encodeURIComponent(code || '');
  const t = encodeURIComponent(token || '');
  return `https://thinkstore.com.ve/?tracking=${c}&token=${t}#status`;
};
  window.tsEnterpriseNotificationItems = function(){
    const orders = (window.tsOrders ? window.tsOrders() : []);
    const customers = (window.tsCustomers ? window.tsCustomers() : []);
    const items = [];
    orders.slice(-6).reverse().forEach(o=>items.push({type:'pedido', text:`${o.code||'TS'} · ${o.customer?.name||'Cliente'} · ${o.status||'Pedido recibido'}`}));
    customers.slice(-3).reverse().forEach(c=>items.push({type:'cliente', text:`Nuevo cliente · ${c.name||c.email||'Cliente'}`}));
    return items.slice(0,8);
  };
  const oldDashboard = window.renderDashboard;
  window.renderDashboard = function(){
    if(typeof oldDashboard === 'function') oldDashboard();
    const recent = document.getElementById('dashRecentOrders');
    const orders = (window.tsOrders ? window.tsOrders() : []);
    if(recent){
      recent.innerHTML = orders.slice(-5).reverse().map(o=>`<div class="mini-row ts-mini-order"><b>${esc(o.code||'TS')}</b><span>${statusIcon(o.status)} ${esc(o.customer?.name||'Cliente')} · ${esc(o.status||'Pedido recibido')}</span></div>`).join('') || '<p class="muted">Sin pedidos todavía.</p>';
    }
    let box = document.getElementById('tsLiveNotifications');
    const dash = document.querySelector('#admin-dashboard .admin-two-col');
    if(dash && !box){
      const card = document.createElement('div');
      card.className='admin-card ts-live-card';
      card.innerHTML='<h3>🔔 Notificaciones en vivo</h3><div id="tsLiveNotifications"></div>';
      dash.appendChild(card); box = card.querySelector('#tsLiveNotifications');
    }
    if(box){
      const items = window.tsEnterpriseNotificationItems();
      box.innerHTML = items.length ? items.map(n=>`<div class="mini-row"><b>${n.type==='pedido'?'📦 Pedido':'👤 Cliente'}</b><span>${esc(n.text)}</span></div>`).join('') : '<p class="muted">Sin novedades por ahora.</p>';
    }
  };
  const oldAccount = window.renderAccount;
  window.renderAccount = function(){
    if(typeof oldAccount === 'function') oldAccount();
    const box = document.getElementById('myOrders');
    if(!box || !window.currentUser) return;
    const mine = (typeof window.myOrders==='function' ? window.myOrders() : []).slice(-20).reverse();
    box.innerHTML = mine.length ? mine.map(o=>{
      const code = esc(o.code||'TS-000');
      const items=(o.items||[]).map(i=>`${esc(i.product||i.name||'Producto')} · ${esc(i.color||'')} · ${esc(i.config||i.capacity||'')}`).join('<br>') || 'Producto por confirmar';
      return `<div class="ts-history-card"><div class="ts-history-top"><div><b>${code}</b><small>${esc(o.date||o.created_at||'')}</small></div><span>${statusIcon(o.status)} ${esc(o.status||'Pedido recibido')}</span></div>${window.tsEnterpriseTimeline(o)}<div class="ts-history-meta"><p>${items}</p><b>${money(orderTotal(o))}</b></div><div class="admin-row-actions"><button class="btn ghost" onclick="showPremiumNoteByCode('${code}')">Descargar nota</button><button class="btn ghost" onclick="openStatusFromCode('${code}')">Ver seguimiento</button></div></div>`;
    }).join('') : '<p class="muted">Aún no tienes compras registradas.</p>';
  };
  window.showPremiumNoteByCode = function(code){
    const order = (window.tsOrders?window.tsOrders():[]).find(o=>String(o.code)===String(code));
    if(order && typeof window.showPremiumNote==='function') window.showPremiumNote(order);
  };
  window.openStatusFromCode = function(code){
    if(typeof window.openStatus==='function') window.openStatus();
    setTimeout(()=>{ const input=document.getElementById('statusCode'); if(input) input.value=code; if(typeof window.checkStatus==='function') window.checkStatus(); },80);
  };
  const oldCheckStatus = window.checkStatus;
  window.checkStatus = function(){
    const code=(document.getElementById('statusCode')?.value||'').trim().toUpperCase();
    const o=(window.tsOrders?window.tsOrders():[]).find(x=>String(x.code||'').toUpperCase()===code);
    const out=document.getElementById('statusResult');
    if(!out) return oldCheckStatus && oldCheckStatus();
    if(!o){ out.innerHTML='<p class="muted">No encontré esa orden. Revisa el código o inicia sesión.</p>'; return; }
    out.innerHTML=`<div class="ts-public-track"><h3>${esc(o.code)}</h3><p>${statusIcon(o.status)} <b>${esc(o.status||'Pedido recibido')}</b></p>${window.tsEnterpriseTimeline(o)}<small>QR / enlace: ${esc(window.tsOrderTrackingUrl(o.code, o.tracking_token))}</small><div class="admin-row-actions"><button class="btn ghost" onclick="showPremiumNoteByCode('${esc(o.code)}')">Ver nota de entrega</button></div></div>`;
  };
  const oldAdminOrders = window.renderAdminOrders;
  window.renderAdminOrders = function(){
    if(typeof oldAdminOrders==='function') oldAdminOrders();
    const box=document.getElementById('adminOrdersList'); if(!box) return;
    box.querySelectorAll('.admin-order-card').forEach(card=>{
      const code = card.querySelector('.order-code')?.textContent?.trim();
      const actions = card.querySelector('.admin-row-actions');
      if(code && actions && !actions.querySelector('.ts-v50-note')){
        actions.insertAdjacentHTML('beforeend', `<button class="ts-v50-note" onclick="showPremiumNoteByCode('${esc(code)}')">PDF / QR</button>`);
      }
    });
  };
  window.tsStartEnterpriseRealtime = function(){
    if(window.tsEnterpriseRealtimeTimer) clearInterval(window.tsEnterpriseRealtimeTimer);
    window.tsEnterpriseRealtimeTimer = setInterval(()=>{
      if(document.getElementById('adminSuiteModal')?.classList.contains('open')){
        if(typeof window.tsRefreshAdminData==='function') window.tsRefreshAdminData({silent:true}).then(()=>window.renderAdminSuite&&window.renderAdminSuite());
      }
    }, 45000);
  };
  window.addEventListener('load',()=>{ window.tsStartEnterpriseRealtime(); });
})();


/* ===== ThinkStore V50.1 - Seguimiento separado de la Nota de Entrega ===== */
(function(){
  const esc=(v)=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=(v)=>Number(v||0)?'$'+Number(v||0).toLocaleString('es-VE'):'A confirmar';
  const total=(o)=>Number(o?.total_usd||o?.total||0)||((o?.items||[]).reduce((s,i)=>s+Number(i.price||i.precio_usd||0)*Number(i.qty||i.quantity||i.cantidad||1),0));
  const statusMap=[
    ['pedido_recibido','Pedido recibido','Tu pedido fue creado correctamente.'],
    ['pago_verificado','Pago verificado','El pago fue revisado por ThinkStore.'],
    ['preparando_pedido','En preparación','Estamos preparando tu pedido.'],
    ['enviado','Enviado','El pedido fue entregado a la empresa de envío.'],
    ['entregado','Entregado','Tu pedido fue entregado correctamente.']
  ];
  function norm(st){
    const s=String(st||'').toLowerCase();
    if(s.includes('cancel')) return 'cancelado';
    if(s.includes('entreg')) return 'entregado';
    if(s.includes('enviado')) return 'enviado';
    if(s.includes('tránsito')||s.includes('transito')||s.includes('camino')) return 'enviado';
    if(s.includes('prepar')||s.includes('proveedor')||s.includes('comprando')) return 'preparando_pedido';
    if(s.includes('verificado')||s.includes('aprob')) return 'pago_verificado';
    return 'pedido_recibido';
  }
  function trackingUrl(code){
    try{ return new URL('?tracking='+encodeURIComponent(code||'')+'#estatus', location.origin).href; }
    catch(e){ return 'https://thinkstore.com.ve/?tracking='+encodeURIComponent(code||'')+'#estatus'; }
  }
  const previousNote = (typeof buildPremiumNoteHTML === 'function') ? buildPremiumNoteHTML : null;
  window.tsCleanNoteDeliveryHTML = function(html, order){
    html=String(html||'');
    // La nota de entrega queda como documento formal: sin timeline visual de estado.
    html=html.replace(/<section class="note-section apple-section">\s*<h3>[\s\S]*?ESTADO DEL PEDIDO[\s\S]*?<\/section>\s*/i,'');
    html=html.replace(/<section class="ts-section ts-status-section">[\s\S]*?<\/section>\s*/i,'');
    // El QR permanece, pero funciona como acceso al portal separado de seguimiento.
    html=html.replace(/Escanea para ver tu pedido/gi,'Escanea para abrir el seguimiento online');
    html=html.replace(/ThinkStore\.com\.ve\/seguimiento/gi,'Portal de seguimiento ThinkStore');
    html=html.replace(/Gracias por confiar en ThinkStore\. Pronto recibirás un correo con la actualización de tu pedido\./gi,'Gracias por confiar en ThinkStore. Para consultar el estado actualizado, usa el QR o el enlace de seguimiento.');
    return html;
  };
  if(previousNote){
    buildPremiumNoteHTML = function(order){
      return window.tsCleanNoteDeliveryHTML(previousNote(order), order);
    };
    window.buildPremiumNoteHTML = buildPremiumNoteHTML;
  }
  window.tsStatusLabel = function(st){
    const key=norm(st);
    if(key==='cancelado') return 'Cancelado';
    return (statusMap.find(x=>x[0]===key)||statusMap[0])[1];
  };
  window.tsTrackingUrl = trackingUrl;
  window.tsPremiumTrackingHTML = function(order){
    const active=norm(order?.status);
    const current=Math.max(0,statusMap.findIndex(x=>x[0]===active));
    const products=(order?.items||[]).map(i=>`<li><b>${esc(i.product||i.name||'Producto')}</b><span>${esc([i.color,i.config||i.capacity].filter(Boolean).join(' · ')||'Configuración por confirmar')}</span></li>`).join('') || '<li><b>Producto por confirmar</b><span>Configuración pendiente</span></li>';
    const guide=order?.guideNumber||order?.tracking_number||'';
    const ship=order?.shippingCompany||order?.deliveryType||order?.customer?.shipping||'Por confirmar';
    const currentLabel=active==='cancelado'?'Cancelado':window.tsStatusLabel(order?.status);
    const steps=active==='cancelado'
      ? `<div class="ts-track-cancel">⚫ Este pedido fue cancelado. Si necesitas ayuda, contacta a soporte@thinkstore.com.ve.</div>`
      : statusMap.map((x,i)=>`<div class="ts-track-step ${i<current?'done':i===current?'active':''}"><div class="ts-track-dot">${i<current?'✓':i===current?'●':'○'}</div><div><b>${esc(x[1])}</b><p>${esc(i<current?'Completado':i===current?x[2]:'Pendiente')}</p></div></div>`).join('');
    return `<div class="ts-track-window">
      <div class="ts-track-hero">
        <div><span>Seguimiento ThinkStore</span><h3>${esc(order?.code||'Pedido')}</h3><p>Estado actual: <b>${esc(currentLabel)}</b></p></div>
        <button class="btn ghost" onclick="showPremiumNoteByCode && showPremiumNoteByCode('${esc(order?.code||'')}')">Ver nota de entrega</button>
      </div>
      <div class="ts-track-layout">
        <section class="ts-track-card"><h4>Progreso del pedido</h4>${steps}</section>
        <section class="ts-track-card"><h4>Resumen</h4><div class="ts-track-kv"><span>Cliente</span><b>${esc(order?.customer?.name||order?.customer_name||'Cliente')}</b></div><div class="ts-track-kv"><span>Total</span><b>${money(total(order))}</b></div><div class="ts-track-kv"><span>Envío</span><b>${esc(ship)}</b></div><div class="ts-track-kv"><span>Guía</span><b>${esc(guide||'Pendiente')}</b></div><div class="ts-track-kv"><span>Enlace</span><button class="mini-copy" onclick="tsCopyText&&tsCopyText('${esc(trackingUrl(order?.code||''))}')">Copiar seguimiento</button></div></section>
      </div>
      <section class="ts-track-card ts-track-products"><h4>Productos</h4><ul>${products}</ul></section>
    </div>`;
  };
  window.tsCopyText = window.tsCopyText || function(text){
    if(navigator.clipboard) navigator.clipboard.writeText(text).then(()=>alert('Enlace copiado.'));
    else alert(text);
  };
  const oldCheck = window.checkStatus;
  window.checkStatus = function(){
    const input=document.getElementById('statusCode')||document.getElementById('trackCode');
    const out=document.getElementById('statusResult');
    const code=String(input?.value||'').trim().toUpperCase();
    const all=(window.tsOrders?window.tsOrders():[]).concat(window.orders||[]);
    const order=all.find(o=>String(o.code||o.order_code||'').toUpperCase()===code);
    if(!out) return oldCheck&&oldCheck();
    if(!order){ out.innerHTML='<div class="ts-track-empty"><b>No encontramos ese pedido.</b><p>Verifica el código o inicia sesión con la cuenta usada al comprar.</p></div>'; return; }
    if(!order.code && order.order_code) order.code=order.order_code;
    out.innerHTML=window.tsPremiumTrackingHTML(order);
  };
  window.openStatusFromCode = function(code){
    if(typeof window.openStatus==='function') window.openStatus();
    setTimeout(()=>{ const input=document.getElementById('statusCode')||document.getElementById('trackCode'); if(input) input.value=code; window.checkStatus(); },100);
  };
  // Seguimiento público desactivado: ahora se consulta solo dentro de la cuenta del cliente.
})();


/* ===== ThinkStore Fix - Dashboard clientes completos desde Supabase ===== */
(function(){
  function tsClient(){
    if(window.tsSupabase) return window.tsSupabase;
    if(window.tsSupabaseClient) return window.tsSupabaseClient;
    if(window.supabase && window.THINKSTORE_SUPABASE){
      const cfg=window.THINKSTORE_SUPABASE;
      try{
        window.tsSupabase=window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
        return window.tsSupabase;
      }catch(e){ console.warn('Supabase dashboard fallback:', e); }
    }
    return null;
  }
  function mapClient(c){
    return {
      source: c.source || 'supabase',
      supabase_id: c.supabase_id || c.id || '',
      id: c.cedula_rif || c.document || c.doc || c.id || '',
      name: c.nombre || c.name || c.full_name || 'Cliente',
      email: c.correo || c.email || '',
      phone: c.telefono || c.phone || '',
      state: c.estado || c.state || '',
      city: c.ciudad || c.city || '',
      address: c.direccion || c.address || '',
      ref: c.referencia || c.ref || '',
      shipping: c.metodo_envio_preferido || c.shipping || '',
      agency: c.agencia_destino || c.agency || '',
      created_at: c.created_at || c.createdAt || ''
    };
  }
  const previousRefresh = window.tsRefreshAdminData;
  window.tsRefreshAdminData = async function(opts={}){
    let result = null;
    if(typeof previousRefresh === 'function'){
      try{ result = await previousRefresh(opts); }catch(e){ console.warn('Refresh previo falló:', e); }
    }
    const currentCount = (window.tsAdminRemoteCustomers || []).length;
    if(currentCount > 1) return result || {clientes:window.tsAdminRemoteCustomers||[], pedidos:window.tsAdminRemoteOrders||[]};
    const sb=tsClient();
    if(!sb) return result || {clientes:window.tsAdminRemoteCustomers||[], pedidos:window.tsAdminRemoteOrders||[]};
    try{
      const {data,error}=await sb.from('clientes').select('*').order('created_at',{ascending:false});
      if(error) throw error;
      if(Array.isArray(data)) window.tsAdminRemoteCustomers = data.map(mapClient);
      window.tsAdminLastRefresh = new Date().toISOString();
      if(!opts.silent && typeof tsShowToast==='function') tsShowToast(`✅ ${window.tsAdminRemoteCustomers.length} clientes cargados`);
      return {clientes:window.tsAdminRemoteCustomers||[], pedidos:window.tsAdminRemoteOrders||[]};
    }catch(e){
      console.warn('Fallback clientes Supabase:', e.message || e);
      return result || {clientes:window.tsAdminRemoteCustomers||[], pedidos:window.tsAdminRemoteOrders||[]};
    }
  };
  const previousCustomers = window.tsCustomers;
  window.tsCustomers = function(){
    const all=[];
    const add=(c)=>{
      if(!c) return;
      const n=mapClient(c);
      const key = String(n.supabase_id || n.email || n.phone || n.id || (n.name+'-'+n.created_at)).toLowerCase();
      if(!key) return;
      const idx=all.findIndex(x=>String(x.supabase_id || x.email || x.phone || x.id || (x.name+'-'+x.created_at)).toLowerCase()===key);
      if(idx>=0) all[idx]={...all[idx],...n}; else all.push(n);
    };
    (window.tsAdminRemoteCustomers||[]).forEach(add);
    try{ if(typeof previousCustomers==='function') (previousCustomers()||[]).forEach(add); }catch(e){}
    return all;
  };
})();


/* ===== ThinkStore V50 - Bloqueo de nota hasta verificación de pago ===== */
(function(){
  function statusAllowsDeliveryNote(status){
    const s = String(status || '').toLowerCase();
    return (
      s.includes('pago verificado') ||
      s.includes('prepar') ||
      s.includes('enviado') ||
      s.includes('entregado') ||
      s.includes('disponible') ||
      s.includes('tránsito') ||
      s.includes('transito')
    ) && !s.includes('por verificar') && !s.includes('cancel');
  }
  window.tsCanGenerateDeliveryNote = statusAllowsDeliveryNote;

  function updateCartNoteButton(){
    const btn = document.getElementById('generateNoteBtn');
    if(!btn) return;
    btn.disabled = true;
    btn.classList.add('ts-note-locked');
    btn.innerHTML = '🔒 Nota disponible después de verificar pago';
    btn.title = 'Primero confirma el pedido. ThinkStore verificará el pago y luego se habilitará la nota de entrega.';
    const aside = btn.closest('.checkout-summary');
    if(aside && !aside.querySelector('.ts-note-lock-hint')){
      const p = document.createElement('div');
      p.className = 'ts-note-lock-hint';
      p.innerHTML = 'La nota de entrega se genera únicamente cuando el pago esté verificado por ThinkStore. Mientras tanto puedes confirmar el pedido y cargar tu comprobante.';
      btn.insertAdjacentElement('afterend', p);
    }
  }

  const oldGenerateDeliveryNote = window.generateDeliveryNote || (typeof generateDeliveryNote === 'function' ? generateDeliveryNote : null);
  window.generateDeliveryNote = generateDeliveryNote = function(){
    alert('La nota de entrega se habilita después de que ThinkStore verifique el pago. Confirma tu pedido y carga el comprobante para iniciar la revisión.');
    return false;
  };

  const oldShowPremiumNote = window.showPremiumNote || (typeof showPremiumNote === 'function' ? showPremiumNote : null);
  window.showPremiumNote = showPremiumNote = function(order){
    if(order && !statusAllowsDeliveryNote(order.status || order.estado)){
      alert('Esta nota de entrega aún no está disponible. Primero debe verificarse el pago del pedido.');
      return false;
    }
    return oldShowPremiumNote ? oldShowPremiumNote(order) : false;
  };

  function lockNoteButtonsInHTML(){
    document.querySelectorAll('button').forEach(btn=>{
      const txt=(btn.textContent||'').toLowerCase();
      const hasNote = txt.includes('nota') || (btn.getAttribute('onclick')||'').includes('showPremiumNote');
      if(!hasNote) return;
      const card = btn.closest('.admin-order-card,.ts-myorder-card,.admin-row');
      if(!card) return;
      const statusTxt = (card.textContent||'');
      if(!statusAllowsDeliveryNote(statusTxt)){
        btn.classList.add('ts-disabled-note');
        btn.disabled = true;
        btn.title = 'Disponible después de verificar pago';
      }
    });
  }

  const oldRenderAdminSuite = window.renderAdminSuite;
  if(typeof oldRenderAdminSuite === 'function'){
    window.renderAdminSuite = function(){
      const r = oldRenderAdminSuite.apply(this, arguments);
      setTimeout(lockNoteButtonsInHTML, 80);
      return r;
    };
  }

  const oldRenderOrderCards = window.tsRenderOrderCardsV50;
  if(typeof oldRenderOrderCards === 'function'){
    window.tsRenderOrderCardsV50 = function(list, loading){
      const r = oldRenderOrderCards.apply(this, arguments);
      setTimeout(lockNoteButtonsInHTML, 80);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    updateCartNoteButton();
    setTimeout(lockNoteButtonsInHTML, 400);
  });
  window.addEventListener('load', ()=>{
    updateCartNoteButton();
    setTimeout(lockNoteButtonsInHTML, 800);
  });
})();

/* ===== ThinkStore V55 Premium Experience: Amazon/eBay style UX ===== */
(function(){
  const LS_FAV='ts_wishlist_v55';
  const LS_CMP='ts_compare_v55';
  const LS_REV='ts_reviews_v55';
  const $ = window.$ || ((id)=>document.getElementById(id));
  const esc = (s)=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const money = window.tsMoney || ((n)=>{ const v=Number(n||0); return v?('$'+v.toLocaleString('en-US')):'Por confirmar'; });
  const products = ()=> (typeof productsV2==='function' ? productsV2() : (window.PRODUCTS || []));
  const productById = (id)=>products().find(p=>String(p.id)===String(id));
  function getProductIdFromCard(card){
    const on = card.getAttribute('onclick') || '';
    const m = on.match(/openProduct\(['"]([^'"]+)['"]\)/);
    if(m) return m[1];
    const name = (card.querySelector('h3')?.textContent||'').trim();
    const p = products().find(x=>x.name===name);
    return p?.id || '';
  }
  function favs(){ try{return JSON.parse(localStorage.getItem(LS_FAV)||'[]')}catch(e){return[]} }
  function setFavs(v){ localStorage.setItem(LS_FAV, JSON.stringify([...new Set(v)])); }
  function compares(){ try{return JSON.parse(localStorage.getItem(LS_CMP)||'[]')}catch(e){return[]} }
  function setCompares(v){ localStorage.setItem(LS_CMP, JSON.stringify([...new Set(v)].slice(0,3))); }
  function reviews(){ try{return JSON.parse(localStorage.getItem(LS_REV)||'{}')}catch(e){return{}} }
  function setReviews(v){ localStorage.setItem(LS_REV, JSON.stringify(v)); }
  function productReviews(id){ return reviews()[id] || []; }
  function avg(id){ const r=productReviews(id); return r.length ? (r.reduce((s,x)=>s+Number(x.stars||5),0)/r.length) : 0; }
  function stockInfo(p){
    const inv = window.adminInventory || [];
    const skuMatches = inv.filter(i=>String(i.product||'').toLowerCase().includes(String(p.name||'').toLowerCase()) || String(p.name||'').toLowerCase().includes(String(i.product||'').toLowerCase()));
    const qty = skuMatches.reduce((s,i)=>s+Number(i.stock||0),0);
    const preorder = skuMatches.some(i=>String(i.status||'').toLowerCase().includes('preorden')) || String(p.condition||'').toLowerCase().includes('preorden');
    if(qty>3) return {key:'available', label:'Disponible', hint:'Entrega inmediata según disponibilidad'};
    if(qty>0) return {key:'low', label:'Últimas unidades', hint:'Stock limitado'};
    if(preorder || !skuMatches.length) return {key:'preorder', label:'Bajo pedido', hint:'15 a 25 días hábiles'};
    return {key:'out', label:'Agotado', hint:'Consulta disponibilidad'};
  }
  function stars(n){ const v=Math.round(Number(n||0)); return '★★★★★'.split('').map((s,i)=>`<span class="${i<v?'on':''}">${s}</span>`).join(''); }
  window.tsToggleWishlist = function(id, ev){ if(ev) ev.stopPropagation(); let a=favs(); a=a.includes(id)?a.filter(x=>x!==id):a.concat(id); setFavs(a); refreshEnhancements(); if(typeof tsShowToast==='function') tsShowToast(a.includes(id)?'❤️ Guardado en favoritos':'Favorito removido'); };
  window.tsToggleCompare = function(id, ev){ if(ev) ev.stopPropagation(); let a=compares(); if(a.includes(id)) a=a.filter(x=>x!==id); else { if(a.length>=3){ alert('Puedes comparar hasta 3 productos a la vez.'); return; } a.push(id); } setCompares(a); refreshEnhancements(); };
  window.tsOpenWishlist = function(){ ensureModal(); const list=favs().map(productById).filter(Boolean); const body=$('tsV55ModalBody'); body.innerHTML=`<h2>Favoritos</h2><p class="muted">Productos guardados para revisar después.</p>${list.length?`<div class="ts-v55-product-list">${list.map(p=>miniProduct(p)).join('')}</div>`:'<div class="ts-v55-empty">Aún no tienes favoritos.</div>'}`; openModal(); };
  window.tsOpenCompare = function(){ ensureModal(); const list=compares().map(productById).filter(Boolean); const rows=['Categoría','Precio','Disponibilidad','Configuraciones','Colores','Valoración']; const body=$('tsV55ModalBody'); body.innerHTML=`<h2>Comparar productos</h2><p class="muted">Elige hasta 3 productos para comparar como en una tienda premium.</p>${list.length?`<div class="ts-v55-compare"><table><thead><tr><th>Detalle</th>${list.map(p=>`<th>${esc(p.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><td>${r}</td>${list.map(p=>`<td>${compareValue(p,r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<div class="ts-v55-empty">Agrega productos al comparador desde el catálogo.</div>'}`; openModal(); };
  window.tsAddReview = function(id){
    const name=($('tsReviewName')?.value||'Cliente ThinkStore').trim();
    const starsVal=Number($('tsReviewStars')?.value||5);
    const text=($('tsReviewText')?.value||'').trim();
    if(!text){ alert('Escribe una opinión breve.'); return; }
    const all=reviews(); all[id]=all[id]||[]; all[id].unshift({name, stars:starsVal, text, date:new Date().toLocaleDateString('es-VE')}); setReviews(all);
    injectProductDetail(id); refreshEnhancements();
  };
  function compareValue(p,r){
    const st=stockInfo(p);
    if(r==='Categoría') return esc((typeof getCat==='function'?getCat(p):p.category)||'Apple');
    if(r==='Precio') return money(p.price);
    if(r==='Disponibilidad') return `<span class="ts-stock ${st.key}">${st.label}</span><small>${st.hint}</small>`;
    if(r==='Configuraciones') return esc(((typeof getConfigs==='function'?getConfigs(p):(p.storage||[]))||[]).join(', ')||'Consultar');
    if(r==='Colores') return esc(Object.keys(p.colors||{}).join(', ')||'Consultar');
    if(r==='Valoración') return `<span class="ts-stars">${stars(avg(p.id)||5)}</span><small>${productReviews(p.id).length||'Nuevo'} opiniones</small>`;
    return '';
  }
  function miniProduct(p){ const st=stockInfo(p); const img=(typeof asset==='function'?asset(p.main):p.main); return `<div class="ts-v55-mini"><img src="${esc(img||'logo-thinkstore.png')}" alt="${esc(p.name)}"><div><b>${esc(p.name)}</b><span class="ts-stock ${st.key}">${st.label}</span><small>${st.hint}</small></div><button class="btn ghost" onclick="openProduct('${esc(p.id)}');tsCloseV55Modal();">Ver</button></div>`; }
  function ensureModal(){
    if($('tsV55Modal')) return;
    document.body.insertAdjacentHTML('beforeend',`<div id="tsV55Modal" class="modal ts-v55-modal"><div class="card ts-v55-card"><button class="close" onclick="tsCloseV55Modal()">×</button><div id="tsV55ModalBody"></div></div></div>`);
    window.tsCloseV55Modal=()=>{$('tsV55Modal')?.classList.remove('open')};
  }
  function openModal(){ $('tsV55Modal')?.classList.add('open'); }
  function injectTopButtons(){
    const nav=document.querySelector('nav'); if(!nav || nav.dataset.v55) return; nav.dataset.v55='1';
    // Botones premium de seguimiento/favoritos/comparar ocultos en la página principal.
    // El seguimiento queda solo dentro de la cuenta del cliente.
  }
  function enhanceCards(){
    document.querySelectorAll('.prod').forEach(card=>{
      const id=getProductIdFromCard(card); if(!id || card.querySelector('.ts-v55-card-actions')) return;
      const p=productById(id); if(!p) return; const st=stockInfo(p); const av=avg(id); const fav=favs().includes(id); const cmp=compares().includes(id);
      const photo=card.querySelector('.photo')||card;
      photo.insertAdjacentHTML('beforeend',`<span class="ts-stock ${st.key}">${st.label}</span>`);
      card.insertAdjacentHTML('beforeend',`<div class="ts-v55-rating"><span class="ts-stars">${stars(av||5)}</span><small>${productReviews(id).length?productReviews(id).length+' opiniones':'Nuevo'}</small></div><div class="ts-v55-card-actions"><button class="${fav?'active':''}" onclick="tsToggleWishlist('${esc(id)}',event)">${fav?'♥':'♡'} Favorito</button><button class="${cmp?'active':''}" onclick="tsToggleCompare('${esc(id)}',event)">⚖ Comparar</button></div>`);
    });
  }
  function injectProductDetail(id){
    const p=productById(id); if(!p) return;
    const modal=$('modal'); if(!modal) return;
    let box=$('tsV55ProductPanel');
    if(!box){
      const target=$('features')?.parentElement || modal.querySelector('.card');
      if(!target) return;
      target.insertAdjacentHTML('beforeend','<div id="tsV55ProductPanel" class="ts-v55-product-panel"></div>');
      box=$('tsV55ProductPanel');
    }
    const st=stockInfo(p); const rev=productReviews(id); const av=avg(id)||5;
    box.innerHTML=`<div class="ts-v55-buybox"><div><span class="ts-stock ${st.key}">${st.label}</span><small>${st.hint}</small></div><button class="btn" onclick="addCart&&addCart()">Comprar ahora</button><button class="btn ghost" onclick="tsToggleWishlist('${esc(id)}',event)">${favs().includes(id)?'♥ En favoritos':'♡ Guardar'}</button><button class="btn ghost" onclick="tsToggleCompare('${esc(id)}',event)">⚖ Comparar</button></div><section class="ts-v55-reviews"><div class="ts-v55-reviews-head"><h3>Opiniones de clientes</h3><div><span class="ts-stars">${stars(av)}</span><small>${rev.length||'Nuevo producto'}</small></div></div>${rev.length?rev.slice(0,4).map(r=>`<article><b>${esc(r.name)}</b><span class="ts-stars">${stars(r.stars)}</span><p>${esc(r.text)}</p><small>${esc(r.date)}</small></article>`).join(''):'<p class="muted">Sé el primero en dejar una opinión cuando completes tu compra.</p>'}<div class="ts-v55-review-form"><input id="tsReviewName" placeholder="Tu nombre"><select id="tsReviewStars"><option value="5">★★★★★</option><option value="4">★★★★</option><option value="3">★★★</option></select><input id="tsReviewText" placeholder="Escribe tu opinión"><button class="btn ghost" onclick="tsAddReview('${esc(id)}')">Publicar opinión</button></div></section>`;
  }
  const oldOpen=window.openProduct;
  if(typeof oldOpen==='function'){
    window.openProduct=function(id){ const r=oldOpen.apply(this,arguments); setTimeout(()=>injectProductDetail(id),120); return r; };
  }
  const oldRender=window.render;
  if(typeof oldRender==='function'){
    window.render=function(){ const r=oldRender.apply(this,arguments); setTimeout(refreshEnhancements,60); return r; };
  }
  function enhanceTracking(){
    const card=$('statusModal')?.querySelector('.card'); if(card) card.classList.add('ts-v55-tracking-card');
    const h=$('statusModal')?.querySelector('h2'); if(h) h.innerHTML='Seguimiento de pedido';
  }
  function enhanceDashboard(){
    const dash=document.getElementById('admin-dashboard'); if(!dash || dash.querySelector('.ts-v55-dashboard-extra')) return;
    const target=dash.querySelector('.admin-two-col') || dash;
    target.insertAdjacentHTML('afterend',`<div class="ts-v55-dashboard-extra"><div class="admin-card"><h3>Rendimiento</h3><div id="tsV55SalesBars" class="ts-v55-bars"></div></div><div class="admin-card"><h3>Experiencia Premium</h3><div class="mini-row"><b>Favoritos</b><span id="tsV55FavCount">0</span></div><div class="mini-row"><b>Comparador</b><span id="tsV55CompareCount">0</span></div><div class="mini-row"><b>Opiniones</b><span id="tsV55ReviewCount">0</span></div></div></div>`);
    updateDashboardExtras();
  }
  function updateDashboardExtras(){
    const fav=$('tsV55FavCount'), cmp=$('tsV55CompareCount'), rev=$('tsV55ReviewCount'), bars=$('tsV55SalesBars');
    if(fav) fav.textContent=favs().length;
    if(cmp) cmp.textContent=compares().length;
    if(rev) rev.textContent=Object.values(reviews()).reduce((s,a)=>s+a.length,0);
    if(bars){
      const orders = (window.tsOrders?window.tsOrders():window.orders||[]);
      const states=['Pedido recibido','Pago verificado','En preparación','Enviado','Entregado'];
      bars.innerHTML=states.map(st=>{const n=orders.filter(o=>String(o.status||o.estado||'').toLowerCase().includes(st.toLowerCase().split(' ')[0])).length; const w=Math.min(100,Math.max(8,n*18)); return `<div><span>${st}</span><b>${n}</b><i style="width:${w}%"></i></div>`}).join('');
    }
  }
  function refreshEnhancements(){ injectTopButtons(); enhanceCards(); enhanceTracking(); enhanceDashboard(); updateDashboardExtras(); }
  window.tsRefreshV55 = refreshEnhancements;
  document.addEventListener('DOMContentLoaded',()=>setTimeout(refreshEnhancements,500));
  window.addEventListener('load',()=>setTimeout(refreshEnhancements,700));
  setInterval(()=>{ if(document.body) refreshEnhancements(); },4000);
})();

/* ===== ThinkStore V55.2 - Auditoría UX aplicada: compra, pedidos y cliente ===== */
(function(){
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  function getProducts(){ try { return (typeof productsV2==='function' ? productsV2() : (window.PRODUCTS || PRODUCTS || [])); } catch(e){ return []; } }
  function getProduct(id){ return getProducts().find(p=>String(p.id)===String(id)); }
  function imgSrc(p){ try { return (typeof asset==='function' ? asset(p.main || Object.values(p.colors||{})[0]) : (p.main||'')); } catch(e){ return p.main||''; } }
  function money(v){ const n=Number(v||0); return n ? '$'+n.toLocaleString('es-VE') : 'Por confirmar'; }
  function colorHex(name){
    const s=String(name||'').toLowerCase();
    if(s.includes('black')||s.includes('negro')||s.includes('space')) return '#1d1d1f';
    if(s.includes('white')||s.includes('blanco')||s.includes('silver')||s.includes('plata')) return '#e9e9eb';
    if(s.includes('blue')||s.includes('azul')) return '#9bb7d4';
    if(s.includes('pink')||s.includes('rosa')) return '#f7c8d5';
    if(s.includes('green')||s.includes('verde')) return '#a8c3a0';
    if(s.includes('yellow')||s.includes('amarillo')) return '#f5dc7a';
    if(s.includes('purple')||s.includes('morado')) return '#b8a1d9';
    if(s.includes('orange')||s.includes('naranja')||s.includes('desert')) return '#d79b67';
    if(s.includes('gold')||s.includes('oro')||s.includes('champagne')) return '#d8c39a';
    if(s.includes('natural')||s.includes('titanium')||s.includes('titanio')) return '#b8b1a7';
    return '#c7c7cc';
  }

  function injectCheckoutStepper(){
    const head=document.querySelector('.checkout-head');
    if(!head || document.querySelector('.ts-v552-stepper')) return;
    head.insertAdjacentHTML('afterend', `<div class="ts-v552-stepper" aria-label="Pasos de compra">
      <div class="ts-v552-step active" data-step="productos"><span>1</span><div>Productos<small>Carrito</small></div></div>
      <div class="ts-v552-step" data-step="datos"><span>2</span><div>Datos<small>Cliente</small></div></div>
      <div class="ts-v552-step" data-step="envio"><span>3</span><div>Envío<small>Entrega</small></div></div>
      <div class="ts-v552-step" data-step="pago"><span>4</span><div>Pago<small>Comprobante</small></div></div>
      <div class="ts-v552-step" data-step="confirmacion"><span>5</span><div>Confirmación<small>Pedido</small></div></div>
    </div>`);
    updateCheckoutStepper();
  }
  function updateCheckoutStepper(){
    const steps=[...document.querySelectorAll('.ts-v552-step')]; if(!steps.length) return;
    let active=0;
    try{
      if((window.cart||[]).length) active=1;
      if(window.currentUser || window.currentClient) active=2;
      if(($('deliveryType')?.value||'').trim()) active=3;
      if(($('paymentRef')?.value||'').trim() || ($('paymentFile')?.files||[]).length) active=4;
    }catch(e){}
    steps.forEach((s,i)=>{ s.classList.toggle('active',i===active); s.classList.toggle('done',i<active); });
  }
  ['paymentRef','paymentAmount','paymentFile','deliveryType','payMethod'].forEach(id=>document.addEventListener('change', e=>{ if(e.target && e.target.id===id) updateCheckoutStepper(); }, true));
  document.addEventListener('input', updateCheckoutStepper, true);
  const oldOpenCart=window.openCart;
  if(typeof oldOpenCart==='function') window.openCart=function(){ const r=oldOpenCart.apply(this,arguments); setTimeout(()=>{injectCheckoutStepper();updateCheckoutStepper();},80); return r; };

  function favIds(){ try{return JSON.parse(localStorage.getItem('ts_wishlist_v55')||'[]');}catch(e){return [];} }
  function orders(){ try{return (window.tsOrders?window.tsOrders():(window.orders||[]));}catch(e){return [];} }
  function customer(){ return window.currentUser || window.currentClient || {}; }

  function accountPaneHTML(kind){
    const c=customer();
    const list=orders();
    if(kind==='pedidos') return `<h3>Mis pedidos</h3><div id="myOrders" class="admin-list"></div>`;
    if(kind==='preordenes'){
      const pre=list.filter(o=>String(o.status||o.estado||'').toLowerCase().includes('preorden') || (o.items||[]).some(i=>String(i.condition||'').toLowerCase().includes('pre')));
      return `<h3>Mis preórdenes</h3>${pre.length?`<div class="ts-v552-grid">${pre.map(o=>`<div class="ts-v552-card"><b>${esc(o.code||o.codigo||'Preorden')}</b><small>${esc(o.status||o.estado||'En seguimiento')}</small><p>${esc((o.items||[]).map(i=>i.product||i.producto).join(', ')||'Producto en preorden')}</p><button class="btn ghost" onclick="openStatusFromCode&&openStatusFromCode('${esc(o.code||o.codigo||'')}')">Ver seguimiento</button></div>`).join('')}</div>`:'<div class="ts-v552-empty">Aún no tienes preórdenes registradas.</div>'}`;
    }
    if(kind==='favoritos'){
      const fav=favIds().map(getProduct).filter(Boolean);
      return `<h3>Favoritos</h3>${fav.length?`<div class="ts-v55-product-list">${fav.map(p=>`<div class="ts-v55-mini"><img src="${esc(imgSrc(p))}" alt="${esc(p.name)}"><div><b>${esc(p.name)}</b><small>${money(p.price)}</small></div><button class="btn ghost" onclick="openProduct('${esc(p.id)}')">Ver</button></div>`).join('')}</div>`:'<div class="ts-v552-empty">Guarda productos con el botón ❤️ Favorito.</div>'}`;
    }
    if(kind==='garantias'){
      const delivered=list.filter(o=>String(o.status||o.estado||'').toLowerCase().includes('entreg'));
      return `<h3>Garantías</h3>${delivered.length?`<div class="ts-v552-grid">${delivered.map(o=>`<div class="ts-v552-card"><b>Garantía activa</b><small>Pedido ${esc(o.code||o.codigo||'')}</small><p>Conserva tu nota de entrega. Soporte ThinkStore disponible para revisión y diagnóstico.</p><button class="btn ghost" onclick="tsAccountTab('soporte')">Solicitar soporte</button></div>`).join('')}</div>`:'<div class="ts-v552-empty">Tus garantías aparecerán cuando un pedido sea entregado.</div>'}`;
    }
    if(kind==='direcciones') return `<h3>Direcciones guardadas</h3><div class="ts-v552-grid"><div class="ts-v552-card"><b>Dirección principal</b><p>${esc(c.address||c.direccion||'No has guardado una dirección todavía.')}</p><small>${esc([c.city||c.ciudad,c.state||c.estado].filter(Boolean).join(', '))}</small></div><div class="ts-v552-card"><b>Entrega preferida</b><p>${esc(c.shipping||c.metodo_envio_preferido||'Por definir')}</p><small>${esc(c.agency||c.agencia_destino||'')}</small></div></div>`;
    return `<h3>Soporte ThinkStore</h3><div class="ts-v552-card"><b>Centro de soporte</b><p>Abre un caso por garantía, pedido, preorden o asesoría de compra.</p><div class="ts-v552-support-form"><input id="tsSupportSubject" placeholder="Asunto"><textarea id="tsSupportMessage" rows="4" placeholder="Describe tu solicitud"></textarea><button class="btn" onclick="tsSendSupportTicket()">Enviar solicitud</button></div></div>`;
  }
  window.tsAccountTab=function(kind){
    document.querySelectorAll('.ts-v552-account-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===kind));
    const pane=$('tsV552AccountPane'); if(pane) pane.innerHTML=accountPaneHTML(kind);
    if(kind==='pedidos' && typeof window.tsFetchMySupabaseOrders==='function'){
      try{ window.tsFetchMySupabaseOrders().then(list=>{ if(list && window.tsRenderOrderCards) window.tsRenderOrderCards(list,false); }).catch(()=>{}); }catch(e){}
    } else if(kind==='pedidos' && typeof window.tsRenderOrderCards==='function') window.tsRenderOrderCards(orders(),false);
  };
  window.tsSendSupportTicket=function(){
    const subj=($('tsSupportSubject')?.value||'Solicitud de soporte ThinkStore').trim();
    const msg=($('tsSupportMessage')?.value||'').trim();
    if(!msg) return alert('Escribe el detalle de tu solicitud.');
    const c=customer();
    const body=`Hola ThinkStore, necesito soporte.\n\nCliente: ${c.name||c.nombre||''}\nCorreo: ${c.email||c.correo||''}\nAsunto: ${subj}\n\n${msg}`;
    window.open('https://wa.me/584141032030?text='+encodeURIComponent(body),'_blank');
  };
  function enhanceAccount(){
    const logged=$('accountLoggedIn'); if(!logged || logged.querySelector('.ts-v552-account-tabs')) return;
    const original=$('myOrders');
    if(original){ original.insertAdjacentHTML('beforebegin', `<div class="ts-v552-account-tabs"><button class="active" data-tab="pedidos" onclick="tsAccountTab('pedidos')">📦 Pedidos</button><button data-tab="preordenes" onclick="tsAccountTab('preordenes')">⏳ Preórdenes</button><button data-tab="favoritos" onclick="tsAccountTab('favoritos')">❤️ Favoritos</button><button data-tab="garantias" onclick="tsAccountTab('garantias')">🛡️ Garantías</button><button data-tab="direcciones" onclick="tsAccountTab('direcciones')">📍 Direcciones</button><button data-tab="soporte" onclick="tsAccountTab('soporte')">🎫 Soporte</button></div><div id="tsV552AccountPane" class="ts-v552-pane active"></div>`); }
  }
  const oldRenderAccount=window.renderAccount;
  if(typeof oldRenderAccount==='function') window.renderAccount=function(){ const r=oldRenderAccount.apply(this,arguments); setTimeout(()=>{ enhanceAccount(); tsAccountTab('pedidos'); },120); return r; };

  function productQuickHTML(p){
    const configs=(typeof getConfigs==='function'?getConfigs(p):[]).slice(0,4).join(' · ') || 'Capacidades según disponibilidad';
    const colors=Object.keys(p.colors||{}).slice(0,5).join(' · ') || 'Colores disponibles';
    const days=(String(p.badge||p.category||'').toLowerCase().includes('pre')?'15-25 días hábiles':'Entrega o retiro coordinado');
    return `<div class="ts-v552-product-quick"><div><b>Disponibilidad</b><small>${days}</small></div><div><b>Capacidades</b><small>${esc(configs)}</small></div><div><b>Colores</b><small>${esc(colors)}</small></div></div>`;
  }
  function relatedHTML(p){
    const cat=(typeof getCat==='function'?getCat(p):p.category)||'';
    const related=getProducts().filter(x=>x.id!==p.id && ((typeof getCat==='function'?getCat(x):x.category)===cat)).slice(0,3);
    if(!related.length) return '';
    return `<section class="ts-v552-product-related"><h3>También te puede interesar</h3><div class="ts-v552-related-row">${related.map(r=>`<div class="ts-v552-related-card" onclick="openProduct('${esc(r.id)}')"><img src="${esc(imgSrc(r))}" alt="${esc(r.name)}"><b>${esc(r.name)}</b><small>${money(r.price)}</small></div>`).join('')}</div></section>`;
  }
  function enhanceColorButtons(){
    document.querySelectorAll('#colors .opt').forEach(btn=>{
      if(btn.dataset.v552) return; btn.dataset.v552='1';
      const name=btn.textContent.trim();
      btn.classList.add('ts-v552-color-chip');
      btn.innerHTML=`<span class="ts-v552-color-dot" style="background:${colorHex(name)}"></span>${esc(name)}`;
    });
  }
  function enhanceProductDetail(id){
    const p=getProduct(id); if(!p) return;
    const target=$('productMeta') || $('features')?.parentElement; if(!target) return;
    let box=$('tsV552ProductUX');
    if(!box){ target.insertAdjacentHTML('afterend','<div id="tsV552ProductUX"></div>'); box=$('tsV552ProductUX'); }
    box.innerHTML=productQuickHTML(p)+relatedHTML(p);
    enhanceColorButtons();
  }
  const oldOpenProduct=window.openProduct;
  if(typeof oldOpenProduct==='function') window.openProduct=function(id){ const r=oldOpenProduct.apply(this,arguments); setTimeout(()=>enhanceProductDetail(id),140); return r; };
  const oldDrawDetail=window.drawDetail;
  if(typeof oldDrawDetail==='function') window.drawDetail=function(){ const r=oldDrawDetail.apply(this,arguments); setTimeout(()=>{ try{enhanceColorButtons(); if(window.selectedProduct) enhanceProductDetail(window.selectedProduct.id);}catch(e){} },50); return r; };

  function refineTracking(){ document.querySelectorAll('.ts-track-window').forEach(el=>el.classList.add('ts-v552-track-refined')); }
  const oldCheckStatus=window.checkStatus;
  if(typeof oldCheckStatus==='function') window.checkStatus=function(){ const r=oldCheckStatus.apply(this,arguments); setTimeout(refineTracking,80); return r; };

  function dashboardNotice(){
    const dash=$('admin-dashboard'); if(!dash || dash.querySelector('.ts-v552-dashboard-notice')) return;
    const customers=(window.tsCustomers?window.tsCustomers():[]).length;
    const pedidos=(window.tsOrders?window.tsOrders():[]).length;
    dash.insertAdjacentHTML('afterbegin',`<div class="ts-v552-dashboard-notice"><b>Panel Enterprise activo</b><small>Supabase conectado · ${customers} clientes · ${pedidos} pedidos. Usa actualizar datos si no ves los registros recientes.</small></div>`);
  }
  const oldRenderAdminSuite=window.renderAdminSuite;
  if(typeof oldRenderAdminSuite==='function') window.renderAdminSuite=function(){ const r=oldRenderAdminSuite.apply(this,arguments); setTimeout(dashboardNotice,120); return r; };
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{ injectCheckoutStepper(); enhanceAccount(); dashboardNotice(); },700));
  window.addEventListener('load',()=>setTimeout(()=>{ injectCheckoutStepper(); enhanceAccount(); dashboardNotice(); },900));
})();

/* ThinkStore Marketing Professional */
(function(){
  function q(id){ return document.getElementById(id); }
  function adminSecretValue(){ return sessionStorage.getItem('thinkstore_admin_secret') || localStorage.getItem('thinkstore_admin_secret') || ''; }
  function val(id, fallback=''){ return (q(id)?.value || fallback).trim(); }
  function set(id, value){ if(q(id)) q(id).value = value; }

  window.tsMarketingFillDemo = function(){
    set('mkAudience','all');
    set('mkSubject','Novedades ThinkStore | Disponibilidad Apple');
    set('mkTitle','Nuevas ofertas disponibles');
    set('mkSubtitle','Descubre equipos Apple, accesorios originales y preórdenes exclusivas.');
    set('mkMessage','Hola, tenemos nuevas opciones disponibles en ThinkStore. Puedes consultar disponibilidad, precios y apartados directamente desde nuestra web o respondiendo este correo.');
    set('mkProductName','iPhone 16 Pro Max');
    set('mkProductDetails','Disponible en varias capacidades y colores. Atención personalizada, envíos nacionales y retiro en tienda física en Altamira.');
    set('mkOffer','Oferta especial por tiempo limitado');
    set('mkActionUrl','https://thinkstore.com.ve');
    set('mkActionLabel','Ver catálogo');
    tsMarketingPreview();
  };

  function marketingPayload(){
    return {
      audience: val('mkAudience','all'),
      testEmail: val('mkTestEmail'),
      subject: val('mkSubject','Novedades ThinkStore'),
      title: val('mkTitle','Nuevas ofertas disponibles'),
      subtitle: val('mkSubtitle','Productos Apple, accesorios y preórdenes exclusivas.'),
      message: val('mkMessage','Tenemos novedades disponibles para ti.'),
      productName: val('mkProductName','Producto destacado ThinkStore'),
      productDetails: val('mkProductDetails','Disponibilidad, garantía y asesoría especializada.'),
      offer: val('mkOffer','Consulta precio y disponibilidad'),
      actionUrl: val('mkActionUrl','https://thinkstore.com.ve'),
      actionLabel: val('mkActionLabel','Ver promoción'),
      bannerUrl: val('mkBannerUrl'),
      logoUrl: 'https://thinkstore.com.ve/assets/thinkstore-email-logo.jpg'
    };
  }

  window.tsMarketingPreview = function(){
    const p = marketingPayload();
    const preview = q('mkPreview');
    if(!preview) return;
    preview.innerHTML = `
      <div class="mk-email-card">
        <div class="mk-email-hero">
          <img src="assets/thinkstore-email-logo.jpg" onerror="this.src='assets/logo-thinkstore.png'" alt="ThinkStore">
          <small>Promoción exclusiva</small>
          <h2>${p.title}</h2>
          <p>${p.subtitle}</p>
        </div>
        <div class="mk-email-body">
          ${p.bannerUrl ? `<img class="mk-banner" src="${p.bannerUrl}" alt="Banner">` : ''}
          <p>${p.message.replace(/\n/g,'<br>')}</p>
          <div class="mk-product">
            <span>Producto destacado</span>
            <b>${p.productName}</b>
            <p>${p.productDetails}</p>
            <strong>${p.offer}</strong>
          </div>
          <button>${p.actionLabel}</button>
        </div>
      </div>`;
  };

  window.tsSendMarketingCampaign = async function(){
    const result = q('mkResult');
    const secret = adminSecretValue();
    if(!secret){ alert('Abre el panel con tu código administrador antes de enviar campañas.'); return; }
    const payload = marketingPayload();
    if(payload.audience === 'test' && !payload.testEmail){ alert('Coloca un correo de prueba.'); return; }
    if(!confirm('¿Enviar esta campaña ThinkStore?')) return;
    if(result) result.textContent = 'Enviando campaña...';
    try{
      const res = await fetch('/.netlify/functions/send-campaign', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-admin-secret': secret },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      if(!res.ok || !data.ok) throw new Error(data.error || 'No se pudo enviar la campaña.');
      if(result) result.textContent = `✅ Campaña enviada: ${data.sent}/${data.total} correos. Fallidos: ${data.failed || 0}`;
      alert(`Campaña enviada: ${data.sent}/${data.total}`);
    }catch(e){
      if(result) result.textContent = '❌ ' + (e.message || e);
      alert('No se pudo enviar la campaña: ' + (e.message || e));
    }
  };

  const oldOpenMassEmail = window.openMassEmail;
  window.openMassEmail = function(){
    const suite = document.getElementById('adminSuiteModal');
    if(suite && suite.classList.contains('open') && typeof window.adminTab === 'function'){
      window.adminTab('marketing');
      setTimeout(()=>{ if(!val('mkSubject')) window.tsMarketingFillDemo(); }, 80);
      return;
    }
    if(typeof oldOpenMassEmail === 'function') oldOpenMassEmail();
  };

  document.addEventListener('input', function(e){
    if(e.target && /^mk/.test(e.target.id || '')) window.tsMarketingPreview();
  });
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(()=>{ if(q('mkPreview')) window.tsMarketingFillDemo(); }, 500); });
})();


/* ===== ThinkStore V56 - 5 Funciones Pro: Tracking, Factura, Wishlist, Carrito abandonado, Estadísticas ===== */
(function(){
  const $ = (id)=>document.getElementById(id);
  const readJSON=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'')}catch(_){return f}};
  const writeJSON=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const money=(n)=>'$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const clean=(v)=>String(v||'').trim();
  const adminSecret=()=>sessionStorage.getItem('thinkstore_admin_secret')||localStorage.getItem('thinkstore_admin_secret')||'';
  const getOrders=()=> (typeof window.tsOrders==='function'?window.tsOrders():[]) || window.adminOrders || window.orders || [];
  const getCustomers=()=> (typeof window.tsCustomers==='function'?window.tsCustomers():[]) || window.adminCustomers || window.clientes || [];
  const flow=['Pedido recibido','Pago por verificar','Pago recibido','Pago verificado','Preparando pedido','En tránsito','Disponible para entrega','Entregado'];
  function orderCode(o){ return clean(o.codigo||o.code||o.order_code||o.id||o.numero||'TS'); }
  function orderStatus(o){ return clean(o.estado||o.status||'Pedido recibido'); }
  function orderTotal(o){ return Number(o.total_usd||o.total||o.monto||0); }
  function orderCustomer(o){ const c=o.clientes||o.cliente||{}; return clean(c.nombre||o.customer_name||o.nombre||'Cliente'); }
  function orderEmail(o){ const c=o.clientes||o.cliente||{}; return clean(c.correo||c.email||o.customer_email||o.correo||o.email||''); }
  function itemName(i){ return clean(i.producto||i.product_name||i.product||i.nombre||i.name||'Producto'); }

  window.tsTrackingProgressHtml=function(status){
    let pos=flow.indexOf(status); if(status==='En preparación') pos=flow.indexOf('Preparando pedido'); if(pos<0) pos=0;
    return `<div class="ts-pro-track">${flow.map((s,i)=>`<div class="ts-pro-step ${i<pos?'done':i===pos?'active':''}"><span>${i<pos?'✓':i===pos?'●':'○'}</span><b>${s}</b></div>`).join('')}</div>`;
  };

  window.tsOpenTrackingPro=function(code){
    const orders=getOrders();
    const o=orders.find(x=>orderCode(x)===code||String(x.id)===String(code))||{};
    const status=orderStatus(o);
    const items=o.pedido_items||o.items||[];
    const html=`<div class="modal open" id="tsTrackingProModal"><div class="card ts-pro-modal"><button class="close" onclick="document.getElementById('tsTrackingProModal').remove()">×</button><img src="assets/logo-thinkstore.png" class="ts-pro-logo"><small>Seguimiento ThinkStore</small><h2>${orderCode(o)||code}</h2><p>Estado actual: <b>${status}</b></p>${window.tsTrackingProgressHtml(status)}<div class="ts-pro-details"><b>Cliente</b><span>${orderCustomer(o)}</span><b>Total</b><span>${money(orderTotal(o))}</span><b>Productos</b><span>${items.length?items.map(itemName).join('<br>'):'Producto por confirmar'}</span></div><div class="action-row"><button class="btn" onclick="window.tsPrintInvoice('${orderCode(o)||code}')">Descargar factura / nota</button><button class="btn ghost" onclick="location.href='https://thinkstore.com.ve/#seguimiento'">Ver en la web</button></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend',html);
  };

  window.tsPrintInvoice=function(code){
    const orders=getOrders(); const o=orders.find(x=>orderCode(x)===code||String(x.id)===String(code))||{};
    const items=o.pedido_items||o.items||[];
    const w=window.open('','_blank');
    const rows=(items.length?items:[{producto:'Producto por confirmar',cantidad:1,precio:orderTotal(o)}]).map(i=>`<tr><td>${itemName(i)}</td><td>${clean(i.color||'')}</td><td>${clean(i.capacidad||i.capacity||'')}</td><td>${i.cantidad||i.qty||1}</td><td>${money(i.precio||i.price_usd||0)}</td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Factura ${orderCode(o)||code}</title><style>body{font-family:Arial,sans-serif;color:#111;margin:40px}.head{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding-bottom:20px}.logo{width:150px}h1{font-size:28px}table{width:100%;border-collapse:collapse;margin-top:28px}td,th{border-bottom:1px solid #eee;padding:12px;text-align:left}.total{text-align:right;font-size:24px;font-weight:800;margin-top:22px}.foot{margin-top:40px;color:#666;font-size:13px}</style></head><body><div class="head"><div><img class="logo" src="https://thinkstore.com.ve/assets/logo-thinkstore.png"><h1>Nota de entrega / Factura</h1><p><b>Pedido:</b> ${orderCode(o)||code}<br><b>Estado:</b> ${orderStatus(o)}<br><b>Fecha:</b> ${new Date().toLocaleDateString()}</p></div><div><b>ThinkStore</b><br>Altamira, Caracas<br>www.thinkstore.com.ve</div></div><h2>Cliente</h2><p>${orderCustomer(o)}<br>${orderEmail(o)}</p><table><thead><tr><th>Producto</th><th>Color</th><th>Capacidad</th><th>Cant.</th><th>Precio</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Total: ${money(orderTotal(o))}</div><p class="foot">Documento generado por ThinkStore. Para validar este pedido, consulta el seguimiento en thinkstore.com.ve.</p><script>window.print()<\/script></body></html>`);
    w.document.close();
  };

  window.tsWishlistToggle=function(productKey, name){
    const list=readJSON('ts_wishlist',[]); const key=clean(productKey||name);
    const idx=list.findIndex(x=>x.key===key);
    if(idx>=0) list.splice(idx,1); else list.push({key,name:name||key,created_at:new Date().toISOString()});
    writeJSON('ts_wishlist',list); window.tsRenderWishlistCount(); return idx<0;
  };
  window.tsRenderWishlistCount=function(){
    const count=(readJSON('ts_wishlist',[])||[]).length;
    document.querySelectorAll('[data-ts-wishlist-count]').forEach(el=>el.textContent=count);
  };
  function injectWishlistButtons(){
    document.querySelectorAll('.product-card,.card-product,.catalog-card,[data-product-id]').forEach((card,idx)=>{
      if(card.querySelector('.ts-wish-btn')) return;
      const name=(card.querySelector('h3,h2,.product-title')?.textContent||card.getAttribute('data-product-id')||('Producto '+idx)).trim();
      const btn=document.createElement('button'); btn.className='ts-wish-btn'; btn.type='button'; btn.innerHTML='♡'; btn.title='Guardar en favoritos';
      btn.onclick=(ev)=>{ev.stopPropagation(); const added=window.tsWishlistToggle(name,name); btn.innerHTML=added?'♥':'♡'; if(typeof tsShowToast==='function') tsShowToast(added?'Agregado a favoritos':'Quitado de favoritos');};
      card.style.position='relative'; card.appendChild(btn);
    });
  }

  window.tsSendAbandonedCart=function(email){
    const cart=readJSON('cart',[])||readJSON('ts_cart',[])||[];
    const to=clean(email||prompt('Correo del cliente para recuperación de carrito:')||'');
    if(!to) return;
    fetch('/.netlify/functions/send-abandoned-cart',{method:'POST',headers:{'Content-Type':'application/json','x-admin-secret':adminSecret()},body:JSON.stringify({email:to,cart})})
      .then(r=>r.json()).then(d=>{ if(!d.ok) throw new Error(d.error||'No enviado'); alert('Correo de recuperación enviado.');})
      .catch(e=>alert('No se pudo enviar recuperación: '+(e.message||e)));
  };

  window.tsSendInvoiceEmail=function(code){
    const orders=getOrders(); const o=orders.find(x=>orderCode(x)===code||String(x.id)===String(code))||{};
    fetch('/.netlify/functions/send-invoice',{method:'POST',headers:{'Content-Type':'application/json','x-admin-secret':adminSecret()},body:JSON.stringify({order:o,code:orderCode(o)||code})})
      .then(r=>r.json()).then(d=>{ if(!d.ok) throw new Error(d.error||'No enviado'); alert('Factura / nota enviada al cliente.');})
      .catch(e=>alert('No se pudo enviar factura: '+(e.message||e)));
  };

  function injectAdminProButtons(){
    const box=$('adminOrdersList'); if(!box) return;
    box.querySelectorAll('.admin-card,.order-card,.admin-order-card').forEach(card=>{
      if(card.querySelector('.ts-pro-actions')) return;
      const txt=card.textContent||''; const m=txt.match(/TS-\d{4}-\d{4}/); if(!m) return;
      card.insertAdjacentHTML('beforeend',`<div class="ts-pro-actions"><button class="btn ghost" onclick="tsOpenTrackingPro('${m[0]}')">Seguimiento premium</button><button class="btn ghost" onclick="tsPrintInvoice('${m[0]}')">Factura PDF</button><button class="btn ghost" onclick="tsSendInvoiceEmail('${m[0]}')">Enviar factura</button></div>`);
    });
  }

  function enhanceDashboardStats(){
    const root=document.querySelector('#admin-dashboard .admin-kpi-grid'); if(!root||document.getElementById('tsAdvancedStats')) return;
    const orders=getOrders(); const customers=getCustomers();
    const total=orders.reduce((s,o)=>s+orderTotal(o),0); const delivered=orders.filter(o=>/entregado/i.test(orderStatus(o))).length;
    const avg=orders.length?total/orders.length:0;
    root.insertAdjacentHTML('afterend',`<div id="tsAdvancedStats" class="ts-advanced-stats"><div><span>Ticket promedio</span><b>${money(avg)}</b></div><div><span>Entregados</span><b>${delivered}</b></div><div><span>Clientes activos</span><b>${customers.length}</b></div><div><span>Ventas estimadas</span><b>${money(total)}</b></div></div>`);
  }

  const oldRenderAdminSuite=window.renderAdminSuite;
  if(typeof oldRenderAdminSuite==='function') window.renderAdminSuite=function(){ const r=oldRenderAdminSuite.apply(this,arguments); setTimeout(()=>{injectAdminProButtons(); enhanceDashboardStats();},250); return r; };
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{injectWishlistButtons();window.tsRenderWishlistCount();enhanceDashboardStats();},900); setInterval(()=>{injectWishlistButtons();injectAdminProButtons();},2500);});
})();


/* ===== ThinkStore Fix Login Seguro: navegación y seguimiento solo desde cuenta ===== */
(function(){
  function $(id){ return document.getElementById(id); }
  function getUser(){
    try{
      const raw = localStorage.getItem('ts_current_user');
      const user = raw ? JSON.parse(raw) : null;
      return user && (user.email || user.id || user.supabase_id) ? user : null;
    }catch(e){ return null; }
  }
  function sameClient(order, user){
    if(!order || !user) return false;
    const c = order.customer || {};
    const valsOrder = [order.cliente_id, order.customer_id, order.customerEmail, order.customer_email, order.email, c.id, c.email, c.phone].filter(Boolean).map(v=>String(v).toLowerCase());
    const valsUser = [user.supabase_id, user.id, user.email, user.phone].filter(Boolean).map(v=>String(v).toLowerCase());
    return valsOrder.some(v=>valsUser.includes(v));
  }
  window.tsUpdateClientNav = function(){
    const btn = $('clientNavBtn');
    if(!btn) return;
    const logged = !!getUser();
    btn.textContent = logged ? '👤 Cuenta' : '👤 Login';
    btn.setAttribute('aria-label', logged ? 'Abrir cuenta' : 'Iniciar sesión');
  };
  window.tsClientNavAction = function(){
    if(getUser()){
      if(typeof window.openAccount === 'function') return window.openAccount();
    }
    if(typeof window.openClientLogin === 'function') return window.openClientLogin();
  };

  const oldOpenStatus = window.openStatus;
  window.openStatus = function(){
    if(!getUser()){
      if(typeof window.openClientLogin === 'function') window.openClientLogin();
      alert('Inicia sesión para ver el seguimiento de tus pedidos.');
      return;
    }
    return oldOpenStatus && oldOpenStatus.apply(this, arguments);
  };

  window.openStatusFromCode = function(code){
    if(!getUser()){
      if(typeof window.openClientLogin === 'function') window.openClientLogin();
      return;
    }
    window.openStatus();
    setTimeout(()=>{
      const input = $('statusCode') || $('trackCode');
      if(input) input.value = code || '';
      if(typeof window.checkStatus === 'function') window.checkStatus();
    },100);
  };

  window.checkStatus = function(){
    const user = getUser();
    const input = $('statusCode') || $('trackCode');
    const out = $('statusResult');
    const code = String(input?.value || '').trim().toUpperCase();
    if(!out) return;
    if(!user){
      out.innerHTML = '<div class="ts-track-empty"><b>Inicia sesión para consultar tus pedidos.</b><p>Por seguridad, el seguimiento solo está disponible dentro de tu cuenta ThinkStore.</p></div>';
      return;
    }
    const all = (window.tsOrders ? window.tsOrders() : []).concat(window.orders || []);
    const order = all.find(o => String(o.code || o.order_code || '').trim().toUpperCase() === code && sameClient(o, user));
    if(!order){
      out.innerHTML = '<div class="ts-track-empty"><b>No encontramos ese pedido en tu cuenta.</b><p>Verifica el código o inicia sesión con la cuenta usada al comprar.</p></div>';
      return;
    }
    if(!order.code && order.order_code) order.code = order.order_code;
    if(typeof window.tsPremiumTrackingHTML === 'function') out.innerHTML = window.tsPremiumTrackingHTML(order);
    else out.innerHTML = '<b>'+String(order.code||'Pedido')+'</b><br>Estatus: <b>'+String(order.status||order.estado||'Pedido recibido')+'</b>';
  };

  const oldLogin = window.loginClient;
  if(typeof oldLogin === 'function'){
    window.loginClient = async function(){
      const r = await oldLogin.apply(this, arguments);
      setTimeout(window.tsUpdateClientNav, 150);
      return r;
    };
  }
  const oldLogout = window.logoutClient;
  if(typeof oldLogout === 'function'){
    window.logoutClient = async function(){
      const r = await oldLogout.apply(this, arguments);
      setTimeout(window.tsUpdateClientNav, 150);
      return r;
    };
  }
  document.addEventListener('DOMContentLoaded', window.tsUpdateClientNav);
  window.addEventListener('storage', window.tsUpdateClientNav);
  setTimeout(window.tsUpdateClientNav, 700);
})();


/* ===== ThinkStore Fix: navegación pública limpia y carrito protegido ===== */
(function(){
  function $(id){ return document.getElementById(id); }
  function loggedUser(){
    try{
      const raw = localStorage.getItem('ts_current_user');
      const user = raw ? JSON.parse(raw) : null;
      return user && (user.email || user.id || user.supabase_id) ? user : null;
    }catch(e){ return null; }
  }
  function refreshMainNav(){
    const nav = document.querySelector('header.top nav');
    if(!nav) return;
    nav.querySelectorAll('button').forEach(btn=>{
      const text = (btn.textContent || '').toLowerCase();
      if(text.includes('seguimiento') || text.includes('estatus') || text.includes('favoritos') || text.includes('comparar')){
        btn.remove();
      }
    });
    const accountBtn = $('clientNavBtn');
    if(accountBtn){
      accountBtn.textContent = loggedUser() ? '👤 Cuenta' : '👤 Login';
      accountBtn.onclick = function(){
        if(loggedUser()){
          if(typeof window.openAccount === 'function') window.openAccount();
        }else if(typeof window.openClientLogin === 'function'){
          window.openClientLogin();
        }
      };
    }
  }
  const previousOpenCart = window.openCart;
  window.openCart = function(){
    if(!loggedUser()){
      if(typeof window.openClientLogin === 'function') window.openClientLogin();
      alert('Inicia sesión para ver tu carrito y continuar la compra.');
      return;
    }
    return previousOpenCart && previousOpenCart.apply(this, arguments);
  };
  document.addEventListener('DOMContentLoaded', refreshMainNav);
  window.addEventListener('load', refreshMainNav);
  setInterval(refreshMainNav, 1000);
})();
 

/* ===== ThinkStore WhatsApp inteligente ===== */
(function(){
  const DEFAULT_WA='584141032030';
  function $(id){ return document.getElementById(id); }
  function cleanPhone(v){ return String(v||'').replace(/[^0-9]/g,'') || DEFAULT_WA; }
  function waPhone(){
    try{
      if(window.adminSettings && window.adminSettings.whatsapp) return cleanPhone(window.adminSettings.whatsapp);
      const saved=JSON.parse(localStorage.getItem('ts_admin_settings')||'{}');
      if(saved.whatsapp) return cleanPhone(saved.whatsapp);
    }catch(e){}
    return DEFAULT_WA;
  }
  function getClient(){
    try{
      if(window.currentUser) return window.currentUser;
      if(typeof customer==='function') return customer() || {};
      return JSON.parse(localStorage.getItem('ts_current_user')||localStorage.getItem('ts_customer')||'{}') || {};
    }catch(e){ return {}; }
  }
  function productContext(){
    try{
      const p=window.selectedProduct || null;
      if(!p) return '';
      const color=window.selectedColor || '';
      const condition=window.selectedCondition || '';
      let config='';
      try{ if(typeof selectionText==='function') config=selectionText(); }catch(e){}
      return `\n\nProducto de interés:\n- ${p.name || p.title || 'Producto ThinkStore'}\n- Modelo: ${p.family || p.model || p.category || 'Por confirmar'}\n- Color/versión: ${color || 'Por confirmar'}\n- Configuración: ${config || 'Por confirmar'}\n- Estado: ${condition || 'Por confirmar'}`;
    }catch(e){ return ''; }
  }
  function cartContext(){
    try{
      const list=Array.isArray(window.cart) ? window.cart : [];
      if(!list.length) return '\n\nCarrito: vacío / por confirmar.';
      const lines=list.map((i,idx)=>`${idx+1}. ${i.product||i.name||'Producto'} ${i.color?'- '+i.color:''} ${i.config?'- '+i.config:''} x${i.qty||1}`).join('\n');
      return `\n\nCarrito ThinkStore:\n${lines}`;
    }catch(e){ return ''; }
  }
  function clientContext(){
    const c=getClient();
    const name=c.name||c.nombre||c.customerName||'';
    const email=c.email||c.correo||c.customerEmail||'';
    const phone=c.phone||c.telefono||'';
    const parts=[];
    if(name) parts.push(`Cliente: ${name}`);
    if(email) parts.push(`Correo: ${email}`);
    if(phone) parts.push(`Teléfono: ${phone}`);
    return parts.length ? '\n\nDatos del cliente:\n'+parts.join('\n') : '';
  }
  function extraText(){ return ($('tsSmartWaExtra')?.value||'').trim(); }
  function buildMessage(kind){
    const k=kind||'general';
    let msg='Hola ThinkStore 👋';
    if(k==='producto') msg+='\nQuiero consultar disponibilidad, precio y opciones de este producto.' + productContext();
    else if(k==='carrito') msg+='\nQuiero confirmar mi carrito y recibir instrucciones para finalizar la compra.' + cartContext();
    else if(k==='preorden') msg+='\nQuiero información para realizar una preorden: tiempos, abono, disponibilidad y condiciones.' + productContext();
    else if(k==='soporte') msg+='\nNecesito soporte técnico / diagnóstico para un equipo Apple.';
    else if(k==='ubicacion') msg+='\nQuiero la ubicación exacta de la tienda en Altamira, horario de atención y referencias para llegar.';
    else msg+='\nNecesito asesoría para elegir un producto Apple según mi presupuesto y uso.';
    const extra=extraText();
    if(extra) msg+='\n\nMensaje adicional:\n'+extra;
    msg+=clientContext();
    msg+='\n\nOrigen: '+location.href.split('#')[0];
    return msg;
  }
  window.tsOpenSmartWhatsApp=function(kind){
    window.tsSmartWaKind=kind||'general';
    const modal=$('tsSmartWhatsappModal');
    if(modal){ modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); }
    else window.tsSendSmartWhatsApp(kind||'general');
  };
  window.tsCloseSmartWhatsApp=function(){
    const modal=$('tsSmartWhatsappModal');
    if(modal){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }
  };
  window.tsSendSmartWhatsApp=function(kind){
    const msg=buildMessage(kind||window.tsSmartWaKind||'general');
    window.open('https://wa.me/'+waPhone()+'?text='+encodeURIComponent(msg),'_blank');
    window.tsCloseSmartWhatsApp();
  };
  window.openWhatsApp=function(){ window.tsOpenSmartWhatsApp('general'); };
  window.waProduct=function(){ window.tsOpenSmartWhatsApp('producto'); };
})();


/* ===== ThinkStore V58/V59 funciones activas ===== */
(function(){
  const $=window.$ || ((id)=>document.getElementById(id));
  const store=(k,v)=>{ try{ if(v===undefined) return JSON.parse(localStorage.getItem(k)||'null'); localStorage.setItem(k,JSON.stringify(v)); }catch(e){ return null; } };
  const money=(v)=>'$'+Number(v||0).toLocaleString('es-VE');
  const esc=(s)=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function orders(){ try{ return (window.tsOrders?window.tsOrders():window.orders)||[]; }catch(e){ return []; } }
  function customers(){ try{ return (window.tsCustomers?window.tsCustomers():window.customers)||[]; }catch(e){ return []; } }
  function currentClient(){ try{ return window.currentUser || JSON.parse(localStorage.getItem('ts_current_user')||localStorage.getItem('ts_customer')||'{}') || {}; }catch(e){ return {}; } }
  function setModal(icon,title,subtitle,body){
    if($('tsFeatureIcon')) $('tsFeatureIcon').textContent=icon;
    if($('tsFeatureTitle')) $('tsFeatureTitle').textContent=title;
    if($('tsFeatureSubtitle')) $('tsFeatureSubtitle').textContent=subtitle;
    if($('tsFeatureBody')) $('tsFeatureBody').innerHTML=body;
    const m=$('tsFeatureModal'); if(m){ m.classList.add('open'); m.setAttribute('aria-hidden','false'); }
  }
  window.tsCloseFeatureModal=function(){ const m=$('tsFeatureModal'); if(m){ m.classList.remove('open'); m.setAttribute('aria-hidden','true'); } };
  function wa(txt){ if(window.tsOpenSmartWhatsApp){ window.tsOpenSmartWhatsApp('general'); setTimeout(()=>{ const t=$('tsSmartWaExtra'); if(t) t.value=txt; },80); } else window.open('https://wa.me/584242142262?text='+encodeURIComponent(txt),'_blank'); }
  function result(id,txt){ const el=$(id); if(el) el.textContent=txt; }
  function formVal(id){ return ($(id)?.value||'').trim(); }

  const modules={
    quote(){
      setModal('🛒','Cotizador PDF','Crea una cotización premium con vigencia y envío por WhatsApp.',`
        <div class="ts-feature-form">
          <label>Cliente<input id="qName" placeholder="Nombre del cliente"></label>
          <label>Producto<input id="qProduct" placeholder="Ej: iPhone 16 Pro Max"></label>
          <label>Precio USD<input id="qPrice" type="number" placeholder="0"></label>
          <label>Vigencia<select id="qDays"><option>24 horas</option><option>48 horas</option><option>72 horas</option><option>7 días</option></select></label>
          <label>Condición<select id="qCondition"><option>Nuevo</option><option>Renovado</option><option>Preorden</option></select></label>
          <label>Entrega<select id="qShip"><option>Retiro en tienda</option><option>Envío nacional MRW</option><option>Envío nacional Zoom</option><option>Delivery Caracas</option></select></label>
        </div>
        <div class="ts-feature-actions"><button onclick="tsBuildQuote()">Generar cotización</button><button class="light ts-pro-btn" onclick="window.print()">Guardar como PDF</button><button class="light ts-pro-btn" onclick="tsQuoteWhatsApp()">Enviar por WhatsApp</button></div>
        <pre id="qResult" class="ts-feature-result">Completa los datos y genera la cotización.</pre>`);
    },
    premap(){
      setModal('📦','Mapa de preórdenes','Visualiza el recorrido Comprado → Aduana → Venezuela.',`
        <div class="ts-feature-form"><label>Código de preorden<input id="preCode" placeholder="TS-2026-0001"></label><label>Estado<select id="preStatus"><option>Comprado</option><option>Miami / proveedor</option><option>Aduana</option><option>En tránsito a Venezuela</option><option>Disponible para entrega</option><option>Entregado</option></select></label></div>
        <div class="ts-feature-actions"><button onclick="tsBuildPreMap()">Ver mapa</button></div><div id="preMapResult" class="ts-feature-timeline"></div>`);
      window.tsBuildPreMap();
    },
    dashboard(){
      const os=orders(), cs=customers(); const sales=os.reduce((a,o)=>a+Number(o.total_usd||o.total||0),0); const pre=os.filter(o=>String(o.status||o.estado||'').toLowerCase().includes('pre')).length;
      setModal('📊','Dashboard ejecutivo','Resumen rápido de ventas, clientes y preórdenes.',`<div class="ts-feature-grid"><div class="ts-feature-box"><b>Ventas estimadas</b><h2>${money(sales)}</h2></div><div class="ts-feature-box"><b>Pedidos</b><h2>${os.length}</h2></div><div class="ts-feature-box"><b>Clientes</b><h2>${cs.length}</h2></div><div class="ts-feature-box"><b>Preórdenes</b><h2>${pre}</h2></div></div><div class="ts-feature-actions"><button onclick="tsExportExecutiveCSV()">Exportar CSV</button></div><pre class="ts-feature-result">Top acciones sugeridas:\n• Contactar clientes con pedidos pendientes.\n• Revisar preórdenes en tránsito.\n• Ofrecer accesorios a compras recientes.</pre>`);
    },
    vip(){
      const c=currentClient(); const name=c.name||c.email||'Cliente ThinkStore'; const total=orders().filter(o=>(o.customer?.email||o.email||o.customerEmail)===(c.email||'')).reduce((a,o)=>a+Number(o.total_usd||o.total||0),0); const tier=total>=3000?'Platinum':total>=1200?'Gold':total>=500?'Silver':'Inicial';
      setModal('🌟','Programa VIP','Clasificación automática Silver, Gold y Platinum.',`<div class="ts-feature-grid"><div class="ts-feature-box"><b>Cliente</b><h2>${esc(name)}</h2></div><div class="ts-feature-box"><b>Nivel actual</b><h2>${tier}</h2></div><div class="ts-feature-box"><b>Compras acumuladas</b><h2>${money(total)}</h2></div></div><pre class="ts-feature-result">Beneficios sugeridos:\nSilver: prioridad en cotizaciones y accesorios seleccionados.\nGold: soporte preferencial y promociones privadas.\nPlatinum: atención premium, reservas y prioridad en preórdenes.</pre>`);
    },
    videos(){
      const list=store('ts_video_gallery')||[];
      setModal('🎥','Galería de videos','Guarda enlaces para reviews, unboxing y demostraciones.',`<div class="ts-feature-form"><label>Título<input id="vidTitle" placeholder="Unboxing iPhone"></label><label>URL<input id="vidUrl" placeholder="https://..."></label></div><div class="ts-feature-actions"><button onclick="tsAddVideo()">Agregar video</button></div><div id="videoList">${renderVideos(list)}</div>`);
    },
    service(){
      setModal('🔧','Centro de Servicio Técnico','Crea órdenes TS-RP con serial, falla y diagnóstico.',`<div class="ts-feature-form"><label>Cliente<input id="rpClient" placeholder="Nombre / correo"></label><label>Equipo<input id="rpDevice" placeholder="iPhone / MacBook / iPad"></label><label>Serial<input id="rpSerial" placeholder="Serial del equipo"></label><label>Falla<textarea id="rpIssue" placeholder="Describe la falla"></textarea></label></div><div class="ts-feature-actions"><button onclick="tsCreateRepair()">Crear orden</button><button class="light ts-pro-btn" onclick="tsOpenFeature('repairTrack')">Seguimiento</button></div><pre id="rpResult" class="ts-feature-result">La orden quedará guardada localmente para seguimiento.</pre>`);
    },
    repairTrack(){
      setModal('📱','Seguimiento de Reparaciones','Consulta diagnóstico, reparación y listo para retirar.',`<div class="ts-feature-form"><label>Código TS-RP<input id="rpSearch" placeholder="TS-RP-0001"></label></div><div class="ts-feature-actions"><button onclick="tsTrackRepair()">Consultar reparación</button></div><div id="rpTrackResult"></div>`);
    },
    care(){
      setModal('💎','ThinkStore Care','Planes de protección por 6 y 12 meses.',`<div class="ts-feature-form"><label>Equipo<input id="careDevice" placeholder="Ej: iPhone 16"></label><label>Valor del equipo USD<input id="careValue" type="number" placeholder="0"></label><label>Plan<select id="carePlan"><option value="6">6 meses</option><option value="12">12 meses</option></select></label></div><div class="ts-feature-actions"><button onclick="tsCalcCare()">Calcular plan</button></div><pre id="careResult" class="ts-feature-result">Calcula una referencia comercial para el plan.</pre>`);
    },
    compare(){
      setModal('🍏','Comparador Apple','Compara dos equipos para ayudar al cliente a decidir.',`<div class="ts-feature-form"><label>Equipo A<input id="cmpA" placeholder="iPhone 15 Pro"></label><label>Equipo B<input id="cmpB" placeholder="iPhone 16 Pro"></label><label>Uso principal<select id="cmpUse"><option>Fotos y video</option><option>Trabajo</option><option>Gaming</option><option>Batería</option><option>Precio</option></select></label></div><div class="ts-feature-actions"><button onclick="tsCompareApple()">Comparar</button></div><pre id="cmpResult" class="ts-feature-result">Ingresa dos modelos para comparar.</pre>`);
    },
    ai(){
      setModal('🤖','IA Vendedora','Recomendaciones rápidas por presupuesto y uso.',`<div class="ts-feature-form"><label>Presupuesto USD<input id="aiBudget" type="number" placeholder="Ej: 800"></label><label>Uso<select id="aiUse"><option>Redes y cámara</option><option>Trabajo y estudio</option><option>Gaming</option><option>Diseño / edición</option><option>Regalo</option></select></label><label>Preferencia<select id="aiPref"><option>iPhone</option><option>MacBook</option><option>iPad</option><option>AirPods</option><option>No sé todavía</option></select></label></div><div class="ts-feature-actions"><button onclick="tsAISeller()">Recomendar</button><button class="light ts-pro-btn" onclick="tsAIWhatsApp()">Enviar asesoría por WhatsApp</button></div><pre id="aiResult" class="ts-feature-result">Completa los datos y genera una recomendación.</pre>`);
    },
    imports(){
      setModal('📦','Importaciones Premium','Calcula ruta y tiempos Proveedor → Miami → Aduana → Venezuela.',`<div class="ts-feature-form"><label>Producto<input id="impProduct" placeholder="MacBook / iPhone / accesorios"></label><label>Proveedor<input id="impProvider" placeholder="Apple, BestBuy, proveedor..."></label><label>Valor USD<input id="impValue" type="number" placeholder="0"></label><label>Modalidad<select id="impMode"><option>Compra asistida</option><option>Solo traslado</option><option>Preorden cliente</option></select></label></div><div class="ts-feature-actions"><button onclick="tsImportCalc()">Generar plan</button></div><pre id="impResult" class="ts-feature-result">Genera el plan de importación para enviar al cliente.</pre>`);
    }
  };
  window.tsOpenFeature=function(name){ (modules[name]||modules.dashboard)(); };
  function renderVideos(list){ return (list||[]).map((v,i)=>`<div class="ts-video-item"><div><b>${esc(v.title)}</b><br><a href="${esc(v.url)}" target="_blank">Abrir video</a></div><button class="ts-pro-btn light" onclick="tsRemoveVideo(${i})">Quitar</button></div>`).join('') || '<p class="muted">No hay videos guardados todavía.</p>'; }
  window.tsAddVideo=function(){ const list=store('ts_video_gallery')||[]; const title=formVal('vidTitle')||'Video ThinkStore'; const url=formVal('vidUrl'); if(!url) return alert('Agrega una URL.'); list.unshift({title,url,created:new Date().toISOString()}); store('ts_video_gallery',list); if($('videoList')) $('videoList').innerHTML=renderVideos(list); };
  window.tsRemoveVideo=function(i){ const list=store('ts_video_gallery')||[]; list.splice(i,1); store('ts_video_gallery',list); if($('videoList')) $('videoList').innerHTML=renderVideos(list); };
  window.tsBuildQuote=function(){ const txt=`ThinkStore · Cotización premium\n\nCliente: ${formVal('qName')||'Por confirmar'}\nProducto: ${formVal('qProduct')||'Producto ThinkStore'}\nCondición: ${formVal('qCondition')}\nPrecio: ${money(formVal('qPrice'))}\nEntrega: ${formVal('qShip')}\nVigencia: ${formVal('qDays')}\n\nIncluye atención personalizada ThinkStore. Precios sujetos a disponibilidad.`; result('qResult',txt); window.tsLastQuote=txt; };
  window.tsQuoteWhatsApp=function(){ if(!window.tsLastQuote) window.tsBuildQuote(); wa(window.tsLastQuote||'Cotización ThinkStore'); };
  window.tsBuildPreMap=function(){ const steps=['Comprado','Miami / proveedor','Aduana','En tránsito a Venezuela','Disponible para entrega','Entregado']; const st=formVal('preStatus')||steps[0]; const idx=Math.max(0,steps.indexOf(st)); const html=steps.map((s,i)=>`<div class="ts-feature-step ${i<idx?'':'pending'} ${i===idx?'current':''}"><b>${i<idx?'✓':i+1}</b><div><strong>${s}</strong><br><small>${i<idx?'Completado':i===idx?'En proceso':'Pendiente'}</small></div></div>`).join(''); if($('preMapResult')) $('preMapResult').innerHTML=html; };
  window.tsExportExecutiveCSV=function(){ const csv='tipo,total\nventas,'+orders().length+'\nclientes,'+customers().length; const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='thinkstore_dashboard.csv'; a.click(); };
  window.tsCreateRepair=function(){ const list=store('ts_repairs')||[]; const code='TS-RP-'+String(Date.now()).slice(-6); const item={code,client:formVal('rpClient'),device:formVal('rpDevice'),serial:formVal('rpSerial'),issue:formVal('rpIssue'),status:'Diagnóstico',created:new Date().toLocaleString()}; list.unshift(item); store('ts_repairs',list); result('rpResult',`Orden creada: ${code}\nCliente: ${item.client}\nEquipo: ${item.device}\nSerial: ${item.serial}\nFalla: ${item.issue}\nEstado: ${item.status}`); };
  window.tsTrackRepair=function(){ const code=formVal('rpSearch').toUpperCase(); const r=(store('ts_repairs')||[]).find(x=>String(x.code).toUpperCase()===code); const el=$('rpTrackResult'); if(!el) return; if(!r){ el.innerHTML='<div class="ts-feature-box">No se encontró la reparación.</div>'; return; } const steps=['Recibido','Diagnóstico','Reparación','Listo']; const idx=Math.max(1,steps.indexOf(r.status)); el.innerHTML=`<div class="ts-feature-box"><b>${esc(r.code)}</b><p>${esc(r.device)} · ${esc(r.issue)}</p><div class="ts-repair-status">${steps.map((s,i)=>`<span class="${i<=idx?'on':''}">${s}</span>`).join('')}</div></div>`; };
  window.tsCalcCare=function(){ const val=Number(formVal('careValue')||0), months=Number(formVal('carePlan')||6); const price=Math.round(val*(months===12?.12:.075)); result('careResult',`ThinkStore Care\nEquipo: ${formVal('careDevice')||'Equipo Apple'}\nPlan: ${months} meses\nReferencia: ${money(price)}\n\nIncluye orientación, prioridad de atención y registro digital del equipo.`); };
  window.tsCompareApple=function(){ const a=formVal('cmpA')||'Equipo A', b=formVal('cmpB')||'Equipo B', use=formVal('cmpUse'); result('cmpResult',`Comparador Apple\n\n${a} vs ${b}\nUso principal: ${use}\n\nRecomendación comercial:\n• ${a}: buena opción si buscas mejor precio o disponibilidad inmediata.\n• ${b}: ideal si quieres más tiempo de soporte, mejor rendimiento y valor de reventa.\n\nPara ${use.toLowerCase()}, conviene revisar batería, almacenamiento y cámara antes de decidir.`); };
  window.tsAISeller=function(){ const budget=Number(formVal('aiBudget')||0), use=formVal('aiUse'), pref=formVal('aiPref'); let rec='iPhone 13 / 14 renovado o iPad base'; if(budget>=1800) rec='iPhone Pro Max reciente o MacBook Pro M4'; else if(budget>=1000) rec='iPhone 15/16, iPad Air o MacBook Air M3/M4'; else if(budget>=500) rec='iPhone 13/14, AirPods Pro o Apple Watch'; const txt=`IA Vendedora ThinkStore\nPresupuesto: ${money(budget)}\nUso: ${use}\nPreferencia: ${pref}\n\nRecomendación: ${rec}\n\nMensaje sugerido:\nTe recomiendo esta opción porque equilibra presupuesto, rendimiento y disponibilidad. También podemos cotizar accesorios compatibles.`; result('aiResult',txt); window.tsLastAI=txt; };
  window.tsAIWhatsApp=function(){ if(!window.tsLastAI) window.tsAISeller(); wa(window.tsLastAI||'Recomendación ThinkStore'); };
  window.tsImportCalc=function(){ const value=Number(formVal('impValue')||0); const fee=Math.max(25,Math.round(value*.08)); result('impResult',`Importaciones Premium ThinkStore\nProducto: ${formVal('impProduct')||'Producto'}\nProveedor: ${formVal('impProvider')||'Por confirmar'}\nModalidad: ${formVal('impMode')}\nValor declarado: ${money(value)}\nGestión estimada: ${money(fee)}\nRuta: Proveedor → Miami → Aduana → Venezuela\nTiempo referencial: 15 a 25 días hábiles según disponibilidad y liberación aduanal.`); };
  function activateCards(){
    const map=[['WhatsApp inteligente','wa'],['Cotizador PDF','quote'],['Mapa de preórdenes','premap'],['Dashboard ejecutivo','dashboard'],['Programa VIP','vip'],['Galería de videos','videos'],['Centro de Servicio Técnico','service'],['Seguimiento de Reparaciones','repairTrack'],['ThinkStore Care','care'],['Comparador Apple','compare'],['IA Vendedora','ai'],['Importaciones Premium','imports']];
    document.querySelectorAll('#v58-sales-automation div, #v59-service-care-ai div').forEach(el=>{ const txt=el.textContent||''; const m=map.find(([label])=>txt.includes(label)); if(!m) return; el.setAttribute('role','button'); el.tabIndex=0; el.onclick=()=> m[1]==='wa' ? (window.tsOpenSmartWhatsApp?window.tsOpenSmartWhatsApp('general'):wa('Hola ThinkStore')) : window.tsOpenFeature(m[1]); el.onkeydown=(e)=>{ if(e.key==='Enter') el.click(); }; });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',activateCards); else activateCards();
})();


/* ===== ThinkStore V60 Growth Enterprise funciones activas ===== */
(function(){
  const $=window.$ || ((id)=>document.getElementById(id));
  const esc=(s)=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=(v)=>'$'+Number(v||0).toLocaleString('es-VE');
  const store=(k,v)=>{ try{ if(v===undefined) return JSON.parse(localStorage.getItem(k)||'null'); localStorage.setItem(k,JSON.stringify(v)); return v; }catch(e){ return null; } };
  const orders=()=>{ try{return (window.tsOrders?window.tsOrders():window.orders)||[];}catch(e){return [];} };
  const products=()=>{ try{return (window.products||window.catalog||window.tsProducts||[]);}catch(e){return [];} };
  const customers=()=>{ try{return (window.tsCustomers?window.tsCustomers():window.customers)||[];}catch(e){return [];} };
  const current=()=>{ try{return window.currentUser || JSON.parse(localStorage.getItem('ts_current_user')||localStorage.getItem('ts_customer')||'{}') || {};}catch(e){return{};} };
  function setModal(icon,title,subtitle,body){
    if($('tsFeatureIcon')) $('tsFeatureIcon').textContent=icon;
    if($('tsFeatureTitle')) $('tsFeatureTitle').textContent=title;
    if($('tsFeatureSubtitle')) $('tsFeatureSubtitle').textContent=subtitle;
    if($('tsFeatureBody')) $('tsFeatureBody').innerHTML=body;
    const m=$('tsFeatureModal'); if(m){ m.classList.add('open'); m.setAttribute('aria-hidden','false'); }
  }
  function val(id){ return ($(id)?.value||'').trim(); }
  function wa(msg){ if(window.tsOpenSmartWhatsApp){ window.tsOpenSmartWhatsApp('general'); setTimeout(()=>{ const t=$('tsSmartWaExtra'); if(t) t.value=msg; },80); } else window.open('https://wa.me/584242142262?text='+encodeURIComponent(msg),'_blank'); }
  function clientEmail(o){ return o?.customer?.email || o?.customerEmail || o?.email || o?.cliente_email || ''; }
  function orderCode(o){ return o?.code || o?.codigo || o?.order_code || ''; }
  function orderTotal(o){ return Number(o?.total_usd || o?.total || o?.amount || 0); }

  const growth={
    points(){
      const c=current(); const email=c.email||'';
      const myOrders=orders().filter(o=>!email || clientEmail(o)===email);
      const spent=myOrders.reduce((a,o)=>a+orderTotal(o),0);
      const pts=Math.floor(spent/10);
      const saved=store('ts_points_balance')||{}; if(email && !saved[email]){ saved[email]=pts; store('ts_points_balance',saved); }
      const level=pts>=300?'Platinum':pts>=120?'Gold':pts>=50?'Silver':'Inicial';
      setModal('🎁','Programa de puntos','Fideliza clientes con puntos por compra y descuentos canjeables.',`
        <div class="ts-feature-grid"><div class="ts-feature-box"><b>Cliente</b><h2>${esc(c.name||email||'Visitante')}</h2></div><div class="ts-feature-box"><b>Puntos</b><h2>${pts}</h2></div><div class="ts-feature-box"><b>Nivel</b><h2>${level}</h2></div></div>
        <pre class="ts-feature-result">Regla activa sugerida:\n• 1 punto por cada $10 comprados.\n• 100 puntos = $5 de descuento.\n• Nivel Silver desde 50 pts, Gold 120 pts, Platinum 300 pts.</pre>
        <div class="ts-feature-actions"><button onclick="tsGrowthRedeemPoints()">Simular canje</button><button class="light ts-pro-btn" onclick="tsGrowthSharePoints()">Enviar por WhatsApp</button></div>`);
      window.tsLastGrowthMsg=`ThinkStore · Programa de puntos\nCliente: ${c.name||email||'Cliente'}\nPuntos disponibles: ${pts}\nNivel: ${level}`;
    },
    reviews(){
      const list=store('ts_verified_reviews')||[];
      setModal('⭐','Reseñas verificadas','Solo compradores reales pueden dejar reseñas de productos.',`
        <div class="ts-feature-form"><label>Código de pedido<input id="rvOrder" placeholder="TS-2026-0001"></label><label>Producto<input id="rvProduct" placeholder="iPhone / MacBook / AirPods"></label><label>Estrellas<select id="rvStars"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label><label>Comentario<textarea id="rvText" rows="3" placeholder="Experiencia del cliente"></textarea></label></div>
        <div class="ts-feature-actions"><button onclick="tsGrowthAddReview()">Guardar reseña</button></div><div id="rvList">${renderReviews(list)}</div>`);
    },
    featured(){
      const list=store('ts_featured_products')||[];
      setModal('🔥','Productos destacados','Marca productos para priorizarlos en portada y campañas.',`
        <div class="ts-feature-form"><label>Producto<input id="ftName" placeholder="iPhone 16 Pro Max"></label><label>Etiqueta<input id="ftTag" placeholder="Más vendido / Nuevo / Oferta"></label><label>Precio USD<input id="ftPrice" type="number" placeholder="0"></label></div>
        <div class="ts-feature-actions"><button onclick="tsGrowthAddFeatured()">Destacar producto</button></div><div id="ftList">${renderFeatured(list)}</div>`);
    },
    inventory(){
      const inv=store('ts_inventory_real')||[];
      setModal('📊','Inventario real','Controla disponibilidad y alertas de stock.',`
        <div class="ts-feature-form"><label>Producto<input id="invName" placeholder="iPhone 16 128GB"></label><label>Stock<input id="invQty" type="number" placeholder="0"></label><label>Alerta mínima<input id="invMin" type="number" value="2"></label></div>
        <div class="ts-feature-actions"><button onclick="tsGrowthAddInventory()">Guardar inventario</button></div><div id="invList">${renderInventory(inv)}</div>`);
    },
    tracking(){
      setModal('🚚','Tracking con guía','Crea enlaces de seguimiento por MRW, Zoom o Tealca.',`
        <div class="ts-feature-form"><label>Pedido<input id="trkOrder" placeholder="TS-2026-0001"></label><label>Empresa<select id="trkCompany"><option>MRW</option><option>Zoom</option><option>Tealca</option><option>Delivery Caracas</option></select></label><label>Número de guía<input id="trkGuide" placeholder="Número de guía"></label></div>
        <div class="ts-feature-actions"><button onclick="tsGrowthBuildTracking()">Generar tracking</button><button class="light ts-pro-btn" onclick="tsGrowthTrackingWA()">Enviar por WhatsApp</button></div><pre id="trkResult" class="ts-feature-result">Completa los datos para generar el tracking.</pre>`);
    },
    warranties(){
      const list=store('ts_digital_warranties')||[];
      setModal('🛡️','Garantías digitales','Registra garantía por serial y fecha de compra.',`
        <div class="ts-feature-form"><label>Cliente<input id="gtClient" placeholder="Nombre / correo"></label><label>Producto<input id="gtProduct" placeholder="iPhone / MacBook"></label><label>Serial<input id="gtSerial" placeholder="Serial del equipo"></label><label>Meses de garantía<input id="gtMonths" type="number" value="12"></label></div>
        <div class="ts-feature-actions"><button onclick="tsGrowthCreateWarranty()">Crear garantía</button></div><div id="gtList">${renderWarranties(list)}</div>`);
    },
    giftcards(){
      const list=store('ts_gift_cards')||[];
      setModal('🎟️','Gift Cards','Genera códigos de regalo para ventas y promociones.',`
        <div class="ts-feature-form"><label>Valor USD<input id="gcValue" type="number" placeholder="50"></label><label>Cliente / destinatario<input id="gcClient" placeholder="Correo o nombre"></label></div>
        <div class="ts-feature-actions"><button onclick="tsGrowthCreateGiftCard()">Crear Gift Card</button></div><div id="gcList">${renderGiftCards(list)}</div>`);
    },
    assistant(){
      setModal('🤖','Asistente IA ThinkStore','Asesoría rápida por presupuesto, uso y preferencia.',`
        <div class="ts-feature-form"><label>Presupuesto USD<input id="gaBudget" type="number" placeholder="800"></label><label>Uso principal<select id="gaUse"><option>Fotos y video</option><option>Trabajo y estudio</option><option>Gaming</option><option>Diseño y edición</option><option>Regalo</option></select></label><label>Preferencia<select id="gaPref"><option>iPhone</option><option>MacBook</option><option>iPad</option><option>AirPods</option><option>No estoy seguro</option></select></label></div>
        <div class="ts-feature-actions"><button onclick="tsGrowthAI()">Generar asesoría</button><button class="light ts-pro-btn" onclick="tsGrowthAIWA()">Enviar a WhatsApp</button></div><pre id="gaResult" class="ts-feature-result">Genera una recomendación para el cliente.</pre>`);
    },
    segmentation(){
      const os=orders(); const cs=customers();
      const segments={iphone:0,mac:0,airpods:0,vip:0,inactive:Math.max(0,cs.length-os.length)};
      os.forEach(o=>{ const txt=JSON.stringify(o).toLowerCase(); if(txt.includes('iphone'))segments.iphone++; if(txt.includes('mac'))segments.mac++; if(txt.includes('airpods'))segments.airpods++; if(orderTotal(o)>=1000)segments.vip++; });
      setModal('📧','Segmentación inteligente','Agrupa clientes para campañas automáticas.',`<div class="ts-feature-grid"><div class="ts-feature-box"><b>Compraron iPhone</b><h2>${segments.iphone}</h2></div><div class="ts-feature-box"><b>Compraron Mac</b><h2>${segments.mac}</h2></div><div class="ts-feature-box"><b>AirPods</b><h2>${segments.airpods}</h2></div><div class="ts-feature-box"><b>VIP +$1000</b><h2>${segments.vip}</h2></div></div><div class="ts-feature-actions"><button onclick="tsGrowthSegmentCSV()">Exportar segmentos</button></div><pre class="ts-feature-result">Campañas sugeridas:\n• Clientes iPhone → accesorios, AirPods y Apple Watch.\n• Clientes Mac → Magic Mouse, teclado, soporte técnico.\n• Inactivos → cupón de regreso por 7 días.</pre>`);
    },
    birthday(){
      const list=store('ts_birthday_campaigns')||[];
      setModal('🎂','Campañas de cumpleaños','Prepara mensajes y cupones automáticos por cumpleaños.',`<div class="ts-feature-form"><label>Cliente<input id="bdClient" placeholder="Nombre"></label><label>Correo / WhatsApp<input id="bdContact" placeholder="Contacto"></label><label>Descuento<select id="bdDiscount"><option>10%</option><option>15%</option><option>$20</option><option>Accesorio sorpresa</option></select></label></div><div class="ts-feature-actions"><button onclick="tsGrowthBirthday()">Crear campaña</button></div><div id="bdList">${renderBirthdays(list)}</div>`);
    },
    preorders(){
      const list=store('ts_smart_preorders')||[];
      setModal('📦','Preórdenes inteligentes','Control premium de proveedor, aduana y entrega.',`<div class="ts-feature-form"><label>Código<input id="spCode" placeholder="TS-2026-0001"></label><label>Producto<input id="spProduct" placeholder="iPhone / MacBook"></label><label>Estado<select id="spStatus"><option>Pedido recibido</option><option>Comprado proveedor</option><option>Miami / proveedor</option><option>Aduana</option><option>En tránsito</option><option>Disponible para entrega</option><option>Entregado</option></select></label></div><div class="ts-feature-actions"><button onclick="tsGrowthSavePreorder()">Guardar preorden</button></div><div id="spList">${renderSmartPreorders(list)}</div>`);
    }
  };

  window.tsOpenGrowthFeature=function(name){ (growth[name]||growth.points)(); };
  window.tsGrowthRedeemPoints=function(){ alert('Canje simulado: se aplicaría descuento según puntos disponibles.'); };
  window.tsGrowthSharePoints=function(){ wa(window.tsLastGrowthMsg||'Programa de puntos ThinkStore'); };
  function renderReviews(list){ return (list||[]).map(r=>`<div class="ts-feature-box"><b>${'⭐'.repeat(Number(r.stars)||5)} ${esc(r.product)}</b><p>${esc(r.text)}</p><small>Pedido verificado: ${esc(r.order)}</small></div>`).join('') || '<p class="muted">Sin reseñas todavía.</p>'; }
  window.tsGrowthAddReview=function(){ const list=store('ts_verified_reviews')||[]; const r={order:val('rvOrder'),product:val('rvProduct')||'Producto ThinkStore',stars:val('rvStars')||5,text:val('rvText')||'Excelente atención y producto verificado.'}; list.unshift(r); store('ts_verified_reviews',list); if($('rvList')) $('rvList').innerHTML=renderReviews(list); };
  function renderFeatured(list){ return (list||[]).map(p=>`<div class="ts-feature-box"><b>🔥 ${esc(p.name)}</b><p>${esc(p.tag)} · ${money(p.price)}</p></div>`).join('') || '<p class="muted">Sin destacados todavía.</p>'; }
  window.tsGrowthAddFeatured=function(){ const list=store('ts_featured_products')||[]; list.unshift({name:val('ftName')||'Producto destacado',tag:val('ftTag')||'Destacado',price:val('ftPrice')||0}); store('ts_featured_products',list); if($('ftList')) $('ftList').innerHTML=renderFeatured(list); };
  function renderInventory(list){ return (list||[]).map(i=>{ const q=Number(i.qty||0), min=Number(i.min||2); const st=q<=0?'Agotado':q<=min?'Últimas unidades':'Disponible'; return `<div class="ts-feature-box"><b>${esc(i.name)}</b><p>Stock: ${q} · ${st}</p></div>`; }).join('') || '<p class="muted">Sin inventario guardado.</p>'; }
  window.tsGrowthAddInventory=function(){ const list=store('ts_inventory_real')||[]; list.unshift({name:val('invName')||'Producto',qty:val('invQty')||0,min:val('invMin')||2}); store('ts_inventory_real',list); if($('invList')) $('invList').innerHTML=renderInventory(list); };
  window.tsGrowthBuildTracking=function(){ const company=val('trkCompany'), guide=val('trkGuide'), code=val('trkOrder'); const link=company==='MRW'?'https://mrwve.com':company==='Zoom'?'https://zoom.red':'https://tealca.com'; const msg=`ThinkStore · Tracking\nPedido: ${code}\nEmpresa: ${company}\nGuía: ${guide||'Pendiente'}\nConsulta: ${link}`; window.tsLastTrackingMsg=msg; const el=$('trkResult'); if(el) el.textContent=msg; };
  window.tsGrowthTrackingWA=function(){ if(!window.tsLastTrackingMsg) window.tsGrowthBuildTracking(); wa(window.tsLastTrackingMsg||'Tracking ThinkStore'); };
  function renderWarranties(list){ return (list||[]).map(g=>`<div class="ts-feature-box"><b>${esc(g.code)} · ${esc(g.product)}</b><p>Serial: ${esc(g.serial)}<br>Cliente: ${esc(g.client)}<br>Vence: ${esc(g.expires)}</p></div>`).join('') || '<p class="muted">Sin garantías registradas.</p>'; }
  window.tsGrowthCreateWarranty=function(){ const list=store('ts_digital_warranties')||[]; const d=new Date(); d.setMonth(d.getMonth()+Number(val('gtMonths')||12)); list.unshift({code:'GT-'+String(Date.now()).slice(-6),client:val('gtClient'),product:val('gtProduct')||'Equipo Apple',serial:val('gtSerial'),expires:d.toLocaleDateString('es-VE')}); store('ts_digital_warranties',list); if($('gtList')) $('gtList').innerHTML=renderWarranties(list); };
  function renderGiftCards(list){ return (list||[]).map(g=>`<div class="ts-feature-box"><b>🎟️ ${esc(g.code)}</b><p>Valor: ${money(g.value)} · Para: ${esc(g.client)} · ${g.used?'Usada':'Activa'}</p></div>`).join('') || '<p class="muted">Sin gift cards.</p>'; }
  window.tsGrowthCreateGiftCard=function(){ const list=store('ts_gift_cards')||[]; list.unshift({code:'GC-'+Math.random().toString(36).slice(2,8).toUpperCase(),value:val('gcValue')||50,client:val('gcClient')||'Cliente ThinkStore',used:false}); store('ts_gift_cards',list); if($('gcList')) $('gcList').innerHTML=renderGiftCards(list); };
  window.tsGrowthAI=function(){ const b=Number(val('gaBudget')||0), use=val('gaUse'), pref=val('gaPref'); let rec='iPhone 13/14 renovado o iPad base'; if(b>=1800) rec='iPhone Pro Max reciente o MacBook Pro M4'; else if(b>=1000) rec='iPhone 15/16, iPad Air o MacBook Air M4'; else if(b>=500) rec='iPhone 13/14, AirPods Pro o Apple Watch'; const txt=`Asistente IA ThinkStore\nPresupuesto: ${money(b)}\nUso: ${use}\nPreferencia: ${pref}\n\nRecomendación: ${rec}\n\nSiguiente paso: validar disponibilidad, color y capacidad para enviar cotización.`; window.tsLastGrowthAI=txt; if($('gaResult')) $('gaResult').textContent=txt; };
  window.tsGrowthAIWA=function(){ if(!window.tsLastGrowthAI) window.tsGrowthAI(); wa(window.tsLastGrowthAI||'Asesoría ThinkStore'); };
  window.tsGrowthSegmentCSV=function(){ const csv='segmento,descripcion\niphone,Clientes interesados en iPhone\nmac,Clientes interesados en Mac\nvip,Clientes con compras altas\ninactivos,Clientes para reactivación'; const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='thinkstore_segmentos.csv'; a.click(); };
  function renderBirthdays(list){ return (list||[]).map(b=>`<div class="ts-feature-box"><b>🎂 ${esc(b.client)}</b><p>${esc(b.contact)} · Cupón: ${esc(b.discount)} · Vigencia 7 días</p></div>`).join('') || '<p class="muted">Sin campañas creadas.</p>'; }
  window.tsGrowthBirthday=function(){ const list=store('ts_birthday_campaigns')||[]; list.unshift({client:val('bdClient')||'Cliente',contact:val('bdContact'),discount:val('bdDiscount')}); store('ts_birthday_campaigns',list); if($('bdList')) $('bdList').innerHTML=renderBirthdays(list); };
  function renderSmartPreorders(list){ return (list||[]).map(p=>`<div class="ts-feature-box"><b>${esc(p.code)} · ${esc(p.product)}</b><p>Estado: ${esc(p.status)}</p></div>`).join('') || '<p class="muted">Sin preórdenes inteligentes.</p>'; }
  window.tsGrowthSavePreorder=function(){ const list=store('ts_smart_preorders')||[]; list.unshift({code:val('spCode')||'TS-2026-0000',product:val('spProduct')||'Producto',status:val('spStatus')}); store('ts_smart_preorders',list); if($('spList')) $('spList').innerHTML=renderSmartPreorders(list); };

  function activateGrowthCards(){
    const map=[['Programa de puntos','points'],['Reseñas verificadas','reviews'],['Productos destacados','featured'],['Inventario real','inventory'],['Tracking con guía','tracking'],['Garantías digitales','warranties'],['Gift Cards','giftcards'],['Asistente IA ThinkStore','assistant'],['Segmentación inteligente','segmentation'],['Campañas de cumpleaños','birthday'],['Preórdenes inteligentes','preorders']];
    document.querySelectorAll('#growth-enterprise .card').forEach(el=>{ const txt=el.textContent||''; const m=map.find(([label])=>txt.includes(label)); if(!m) return; el.setAttribute('role','button'); el.tabIndex=0; el.classList.add('ts-growth-active'); el.onclick=()=>window.tsOpenGrowthFeature(m[1]); el.onkeydown=(e)=>{ if(e.key==='Enter') el.click(); }; });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',activateGrowthCards); else activateGrowthCards();
})();

/* ===== ThinkStore V61 Ecosistema Comercial Pro funciones activas ===== */
(function(){
  const $=window.$ || ((id)=>document.getElementById(id));
  const esc=(s)=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=(v)=>'$'+Number(v||0).toLocaleString('es-VE');
  const store=(k,v)=>{ try{ if(v===undefined) return JSON.parse(localStorage.getItem(k)||'null'); localStorage.setItem(k,JSON.stringify(v)); return v; }catch(e){ return null; } };
  const orders=()=>{ try{return (window.tsOrders?window.tsOrders():window.orders)||[];}catch(e){return [];} };
  const customers=()=>{ try{return (window.tsCustomers?window.tsCustomers():window.customers)||[];}catch(e){return [];} };
  const current=()=>{ try{return window.currentUser || JSON.parse(localStorage.getItem('ts_current_user')||localStorage.getItem('ts_customer')||'{}') || {};}catch(e){return{};} };
  const val=(id)=>($(id)?.value||'').trim();
  function setModal(icon,title,subtitle,body){
    if($('tsFeatureIcon')) $('tsFeatureIcon').textContent=icon;
    if($('tsFeatureTitle')) $('tsFeatureTitle').textContent=title;
    if($('tsFeatureSubtitle')) $('tsFeatureSubtitle').textContent=subtitle;
    if($('tsFeatureBody')) $('tsFeatureBody').innerHTML=body;
    const m=$('tsFeatureModal'); if(m){ m.classList.add('open'); m.setAttribute('aria-hidden','false'); }
  }
  function wa(msg){ if(window.tsOpenSmartWhatsApp){ window.tsOpenSmartWhatsApp('general'); setTimeout(()=>{ const t=$('tsSmartWaExtra'); if(t) t.value=msg; },80); } else window.open('https://wa.me/584242142262?text='+encodeURIComponent(msg),'_blank'); }
  const clientEmail=(o)=>o?.customer?.email || o?.customerEmail || o?.email || o?.cliente_email || '';
  const clientName=(o)=>o?.customer?.name || o?.customerName || o?.cliente || o?.name || '';
  const orderCode=(o)=>o?.code || o?.codigo || o?.order_code || '';
  const orderStatus=(o)=>o?.status || o?.estado || 'Pedido recibido';
  const orderTotal=(o)=>Number(o?.total_usd || o?.total || o?.amount || 0);

  const v61={
    portal(){
      const c=current(); const email=c.email||'';
      const my=orders().filter(o=>!email || clientEmail(o)===email);
      const spent=my.reduce((a,o)=>a+orderTotal(o),0);
      const points=Math.floor(spent/10);
      setModal('👤','Portal completo del cliente','Vista unificada de pedidos, garantías, facturas, reparaciones y puntos.',`
        <div class="ts-feature-grid">
          <div class="ts-feature-box"><b>Cliente</b><h2>${esc(c.name||email||'Visitante')}</h2></div>
          <div class="ts-feature-box"><b>Pedidos</b><h2>${my.length}</h2></div>
          <div class="ts-feature-box"><b>Total comprado</b><h2>${money(spent)}</h2></div>
          <div class="ts-feature-box"><b>Puntos VIP</b><h2>${points}</h2></div>
        </div>
        <div class="ts-feature-actions"><button onclick="tsV61OpenClientAccount()">Abrir cuenta</button><button class="light ts-pro-btn" onclick="tsV61PortalWA()">Enviar resumen por WhatsApp</button></div>
        <pre class="ts-feature-result">Módulos activos dentro del portal:\n• Pedidos y preórdenes\n• Reparaciones y garantías\n• Facturas / notas de entrega\n• Puntos VIP y beneficios</pre>`);
      window.tsV61LastPortal=`ThinkStore · Portal del cliente\nCliente: ${c.name||email||'Cliente'}\nPedidos: ${my.length}\nPuntos VIP: ${points}`;
    },
    crm(){
      const os=orders(), cs=customers();
      const totalByEmail={}; os.forEach(o=>{ const e=clientEmail(o)||'sin-correo'; totalByEmail[e]=(totalByEmail[e]||0)+orderTotal(o); });
      const vip=Object.values(totalByEmail).filter(v=>v>=1000).length;
      const nuevos=cs.length || new Set(os.map(clientEmail).filter(Boolean)).size;
      const calientes=os.filter(o=>String(orderStatus(o)).toLowerCase().includes('preorden')||String(orderStatus(o)).toLowerCase().includes('cotiz')).length;
      setModal('🎯','CRM inteligente','Clasificación comercial automática para campañas, seguimiento y clientes VIP.',`
        <div class="ts-feature-grid">
          <div class="ts-feature-box"><b>Clientes registrados</b><h2>${nuevos}</h2></div>
          <div class="ts-feature-box"><b>Clientes VIP</b><h2>${vip}</h2></div>
          <div class="ts-feature-box"><b>Leads calientes</b><h2>${calientes}</h2></div>
          <div class="ts-feature-box"><b>Pedidos analizados</b><h2>${os.length}</h2></div>
        </div>
        <div class="ts-feature-actions"><button onclick="tsV61ExportCRM()">Exportar CRM CSV</button><button class="light ts-pro-btn" onclick="tsV61CRMWhatsApp()">Campaña sugerida</button></div>
        <pre class="ts-feature-result">Segmentos activos:\n• Nuevo cliente: primer pedido o registro reciente.\n• VIP: compras acumuladas desde $1.000.\n• Inactivo: cliente sin compra reciente.\n• Lead caliente: preorden, cotización o carrito pendiente.</pre>`);
    },
    finance(){
      setModal('💰','Financiamiento y cuotas','Simula inicial, cuotas y planes de pago para cerrar ventas más rápido.',`
        <div class="ts-feature-form">
          <label>Producto<input id="fnProduct" placeholder="iPhone 16 Pro Max"></label>
          <label>Precio USD<input id="fnPrice" type="number" placeholder="1200"></label>
          <label>Inicial USD<input id="fnInitial" type="number" placeholder="300"></label>
          <label>Meses<select id="fnMonths"><option>3</option><option>6</option><option>9</option><option>12</option></select></label>
          <label>Recargo %<input id="fnRate" type="number" value="0"></label>
        </div>
        <div class="ts-feature-actions"><button onclick="tsV61CalcFinance()">Calcular cuotas</button><button class="light ts-pro-btn" onclick="tsV61FinanceWA()">Enviar plan por WhatsApp</button></div>
        <pre id="fnResult" class="ts-feature-result">Completa los datos para generar la simulación.</pre>`);
    },
    tradein(){
      setModal('🔄','Renueva tu iPhone','Formulario Trade-In para recibir equipos como parte de pago.',`
        <div class="ts-feature-form">
          <label>Modelo actual<input id="tiModel" placeholder="iPhone 13 Pro Max"></label>
          <label>Capacidad<select id="tiStorage"><option>64GB</option><option>128GB</option><option>256GB</option><option>512GB</option><option>1TB</option></select></label>
          <label>Estado<select id="tiState"><option>Excelente</option><option>Bueno</option><option>Detalles estéticos</option><option>Pantalla / batería con detalle</option></select></label>
          <label>Equipo que desea<input id="tiWanted" placeholder="iPhone 16 Pro"></label>
        </div>
        <div class="ts-feature-actions"><button onclick="tsV61EstimateTradeIn()">Estimar valor</button><button class="light ts-pro-btn" onclick="tsV61TradeInWA()">Enviar a WhatsApp</button></div>
        <pre id="tiResult" class="ts-feature-result">Estimación referencial. El valor final se confirma en tienda.</pre>`);
    },
    appointments(){
      const list=store('ts_store_appointments')||[];
      setModal('📅','Citas en tienda','Agenda diagnósticos, reparaciones, retiros y asesorías Apple.',`
        <div class="ts-feature-form">
          <label>Cliente<input id="apClient" placeholder="Nombre del cliente"></label>
          <label>Motivo<select id="apType"><option>Diagnóstico</option><option>Reparación</option><option>Retiro en tienda</option><option>Asesoría Apple</option></select></label>
          <label>Fecha<input id="apDate" type="date"></label>
          <label>Hora<input id="apTime" type="time"></label>
          <label>Detalle<textarea id="apNote" rows="2" placeholder="Equipo, falla o requerimiento"></textarea></label>
        </div>
        <div class="ts-feature-actions"><button onclick="tsV61SaveAppointment()">Guardar cita</button><button class="light ts-pro-btn" onclick="tsV61AppointmentWA()">Enviar confirmación</button></div>
        <div id="apList">${renderAppointments(list)}</div>`);
    },
    qr(){
      setModal('🏷️','Etiquetas QR','Genera etiquetas para pedidos, reparaciones, garantías y entregas.',`
        <div class="ts-feature-form">
          <label>Tipo<select id="qrType"><option>Pedido</option><option>Reparación</option><option>Garantía</option><option>Entrega</option></select></label>
          <label>Código<input id="qrCode" placeholder="TS-2026-0001"></label>
          <label>Descripción<input id="qrDesc" placeholder="iPhone / cliente / estado"></label>
        </div>
        <div class="ts-feature-actions"><button onclick="tsV61BuildQRLabel()">Generar etiqueta</button><button class="light ts-pro-btn" onclick="window.print()">Imprimir</button></div>
        <div id="qrResult" class="ts-feature-result">La etiqueta aparecerá aquí.</div>`);
    },
    recommendations(){
      setModal('🧠','Recomendaciones inteligentes','Sugiere accesorios y productos complementarios según la compra.',`
        <div class="ts-feature-form">
          <label>Producto principal<input id="rcProduct" placeholder="iPhone 16 / MacBook Air / iPad"></label>
          <label>Uso del cliente<select id="rcUse"><option>Fotos y video</option><option>Trabajo</option><option>Estudio</option><option>Gaming</option><option>Regalo</option></select></label>
          <label>Presupuesto adicional USD<input id="rcBudget" type="number" placeholder="150"></label>
        </div>
        <div class="ts-feature-actions"><button onclick="tsV61Recommend()">Generar recomendación</button><button class="light ts-pro-btn" onclick="tsV61RecommendWA()">Enviar por WhatsApp</button></div>
        <pre id="rcResult" class="ts-feature-result">Genera recomendaciones para aumentar el ticket promedio.</pre>`);
    }
  };

  window.tsOpenV61Feature=function(name){ (v61[name]||v61.portal)(); };
  window.tsV61OpenClientAccount=function(){ if(typeof window.openClientAccount==='function') window.openClientAccount(); else if(typeof window.openClientLogin==='function') window.openClientLogin(); else alert('Portal de cliente disponible desde Login / Cuenta.'); };
  window.tsV61PortalWA=function(){ wa(window.tsV61LastPortal||'Resumen del portal ThinkStore'); };
  window.tsV61ExportCRM=function(){ const rows=['segmento,cliente,correo,total,status']; orders().forEach(o=>rows.push(['cliente',clientName(o),clientEmail(o),orderTotal(o),orderStatus(o)].map(x=>'"'+String(x||'').replace(/"/g,'""')+'"').join(','))); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'})); a.download='thinkstore_crm_inteligente.csv'; a.click(); };
  window.tsV61CRMWhatsApp=function(){ wa('ThinkStore CRM inteligente\nCampaña sugerida: Clientes iPhone → accesorios MagSafe, AirPods y Apple Watch. Clientes inactivos → cupón por 7 días.'); };
  window.tsV61CalcFinance=function(){ const price=Number(val('fnPrice')||0), initial=Number(val('fnInitial')||0), months=Number(val('fnMonths')||6), rate=Number(val('fnRate')||0); const balance=Math.max(0,price-initial); const total=balance*(1+rate/100); const cuota=months?total/months:0; const msg=`ThinkStore · Simulador de financiamiento\nProducto: ${val('fnProduct')||'Producto'}\nPrecio: ${money(price)}\nInicial: ${money(initial)}\nSaldo financiado: ${money(total)}\nPlan: ${months} cuotas de ${money(cuota)}\nNota: aprobación y condiciones sujetas a validación.`; window.tsV61LastFinance=msg; if($('fnResult')) $('fnResult').textContent=msg; };
  window.tsV61FinanceWA=function(){ if(!window.tsV61LastFinance) window.tsV61CalcFinance(); wa(window.tsV61LastFinance||'Plan de financiamiento ThinkStore'); };
  window.tsV61EstimateTradeIn=function(){ const state=val('tiState'); let base=250; if(/pro max/i.test(val('tiModel'))) base=520; else if(/pro/i.test(val('tiModel'))) base=430; else if(/14|15|16/i.test(val('tiModel'))) base=380; if(state==='Excelente') base*=1; else if(state==='Bueno') base*=.85; else if(state.includes('estéticos')) base*=.7; else base*=.5; const msg=`ThinkStore · Renueva tu iPhone\nModelo: ${val('tiModel')||'Por confirmar'}\nCapacidad: ${val('tiStorage')}\nEstado: ${state}\nEquipo deseado: ${val('tiWanted')||'Por confirmar'}\nValor referencial como parte de pago: ${money(Math.round(base))}\nValor final sujeto a revisión física.`; window.tsV61LastTradeIn=msg; if($('tiResult')) $('tiResult').textContent=msg; };
  window.tsV61TradeInWA=function(){ if(!window.tsV61LastTradeIn) window.tsV61EstimateTradeIn(); wa(window.tsV61LastTradeIn||'Trade-In ThinkStore'); };
  function renderAppointments(list){ return (list||[]).map(a=>`<div class="ts-feature-box"><b>📅 ${esc(a.date)} ${esc(a.time)} · ${esc(a.type)}</b><p>${esc(a.client)}<br>${esc(a.note)}</p></div>`).join('') || '<p class="muted">Sin citas registradas.</p>'; }
  window.tsV61SaveAppointment=function(){ const list=store('ts_store_appointments')||[]; const item={client:val('apClient')||'Cliente',type:val('apType'),date:val('apDate')||new Date().toLocaleDateString('es-VE'),time:val('apTime')||'Por confirmar',note:val('apNote')}; list.unshift(item); store('ts_store_appointments',list); window.tsV61LastAppointment=`ThinkStore · Cita en tienda\nCliente: ${item.client}\nMotivo: ${item.type}\nFecha: ${item.date}\nHora: ${item.time}\nDetalle: ${item.note}`; if($('apList')) $('apList').innerHTML=renderAppointments(list); };
  window.tsV61AppointmentWA=function(){ if(!window.tsV61LastAppointment) window.tsV61SaveAppointment(); wa(window.tsV61LastAppointment||'Cita ThinkStore'); };
  window.tsV61BuildQRLabel=function(){ const type=val('qrType'), code=val('qrCode')||'TS-2026-0000', desc=val('qrDesc')||'ThinkStore'; const url=`https://thinkstore.com.ve/?tracking=${encodeURIComponent(code)}#status`; const html=`<div class="ts-qr-label"><div class="ts-qr-fake">QR</div><div><b>${esc(type)} · ${esc(code)}</b><p>${esc(desc)}</p><small>${esc(url)}</small></div></div>`; if($('qrResult')) $('qrResult').innerHTML=html; };
  window.tsV61Recommend=function(){ const p=val('rcProduct').toLowerCase(); const budget=Number(val('rcBudget')||0); let items=['Funda premium','Vidrio templado','Cargador USB‑C','Cable 240W']; if(p.includes('iphone')) items=['AirPods Pro','Cargador 35W','Funda MagSafe','Apple Watch','Vidrio premium']; if(p.includes('mac')) items=['Magic Mouse','Magic Keyboard','Adaptador USB‑C','Hub multipuerto','Soporte laptop']; if(p.includes('ipad')) items=['Apple Pencil USB‑C','Magic Keyboard','Funda protectora','Cargador USB‑C']; const pick=budget<100?items.slice(0,3):items; const msg=`ThinkStore · Recomendaciones inteligentes\nProducto: ${val('rcProduct')||'Producto'}\nUso: ${val('rcUse')}\nPresupuesto adicional: ${money(budget)}\n\nSugerencias:\n• ${pick.join('\n• ')}`; window.tsV61LastRecommend=msg; if($('rcResult')) $('rcResult').textContent=msg; };
  window.tsV61RecommendWA=function(){ if(!window.tsV61LastRecommend) window.tsV61Recommend(); wa(window.tsV61LastRecommend||'Recomendaciones ThinkStore'); };

  function activateV60Cards(){
    const map=[['Portal completo del cliente','portal'],['CRM inteligente','crm'],['Financiamiento y cuotas','finance'],['Renueva tu iPhone','tradein'],['Citas en tienda','appointments'],['Etiquetas QR','qr'],['Recomendaciones inteligentes','recommendations']];
    document.querySelectorAll('#v60-ecosistema-comercial div[style]').forEach(el=>{
      const txt=el.textContent||''; const m=map.find(([label])=>txt.includes(label)); if(!m) return;
      el.setAttribute('role','button'); el.tabIndex=0; el.classList.add('ts-growth-active');
      el.onclick=()=>window.tsOpenV61Feature(m[1]); el.onkeydown=(e)=>{ if(e.key==='Enter') el.click(); };
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',activateV60Cards); else activateV60Cards();
})();

/* ===== ThinkStore V62 Multi-Rol Pro: permisos, portal y acceso por rol ===== */
(function(){
  const ROLE_LABELS={
    cliente:'Cliente', vendedor:'Ventas', recepcion:'Recepción', soporte:'Soporte', tecnico:'Técnico', logistica:'Logística', admin:'Admin', superadmin:'Super Admin'
  };
  const STAFF_ROLES=['vendedor','recepcion','soporte','tecnico','logistica','admin','superadmin'];
  function readUser(){ try{ return JSON.parse(localStorage.getItem('ts_current_user')||'null'); }catch(e){ return null; } }
  function writeUser(u){ if(u) localStorage.setItem('ts_current_user', JSON.stringify(u)); }
  function normalizeRole(role){
    role=String(role||'cliente').trim().toLowerCase();
    if(role==='seller'||role==='ventas') return 'vendedor';
    if(role==='reception'||role==='recepción') return 'recepcion';
    if(role==='support') return 'soporte';
    if(role==='technical') return 'tecnico';
    if(role==='logistics') return 'logistica';
    if(role==='administrator') return 'admin';
    return ROLE_LABELS[role] ? role : 'cliente';
  }
  window.tsGetCurrentRole=function(){ const u=readUser(); return normalizeRole(u?.role || u?.rol || u?.tipo || 'cliente'); };
  window.tsRoleLabel=function(role){ return ROLE_LABELS[normalizeRole(role)] || 'Cliente'; };
  window.tsIsStaff=function(){ return STAFF_ROLES.includes(window.tsGetCurrentRole()); };
  window.tsCan=function(module){
    const role=window.tsGetCurrentRole();
    const map={
      cliente:['cuenta','pedidos','preordenes','garantias','reparaciones_cliente','puntos'],
      vendedor:['ventas','cotizaciones','clientes','pagos','preordenes','crm','productos','whatsapp'],
      recepcion:['recepcion','tickets','diagnostico','reparaciones','garantias','clientes','citas'],
      soporte:['soporte','tickets','diagnostico','reparaciones','garantias','clientes','citas'],
      tecnico:['tecnico','diagnostico','reparaciones','repuestos','pruebas','garantias'],
      logistica:['logistica','envios','guias','entregas','pedidos','preordenes'],
      admin:['*'], superadmin:['*']
    };
    const allowed=map[role]||map.cliente;
    return allowed.includes('*') || allowed.includes(module);
  };
  async function hydrateRoleFromSupabase(){
    const u=readUser();
    if(!u || !window.tsSupabaseReady || !window.tsSupabase) return u;
    try{
      const session=await window.tsSupabase.auth.getSession();
      const uid=session?.data?.session?.user?.id || u.supabase_id || u.id;
      const email=session?.data?.session?.user?.email || u.email;
      let role='cliente';
      if(uid){
        const r1=await window.tsSupabase.from('staff_profiles').select('role,is_active').eq('id',uid).maybeSingle();
        if(!r1.error && r1.data && r1.data.is_active!==false) role=normalizeRole(r1.data.role);
        if(role==='cliente'){
          const r2=await window.tsSupabase.from('clientes').select('role,rol,tipo').eq('id',uid).maybeSingle();
          if(!r2.error && r2.data) role=normalizeRole(r2.data.role||r2.data.rol||r2.data.tipo||'cliente');
        }
      }
      if(email && role==='cliente'){
        const r3=await window.tsSupabase.from('staff_profiles').select('role,is_active').eq('email',email).maybeSingle();
        if(!r3.error && r3.data && r3.data.is_active!==false) role=normalizeRole(r3.data.role);
      }
      u.role=role; u.rol=role; writeUser(u);
      return u;
    }catch(e){ console.warn('ThinkStore role hydrate:', e); return u; }
  }
  function updateNavRole(){
    const btn=document.getElementById('clientNavBtn');
    const u=readUser();
    if(!btn) return;
    if(!u){ btn.textContent='👤 Login'; return; }
    const role=window.tsGetCurrentRole();
    btn.textContent=window.tsIsStaff() ? '🧭 Panel' : '👤 Cuenta';
    btn.title=window.tsIsStaff() ? ('Panel '+window.tsRoleLabel(role)) : 'Mi cuenta ThinkStore';
  }
  window.tsOpenRolePanel=function(){
    const u=readUser();
    if(!u){ if(typeof window.openClientLogin==='function') window.openClientLogin(); return; }
    if(window.tsIsStaff()) location.href='panel.html';
    else if(typeof window.openAccount==='function') window.openAccount();
  };
  window.tsClientNavAction=function(){ window.tsOpenRolePanel(); };
  const oldLogin=window.loginClient;
  if(typeof oldLogin==='function'){
    window.loginClient=async function(){
      const r=await oldLogin.apply(this, arguments);
      await hydrateRoleFromSupabase();
      updateNavRole();
      return r;
    };
  }
  document.addEventListener('DOMContentLoaded', async()=>{ await hydrateRoleFromSupabase(); updateNavRole(); });
  window.addEventListener('load', updateNavRole);
  setInterval(updateNavRole, 1500);
})();
