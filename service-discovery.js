/* Service discovery and booking: no stock or price assumptions. */
(()=>{
 const paths={
 'Diagnóstico':'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6m-3-3v6"/>',
 'Baterías':'<rect x="3" y="6" width="17" height="12" rx="3"/><path d="M22 10v4M7 10v4m4-4v4m4-4v4"/>',
 'Pantallas':'<rect x="2" y="3" width="20" height="14" rx="3"/><path d="M8 21h8m-4-4v4"/>',
 'Recuperación de datos':'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8m-8 4h8m-8 5h3"/>',
 'macOS':'<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m7 9 3 3-3 3m6 0h4"/>',
 'Mantenimiento':'<path d="m14 5 5 5M5 14l5 5M3 21l6-2L21 7l-4-4L5 15z"/>'};
 const svg=k=>`<span class="ts-service-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[k]||paths['Diagnóstico']}</svg></span>`;
 const info={
 'Diagnóstico':['Conoce lo que necesita tu equipo.','Evaluación de encendido y carga','Revisión de funcionamiento y síntomas','Propuesta de reparación antes de intervenir'],
 'Baterías':['Recupera la autonomía de tu equipo.','Revisión del estado de la batería y la carga','Identificación del repuesto por modelo exacto','Cotización y disponibilidad antes del reemplazo'],
 'Pantallas':['Una imagen clara, desde el diagnóstico.','Evaluación de imagen, táctil y daños','Identificación de pantalla según modelo','Consulta de repuesto y presupuesto'],
 'Recuperación de datos':['Tus archivos merecen una evaluación cuidadosa.','Diagnóstico del almacenamiento','Evaluación de opciones de recuperación','Alcance y presupuesto según estado del equipo'],
 'macOS':['Tu sistema, listo para seguir trabajando.','Revisión de compatibilidad del equipo','Respaldo y actualización o reinstalación','Configuración y comprobación de funcionamiento'],
 'Mantenimiento':['Cuida el rendimiento de tu equipo.','Limpieza y evaluación preventiva','Revisión de temperatura y ventilación en Mac','Comprobación de funcionamiento']};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let selected='Diagnóstico';
 const dialog=document.createElement('dialog');dialog.id='tsServiceDialog';dialog.setAttribute('aria-labelledby','tsServiceTitle');document.body.append(dialog);
 function selection(){const family=dialog.querySelector('#tsServiceDevice').value;const model=dialog.querySelector('#tsServiceModel').value;const os=dialog.querySelector('#tsServiceOS');return {family,model,detail:`${selected}${os?' · '+os.value:''} · ${model||family}`};}
 function models(){const family=dialog.querySelector('#tsServiceDevice').value;let products=[];try{products=typeof productsV2==='function'?productsV2():typeof PRODUCTS!=='undefined'?PRODUCTS:[];}catch(_){}if(!Array.isArray(products))products=[];const names=[...new Set(products.filter(p=>(p.category||p.cat)===family).map(p=>p.name).filter(Boolean))];const model=dialog.querySelector('#tsServiceModel');model.innerHTML='<option value="">Otro modelo / confirmar modelo exacto</option>'+names.map(n=>`<option>${esc(n)}</option>`).join('');}
 window.tsOpenTechnicalService=function(service){
 selected=info[service]?service:'Diagnóstico';const details=info[selected];
 dialog.innerHTML=`<div class="ts-service-dialog-head">${svg(selected)}<button type="button" class="ts-service-close" aria-label="Cerrar ventana">×</button></div><p class="eyebrow">Soporte Think</p><h2 id="tsServiceTitle">${selected==='macOS'?'macOS, iOS y iPadOS':esc(selected)}</h2><p>${details[0]}</p><ul>${details.slice(1).map(t=>`<li>${t}</li>`).join('')}</ul>${selected==='macOS'?'<label>Sistema<select id="tsServiceOS"><option>macOS 27 Golden Gate · Mac</option><option>iOS 27 · iPhone</option><option>iPadOS · iPad</option><option>Versión compatible con mi equipo</option></select></label>':''}<div class="ts-service-fields"><label>Equipo<select id="tsServiceDevice"><option>iPhone</option><option>Mac</option><option>iPad</option><option>Apple Watch</option><option>AirPods</option></select></label><label>Modelo<select id="tsServiceModel"></select></label></div><p class="ts-service-note">${selected==='Baterías'?'Catálogo de solicitudes de reemplazo. ':''}Confirmamos compatibilidad, disponibilidad, precio y plazo después de identificar tu equipo.${selected==='Recuperación de datos'?' La recuperación depende del estado del almacenamiento.':''}</p><div class="ts-service-actions"><a class="btn" id="tsServiceBook" href="agenda-soporte.html">Agenda tu reparación</a><button class="btn ghost" id="tsServiceConsult" type="button">Consultar servicio</button></div>`;
 const device=dialog.querySelector('#tsServiceDevice');if(selected==='macOS')device.value='Mac';models();
 const booking=()=>{const s=selection();const q=new URLSearchParams({origen:'home-servicios',dispositivo:s.family,modelo:s.model,servicio:selected,falla:s.detail});dialog.querySelector('#tsServiceBook').href='agenda-soporte.html?'+q;};
 device.onchange=()=>{models();booking();};dialog.querySelector('#tsServiceModel').onchange=booking;
 const os=dialog.querySelector('#tsServiceOS');if(os)os.onchange=()=>{device.value=os.value.startsWith('macOS')?'Mac':os.value.startsWith('iOS')?'iPhone':os.value.startsWith('iPadOS')?'iPad':device.value;models();booking();};
 dialog.querySelector('.ts-service-close').onclick=()=>dialog.close();
 dialog.querySelector('#tsServiceConsult').onclick=()=>{const s=selection();dialog.close();if(typeof window.tsOpenSmartWhatsApp==='function'){window.tsOpenSmartWhatsApp('soporte');const field=document.getElementById('tsSmartWaExtra');if(field){field.value='Necesito consultar '+s.detail;field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();}}};booking();
 if(!dialog.open)dialog.showModal();
 };
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 document.querySelectorAll('#servicio-tecnico .servgrid button').forEach(b=>{const label=b.querySelector('b');const key=label?.textContent==='Datos'?'Recuperación de datos':label?.textContent;b.innerHTML=svg(key)+`<b>${key==='macOS'?'Sistemas Apple':esc(label?.textContent||key)}</b><small>${key==='macOS'?'macOS, iOS y iPadOS':esc(b.querySelector('small')?.textContent||'')}</small>`;});
})();
