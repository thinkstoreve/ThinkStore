/* ThinkStore V13.5 · Asistente automático local (sin API externa) */
(()=>{
  if(window.__TS_CHATBOT_V135__) return; window.__TS_CHATBOT_V135__=true;
  const WA='584141032030';
  const STORAGE='ts_chat_v135';
  const qs=(s,r=document)=>r.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const intents=[
    {keys:['hola','buenas','hey','saludos'],reply:'¡Hola! 👋 Soy Thinky, el asistente de ThinkStore. Puedo ayudarte con productos, pagos, envíos, preórdenes, pedidos o servicio técnico.'},
    {keys:['iphone','ipad','macbook','mac mini','airpods','watch','producto','equipo','accesorio','disponibilidad','stock','precio'],reply:'Claro 📱. Dime qué equipo buscas y, si puedes, indícame modelo, capacidad y color. Para confirmar stock y precio exactos puedes revisar el catálogo o hablar con nuestro equipo por WhatsApp.'},
    {keys:['pago','zelle','pago movil','efectivo','usdt','comprobante','transferencia'],reply:'En ThinkStore puedes consultar las formas de pago disponibles durante tu compra. Para pedidos con comprobante, el pago se verifica antes de completar el proceso. Nunca envíes contraseñas bancarias por el chat.'},
    {keys:['envio','mrw','zoom','tealca','delivery','retiro','entrega'],reply:'Realizamos entregas y envíos según disponibilidad de zona y agencia. Podemos gestionar MRW, Zoom o TEALCA, además de retiro coordinado. Si me dices tu ciudad te recomiendo la opción más práctica.'},
    {keys:['preorden','pre-orden','pre orden','encargo'],reply:'Las preórdenes aplican a productos sin stock inmediato o configuraciones especiales. El tiempo estimado puede variar; como referencia operativa manejamos normalmente 15–25 días hábiles. La confirmación final la realiza nuestro equipo.'},
    {keys:['reparacion','servicio tecnico','servicio','tecnico','falla','pantalla','bateria','diagnostico'],reply:'🛠️ Nuestro Servicio Técnico puede recibir equipos Apple para diagnóstico y reparación. Puedes comenzar desde la sección Servicio Técnico o escribirnos por WhatsApp con el modelo y la falla que presenta.'},
    {keys:['pedido','orden','seguimiento','estatus','estado de mi'],reply:'Para consultar un pedido necesitas iniciar sesión en tu cuenta ThinkStore. Desde allí podrás ver tus compras y el seguimiento disponible. Por seguridad, no muestro información privada de pedidos sin autenticación.'},
    {keys:['ubicacion','direccion','donde estan','tienda','altamira'],reply:'ThinkStore atiende en Altamira, Caracas. Para evitar desplazamientos innecesarios, te recomendamos solicitar por WhatsApp la ubicación exacta y confirmar disponibilidad antes de visitarnos.'},
    {keys:['horario','hora','abren','cierran'],reply:'Los horarios pueden variar. Antes de ir a la tienda, lo mejor es confirmar el horario de atención por WhatsApp para ese día.'},
    {keys:['correo','contacto','email'],reply:'Puedes escribirnos a contacto@thinkstore.com.ve 📧. También puedes continuar por WhatsApp si necesitas una respuesta comercial rápida.'},
    {keys:['garantia','garantía','devolucion','cambio'],reply:'Las condiciones de garantía, cambios o devoluciones dependen del producto, su condición y el motivo de la solicitud. Conserva tu comprobante o nota de entrega y nuestro equipo revisará el caso contigo.'}
  ];
  function replyFor(text){
    const t=normalize(text);
    let best=null,score=0;
    for(const x of intents){let n=0;for(const k of x.keys)if(t.includes(normalize(k)))n++;if(n>score){score=n;best=x;}}
    if(best) return best.reply;
    if(t.includes('gracias')) return '¡Con gusto! 😊 Si necesitas algo más sobre ThinkStore, aquí estoy.';
    return 'Puedo ayudarte con productos, disponibilidad, pagos, envíos, preórdenes, pedidos, ubicación o servicio técnico. Si tu consulta necesita atención humana, también puedes continuar por WhatsApp.';
  }
  function create(){
    if(qs('#tsChat')) return;
    document.body.insertAdjacentHTML('beforeend',`
      <button class="ts-chat-launcher" id="tsChatLauncher" type="button" aria-label="Abrir asistente ThinkStore" aria-controls="tsChat" aria-expanded="false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.8 4v-4.2A2.5 2.5 0 0 1 4 13.5z"/></svg><span class="dot"></span>
      </button>
      <section class="ts-chat" id="tsChat" aria-hidden="true" aria-label="Asistente ThinkStore">
        <div class="ts-chat-head"><div class="ts-chat-avatar">T</div><div class="ts-chat-title"><b>Thinky · ThinkStore</b><span>Asistente automático</span></div><button class="ts-chat-close" id="tsChatClose" type="button" aria-label="Cerrar chat">×</button></div>
        <div class="ts-chat-body" id="tsChatBody" aria-live="polite"></div>
        <div class="ts-chat-quick" aria-label="Preguntas rápidas">
          <button class="ts-chat-chip" data-q="Quiero consultar un producto">Productos</button><button class="ts-chat-chip" data-q="¿Cuáles son las formas de pago?">Pagos</button><button class="ts-chat-chip" data-q="Necesito información de envíos">Envíos</button><button class="ts-chat-chip" data-q="Necesito servicio técnico">Servicio técnico</button><button class="ts-chat-chip" data-q="¿Cómo consulto mi pedido?">Mi pedido</button>
        </div>
        <form class="ts-chat-form" id="tsChatForm"><input class="ts-chat-input" id="tsChatInput" autocomplete="off" maxlength="400" placeholder="Escribe tu mensaje…" aria-label="Mensaje"><button class="ts-chat-send" type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.2 21 12 3.4 3.8l.1 6.4L16 12 3.5 13.8z"/></svg></button></form>
        <div class="ts-chat-note">¿Necesitas atención humana? <a target="_blank" rel="noopener" href="https://wa.me/${WA}?text=Hola%20ThinkStore%2C%20vengo%20desde%20el%20asistente%20web%20y%20necesito%20ayuda.">Continuar por WhatsApp</a></div>
      </section>`);
    bind(); restore();
  }
  function msg(role,text,save=true){
    const body=qs('#tsChatBody'); if(!body)return;
    const row=document.createElement('div');row.className='ts-msg '+role;row.innerHTML=`<div class="ts-bubble">${esc(text)}</div>`;body.appendChild(row);body.scrollTop=body.scrollHeight;
    if(save) persist();
  }
  function persist(){
    const data=[...document.querySelectorAll('#tsChatBody .ts-msg')].slice(-24).map(n=>({role:n.classList.contains('user')?'user':'bot',text:qs('.ts-bubble',n)?.textContent||''}));
    try{sessionStorage.setItem(STORAGE,JSON.stringify(data));}catch(e){}
  }
  function restore(){
    let data=[];try{data=JSON.parse(sessionStorage.getItem(STORAGE)||'[]')}catch(e){}
    if(Array.isArray(data)&&data.length)data.forEach(x=>msg(x.role==='user'?'user':'bot',x.text,false));
    else msg('bot','Hola 👋 Soy Thinky, el asistente automático de ThinkStore. ¿Qué equipo Apple buscas o en qué puedo ayudarte hoy?',true);
  }
  function typing(on){
    const body=qs('#tsChatBody');if(!body)return;
    qs('#tsTyping')?.remove();
    if(on){const d=document.createElement('div');d.id='tsTyping';d.className='ts-msg bot';d.innerHTML='<span class="ts-chat-typing"><i></i><i></i><i></i></span>';body.appendChild(d);body.scrollTop=body.scrollHeight;}
  }
  function answer(text){msg('user',text);typing(true);setTimeout(()=>{typing(false);msg('bot',replyFor(text));},520+Math.min(650,text.length*8));}
  function open(){const c=qs('#tsChat'),b=qs('#tsChatLauncher');c?.classList.add('open');c?.setAttribute('aria-hidden','false');b?.setAttribute('aria-expanded','true');setTimeout(()=>qs('#tsChatInput')?.focus(),180)}
  function close(){const c=qs('#tsChat'),b=qs('#tsChatLauncher');c?.classList.remove('open');c?.setAttribute('aria-hidden','true');b?.setAttribute('aria-expanded','false')}
  function bind(){
    qs('#tsChatLauncher')?.addEventListener('click',()=>qs('#tsChat')?.classList.contains('open')?close():open());
    qs('#tsChatClose')?.addEventListener('click',close);
    qs('#tsChatForm')?.addEventListener('submit',e=>{e.preventDefault();const i=qs('#tsChatInput');const t=i?.value.trim();if(!t)return;i.value='';answer(t)});
    document.querySelectorAll('.ts-chat-chip').forEach(b=>b.addEventListener('click',()=>answer(b.dataset.q||b.textContent)));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&qs('#tsChat')?.classList.contains('open'))close()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',create);else create();
})();
