(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const state={step:1,category:'',model:'',variant:'',year:'',chip:'',capacity:'',battery:'',condition:'',damages:[],docs:'',accessories:'',quote:null};
  const stepNames=['Categoría','Modelo','Variante','Capacidad','Batería','Estado','Daños','Documentación','Resultado'];

  const catalog={
    iphone:{label:'iPhone',icon:'iphone',models:{
      'iPhone 12':{base:230,variants:['Normal','Mini','Pro','Pro Max'],caps:['64 GB','128 GB','256 GB']},
      'iPhone 13':{base:300,variants:['Normal','Mini','Pro','Pro Max'],caps:['128 GB','256 GB','512 GB','1 TB']},
      'iPhone 14':{base:380,variants:['Normal','Plus','Pro','Pro Max'],caps:['128 GB','256 GB','512 GB','1 TB']},
      'iPhone 15':{base:480,variants:['Normal','Plus','Pro','Pro Max'],caps:['128 GB','256 GB','512 GB','1 TB']},
      'iPhone 16':{base:590,variants:['Normal','Plus','Pro','Pro Max','16e'],caps:['128 GB','256 GB','512 GB','1 TB']},
      'iPhone 17':{base:720,variants:['Normal','Air','Pro','Pro Max'],caps:['256 GB','512 GB','1 TB','2 TB']}
    }},
    ipad:{label:'iPad',icon:'ipad',models:{
      'iPad':{base:235,variants:['6ª generación (2018)','7ª generación (2019)','8ª generación (2020)','9ª generación (2021)','10ª generación (2022)','iPad A16 (2025)'],caps:['32 GB','64 GB','128 GB','256 GB','512 GB']},
      'iPad mini':{base:265,variants:['iPad mini 5 (2019)','iPad mini 6 (2021)','iPad mini 7 / A17 Pro (2024)'],caps:['64 GB','128 GB','256 GB','512 GB']},
      'iPad Air':{base:350,variants:['iPad Air 3 (2019)','iPad Air 4 (2020)','iPad Air 5 · M1 (2022)','iPad Air M2 · 11″ (2024)','iPad Air M2 · 13″ (2024)','iPad Air M3 · 11″ (2025)','iPad Air M3 · 13″ (2025)'],caps:['64 GB','128 GB','256 GB','512 GB','1 TB']},
      'iPad Pro':{base:520,variants:['iPad Pro 11″ (2018)','iPad Pro 11″ (2020)','iPad Pro 11″ · M1','iPad Pro 11″ · M2','iPad Pro 11″ · M4','iPad Pro 12,9″ (2018)','iPad Pro 12,9″ (2020)','iPad Pro 12,9″ · M1','iPad Pro 12,9″ · M2','iPad Pro 13″ · M4'],caps:['64 GB','128 GB','256 GB','512 GB','1 TB','2 TB']}
    }},
    mac:{label:'Mac',icon:'mac',models:{
      'MacBook Air':{base:520,variants:['13″','13.6″','15″'],caps:['128 GB','256 GB','512 GB','1 TB','2 TB']},
      'MacBook Pro':{base:690,variants:['13″','14″','16″'],caps:['256 GB','512 GB','1 TB','2 TB','4 TB','8 TB']},
      'MacBook NEO':{base:560,variants:['13″'],caps:['256 GB','512 GB','1 TB','2 TB']},
      'Mac mini':{base:430,variants:['M1','M2','M2 Pro','M4','M4 Pro'],caps:['256 GB','512 GB','1 TB','2 TB','4 TB','8 TB']},
      'iMac':{base:560,variants:['21.5″','24″','27″'],caps:['256 GB','512 GB','1 TB','2 TB','4 TB']},
      'Mac Studio':{base:980,variants:['M1 Max / Ultra','M2 Max / Ultra','M3 Ultra','M4 Max'],caps:['512 GB','1 TB','2 TB','4 TB','8 TB']}
    }},
    watch:{label:'Apple Watch',icon:'watch',models:{
      'Series 7':{base:105,variants:['41 mm','45 mm'],caps:['GPS','GPS + Cellular']},
      'Series 8':{base:135,variants:['41 mm','45 mm'],caps:['GPS','GPS + Cellular']},
      'Series 9':{base:175,variants:['41 mm','45 mm'],caps:['GPS','GPS + Cellular']},
      'Series 10':{base:220,variants:['42 mm','46 mm'],caps:['GPS','GPS + Cellular']},
      'Series 11':{base:270,variants:['42 mm','46 mm'],caps:['GPS','GPS + Cellular']},
      'Watch SE':{base:120,variants:['40 mm','44 mm'],caps:['GPS','GPS + Cellular']},
      'Watch Ultra':{base:390,variants:['Ultra','Ultra 2','Ultra 3'],caps:['GPS + Cellular']}
    }},
    other:{label:'Otro',icon:'other',manual:true}
  };

  const factors={
    variants:{'Mini':-.06,'Plus':.06,'Pro':.16,'Pro Max':.25,'Air':.08,'16e':-.08,'13″':0,'13.6″':.03,'14″':.08,'15″':.10,'16″':.16,'21.5″':-.08,'24″':.05,'27″':.12,'M1':-.12,'M2':-.04,'M2 Pro':.05,'M4':.14,'M4 Pro':.23,'M1 Max / Ultra':-.10,'M2 Max / Ultra':0,'M3 Ultra':.12,'M4 Max':.18,'GPS + Cellular':.10,'Ultra 2':.12,'Ultra 3':.22,
      '6ª generación (2018)':-.30,'7ª generación (2019)':-.25,'8ª generación (2020)':-.18,'9ª generación (2021)':-.10,'10ª generación (2022)':0,'iPad A16 (2025)':.28,
      'iPad mini 5 (2019)':-.24,'iPad mini 6 (2021)':0,'iPad mini 7 / A17 Pro (2024)':.30,
      'iPad Air 3 (2019)':-.30,'iPad Air 4 (2020)':-.20,'iPad Air 5 · M1 (2022)':0,'iPad Air M2 · 11″ (2024)':.24,'iPad Air M2 · 13″ (2024)':.34,'iPad Air M3 · 11″ (2025)':.40,'iPad Air M3 · 13″ (2025)':.50,
      'iPad Pro 11″ (2018)':-.35,'iPad Pro 11″ (2020)':-.25,'iPad Pro 11″ · M1':-.08,'iPad Pro 11″ · M2':.08,'iPad Pro 11″ · M4':.42,'iPad Pro 12,9″ (2018)':-.28,'iPad Pro 12,9″ (2020)':-.18,'iPad Pro 12,9″ · M1':0,'iPad Pro 12,9″ · M2':.16,'iPad Pro 13″ · M4':.55},
    capacity:{'32 GB':-.08,'64 GB':-.04,'128 GB':0,'256 GB':.05,'512 GB':.11,'1 TB':.18,'2 TB':.25,'4 TB':.32,'8 TB':.40,'GPS':0,'GPS + Cellular':.08},
    battery:{'100%':.03,'91–99%':0,'85–90%':-.05,'<85%':-.14,'Excelente':.02,'Buena':0,'Servicio recomendado':-.13,'No aplica':0},
    condition:{'Excelente':.04,'Usado · buen estado':0,'Detalles estéticos':-.10,'Con daños':-.18},
    docs:{'Sí, tengo comprobante':.02,'No tengo comprobante':0}, accessories:{'Con accesorios originales':.025,'Sin accesorios':0},
    damages:{'Pantalla':-.16,'Chasis':-.08,'Cámara':-.10,'Puerto de carga':-.09,'Face ID / Touch ID':-.12,'No enciende':-.30,'Daño por líquido':-.32,'Daño en placa lógica':-.38,'Otro daño':-.08}
  };

  function isMBP(){return state.category==='mac'&&state.model==='MacBook Pro'}
  function route(){const r=isMBP()?[1,2,3,10,11,4,5,6]:[1,2,3,4,5,6];if(state.condition==='Con daños')r.push(7);r.push(8,9);return r;}
  function totalSteps(){return route().length}
  function visualStep(step){const i=route().indexOf(step);return i>=0?i+1:1;}
  function nameFor(step){return ({1:'Categoría',2:'Modelo',3:'Variante',10:'Año',11:'Chip',4:'Capacidad',5:'Batería',6:'Estado',7:'Daños',8:'Documentación',9:'Resultado',12:'Resultado'})[step]||'Resultado'; }
  function resetFrom(key){
    const order=['category','model','variant','year','chip','capacity','battery','condition','damages','docs','accessories'];
    const i=order.indexOf(key); order.slice(i+1).forEach(k=>state[k]=k==='damages'?[]:''); state.quote=null;
  }
  function go(step){
    state.step=step;
    document.querySelectorAll('.step').forEach(el=>el.classList.toggle('active',Number(el.dataset.step)===step));
    const total=totalSteps(), shown=visualStep(step);
    $('stepText').textContent=`Paso ${shown} de ${total}`; $('stepName').textContent=nameFor(step); $('progressBar').style.width=`${Math.min(100,(shown/total)*100)}%`;
    if(step===2)renderModels(); if(step===3)renderVariants(); if(step===10)renderYears(); if(step===11)renderChips(); if(step===4)renderCapacity(); if(step===5)renderBattery(); if(step===6)renderCondition();
    if(step===7)renderDamages(); if(step===8)renderDocs(); if(step===9)renderSummary();
    if(step>1)document.getElementById('cotizador').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function categoryIcon(name){const a='viewBox=\"0 0 32 32\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"';const icons={iphone:`<svg ${a}><rect x=\"10\" y=\"3\" width=\"12\" height=\"26\" rx=\"3\"/><path d=\"M14 6h4M15 26h2\"/></svg>`,ipad:`<svg ${a}><rect x=\"7\" y=\"3\" width=\"18\" height=\"26\" rx=\"2.5\"/><path d=\"M14 6h4M15 26h2\"/></svg>`,mac:`<svg ${a}><path d=\"M8 7h16a2 2 0 0 1 2 2v12H6V9a2 2 0 0 1 2-2Z\"/><path d=\"M3 24h26M11 24h10\"/></svg>`,watch:`<svg ${a}><path d=\"M12 3h8l1 6H11l1-6ZM11 23h10l-1 6h-8l-1-6Z\"/><rect x=\"9\" y=\"8\" width=\"14\" height=\"16\" rx=\"4\"/><path d=\"M23 13h2v4h-2\"/></svg>`,other:`<svg ${a}><circle cx=\"16\" cy=\"16\" r=\"12\"/><circle cx=\"10.5\" cy=\"16\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"16\" cy=\"16\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"21.5\" cy=\"16\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/></svg>`};return icons[name]||name;}
  function choiceButton(text,cb,icon='',sub=''){const b=document.createElement('button');b.type='button';b.className='option';b.innerHTML=(icon?`<span class="icon">${categoryIcon(icon)}</span>`:'')+`<span>${text}${sub?`<small>${sub}</small>`:''}</span>`;b.addEventListener('click',cb);return b;}
  function chip(text,cb){const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=text;b.addEventListener('click',()=>{b.parentElement.querySelectorAll('.chip').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');cb();});return b;}
  function renderCategories(){const box=$('categoryOptions');box.innerHTML='';Object.entries(catalog).forEach(([key,c])=>{const b=choiceButton(c.label,()=>{if(c.manual){state.category='other';go(12);return;}resetFrom('category');state.category=key;go(2);},c.icon,key==='other'?'Evaluación presencial':'');if(c.manual)b.classList.add('manual');box.appendChild(b);});}
  function renderModels(){
    const box=$('modelOptions');box.innerHTML='';const c=catalog[state.category];
    if($('modelTitle')) $('modelTitle').textContent=state.category==='ipad'?'Selecciona la familia de iPad':state.category==='mac'?'Selecciona el modelo de Mac':'Selecciona el modelo';
    if($('modelHelp')) $('modelHelp').textContent=state.category==='ipad'?'Primero elige la familia. Luego te pediremos el modelo exacto y el año solo si corresponde.':state.category==='mac'?'Elige la familia de tu Mac. En MacBook te pediremos también el tamaño de pantalla.':'Mostramos las líneas disponibles para la categoría elegida.';
    Object.keys(c.models).forEach(m=>box.appendChild(choiceButton(m,()=>{resetFrom('model');state.model=m;go(3);}))); 
    const manualText=state.category==='ipad'?'Mi equipo no aparece en la lista':'Tengo un equipo más antiguo';
    const old=choiceButton(manualText,()=>window.open('https://wa.me/584141032030?text='+encodeURIComponent(`Hola ThinkStore, quiero cotizar un ${c.label} que no aparece en el cotizador.`),'_blank'));old.classList.add('manual');box.appendChild(old);
  }
  function renderVariants(){
    const box=$('variantOptions');box.innerHTML='';
    const isMacBook=state.category==='mac' && state.model.startsWith('MacBook');
    if($('variantTitle')) $('variantTitle').textContent=state.category==='ipad'?`Selecciona tu ${state.model}`:isMacBook?'Selecciona las pulgadas':state.category==='mac'?`Selecciona la versión de ${state.model}`:'Elige la variante';
    if($('variantHelp')) $('variantHelp').textContent=state.category==='ipad'?'Elige la generación, tamaño o chip que corresponda a tu equipo.':isMacBook?'Elige el tamaño de pantalla de tu MacBook para afinar la cotización.':state.category==='mac'?'Selecciona el tamaño o chip que corresponda a tu equipo.':'Selecciona la versión exacta para afinar la cotización.';
    catalog[state.category].models[state.model].variants.forEach(v=>box.appendChild(choiceButton(v,()=>{resetFrom('variant');state.variant=v;go(isMBP()?10:4);}))); 
  }
  function renderYears(){const box=$('yearOptions');box.innerHTML='';const years=['2026','2025','2024','2023','2022','2021'];years.forEach(v=>box.appendChild(chip(v,()=>{resetFrom('year');state.year=v;setTimeout(()=>go(11),120);})));const old=chip('Mi equipo es más antiguo o no aparece el año',()=>{resetFrom('year');state.year='Anterior a 2021';setTimeout(()=>go(11),120);});box.appendChild(old);}
  function chipsForYear(){const y=state.year;if(y==='2026'||y==='2025')return['M5','M5 Pro','M5 Max'];if(y==='2024')return['M4','M4 Pro','M4 Max'];if(y==='2023')return['M2 Pro','M2 Max','M3','M3 Pro','M3 Max'];if(y==='2022'||y==='2021')return['M1 Pro','M1 Max'];return['Intel Core i5','Intel Core i7','Intel Core i9','M1','M1 Pro','M1 Max'];}
  function renderChips(){const box=$('chipOptions');box.innerHTML='';chipsForYear().forEach(v=>box.appendChild(chip(v,()=>{resetFrom('chip');state.chip=v;setTimeout(()=>go(4),120);})));}
  function renderCapacity(){const box=$('capacityOptions');box.innerHTML='';catalog[state.category].models[state.model].caps.forEach(v=>box.appendChild(chip(v,()=>{resetFrom('capacity');state.capacity=v;setTimeout(()=>go(5),120);})));}
  function batteryChoices(){if(state.category==='mac')return['Excelente','Buena','Servicio recomendado'];return['100%','91–99%','85–90%','<85%'];}
  function renderBattery(){const box=$('batteryOptions');box.innerHTML='';if(state.category==='mac'){$('batteryTitle').textContent='Estado de la batería';$('batteryHelp').textContent='Selecciona la condición general de la batería de tu Mac.';}else{$('batteryTitle').textContent='Salud de la batería';$('batteryHelp').textContent='Selecciona el rango que muestra tu equipo en los ajustes de batería.';}batteryChoices().forEach(v=>box.appendChild(chip(v,()=>{resetFrom('battery');state.battery=v;setTimeout(()=>go(6),120);})));}
  function renderCondition(){const box=$('conditionOptions');box.innerHTML='';[['Excelente','Sin golpes ni rayas importantes'],['Usado · buen estado','Desgaste normal de uso'],['Detalles estéticos','Rayas, marcas o golpes leves'],['Con daños','Pantalla, cámara, Face ID/Touch ID u otra falla']].forEach(([v,s])=>box.appendChild(choiceButton(v,()=>{resetFrom('condition');state.condition=v;if(v==='Con daños')go(7);else go(8);},'',s)));}
  function damageChoices(){
    const base=['Pantalla','Chasis','Cámara','Puerto de carga'];
    if(state.category==='iphone'||state.category==='ipad')base.push('Face ID / Touch ID');
    base.push('No enciende','Daño por líquido','Daño en placa lógica','Otro daño'); return base;
  }
  function renderDamages(){const box=$('damageOptions');box.innerHTML='';state.damages=[];damageChoices().forEach(v=>{const label=document.createElement('label');label.className='damage-check';label.innerHTML=`<input type="checkbox" value="${v}"><span>${v}</span>`;label.querySelector('input').addEventListener('change',e=>{if(e.target.checked){if(!state.damages.includes(v))state.damages.push(v);}else state.damages=state.damages.filter(x=>x!==v);$('damageContinue').disabled=state.damages.length===0;});box.appendChild(label);});$('damageContinue').disabled=true;}
  function renderDocs(){const d=$('docsOptions'),a=$('accessoryOptions');d.innerHTML='';a.innerHTML='';state.docs='';state.accessories='';['Sí, tengo comprobante','No tengo comprobante'].forEach(v=>d.appendChild(chip(v,()=>{state.docs=v;updateContinue();})));['Con accesorios originales','Sin accesorios'].forEach(v=>a.appendChild(chip(v,()=>{state.accessories=v;updateContinue();})));$('toResult').disabled=true;}
  function updateContinue(){$('toResult').disabled=!(state.docs&&state.accessories)}
  function renderSummary(){
    const rows=[['Equipo',catalog[state.category].label],['Modelo',state.model],['Variante',state.variant]];if(state.year)rows.push(['Año',state.year]);if(state.chip)rows.push(['Chip / Procesador',state.chip]);rows.push(['Capacidad',state.capacity],['Batería',state.battery],['Estado',state.condition]);
    if(state.condition==='Con daños')rows.push(['Daños',state.damages.join(', ')]);rows.push(['Documentación',state.docs],['Accesorios',state.accessories]);
    $('resultSummary').innerHTML=rows.map(([k,v])=>`<div class="result-row"><span>${k}</span><b>${v}</b></div>`).join('');
    $('ownership').checked=false;$('calculateQuote').disabled=true;$('ownershipHint').style.display='block';$('quotePrecheck').classList.remove('hidden');$('preQuoteActions').classList.remove('hidden');$('quoteResult').hidden=true;$('resultIntro').textContent='Revisa los datos antes de calcular el rango estimado.';state.quote=null;
  }
  function estimate(){let base=catalog[state.category].models[state.model].base,factor=1;factor+=factors.variants[state.variant]||0;factor+=({'M5':.22,'M5 Pro':.30,'M5 Max':.38,'M4':.15,'M4 Pro':.23,'M4 Max':.31,'M3':.08,'M3 Pro':.15,'M3 Max':.22,'M2 Pro':.05,'M2 Max':.11,'M1 Pro':-.05,'M1 Max':0,'Intel Core i5':-.22,'Intel Core i7':-.16,'Intel Core i9':-.10})[state.chip]||0;factor+=factors.capacity[state.capacity]||0;factor+=factors.battery[state.battery]||0;factor+=factors.condition[state.condition]||0;factor+=factors.docs[state.docs]||0;factor+=factors.accessories[state.accessories]||0;if(state.condition==='Con daños')state.damages.forEach(d=>factor+=factors.damages[d]||0);factor=Math.max(.15,factor);const center=Math.max(20,Math.round(base*factor/5)*5),low=Math.max(15,Math.round(center*.90/5)*5),high=Math.max(low+10,Math.round(center*1.10/5)*5);return{low,high};}
  function quoteText(action='coordinar la evaluación'){const q=state.quote;return `ThinkStore · Cotización Trade-IN\n${catalog[state.category].label} · ${state.model} · ${state.variant}${state.year?` · ${state.year}`:''}${state.chip?` · ${state.chip}`:''}\nCapacidad: ${state.capacity}\nBatería: ${state.battery}\nEstado: ${state.condition}${state.damages.length?`\nDaños: ${state.damages.join(', ')}`:''}\nDocumentación: ${state.docs}\nAccesorios: ${state.accessories}\nRango estimado: $${q.low}–$${q.high} USD\n\nQuiero ${action}.`;}
  function showQuote(){state.quote=estimate();$('quotePrice').textContent=`$${state.quote.low} – $${state.quote.high} USD`;$('quoteBonus').textContent=state.accessories==='Con accesorios originales'?'Bono por accesorios originales completos aplicado.':'La estimación puede mejorar si presentas accesorios originales completos.';$('quotePrecheck').classList.add('hidden');$('preQuoteActions').classList.add('hidden');$('quoteResult').hidden=false;$('resultIntro').textContent='Esta es tu estimación preliminar ThinkStore.';try{localStorage.setItem('ts_last_tradein_quote',JSON.stringify({...state,createdAt:new Date().toISOString(),validUntil:new Date(Date.now()+7*86400000).toISOString()}));}catch(e){}}
  function restart(){Object.assign(state,{step:1,category:'',model:'',variant:'',year:'',chip:'',capacity:'',battery:'',condition:'',damages:[],docs:'',accessories:'',quote:null});go(1);}
  function previousStep(){const r=route(),i=r.indexOf(state.step);return i>0?r[i-1]:1;}

  document.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>go(previousStep())));
  $('startQuote').addEventListener('click',()=>document.getElementById('cotizador').scrollIntoView({behavior:'smooth',block:'start'}));
  $('manualBack').addEventListener('click',restart);
  $('manualCredit').addEventListener('click',()=>window.open('https://wa.me/584141032030?text='+encodeURIComponent('Hola ThinkStore, seleccioné Otro en Trade-IN y quiero evaluar mi equipo para usarlo como parte de pago.'),'_blank'));
  $('manualSell').addEventListener('click',()=>window.open('https://wa.me/584141032030?text='+encodeURIComponent('Hola ThinkStore, seleccioné Otro en Trade-IN y quiero coordinar una evaluación manual para vender mi equipo.'),'_blank'));
  $('damageContinue').addEventListener('click',()=>go(8));
  $('toResult').addEventListener('click',()=>go(9));
  $('ownership').addEventListener('change',e=>{$('calculateQuote').disabled=!e.target.checked;$('ownershipHint').style.display=e.target.checked?'none':'block';});
  $('calculateQuote').addEventListener('click',showQuote);
  $('sendQuote').addEventListener('click',()=>{if(!state.quote)showQuote();window.open('https://wa.me/584141032030?text='+encodeURIComponent(quoteText()),'_blank');});
  $('useAsCredit').addEventListener('click',()=>{if(!state.quote)showQuote();window.open('https://wa.me/584141032030?text='+encodeURIComponent(quoteText('usar esta cotización como parte de pago en mi próxima compra')),'_blank');});
  $('sellDevice').addEventListener('click',()=>{if(!state.quote)showQuote();window.open('https://wa.me/584141032030?text='+encodeURIComponent(quoteText('vender mi equipo y coordinar la evaluación presencial')),'_blank');});
  $('restartQuote').addEventListener('click',restart);$('newQuoteInline').addEventListener('click',restart);
  renderCategories();
})();
