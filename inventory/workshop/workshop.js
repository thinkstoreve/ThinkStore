(function(){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>'USD '+Number(v||0).toFixed(2),label={labor:'Mano de obra',part:'Repuesto',service:'Servicio / costo externo'};
 const input=(name,title,value='',type='text',extra='')=>`<label>${title}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
 function download(name,rows){const csv=rows.map(row=>row.map(v=>'"'+String(typeof v==='string'&&/^[=+@\-]/.test(v)?"'"+v:v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function mount(host,options){
  const F=window.TSWorkshopFinance;let parts=[],data={quotes:[],lines:[],payments:[]},page=0,query='',partFilter='all',groupFilter='all',deviceFilter='all',modelFilter='all',mode=options.mode||'parts';
  const api=async(action,payload)=>{
    const headers=await options.headers();
    const endpoint=new URL(options.endpoint||'/api/workshop',location.origin);
    if(!payload)endpoint.searchParams.set('action',action);
    endpoint.searchParams.set('_v','3.2.32');
    const r=await fetch(endpoint.toString(),{method:payload?'POST':'GET',cache:'no-store',credentials:'same-origin',headers:{...headers,'Content-Type':'application/json','Accept':'application/json','X-ThinkStore-Inventory-Version':'3.2.32'},...(payload?{body:JSON.stringify({action,...payload})}:{})});
    const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{};}catch{d={};}
    if(r.status===404){if(d&&d.error)throw Error(d.error);throw Error('API_WORKSHOP_ROUTE_404: '+endpoint.origin+endpoint.pathname+' no está publicado en este origen.');}
    if(!r.ok||!d.ok)throw Error(d.error||('No se pudo consultar el servicio técnico. HTTP '+r.status));
    return d;
   };
  host.innerHTML='<section class="wk"><p>Cargando datos de servicio técnico…</p></section>';
  const error=e=>{const msg=String(e?.message||'No se pudo cargar el inventario técnico.');let help='Revisa la conexión con el Supabase de Soporte.';if(/SUPPORT_SUPABASE|entorno de producción/i.test(msg))help='En Cloudflare Pages → Configuración → Variables y secretos agrega SUPPORT_SUPABASE_URL y una clave privada en SUPPORT_SUPABASE_SECRET_KEY (o el nombre legado SUPPORT_SUPABASE_SERVICE_ROLE_KEY), y luego vuelve a desplegar.';else if(/published|catalog_details|workshop_adjust_stock|does not exist|schema cache|relation/i.test(msg))help='La conexión funciona, pero falta compatibilidad de esquema. Ejecuta support-workshop-inventory-compat-v3.2.11.sql en el Supabase de Soporte.';else if(/API_WORKSHOP_ROUTE_404/i.test(msg))help='La aplicación está llegando a un origen sin la Pages Function. Abre https://inventory.thinkstore.com.ve y verifica /api/health. Esta versión elimina cachés anteriores automáticamente.';else if(/jwt|api key|unauthorized|401|Sesión inválida/i.test(msg))help='Revisa THINKSTORE_SUPABASE_PUBLISHABLE_KEY y vuelve a iniciar sesión. V3.2.26 valida Auth con la clave publishable y usa la clave privada solo para consultas de servidor.';const el=host.querySelector('.wk-message');if(el){el.textContent=msg+' '+help;}else host.innerHTML=`<section class="wk"><p role="alert">${esc(msg)}</p><p>${esc(help)}</p></section>`;};
  const formSubmit=(form,fn)=>{form.addEventListener('submit',async e=>{e.preventDefault();if(form.dataset.busy)return;form.dataset.busy='1';const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{await fn(new FormData(form),e);}catch(err){const msg=form.querySelector('.wk-form-message');if(msg)msg.textContent=err.message;else error(err);}finally{delete form.dataset.busy;buttons.forEach(b=>b.disabled=false);}});};
  const dialog=(title,html)=>{host.querySelector('dialog')?.remove();const d=document.createElement('dialog');d.className='wk-dialog';d.innerHTML=`<h2>${esc(title)}</h2>${html}<button type="button" class="wk-secondary wk-close">Cerrar</button>`;host.querySelector('.wk').append(d);d.querySelector('.wk-close').onclick=()=>d.close();d.showModal();return d;};
  async function refresh(){
   if(mode==='parts'){parts=(await api('parts')).parts;renderParts();}
   else{data=await api('finance');if(mode==='summary')renderSummary();else{parts=(await api('parts')).parts;renderFinance();}}
  }
  function header(title,description){return `<section class="wk"><header><div><h2>${title}</h2><p>${description}</p></div><button type="button" class="wk-refresh">Actualizar</button></header><p class="wk-message" role="status"></p>`;}
  function baseEvents(){host.querySelector('.wk-refresh').onclick=()=>refresh().catch(error);}

  const GROUPS=[
   ['all','Todo el catálogo','▦'],
   ['Apple · Pantallas','Apple · Pantallas','▣'],
   ['Apple · Baterías','Apple · Baterías','▤'],
   ['Apple · Sensores / proximidad','Apple · Sensores / proximidad','◉'],
   ['Apple · Flex de carga','Apple · Flex de carga','⌁'],
   ['Apple · Cámaras','Apple · Cámaras','◫'],
   ['Apple · Chasis / carcasas','Apple · Chasis / carcasas','▱'],
   ['Apple · Cubiertas traseras / Back Cover','Apple · Cubiertas traseras / Back Cover','◧'],
   ['Apple · Botones y flex','Apple · Botones y flex','⌘'],
   ['Audio · Speakers','Audio · Speakers','◖'],
   ['Audio · Auriculares','Audio · Auriculares','◒'],
   ['Audio · Micrófonos','Audio · Micrófonos','◍'],
   ['AirPods · Almohadillas','AirPods · Almohadillas','◌'],
   ['AirPods · Otros','AirPods · Otros','◎'],
   ['Conectividad / antenas','Conectividad / antenas','⌁'],
   ['Servicios · Mantenimiento','Servicios · Mantenimiento','✦'],
   ['Servicios · Software','Servicios · Software','⌘'],
   ['Servicios · Hardware','Servicios · Hardware','⚙'],
   ['Otros repuestos','Otros repuestos','□']
  ];
  const GROUP_NAMES=GROUPS.map(x=>x[0]).filter(x=>x!=='all');
  const fold=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const itemType=p=>fold(p?.catalog_details?.item_type)==='service'||fold(p?.category).startsWith('servicios')?'service':'part';
  function classifyPart(p){
   const m=p.catalog_details||{};
   if(m.inventory_group&&GROUP_NAMES.includes(m.inventory_group))return m.inventory_group;
   const t=fold([p.name,p.category,p.compatible_models,m.model,m.series,m.model_type,m.repair,m.description].join(' '));
   if(itemType(p)==='service'){
    const sg=fold(m.service_group||p.category);
    if(/software|office|adobe|macos|ios|sistema|instalacion|optimiz|respaldo|migracion/.test(sg+' '+t))return 'Servicios · Software';
    if(/hardware|micro|sold|ic|pmic|reball|placa|circuito|pista|pad|tristar|hydra|backlight/.test(sg+' '+t))return 'Servicios · Hardware';
    return 'Servicios · Mantenimiento';
   }
   if(/almohad|ear ?tip|gomita/.test(t)&&/airpod/.test(t))return 'AirPods · Almohadillas';
   if(/speaker|altavoz|bocina|parlante/.test(t))return 'Audio · Speakers';
   if(/auricular|earpiece|receiver|receptor/.test(t))return 'Audio · Auriculares';
   if(/microfono|microphone/.test(t))return 'Audio · Micrófonos';
   if(/pantalla|display|lcd|oled|screen|touch/.test(t))return 'Apple · Pantallas';
   if(/bateria|battery/.test(t))return 'Apple · Baterías';
   if(/proxim|sensor.*luz|ambient.*sensor/.test(t))return 'Apple · Sensores / proximidad';
   if(/flex.*carga|carga.*flex|charging|dock|puerto.*carga|conector.*carga/.test(t))return 'Apple · Flex de carga';
   if(/camara|camera|true ?depth/.test(t))return 'Apple · Cámaras';
   if(/cubierta.*trasera|back ?cover|rear ?cover|tapa.*trasera|back ?glass|vidrio.*trasero/.test(t))return 'Apple · Cubiertas traseras / Back Cover';
   if(/chasis|carcasa|housing/.test(t))return 'Apple · Chasis / carcasas';
   if(/boton|button|power|volumen|mute|encendido|home flex/.test(t))return 'Apple · Botones y flex';
   if(/wifi|bluetooth|antena|antenna|nfc|gps|senal/.test(t))return 'Conectividad / antenas';
   if(/airpod/.test(t))return 'AirPods · Otros';
   return 'Otros repuestos';
  }
  const deviceFamily=p=>{
   if(itemType(p)==='service')return p.category||'General';
   const explicit=String(p.category||'').trim();
   if(explicit)return explicit;
   const group=classifyPart(p);
   if(group.startsWith('AirPods'))return 'AirPods';
   if(group.startsWith('Audio'))return 'Audio';
   const t=fold([p.category,p.compatible_models,p.catalog_details?.model,p.catalog_details?.series].join(' '));
   if(/iphone/.test(t))return 'iPhone'; if(/ipad/.test(t))return 'iPad'; if(/macbook|imac|mac mini| mac /.test(' '+t+' '))return 'Mac';
   if(/watch/.test(t))return 'Apple Watch'; if(/airpod/.test(t))return 'AirPods'; return 'General';
  };
  const modelName=p=>String(p?.catalog_details?.model||p?.compatible_models||'Sin modelo').trim()||'Sin modelo';
  const iphoneGeneration=model=>{const raw=fold(model);if(/iphone\s*se/.test(raw)){if(/2020|2022|2nd|3rd|segunda|tercera/.test(raw))return 9;return 6;}const m=raw.match(/iphone\s*(\d+)/);return m?Number(m[1]):null;};
  function colorApplies(group,category,model,repair='',name='',modelType=''){
   const g=String(group||''),cat=fold(category),t=fold([model,repair,name,modelType].join(' '));
   if(g==='Apple · Cubiertas traseras / Back Cover'||g==='Apple · Chasis / carcasas')return true;
   if(g==='Apple · Flex de carga')return true;
   if(g==='Apple · Pantallas'){
    const gen=iphoneGeneration(model||t);
    return cat==='iphone'&&gen!==null&&gen<=8;
   }
   if(/cristal.*camara|vidrio.*camara|camera.*glass|lens.*glass|aro.*camara|camera.*ring/.test(t))return true;
   if(/bandeja.*sim|sim.*tray/.test(t))return true;
   if(/boton.*home|home.*button/.test(t)&&!/flex/.test(t))return true;
   return false;
  }
  const partUsesColor=p=>{const m=p?.catalog_details||{};return itemType(p)!=='service'&&colorApplies(classifyPart(p),deviceFamily(p),modelName(p),m.repair,p?.name,m.model_type);};
  const variantText=p=>{const m=p.catalog_details||{},bits=[];if(partUsesColor(p)&&m.color)bits.push(m.color);if(m.quality)bits.push(m.quality);if(!bits.length&&m.model_type)bits.push(m.model_type);return bits.join(' · ')||'Única variante';};
  const colorPolicyText=(group,category,model)=>colorApplies(group,category,model)?'Este repuesto usa color como variante.':'Color no aplica a este repuesto y se oculta para evitar variantes incorrectas.';
  const natural=(a,b)=>String(a||'').localeCompare(String(b||''),'es',{numeric:true,sensitivity:'base'});
  const DEVICE_OPTIONS=['iPhone','Mac','iPad','Apple Watch','AirPods','Audio','General'];
  const DEVICE_RANK=Object.fromEntries(DEVICE_OPTIONS.map((x,i)=>[x,i]));
  const QUALITY_LEVELS=['Estándar','Original','AAA','OEM','Premium','Reacondicionado','Servicio'];
  const QUALITY_RANK=Object.fromEntries(QUALITY_LEVELS.map((x,i)=>[x,i]));
  const REPAIR_OPTIONS={
   'iPhone':['Pantalla','Batería','Cámara frontal','Cámara trasera','Cristal cámara','Cristal cámara trasera','Flex de carga','Flex de encendido','Chasis','Cubierta trasera / Back Cover','Auricular','Parlante','Micrófono','Botón home','Botón volumen','WiFi','Dual SIM','Lector SIM','Baseband','MagSafe','Software','Face ID','Placa lógica','Baño químico','Diagnóstico','Sensor de proximidad','Taptic Engine'],
   'Mac':['Pantalla','Batería','Teclado','Trackpad','Bisagras','Flex de pantalla','Cargador / MagSafe','SSD','Memoria','Ventilación','Parlante','Micrófono','Cámara','Software','Instalación macOS','Optimización','Placa lógica','Baño químico','Diagnóstico'],
   'iPad':['Pantalla','Display','Touch','Batería','Puerto de carga','Cámara frontal','Cámara trasera','Cristal cámara','Parlante','Micrófono','WiFi','Botón home','Botón volumen','Face ID','Placa lógica','Software','Baño químico','Diagnóstico'],
   'Apple Watch':['Pantalla','Batería','Tapa trasera','Corona','Botón lateral','Sensor','Parlante','Micrófono','Flex de carga','Software','Diagnóstico'],
   'AirPods':['Batería','Case de carga','Parlante','Micrófono','Auricular','Malla / almohadillas','Flex de carga','Sensor','Software','Diagnóstico'],
   'Audio':['Parlante','Auricular','Micrófono','Almohadillas','Case de carga','Flex de carga','Diagnóstico'],
   'General':['Diagnóstico','Software','Mantenimiento','Instalación','Microsoldadura','Cambio de IC','Baño químico']
  };
  const SERVICE_REPAIR_OPTIONS=['Mantenimiento preventivo','Mantenimiento interno','Diagnóstico avanzado','Instalación Paquete Office','Instalación Suite Adobe','Instalación / restauración macOS','Optimización macOS','Migración / respaldo de datos','Microsoldadura','Cambio de IC','Reparación de circuito de carga','Reconstrucción de pistas / pads','Baño químico'];
  const deviceRank=v=>DEVICE_RANK[v]??999;
  const qualityRank=v=>QUALITY_RANK[v]??999;
  const deviceOptions=current=>{const opts=DEVICE_OPTIONS.slice();if(current&&!opts.includes(current))opts.unshift(current);return opts.map(x=>`<option value="${esc(x)}" ${current===x?'selected':''}>${esc(x)}</option>`).join('');};
  const qualityOptions=current=>{const opts=QUALITY_LEVELS.slice();if(current&&!opts.includes(current))opts.unshift(current);return opts.map(x=>`<option value="${esc(x)}" ${current===x?'selected':''}>${esc(x)}</option>`).join('');};
  const groupOptions=current=>{const opts=GROUP_NAMES.slice();if(current&&!opts.includes(current))opts.unshift(current);return `<option value="">Automática</option>`+opts.map(x=>`<option value="${esc(x)}" ${current===x?'selected':''}>${esc(x)}</option>`).join('');};
  const repairChoices=(category,type='part')=>{if(type==='service')return SERVICE_REPAIR_OPTIONS.slice();return (REPAIR_OPTIONS[category]||REPAIR_OPTIONS.General).slice();};
  const repairOptions=(category,current,type='part')=>{const opts=repairChoices(category,type);if(current&&!opts.includes(current))opts.unshift(current);return opts.map(x=>`<option value="${esc(x)}" ${current===x?'selected':''}>${esc(x)}</option>`).join('');};
  const discountValue=p=>Math.max(0,Math.min(95,Math.round(Number(p?.catalog_details?.discount_percent||0)||0)));
  const readFileDataURL=file=>new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=()=>reject(Error('No pude leer la imagen.'));fr.readAsDataURL(file);});
  const loadImg=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('No pude abrir la imagen.'));img.src=src;});
  function clearLightBackground(imageData){
   const {data,width,height}=imageData,picks=[[0,0],[width-1,0],[0,height-1],[width-1,height-1],[Math.floor(width/2),0],[Math.floor(width/2),height-1]],bg=[];
   for(const [x,y] of picks){const i=(y*width+x)*4;bg.push([data[i],data[i+1],data[i+2]]);}
   const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
   for(let i=0;i<data.length;i+=4){
    if(data[i+3]===0)continue;
    const px=[data[i],data[i+1],data[i+2]],brightness=(px[0]+px[1]+px[2])/3;
    let dist=Infinity;for(const c of bg)dist=Math.min(dist,distance(px,c));
    if(brightness>218&&dist<46)data[i+3]=0;
    else if(brightness>195&&dist<82)data[i+3]=Math.round(data[i+3]*Math.max(0,Math.min(1,(dist-35)/47)));
   }
  }
  async function prepareCatalogImage(file){
   if(!file?.type?.startsWith('image/'))throw Error('Selecciona una imagen PNG, JPG o WEBP.');
   if(file.size>12*1024*1024)throw Error('La imagen es demasiado grande. Usa una de menos de 12 MB.');
   const src=await readFileDataURL(file),img=await loadImg(src),max=1100,scale=Math.min(max/img.width,max/img.height,1);
   const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
   const cut=document.createElement('canvas');cut.width=w;cut.height=h;const c=cut.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0,w,h);
   const frame=c.getImageData(0,0,w,h);clearLightBackground(frame);c.putImageData(frame,0,0);
   const square=document.createElement('canvas');square.width=1000;square.height=1000;const sctx=square.getContext('2d');
   sctx.fillStyle='#fff';sctx.fillRect(0,0,1000,1000);
   const fit=Math.min(820/w,820/h),dw=Math.max(1,Math.round(w*fit)),dh=Math.max(1,Math.round(h*fit));
   sctx.drawImage(cut,(1000-dw)/2,(1000-dh)/2,dw,dh);
   return square.toDataURL('image/webp',0.91);
  }
  async function uploadCatalogImage(id,dataUrl){
   const headers=await options.headers(),r=await fetch('/api/r2-upload',{method:'POST',cache:'no-store',credentials:'same-origin',headers:{...headers,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({workspace:'support',folder:'service-parts',itemId:id,dataUrl})});
   const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'No pude subir la imagen a R2.');return d;
  }
  function renderParts(){
   const active=parts.filter(p=>p.active!==false),stats={total:active.length,published:active.filter(p=>p.published===true).length,stock:active.filter(p=>itemType(p)==='part'&&Number(p.quantity)>0).length,low:active.filter(p=>itemType(p)==='part'&&Number(p.quantity)<=Number(p.minimum_stock||0)).length,services:active.filter(p=>itemType(p)==='service').length};
   const matchesFilter=p=>partFilter==='stock'?itemType(p)==='part'&&Number(p.quantity)>0:partFilter==='low'?itemType(p)==='part'&&Number(p.quantity)<=Number(p.minimum_stock||0):partFilter==='priced'?p.sale_price!==null:partFilter==='published'?p.published===true:partFilter==='services'?itemType(p)==='service':partFilter==='parts'?itemType(p)==='part':partFilter==='hidden'?p.published!==true:true;
   const counts=Object.fromEntries(GROUP_NAMES.map(g=>[g,0]));active.forEach(p=>{const g=classifyPart(p);counts[g]=(counts[g]||0)+1;});
   const groupBase=active.filter(p=>matchesFilter(p)&&(groupFilter==='all'||classifyPart(p)===groupFilter));
   const devices=[...new Set(groupBase.map(deviceFamily).filter(Boolean))].sort((a,b)=>deviceRank(a)-deviceRank(b)||natural(a,b));
   if(deviceFilter!=='all'&&!devices.includes(deviceFilter)){deviceFilter='all';modelFilter='all';}
   const deviceBase=groupBase.filter(p=>deviceFilter==='all'||deviceFamily(p)===deviceFilter);
   const models=[...new Set(deviceBase.map(modelName).filter(Boolean))].sort(natural);
   if(modelFilter!=='all'&&!models.includes(modelFilter))modelFilter='all';
   const q=fold(query);
   const filtered=deviceBase.filter(p=>(modelFilter==='all'||modelName(p)===modelFilter)&&(!q||fold([p.sku,p.name,p.category,p.compatible_models,p.catalog_details?.model,p.catalog_details?.series,p.catalog_details?.model_type,p.catalog_details?.color,p.catalog_details?.quality,p.catalog_details?.repair,classifyPart(p)].join(' ')).includes(q))).sort((a,b)=>natural(modelName(a),modelName(b))||natural(variantText(a),variantText(b))||qualityRank(a.catalog_details?.quality)-qualityRank(b.catalog_details?.quality)||natural(a.name,b.name));
   page=Math.min(page,Math.max(0,Math.ceil(filtered.length/30)-1));
   const groupCards=GROUPS.map(([key,title,icon])=>{const count=key==='all'?active.length:(counts[key]||0);return `<button type="button" class="wk-group-card ${groupFilter===key?'active':''}" data-group="${esc(key)}"><span>${icon}</span><b>${esc(title)}</b><small>${count}</small></button>`}).join('');
   const deviceCards=devices.map(d=>{const n=groupBase.filter(p=>deviceFamily(p)===d).length;return `<button type="button" class="wk-device-card ${deviceFilter===d?'active':''}" data-device="${esc(d)}"><span>${esc(d)}</span><small>${n} referencias</small></button>`}).join('');
   const modelCards=models.map(m=>{const subset=deviceBase.filter(p=>modelName(p)===m),stock=subset.reduce((n,p)=>n+(itemType(p)==='part'?Number(p.quantity||0):0),0),variants=subset.length,colorCount=subset.filter(partUsesColor).length;return `<button type="button" class="wk-model-card ${modelFilter===m?'active':''}" data-model="${esc(m)}"><div><small>Modelo</small><b>${esc(m)}</b></div><div class="wk-model-meta"><span>${variants} ${variants===1?'variante':'variantes'}</span><span>${stock} uds.</span>${colorCount?'<span>Color aplica</span>':''}</div></button>`}).join('');
   const rows=filtered.slice(page*30,page*30+30).map(p=>{const m=p.catalog_details||{},service=itemType(p)==='service',group=classifyPart(p),usesColor=partUsesColor(p),img=m.image_url?`<img src="${esc(m.image_url)}" alt="" loading="lazy">`:`<span class="wk-thumb-placeholder">TS</span>`,variant=variantText(p);return `<tr><td><div class="wk-part-main"><div class="wk-part-thumb">${img}</div><div><b>${esc(variant)}</b><small>${esc(p.sku)}</small>${usesColor&&m.color?`<span class="wk-color-chip">${esc(m.color)}</span>`:''}</div></div></td><td>${esc(m.quality||'—')}<br><small>${esc(m.model_type||group.replace(/^Apple · /,''))}</small></td><td>${service?'<span class="wk-service-badge">Servicio · sin stock</span>':`<b>${Number(p.quantity)}</b><br><small>${Number(p.quantity)>0?'Disponible':'Sin stock'} · mín. ${Number(p.minimum_stock)}</small>`}</td><td>${service?'—':p.unit_cost===null?'Sin registrar':money(p.unit_cost)}</td><td>${p.sale_price===null?'Valor pendiente':(()=>{const pct=discountValue(p),old=Number(m.original_price_usd||0),final=Number(p.sale_price||0);return pct>0&&old>final?`<span class="wk-old-price">${money(old)}</span><br><b class="wk-sale-price">${money(final)}</b><br><small class="wk-discount-pill">-${pct}%</small>`:money(final)})()}</td><td><span class="wk-status-pill ${p.published?'is-live':'is-hidden'}">${p.published?'Publicado':'Oculto'}</span></td><td><div class="wk-row-actions"><button class="wk-edit-btn" data-edit="${esc(p.id)}">Editar</button>${service?'':`<button class="wk-stock-btn" data-stock="${esc(p.id)}">Movimiento</button>`}</div></td></tr>`;}).join('');
   const path=[groupFilter==='all'?'Tipo de repuesto':groupFilter,deviceFilter==='all'?'Categoría':deviceFilter,modelFilter==='all'?'Modelo':modelFilter].map((x,i)=>`<span class="${(i===0&&groupFilter!=='all')||(i===1&&deviceFilter!=='all')||(i===2&&modelFilter!=='all')?'done':''}">${esc(x)}</span>`).join('<i>›</i>');
   let explorer='';
   if(groupFilter==='all'&&!query)explorer='<div class="wk-empty-explorer"><b>Selecciona un tipo de repuesto</b><p>Empieza por Pantallas, Baterías, Back Cover, Chasis, Flex de carga u otra familia. Así evitamos una lista interminable.</p></div>';
   else if(deviceFilter==='all'&&!query)explorer=`<div class="wk-section-head"><div><small>Paso 2</small><h3>Elige la categoría del equipo</h3></div></div><div class="wk-device-grid">${deviceCards||'<p>No hay categorías para esta selección.</p>'}</div>`;
   else if(modelFilter==='all'&&!query)explorer=`<div class="wk-section-head"><div><small>Paso 3</small><h3>Elige el modelo</h3></div></div><div class="wk-model-grid">${modelCards||'<p>No hay modelos para esta selección.</p>'}</div>`;
   else explorer=`<div class="wk-result-head"><div><small>${query?'Resultados de búsqueda':'Variantes del modelo'}</small><h3>${esc(query?`Coincidencias para “${query}”`:modelFilter)}</h3><p>${filtered.length} referencias. ${modelFilter!=='all'?esc(colorPolicyText(groupFilter,deviceFilter,modelFilter)):''}</p></div>${modelFilter!=='all'?'<button type="button" class="wk-back-models wk-secondary">Cambiar modelo</button>':''}</div><div class="wk-scroll wk-variants-table"><table><thead><tr><th>Variante</th><th>Calidad / tipo</th><th>Stock</th><th>Costo</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${rows||'<tr><td colspan="7">No hay registros con estos filtros.</td></tr>'}</tbody></table></div>${filtered.length>30?`<div class="wk-actions"><button class="wk-prev" ${page===0?'disabled':''}>Anterior</button><span>Página ${page+1} de ${Math.max(1,Math.ceil(filtered.length/30))}</span><button class="wk-next" ${(page+1)*30>=filtered.length?'disabled':''}>Siguiente</button></div>`:''}`;
   host.innerHTML=header('Catálogo técnico','Acceso por tipo de repuesto → categoría → modelo → variante. El color solo aparece cuando realmente aplica al repuesto.')+`<div class="wk-cards"><div><small>Referencias activas</small><b>${stats.total}</b></div><div><small>Con stock</small><b>${stats.stock}</b></div><div><small>Stock bajo / agotado</small><b>${stats.low}</b></div><div><small>Servicios</small><b>${stats.services}</b></div></div><div class="wk-browser"><div class="wk-browser-head"><div><small>Catálogo por familias</small><h3>¿Qué necesitas gestionar?</h3></div><button class="wk-new">+ Nueva referencia</button></div><div class="wk-category-grid">${groupCards}</div><div class="wk-breadcrumb">${path}</div><div class="wk-filter-bar"><label>Tipo de repuesto<select class="wk-group-select"><option value="all">Seleccionar…</option>${GROUPS.filter(x=>x[0]!=='all').map(([k,t])=>`<option value="${esc(k)}" ${groupFilter===k?'selected':''}>${esc(t)}</option>`).join('')}</select></label><label>Categoría<select class="wk-device-filter"><option value="all">Todas</option>${devices.map(d=>`<option ${deviceFilter===d?'selected':''}>${esc(d)}</option>`).join('')}</select></label><label>Modelo<select class="wk-model-filter"><option value="all">Todos</option>${models.map(m=>`<option ${modelFilter===m?'selected':''}>${esc(m)}</option>`).join('')}</select></label><label>Estado<select class="wk-part-filter"><option value="all" ${partFilter==='all'?'selected':''}>Todos</option><option value="parts" ${partFilter==='parts'?'selected':''}>Solo repuestos</option><option value="services" ${partFilter==='services'?'selected':''}>Solo servicios</option><option value="published" ${partFilter==='published'?'selected':''}>Publicados</option><option value="stock" ${partFilter==='stock'?'selected':''}>Con stock</option><option value="low" ${partFilter==='low'?'selected':''}>Stock bajo / agotado</option><option value="priced" ${partFilter==='priced'?'selected':''}>Con valor</option><option value="hidden" ${partFilter==='hidden'?'selected':''}>Ocultos</option></select></label><label class="wk-search-label">Buscar<input class="wk-search" aria-label="Buscar" placeholder="SKU, modelo, pieza o color" value="${esc(query)}"></label></div>${explorer}</div></section>`;
   baseEvents();
   host.querySelector('.wk-search').oninput=e=>{query=e.target.value;page=0;renderParts();};
   host.querySelector('.wk-part-filter').onchange=e=>{partFilter=e.target.value;page=0;renderParts();};
   host.querySelector('.wk-group-select').onchange=e=>{groupFilter=e.target.value;deviceFilter='all';modelFilter='all';page=0;renderParts();};
   host.querySelector('.wk-device-filter').onchange=e=>{deviceFilter=e.target.value;modelFilter='all';page=0;renderParts();};
   host.querySelector('.wk-model-filter').onchange=e=>{modelFilter=e.target.value;page=0;renderParts();};
   host.querySelector('.wk-new').onclick=()=>editPart();
   host.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{groupFilter=b.dataset.group;deviceFilter='all';modelFilter='all';page=0;renderParts();});
   host.querySelectorAll('[data-device]').forEach(b=>b.onclick=()=>{deviceFilter=b.dataset.device;modelFilter='all';page=0;renderParts();});
   host.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>{modelFilter=b.dataset.model;page=0;renderParts();});
   host.querySelector('.wk-back-models')?.addEventListener('click',()=>{modelFilter='all';query='';page=0;renderParts();});
   host.querySelector('.wk-prev')?.addEventListener('click',()=>{page--;renderParts();});host.querySelector('.wk-next')?.addEventListener('click',()=>{page++;renderParts();});
   host.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editPart(parts.find(p=>p.id===b.dataset.edit)));
   host.querySelectorAll('[data-stock]').forEach(b=>b.onclick=()=>stockPart(parts.find(p=>p.id===b.dataset.stock)));
  }
  function editPart(p={}){
   const m=p.catalog_details||{},id=p.id||crypto.randomUUID(),existingImage=m.image_url||'',currentType=itemType(p),currentGroup=m.inventory_group||classifyPart(p),currentCategory=p.category||deviceFamily(p),currentDiscount=Math.max(0,Math.min(95,Math.round(Number(m.discount_percent||0)||0)));
   const currentFinal=p.sale_price===null?'':Number(p.sale_price||0);
   const derivedOriginal=currentDiscount>0&&currentFinal>0?Math.round((currentFinal/(1-currentDiscount/100))*100)/100:currentFinal;
   const currentOriginal=Number(m.original_price_usd||0)>0?Number(m.original_price_usd):derivedOriginal;
   const d=dialog(p.id?'Editar ficha':'Nueva ficha',`<form class="wk-edit-form"><div class="wk-edit-head"><div><small>${p.id?'Editar catálogo':'Nueva referencia'}</small><h3>${esc(p.name||'Repuesto o servicio')}</h3></div><span class="wk-edit-type">${currentType==='service'?'Servicio':'Repuesto'}</span></div><div class="wk-grid"><label>Tipo<select name="item_type" class="wk-item-type"><option value="part" ${currentType==='part'?'selected':''}>Repuesto con stock</option><option value="service" ${currentType==='service'?'selected':''}>Servicio sin stock</option></select></label><label>Clasificación<select name="inventory_group">${groupOptions(currentGroup)}</select></label>${input('sku','SKU',p.sku,'text','required')}${input('name','Nombre',p.name,'text','required')}<label>Categoría<select name="category" class="wk-category-select">${deviceOptions(currentCategory)}</select></label><label>Reparación<select name="repair" class="wk-repair-select">${repairOptions(currentCategory,m.repair,currentType)}</select></label><label>Calidad<select name="quality">${qualityOptions(m.quality||(currentType==='service'?'Servicio':'Estándar'))}</select></label>${input('compatible_models','Compatibilidad',p.compatible_models)}${input('model','Modelo',m.model)}${input('series','Serie',m.series)}${input('model_type','Variante',m.model_type)}<label class="wk-color-field">Color<input name="color" value="${esc(m.color||'')}"><small class="wk-field-help wk-color-help"></small></label><label class="wk-cost-field">Costo unitario USD<input name="unit_cost" type="number" value="${esc(p.unit_cost??'')}" min="0" step="0.01"></label><label>Precio original USD<input name="original_price" type="number" value="${esc(currentOriginal||'')}" min="0" step="0.01" placeholder="Ej. 169.99"></label><label>Descuento (%)<input name="discount_percent" type="number" value="${esc(currentDiscount)}" min="0" max="95" step="1" placeholder="Ej. 30"></label><label>Precio final automático<input name="discounted_price" type="number" value="${esc(currentFinal||'')}" readonly tabindex="-1"></label><div class="wk-discount-preview"><span>Vista de promoción</span><div class="wk-discount-preview-prices"><s class="wk-preview-old"></s><b class="wk-preview-new"></b><em class="wk-preview-badge"></em></div><small>Al guardar, el precio final se calcula automáticamente a partir del precio original y el porcentaje.</small></div><label class="wk-stock-field">Stock mínimo<input name="minimum_stock" type="number" value="${esc(p.minimum_stock||0)}" min="0" step="1" required></label>${input('location','Ubicación',p.location)}${input('warranty','Garantía publicada',m.warranty)}${input('repair_time','Tiempo estimado',m.repair_time)}</div><div class="wk-image-editor"><div class="wk-image-preview">${existingImage?`<img src="${esc(existingImage)}" alt="Imagen actual">`:'<span>Sin imagen</span>'}</div><div><label>Imagen del catálogo<input type="file" class="wk-image-input" accept="image/png,image/jpeg,image/webp"></label><p class="wk-image-status">La imagen se centra en formato cuadrado, se limpia cuando el fondo es claro y se genera sobre fondo blanco.</p><button type="button" class="wk-secondary wk-remove-image" ${existingImage?'':'hidden'}>Quitar imagen</button></div></div><label>Descripción<textarea name="description">${esc(m.description)}</textarea></label><label class="wk-check"><input type="checkbox" name="published" ${p.published?'checked':''}> Publicar en servicio técnico</label><label class="wk-check"><input type="checkbox" name="active" ${p.active!==false?'checked':''}> Activo</label><p class="wk-form-message" role="status"></p><div class="wk-dialog-actions"><button type="button" class="wk-secondary wk-cancel-edit">Cancelar</button><button class="wk-save">Guardar cambios</button></div></form>`);
   const form=d.querySelector('form'),typeSel=form.elements.item_type,categorySel=form.elements.category,repairSel=form.elements.repair,stockField=d.querySelector('.wk-stock-field'),costField=d.querySelector('.wk-cost-field'),colorField=d.querySelector('.wk-color-field'),colorHelp=d.querySelector('.wk-color-help'),preview=d.querySelector('.wk-image-preview'),status=d.querySelector('.wk-image-status'),fileInput=d.querySelector('.wk-image-input'),removeBtn=d.querySelector('.wk-remove-image'),saveBtn=d.querySelector('.wk-save'),oldEl=d.querySelector('.wk-preview-old'),newEl=d.querySelector('.wk-preview-new'),badgeEl=d.querySelector('.wk-preview-badge');
   let imageUrl=existingImage,prepared='';
   const syncRepairs=(preferred='')=>{const curr=preferred||repairSel.value||m.repair||'';repairSel.innerHTML=repairOptions(categorySel.value,curr,typeSel.value);if(curr)repairSel.value=curr;};
   const calculateDiscount=()=>{
    const original=Math.max(0,Number(form.elements.original_price.value||0)),pct=Math.max(0,Math.min(95,Math.round(Number(form.elements.discount_percent.value||0)||0)));
    const final=original>0?Math.round((original*(1-pct/100))*100)/100:0;
    form.elements.discounted_price.value=original>0?final.toFixed(2):'';
    if(original<=0){oldEl.textContent='';newEl.textContent='Precio por definir';badgeEl.textContent='';oldEl.hidden=true;badgeEl.hidden=true;return final;}
    oldEl.textContent=`USD ${original.toFixed(2)}`;oldEl.hidden=pct<=0;
    newEl.textContent=`USD ${final.toFixed(2)}`;
    badgeEl.textContent=pct>0?`-${pct}%`:'';badgeEl.hidden=pct<=0;
    return final;
   };
   const syncColor=()=>{const allowed=typeSel.value!=='service'&&colorApplies(form.elements.inventory_group.value,categorySel.value,form.elements.model.value,repairSel.value,form.elements.name.value,form.elements.model_type.value);colorField.hidden=!allowed;colorHelp.textContent=allowed?'Usa el color real de esta variante.':'No aplica: Inventory ocultará el color para evitar variantes incorrectas.';};
   const syncType=()=>{const service=typeSel.value==='service';stockField.hidden=service;costField.hidden=service;if(service){form.elements.minimum_stock.value=0;form.elements.unit_cost.value='';if(form.elements.quality.value==='Estándar')form.elements.quality.value='Servicio';}syncRepairs();syncColor();calculateDiscount();};
   syncType();typeSel.onchange=syncType;categorySel.onchange=()=>{syncRepairs();syncColor();};form.elements.inventory_group.onchange=syncColor;repairSel.onchange=syncColor;form.elements.model.oninput=syncColor;form.elements.name.oninput=syncColor;form.elements.model_type.oninput=syncColor;form.elements.original_price.oninput=calculateDiscount;form.elements.discount_percent.oninput=calculateDiscount;
   d.querySelector('.wk-cancel-edit').onclick=()=>d.close();
   fileInput.onchange=async()=>{const file=fileInput.files?.[0];if(!file)return;try{saveBtn.disabled=true;status.textContent='Procesando imagen y generando fondo blanco…';prepared=await prepareCatalogImage(file);preview.innerHTML=`<img src="${prepared}" alt="Vista previa">`;status.textContent='Imagen lista. Se subirá a Cloudflare R2 al guardar.';removeBtn.hidden=false;}catch(err){status.textContent=err.message;}finally{saveBtn.disabled=false;}};
   removeBtn.onclick=()=>{prepared='';imageUrl='';preview.innerHTML='<span>Sin imagen</span>';status.textContent='La imagen se quitará al guardar.';removeBtn.hidden=true;};
   formSubmit(form,async f=>{
    const v=Object.fromEntries(f),service=v.item_type==='service',discount=Math.max(0,Math.min(95,Math.round(Number(v.discount_percent||0)||0))),original=Math.max(0,Number(v.original_price||0)),final=original>0?Math.round((original*(1-discount/100))*100)/100:null;
    if(prepared){status.textContent='Subiendo imagen…';const uploaded=await uploadCatalogImage(id,prepared);imageUrl=uploaded.publicUrl||'';}
    await api('save_part',{part:{...v,id,minimum_stock:service?0:Number(v.minimum_stock||0),unit_cost:service?null:(v.unit_cost===''?null:Number(v.unit_cost)),sale_price:final,active:f.has('active'),published:f.has('published'),catalog_details:{...m,model:v.model||'',series:v.series||'',model_type:v.model_type||'',color:(!service&&colorApplies(v.inventory_group,v.category,v.model,v.repair,v.name,v.model_type))?(v.color||''):'',repair:v.repair||'',quality:v.quality||'',image_url:imageUrl,description:v.description||'',warranty:v.warranty||'',repair_time:v.repair_time||'',original_price_usd:original||null,discount_percent:discount,item_type:v.item_type,inventory_group:v.inventory_group||'',service_group:service?(v.inventory_group||'Servicios · Mantenimiento'):'',stock_managed:!service}}});
    d.close();await refresh();
   });
  }
  function stockPart(p){
   if(itemType(p)==='service'){error(Error('Este registro es un servicio y no maneja stock.'));return;}
   const requestId=crypto.randomUUID();const d=dialog('Movimiento · '+p.sku,`<form><p>${esc(p.name)} · Existencia: ${p.quantity}</p>${input('delta','Cantidad (+ entrada / − ajuste)',1,'number','step="1" required')}${input('note','Motivo o documento de compra','','text','required')}<p>Las ventas se descuentan al registrar el primer cobro. Usa este formulario para compras, apertura o correcciones.</p><p class="wk-form-message" role="status"></p><button>Registrar movimiento</button></form>`);formSubmit(d.querySelector('form'),async f=>{await api('stock',{id:p.id,request_id:requestId,delta:Number(f.get('delta')),note:f.get('note')});d.close();await refresh();});
  }

  function newQuote(){
   const id=crypto.randomUUID(),lines=[];const d=dialog('Cotización desglosada',`<form><label>Orden<select name="order_id"><option value="">Venta directa de repuesto / servicio</option>${(data.orders||options.orders||[]).map(o=>`<option value="${esc(o.id)}">${esc(o.code)} · ${esc(o.client)}</option>`).join('')}</select></label>${input('client','Cliente','','text','required')}<div class="wk-actions"><button type="button" data-add="labor">+ Mano de obra</button><button type="button" data-add="part">+ Repuesto</button><button type="button" data-add="service">+ Otro servicio</button></div><div class="wk-lines"></div><p class="wk-total"></p><p>Los costos quedan guardados con la cotización. Los abonos se distribuyen proporcionalmente entre los conceptos; solo la mano de obra cobrada se reparte.</p><p class="wk-form-message" role="status"></p><button>Guardar cotización</button></form>`);
   const form=d.querySelector('form');form.elements.order_id.onchange=()=>{const o=(data.orders||options.orders||[]).find(x=>String(x.id)===form.elements.order_id.value);if(o)form.elements.client.value=o.client;};
   function draw(){d.querySelector('.wk-lines').innerHTML=lines.map((l,i)=>`<fieldset data-line="${i}"><legend>${label[l.kind]}</legend>${l.kind==='part'?`<label>Buscar repuesto<input data-search="${i}" placeholder="SKU o modelo"><select data-part="${i}"><option value="">Selecciona un repuesto</option>${parts.filter(p=>p.active).map(p=>`<option value="${p.id}" ${p.id===l.part_id?'selected':''}>${esc(p.sku)} · ${esc(p.name)} · Stock ${p.quantity}</option>`).join('')}</select></label>`:''}<div class="wk-grid">${input('description','Concepto',l.description,'text','required data-field="description"')}${input('quantity','Cantidad',l.quantity,'number','min="1" step="1" required data-field="quantity"')}${input('unit_price','Precio unitario USD',l.unit_price,'number','min="0" step="0.01" required data-field="unit_price"')}${input('unit_cost','Costo unitario USD',l.unit_cost??'','number',`min="0" step="0.01" required data-field="unit_cost" ${l.kind!=='service'?'readonly':''}`)}</div><button type="button" data-remove="${i}" class="wk-secondary">Quitar</button></fieldset>`).join('');
    d.querySelectorAll('[data-line]').forEach(field=>field.querySelectorAll('[data-field]').forEach(el=>el.oninput=()=>{lines[Number(field.dataset.line)][el.dataset.field]=el.dataset.field==='description'?el.value:Number(el.value);total();}));
    d.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{lines.splice(Number(b.dataset.remove),1);draw();});
    d.querySelectorAll('[data-part]').forEach(sel=>sel.onchange=()=>{const p=parts.find(x=>x.id===sel.value),l=lines[Number(sel.dataset.part)];if(p){Object.assign(l,{part_id:p.id,description:p.name,unit_price:p.sale_price??0,unit_cost:p.unit_cost});draw();}});
    d.querySelectorAll('[data-search]').forEach(el=>el.oninput=()=>{const sel=d.querySelector(`[data-part="${el.dataset.search}"]`);for(const opt of sel.options)opt.hidden=!!opt.value&&!opt.text.toLowerCase().includes(el.value.toLowerCase());});total();
   }
   const total=()=>d.querySelector('.wk-total').textContent='Total: '+money(lines.reduce((n,l)=>n+l.quantity*Number(l.unit_price||0),0));
   d.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{lines.push({kind:b.dataset.add,description:'',part_id:null,quantity:1,unit_price:0,unit_cost:b.dataset.add==='part'?null:0});draw();});
   formSubmit(form,async f=>{if(!lines.length)throw Error('Añade al menos un concepto.');if(lines.some(l=>l.kind==='part'&&(!l.part_id||l.unit_cost===null)))throw Error('Selecciona el repuesto y registra primero su costo en el inventario técnico.');await api('quote',{id,order_id:f.get('order_id')||null,client:f.get('client'),lines});d.close();await refresh();});
  }
  function showQuote(q){const lines=data.lines.filter(l=>l.quote_id===q.id),payments=data.payments.filter(p=>p.quote_id===q.id);dialog('Detalle · '+q.client_name,`<div class="wk-scroll"><table><tr><th>Tipo</th><th>Concepto</th><th>Cant.</th><th>Precio</th><th>Costo</th><th>Total</th></tr>${lines.map(l=>`<tr><td>${label[l.kind]}</td><td>${esc(l.description)}</td><td>${l.quantity}</td><td>${money(l.unit_price)}</td><td>${money(l.unit_cost)}</td><td>${money(l.total)}</td></tr>`).join('')}</table></div><h3>Cobros registrados</h3>${payments.map(p=>`<p>${F.day(p.paid_at)} · ${money(p.amount)} · ${esc(p.method)} · ${esc(p.reference)}</p>`).join('')||'<p>Sin cobros.</p>'}`);}
  function newPayment(q){
   const id=crypto.randomUUID(),balance=Number(q.total)-data.payments.filter(p=>p.quote_id===q.id).reduce((n,p)=>n+Number(p.amount),0),today=F.day(new Date());
   const d=dialog('Registrar cobro · '+q.client_name,`<form><p>Saldo: ${money(balance)}. El primer cobro descuenta una sola vez todos los repuestos de esta cotización.</p><div class="wk-grid"><label>Moneda<select name="currency"><option>USD</option><option>VES</option></select></label>${input('original_amount','Importe recibido',balance.toFixed(2),'number','min="0.01" step="0.01" required')}${input('rate','Tasa VES por USD (USD: 1)',1,'number','min="0.000001" step="0.000001" required')}${input('date','Fecha del cobro',today,'date','required max="'+today+'"')}${input('time','Hora (Caracas)',new Date(Date.now()-4*3600000).toISOString().slice(11,16),'time','required')}${input('method','Método de pago','','text','required')}${input('reference','Referencia / comprobante')}</div><p class="wk-converted"></p><p>Confirma el dinero efectivamente recibido. Este registro no ejecuta un cobro bancario ni transfiere dinero a los socios.</p><p class="wk-form-message" role="status"></p><button>Confirmar cobro recibido</button></form>`);
   const form=d.querySelector('form'),amount=()=>Math.round(Number(form.elements.original_amount.value)/Number(form.elements.rate.value)*100)/100;
   form.oninput=()=>d.querySelector('.wk-converted').textContent='Equivalente: '+money(amount());form.elements.currency.onchange=()=>{if(form.elements.currency.value==='USD')form.elements.rate.value=1;form.oninput();};form.oninput();
   formSubmit(form,async f=>{await api('payment',{id,quote_id:q.id,amount:amount(),original_amount:Number(f.get('original_amount')),currency:f.get('currency'),rate:Number(f.get('rate')),paid_at:new Date(f.get('date')+'T'+f.get('time')+':00-04:00').toISOString(),method:f.get('method'),reference:f.get('reference')});d.close();await refresh();});
  }
  function weeklyReport(){
   const start=F.monday(F.day(new Date()));let report;
   const d=dialog('Liquidación · lunes a sábado',`<label>Semana del lunes<input class="wk-week" type="date" value="${start}"></label><div class="wk-weekly"></div><button class="wk-export">Exportar detalle CSV</button>`);
   const render=()=>{const from=F.monday(d.querySelector('.wk-week').value||start),to=F.addDays(from,5),sunday=F.addDays(from,6);d.querySelector('.wk-week').value=from;report=F.summarize(data,from,to);const extra=F.summarize(data,sunday,sunday);d.querySelector('.wk-weekly').innerHTML=`<p>${from} al ${to} · América/Caracas · según fecha de cobro</p>${cards(report)}<h3>Reparto de mano de obra cobrada</h3><div class="wk-cards"><div><small>Empresa · 50%</small><b>${money(report.split.company)}</b></div><div><small>Freddy · 25%</small><b>${money(report.split.freddy)}</b></div><div><small>Nelson · 25%</small><b>${money(report.split.nelson)}</b></div></div><p>Los márgenes de repuestos y otros servicios se muestran aparte y no participan en este reparto. Este reporte es un cálculo, no una constancia de pago a socios.</p><p><b>Domingo fuera del ciclo:</b> ${money(extra.received)} cobrado · mano de obra ${money(extra.labor)}. Se conserva en los registros, sin sumarlo a lunes–sábado.</p><h3>Detalle diario</h3><div class="wk-scroll"><table><tr><th>Día</th><th>Cotizado</th><th>Cobrado</th><th>Mano de obra</th><th>Margen repuestos</th><th>Margen otros servicios</th></tr>${report.daily.map(r=>`<tr><td>${r.date}</td><td>${money(r.quoted)}</td><td>${money(r.received)}</td><td>${money(r.labor)}</td><td>${money(r.partProfit)}</td><td>${money(r.serviceProfit)}</td></tr>`).join('')}</table></div><h3>Detalle por servicio y repuesto</h3><div class="wk-scroll"><table><tr><th>Fecha / cliente</th><th>Concepto</th><th>Tipo</th><th>Cobrado</th><th>Costo proporcional</th><th>Margen</th></tr>${report.details.map(r=>`<tr><td>${r.date}<br>${esc(r.client)}</td><td>${esc(r.description)}</td><td>${label[r.kind]}</td><td>${money(r.revenue)}</td><td>${money(r.cost)}</td><td>${money(r.profit)}</td></tr>`).join('')}</table></div><p>Abonos: ingresos y costos se reconocen en proporción al importe cobrado. El margen no descuenta gastos generales del negocio.</p>`;};
   d.querySelector('.wk-week').onchange=render;render();d.querySelector('.wk-export').onclick=()=>download('liquidacion-tecnica-'+d.querySelector('.wk-week').value+'.csv',[['Semana',d.querySelector('.wk-week').value],['Empresa 50%',report.split.company],['Freddy 25%',report.split.freddy],['Nelson 25%',report.split.nelson],[],['Fecha','Cliente','Cotización','Cobro','Concepto','Tipo','Cobrado USD','Costo USD','Margen USD','Método','Referencia'],...report.details.map(r=>[r.date,r.client,r.quote,r.payment,r.description,label[r.kind],r.revenue.toFixed(2),r.cost.toFixed(2),r.profit.toFixed(2),r.method,r.reference])]);
  }
  try{await refresh();}catch(e){error(e);}
 }
 window.TSWorkshop={mount};
})();
