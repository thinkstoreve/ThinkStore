/* ThinkStore V15.35 · Thinky · Asistente comercial inteligente */
(()=>{
  if(window.__TS_CHATBOT_V1535__) return; window.__TS_CHATBOT_V1535__=true;
  const WA='584241706142';
  const STORAGE='ts_chat_v1535';
  const LEGACY_STORAGE='ts_chat_v135';
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const money=n=>Number(n||0)>0?`USD ${Number(n).toFixed(2)}`:'Precio a consultar';
  const first=(...v)=>v.find(x=>String(x||'').trim())||'';
  const words=s=>norm(s).split(/\s+/).filter(x=>x.length>1);
  const slug=s=>norm(s).replace(/\s+/g,'-')||'producto';

  const STOP=new Set('quiero quisiera necesito busco buscar dame dime tienes tienen hay una uno unos unas para por con del de la el los las en un y o me mi que cual cuales como cuanto cuesta precio precios disponible disponibilidad'.split(' '));
  const SYN={
    'forro':'case','funda':'case','carcasa':'case','silicon':'silicone','silicona':'silicone','charger':'cargador','cargadores':'cargador',
    'baterias':'bateria','pantallas':'pantalla','reparar':'reparacion','reparo':'reparacion','reparacion':'servicio','tecnico':'servicio',
    'macbook':'mac','imac':'mac','airpods':'audio','audifonos':'audio','audifono':'audio','watch':'reloj','applewatch':'reloj',
    'transferencias':'transferencia','pagomovil':'pago movil','delivery':'envio','envios':'envio','preorden':'pre order','preordenes':'pre order',
    'tradein':'trade in','canje':'trade in','recibo':'pedido','orden':'pedido','estatus':'seguimiento','status':'seguimiento','cita':'agenda',
    'office':'microsoft 365','word':'microsoft 365','excel':'microsoft 365','powerpoint':'microsoft 365','photoshop':'adobe','illustrator':'adobe','premiere':'adobe'
  };
  function canonical(s){
    let t=' '+norm(s)+' ';
    Object.entries(SYN).sort((a,b)=>b[0].length-a[0].length).forEach(([a,b])=>{t=t.replace(new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'g'),b)});
    return t.trim();
  }
  function queryTokens(s){return words(canonical(s)).filter(x=>!STOP.has(x));}
  function editDistance(a,b){
    a=norm(a);b=norm(b);if(a===b)return 0;if(!a)return b.length;if(!b)return a.length;
    const prev=Array.from({length:b.length+1},(_,i)=>i),cur=Array(b.length+1);
    for(let i=1;i<=a.length;i++){cur[0]=i;for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));for(let j=0;j<=b.length;j++)prev[j]=cur[j]}
    return prev[b.length];
  }
  function fuzzyToken(q,t){
    if(!q||!t)return 0;if(q===t)return 1;if(t.startsWith(q)||q.startsWith(t))return .86;
    if(q.length<4||t.length<4)return 0;
    const d=editDistance(q,t),m=Math.max(q.length,t.length);return d<=2?1-d/m:0;
  }

  const ROUTES=[
    {id:'catalogo',kind:'page',title:'Catálogo ThinkStore',subtitle:'iPhone, Mac, iPad, AirPods, Apple Watch y accesorios.',keywords:'producto comprar catalogo iphone mac ipad airpods apple watch accesorio stock disponibilidad precio',url:'index.html#catalogo',action:'Ver catálogo'},
    {id:'accesorios',kind:'page',title:'Accesorios',subtitle:'Cases, cargadores, MagSafe, cables, vidrios y más.',keywords:'accesorio case silicone funda cargador magsafe cable usb c vidrio templado pencil airtag',url:'index.html?categoria=Accesorios#catalogo',action:'Ver accesorios'},
    {id:'servicio',kind:'page',title:'Servicio Técnico',subtitle:'Diagnóstico, reparación, mantenimiento y seguimiento.',keywords:'servicio tecnico reparacion diagnostico falla pantalla bateria carga circuito microsoldadura mantenimiento soporte',url:'servicio-tecnico.html',action:'Abrir Servicio Técnico'},
    {id:'precios-servicio',kind:'page',title:'Precios y repuestos',subtitle:'Consulta reparaciones por equipo, modelo y tipo de falla.',keywords:'precio repuesto servicio tecnico pantalla bateria circuito carga flex calidad stock reparacion',url:'servicio-precios.html',action:'Consultar precios'},
    {id:'agenda',kind:'page',title:'Agendar una cita',subtitle:'Reserva atención de Servicio Técnico por previa cita.',keywords:'agenda cita reservar turno servicio tecnico reparacion chacao',url:'agenda-soporte.html',action:'Agendar'},
    {id:'trade-in',kind:'page',title:'Trade‑In',subtitle:'Entrega tu equipo actual como parte de pago.',keywords:'trade in canje renovar iphone parte pago entregar equipo usado valor cotizar',url:'trade-in.html',action:'Cotizar Trade‑In'},
    {id:'envios',kind:'page',title:'Envíos y delivery',subtitle:'Opciones de entrega y envíos nacionales.',keywords:'envio delivery entrega mrw zoom tealca retiro domicilio caracas nacional',url:'envio-regiones.html',action:'Ver envíos'},
    {id:'contacto',kind:'page',title:'Contacto ThinkStore',subtitle:'Chacao, Caracas · atención por previa cita.',keywords:'contacto ubicacion direccion mapa chacao caracas telefono whatsapp tienda donde estan',url:'contacto.html',action:'Ver contacto'},
    {id:'cuenta',kind:'page',title:'Mi cuenta',subtitle:'Pedidos, reparaciones, garantías, favoritos y direcciones.',keywords:'mi cuenta iniciar sesion login pedido compras reparacion garantia favorito direccion cliente',url:'login.html',action:'Entrar a Mi cuenta'},
    {id:'office',kind:'page',title:'Microsoft 365 / Office',subtitle:'Instalación y configuración en Mac con licencia válida.',keywords:'microsoft 365 office word excel powerpoint outlook onedrive software mac instalar',url:'servicio-tecnico.html#software-profesional',action:'Ver Office'},
    {id:'adobe',kind:'page',title:'Adobe Creative Cloud',subtitle:'Photoshop, Illustrator, Premiere, Acrobat y más.',keywords:'adobe creative cloud photoshop illustrator premiere acrobat lightroom software mac instalar',url:'servicio-tecnico.html#software-profesional',action:'Ver Adobe'}
  ];
  const KNOWLEDGE=[
    {id:'pagos',keys:'pago pagar zelle pago movil transferencia efectivo banco binance usdt dolar dolares bolivares metodos',text:'ThinkStore admite varias formas de pago, incluyendo Zelle, Pago Móvil, transferencias nacionales e internacionales, Binance/USDT y efectivo. En compras con varios métodos podemos registrar pagos combinados. Para datos bancarios exactos, usa el checkout o confirma con nuestro equipo.',cards:['catalogo','contacto']},
    {id:'envios',keys:'envio delivery entrega mrw zoom tealca retiro domicilio agencia',text:'Podemos coordinar delivery y envíos nacionales según zona y disponibilidad. Para ver las opciones y preparar el envío de un equipo o una compra, abre la sección de envíos.',cards:['envios','contacto']},
    {id:'ubicacion',keys:'ubicacion direccion donde estan tienda chacao caracas mapa local visitar',text:'ThinkStore atiende en Chacao, Caracas, por previa cita. La página de contacto muestra la referencia de ubicación y puedes coordinar la visita antes de desplazarte.',cards:['contacto','agenda']},
    {id:'garantia',keys:'garantia devolucion cambio falla garantia producto comprobante nota entrega',text:'La garantía depende del producto o servicio y de su condición. Conserva tu comprobante o Nota de Entrega. Para reparaciones, la ficha del servicio muestra la garantía aplicable y puedes consultar el seguimiento de tu orden.',cards:['servicio','cuenta']},
    {id:'pedido',keys:'pedido seguimiento estatus orden compra donde esta mi pedido rastrear',text:'Por privacidad no muestro datos de pedidos directamente en el chat. Inicia sesión en Mi cuenta para consultar tus pedidos y su seguimiento, o usa el enlace seguro recibido por ThinkStore.',cards:['cuenta']},
    {id:'preorder',keys:'pre order preorden encargo bajo pedido apartar reservar producto',text:'Los productos sin disponibilidad inmediata pueden manejarse como Pre‑Order o bajo pedido. El plazo se confirma según producto y proveedor antes de cerrar la compra.',cards:['catalogo','contacto']},
    {id:'tradein',keys:'trade in canje parte pago renovar entregar iphone usado vender equipo',text:'Con Trade‑In puedes entregar tu equipo actual como parte de pago para renovar. El valor final se confirma después de revisar modelo, capacidad y condición física.',cards:['trade-in']},
    {id:'software',keys:'adobe microsoft 365 office word excel powerpoint photoshop illustrator premiere software mac',text:'ThinkStore ofrece instalación y configuración de Microsoft 365 / Office y Adobe Creative Cloud en Mac usando una licencia o suscripción válida del cliente.',cards:['office','adobe']}
  ];

  const live={loaded:false,loading:null,products:[],services:[],updatedAt:0};
  function catOf(p){try{if(typeof productCategoryV2==='function')return productCategoryV2(p)}catch(e){}return first(p.category,p.cat,'Catálogo')}
  function imageOf(p){try{if(typeof productImageV2==='function')return productImageV2(p)}catch(e){}let x=first(p.main,p.image,p.img,p.image_url);if(!x)return'';if(/^https?:|^data:|^assets\//.test(x))return x;return 'assets/'+x.replace(/^\//,'')}
  function staticProducts(){
    let list=[];try{if(typeof productsV2==='function')list=productsV2()||[]}catch(e){}
    if(!list.length)try{if(typeof PRODUCTS!=='undefined'&&Array.isArray(PRODUCTS))list=PRODUCTS}catch(e){}
    return list.map(p=>({
      id:String(first(p.id,p.sku,p.name)),kind:'product',title:first(p.name,p.model,'Producto ThinkStore'),subtitle:first(p.desc,p.description,p.family,catOf(p)),
      category:catOf(p),image:imageOf(p),price:Number(first(p.price,p.from,p.basePrice,0))||0,available:Number(p.inventory_available??-1),
      keywords:[p.name,p.model,p.family,p.category,p.cat,p.brand,p.badge,p.desc,p.description,p.features?.join(' '),p.storage?.join(' '),Object.keys(p.colors||{}).join(' ')].filter(Boolean).join(' ')
    }));
  }
  function mergeProducts(inv){
    const base=staticProducts(),map=new Map(base.map(x=>[norm(x.title),x]));
    const variants=Array.isArray(inv?.variants)?inv.variants:[],byName=new Map();
    variants.forEach(v=>{const k=norm(v.product_name);if(!k)return;if(!byName.has(k))byName.set(k,[]);byName.get(k).push(v)});
    // Primero enriquece los productos ya existentes del catálogo.
    base.forEach(p=>{const vars=byName.get(norm(p.title))||[];if(!vars.length)return;const prices=vars.map(v=>Number(v.price_usd||0)).filter(n=>n>0);p.available=vars.reduce((n,v)=>n+Math.max(0,Number(v.available??(Number(v.stock_on_hand||0)-Number(v.stock_reserved||0)))),0);if(prices.length)p.price=Math.min(...prices);p.keywords+=' '+vars.map(v=>[v.model,v.color,v.capacity,v.condition,v.sku].join(' ')).join(' ')});

    const published=(inv?.inventory_products||[]).filter(p=>p&&p.active!==false&&p.published!==false);
    // Los accesorios en la tienda pública se agrupan por product_group; Thinky replica la misma lógica.
    const groups=new Map();
    for(const p of published){
      if(/servicio|repuesto|pantalla|bateria|circuito|flex|sensor|back cover|microsoldadura/i.test(`${p.category} ${p.subcategory}`))continue;
      const isAccessory=/acces/i.test(String(p.category||''));
      const title=String(isAccessory?(p.product_group||p.name):p.name||'').trim();if(!title)continue;
      const key=norm(title);if(!groups.has(key))groups.set(key,{title,rows:[],isAccessory});groups.get(key).rows.push(p);
    }
    for(const g of groups.values()){
      const rows=g.rows,vars=byName.get(norm(g.title))||[];
      const prices=[...rows.map(x=>Number(x.sale_price||0)),...vars.map(v=>Number(v.price_usd||0))].filter(n=>n>0);
      const avail=vars.reduce((n,v)=>n+Math.max(0,Number(v.available??(Number(v.stock_on_hand||0)-Number(v.stock_reserved||0)))),0);
      const specs=[...new Set(rows.map(x=>first(x.compatibility,x.model,x.capacity,x.color)).filter(Boolean))];
      const rec={id:g.isAccessory?'inv-'+slug(g.title):String(first(rows[0].id,g.title)),kind:'product',title:g.title,subtitle:[rows.find(x=>x.subcategory)?.subcategory,...specs.slice(0,2)].filter(Boolean).join(' · ')||rows.find(x=>x.description)?.description||rows[0].category,category:g.isAccessory?'Accesorios':rows[0].category||'Catálogo',image:rows.find(x=>x.image_url)?.image_url||'',price:prices.length?Math.min(...prices):0,available:avail,keywords:rows.map(p=>[p.name,p.product_group,p.category,p.subcategory,p.compatibility,p.model,p.capacity,p.color,p.condition,p.brand,p.description,p.sku].join(' ')).join(' ')};
      const old=map.get(norm(g.title));if(old)Object.assign(old,{...rec,id:old.id||rec.id,image:rec.image||old.image,subtitle:rec.subtitle||old.subtitle,price:rec.price||old.price,available:vars.length?avail:old.available});else{base.push(rec);map.set(norm(g.title),rec)}
    }
    return base.filter((x,i,a)=>x.title&&a.findIndex(y=>norm(y.title)===norm(x.title))===i);
  }
  async function loadLive(force=false){
    if(live.loading)return live.loading;if(live.loaded&&!force&&Date.now()-live.updatedAt<120000)return live;
    live.loading=(async()=>{
      const [ir,sr]=await Promise.allSettled([
        fetch('/.netlify/functions/inventory?ts='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null),
        fetch('/.netlify/functions/service-parts?ts='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null)
      ]);
      const inv=ir.status==='fulfilled'?ir.value:null,svc=sr.status==='fulfilled'?sr.value:null;
      live.products=mergeProducts(inv||{});
      live.services=(svc?.ok&&Array.isArray(svc.items)?svc.items:[]).map(x=>({
        id:String(first(x.sku,x.id,x.name)),sku:String(x.sku||''),kind:'service',title:first(x.name,x.repair,'Servicio técnico'),subtitle:[x.device_category,x.model||x.series,x.repair,x.quality].filter(Boolean).join(' · '),
        category:x.device_category||'Servicio Técnico',image:x.image_url||'',price:Number(x.price_usd||0),available:Number(x.available||0),repair:x.repair||'',model:x.model||x.series||'',quality:x.quality||'',
        keywords:[x.name,x.device_category,x.model,x.series,x.model_type,x.repair,x.quality,x.sku,x.description,x.compatibility,x.subcategory].join(' ')
      }));
      live.loaded=true;live.updatedAt=Date.now();live.loading=null;return live;
    })().catch(e=>{live.products=staticProducts();live.services=[];live.loaded=true;live.updatedAt=Date.now();live.loading=null;return live});
    return live.loading;
  }

  function scoreRecord(rec,q){
    const cq=canonical(q),qt=queryTokens(q),hay=canonical([rec.title,rec.subtitle,rec.category,rec.keywords].join(' ')),ht=words(hay);let s=0;
    if(!qt.length)return 0;
    const title=canonical(rec.title);
    if(title===cq)s+=130;if(cq.length>2&&title.includes(cq))s+=75;if(cq.length>3&&hay.includes(cq))s+=38;
    for(const w of qt){
      if(title.split(' ').includes(w))s+=22;else if(title.includes(w))s+=15;else if(hay.includes(w))s+=9;
      let best=0;for(const h of ht){const f=fuzzyToken(w,h);if(f>best)best=f;if(best===1)break}s+=Math.round(best*16);
    }
    const serviceHint=/falla|repara|servicio|pantalla|bateria|no carga|circuito|flex|micro|diagnost|cambio|roto|mojo|liquido|software/.test(cq);
    const productHint=/compr|producto|iphone|ipad|mac|audio|reloj|case|silicone|cargador|cable|magsafe|airtag|pencil|accesorio/.test(cq);
    if(rec.kind==='service'&&serviceHint)s+=24;if(rec.kind==='product'&&productHint)s+=18;
    if(rec.available>0)s+=4;
    return s;
  }
  function parseBudget(q){const t=canonical(q);if(!/presupuesto|hasta|menos de|maximo|máximo|por debajo|usd|\$/.test(String(q).toLowerCase()))return 0;const nums=[...String(q).replace(/,/g,'.').matchAll(/(?:usd|\$)?\s*(\d+(?:\.\d+)?)/gi)].map(m=>Number(m[1])).filter(n=>n>0);return nums.length?Math.max(...nums):0}
  function searchAll(q){
    const budget=parseBudget(q),all=[...live.products,...live.services,...ROUTES];
    return all.map(rec=>({rec,score:scoreRecord(rec,q)})).filter(x=>x.score>10&&(!budget||x.rec.kind!=='product'||!x.rec.price||x.rec.price<=budget)).sort((a,b)=>b.score-a.score||Number(b.rec.available>0)-Number(a.rec.available>0)||Number(a.rec.price||1e9)-Number(b.rec.price||1e9)).slice(0,6).map(x=>x.rec);
  }
  function route(id){return ROUTES.find(x=>x.id===id)}
  function knowledge(q){
    const qt=queryTokens(q);let best=null,score=0;
    for(const k of KNOWLEDGE){const hay=words(k.keys);let n=0;qt.forEach(w=>{let b=0;hay.forEach(h=>b=Math.max(b,fuzzyToken(w,h)));n+=b});if(n>score){score=n;best=k}}
    return score>=.9?best:null;
  }
  function cardHTML(r){
    if(!r)return'';
    if(r.kind==='page')return `<article class="ts-chat-result ts-page-result"><div class="ts-result-icon">↗</div><div class="ts-result-copy"><b>${esc(r.title)}</b><small>${esc(r.subtitle)}</small><a href="${esc(r.url)}">${esc(r.action||'Abrir')}</a></div></article>`;
    const service=r.kind==='service';const img=r.image?`<img src="${esc(r.image)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('no-img');this.remove()">`:`<span>${service?'🔧':'◫'}</span>`;
    const stock=r.available>0?`Disponible · ${r.available}`:(r.available===0?'Consultar / bajo pedido':'Disponibilidad al consultar');
    const action=service
      ? `<a href="servicio-precios.html?cat=${encodeURIComponent(r.category||'iPhone')}&buscar=${encodeURIComponent(r.title+' '+(r.model||r.repair||''))}">Ver servicio</a>`
      : `<button type="button" data-ts-product="${esc(r.id)}" data-ts-product-name="${esc(r.title)}">Ver producto</button>`;
    return `<article class="ts-chat-result"><div class="ts-result-media">${img}</div><div class="ts-result-copy"><em>${esc(service?'Servicio Técnico':r.category||'Producto')}</em><b>${esc(r.title)}</b><small>${esc(r.subtitle||'')}</small><div class="ts-result-meta"><strong>${esc(money(r.price))}</strong><span>${esc(stock)}</span></div>${action}</div></article>`;
  }
  function msg(role,text,save=true,cards=[]){
    const body=qs('#tsChatBody');if(!body)return;
    const row=document.createElement('div');row.className='ts-msg '+role;
    if(role==='bot')row.innerHTML=`<div class="ts-bot-stack"><div class="ts-bubble">${esc(text)}</div>${cards.length?`<div class="ts-chat-results">${cards.map(cardHTML).join('')}</div>`:''}</div>`;
    else row.innerHTML=`<div class="ts-bubble">${esc(text)}</div>`;
    body.appendChild(row);body.scrollTop=body.scrollHeight;if(save)persist();
  }
  function persist(){
    const data=qsa('#tsChatBody .ts-msg').slice(-24).map(n=>({role:n.classList.contains('user')?'user':'bot',text:qs('.ts-bubble',n)?.textContent||''}));
    try{sessionStorage.setItem(STORAGE,JSON.stringify(data))}catch(e){}
  }
  function restore(){
    let data=[];try{data=JSON.parse(sessionStorage.getItem(STORAGE)||sessionStorage.getItem(LEGACY_STORAGE)||'[]')}catch(e){}
    if(Array.isArray(data)&&data.length)data.forEach(x=>msg(x.role==='user'?'user':'bot',x.text,false));
    else msg('bot','Hola 👋 Soy Thinky, el asistente comercial de ThinkStore. Puedo buscar productos, accesorios, precios, reparaciones y llevarte directamente a la opción correcta.',true);
  }
  function typing(on){const body=qs('#tsChatBody');if(!body)return;qs('#tsTyping')?.remove();if(on){const d=document.createElement('div');d.id='tsTyping';d.className='ts-msg bot';d.innerHTML='<span class="ts-chat-typing"><i></i><i></i><i></i></span>';body.appendChild(d);body.scrollTop=body.scrollHeight}}
  function greeting(q){const t=canonical(q);return /^(hola|buenas|hey|saludos|buen dia|buenas tardes|buenas noches)( |$)/.test(t)&&words(t).length<5}
  function thanks(q){return /\b(gracias|perfecto|listo|excelente)\b/.test(canonical(q))&&words(q).length<6}
  function suggestionText(results,q){
    const p=results.filter(x=>x.kind==='product'),s=results.filter(x=>x.kind==='service');
    if(p.length&&s.length)return `Encontré ${p.length} producto${p.length===1?'':'s'} y ${s.length} opción${s.length===1?'':'es'} de Servicio Técnico relacionadas con “${q}”.`;
    if(p.length)return `Encontré estas opciones en el catálogo para “${q}”. Te muestro primero las coincidencias más útiles.`;
    if(s.length)return `Encontré estas opciones de Servicio Técnico relacionadas con “${q}”.`;
    return `Encontré estas secciones de ThinkStore relacionadas con “${q}”.`;
  }
  async function answer(text){
    msg('user',text);typing(true);
    await loadLive(false);await new Promise(r=>setTimeout(r,240));typing(false);
    if(greeting(text)){msg('bot','¡Hola! 👋 Dime lo que buscas tal como se lo dirías a un vendedor: “iPhone 17 negro”, “cable USB‑C”, “mi iPhone no carga” o “recomiéndame algo hasta $500”.');return}
    if(thanks(text)){msg('bot','¡Con gusto! 😊 Puedes seguir preguntándome por cualquier producto, accesorio, servicio o proceso de ThinkStore.');return}
    const cq=canonical(text),budget=parseBudget(text);
    const wantsRecommendation=/recomiend|sugier|opcion|opciones|presupuesto|que compro|que me conviene/.test(cq);
    if(wantsRecommendation&&budget){
      let pool=live.products.filter(x=>x.price>0&&x.price<=budget&&x.available!==0);
      const hints=queryTokens(text).filter(x=>!/^\d/.test(x)&&!['recomiendame','recomienda','sugiere','sugerencia','opcion','opciones','presupuesto','algo'].includes(x));
      if(hints.length){const narrowed=pool.filter(x=>hints.some(w=>canonical([x.title,x.category,x.keywords].join(' ')).includes(w)));if(narrowed.length)pool=narrowed}
      pool=pool.sort((a,b)=>Number(b.available>0)-Number(a.available>0)||b.price-a.price).slice(0,4);
      if(pool.length){msg('bot',`Con un presupuesto de hasta ${money(budget)}, estas son las opciones que mejor encajan ahora mismo. Puedes decirme también si prefieres iPhone, Mac, iPad o accesorios para afinar la recomendación.`,true,pool);return}
    }
    const k=knowledge(text),results=searchAll(text);
    const strong=results.filter((r,i)=>i<4);
    if(k){
      const extra=(k.cards||[]).map(route).filter(Boolean);
      const relevant=strong.filter(x=>x.kind==='product'||x.kind==='service').slice(0,3);
      msg('bot',k.text,true,[...relevant,...extra].slice(0,4));return;
    }
    if(strong.length){msg('bot',suggestionText(strong,text),true,strong);return}
    const t=canonical(text);
    if(/pedido|seguimiento|orden/.test(t)){msg('bot','Por privacidad, el seguimiento de una compra o reparación se consulta desde Mi cuenta o mediante el enlace seguro que recibiste.',true,[route('cuenta'),route('servicio')]);return}
    msg('bot','No encontré una coincidencia exacta, pero puedo buscar por modelo, capacidad, color, presupuesto, accesorio o falla. Prueba algo como “iPhone 17 256”, “Silicone Case”, “cargador 20W”, “batería iPhone 13” o “mi equipo no carga”.',true,[route('catalogo'),route('servicio'),route('contacto')]);
  }
  function create(){
    if(qs('#tsChat'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <button class="ts-chat-launcher" id="tsChatLauncher" type="button" aria-label="Abrir asistente ThinkStore" aria-controls="tsChat" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.8 4v-4.2A2.5 2.5 0 0 1 4 13.5z"/></svg><span class="dot"></span></button>
      <section class="ts-chat" id="tsChat" aria-hidden="true" aria-label="Asistente ThinkStore">
        <div class="ts-chat-head"><div class="ts-chat-avatar">T</div><div class="ts-chat-title"><b>Thinky · ThinkStore</b><span>Asistente comercial inteligente</span></div><button class="ts-chat-close" id="tsChatClose" type="button" aria-label="Cerrar chat">×</button></div>
        <div class="ts-chat-body" id="tsChatBody" aria-live="polite"></div>
        <div class="ts-chat-quick" aria-label="Preguntas rápidas"><button class="ts-chat-chip" data-q="iPhone disponibles">iPhone</button><button class="ts-chat-chip" data-q="Busco accesorios">Accesorios</button><button class="ts-chat-chip" data-q="Mi iPhone no carga">No carga</button><button class="ts-chat-chip" data-q="¿Cómo funciona Trade-In?">Trade‑In</button><button class="ts-chat-chip" data-q="¿Cuáles son las formas de pago?">Pagos</button></div>
        <form class="ts-chat-form" id="tsChatForm"><input class="ts-chat-input" id="tsChatInput" autocomplete="off" maxlength="400" placeholder="¿Qué estás buscando?" aria-label="Mensaje"><button class="ts-chat-send" type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.2 21 12 3.4 3.8l.1 6.4L16 12 3.5 13.8z"/></svg></button></form>
        <div class="ts-chat-note"><span id="tsChatDataState">Catálogo en vivo</span> · ¿Necesitas atención humana? <a target="_blank" rel="noopener" href="https://wa.me/${WA}?text=Hola%20ThinkStore%2C%20vengo%20desde%20Thinky%20y%20necesito%20ayuda.">WhatsApp</a></div>
      </section>`);
    bind();restore();
  }
  function open(){const c=qs('#tsChat'),b=qs('#tsChatLauncher');c?.classList.add('open');c?.setAttribute('aria-hidden','false');b?.setAttribute('aria-expanded','true');loadLive(false).then(()=>{const x=qs('#tsChatDataState');if(x)x.textContent='Catálogo actualizado'});setTimeout(()=>qs('#tsChatInput')?.focus(),180)}
  function close(){const c=qs('#tsChat'),b=qs('#tsChatLauncher');c?.classList.remove('open');c?.setAttribute('aria-hidden','true');b?.setAttribute('aria-expanded','false')}
  function bind(){
    qs('#tsChatLauncher')?.addEventListener('click',()=>qs('#tsChat')?.classList.contains('open')?close():open());qs('#tsChatClose')?.addEventListener('click',close);
    qs('#tsChatForm')?.addEventListener('submit',e=>{e.preventDefault();const i=qs('#tsChatInput'),t=i?.value.trim();if(!t)return;i.value='';answer(t)});
    qsa('.ts-chat-chip').forEach(b=>b.addEventListener('click',()=>answer(b.dataset.q||b.textContent)));
    qs('#tsChatBody')?.addEventListener('click',e=>{
      const b=e.target.closest('[data-ts-product]');if(!b)return;const id=b.dataset.tsProduct,name=b.dataset.tsProductName;
      try{if(typeof openProductFromV2==='function'){close();openProductFromV2(id);return}}catch(_e){}
      location.href=`index.html?producto=${encodeURIComponent(id)}&producto_nombre=${encodeURIComponent(name||'')}#catalogo`;
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&qs('#tsChat')?.classList.contains('open'))close()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',create);else create();
})();
