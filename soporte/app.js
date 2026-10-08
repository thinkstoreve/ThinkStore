const TSService=(()=>{
  const SUPABASE_URL='https://tnezvnziqnjxhcwjtcuy.supabase.co';
  const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuZXp2bnppcW5qeGhjd2p0Y3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwODk5ODUsImV4cCI6MjA5NzY2NTk4NX0.OsFkefVeW4FN_uVML1ncE0i6FR_Dmg8eLPY9TEnezpM';
  const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  if(window.ThinkStoreOffline)window.ThinkStoreOffline.setTokenProvider(async()=>{const {data}=await supabaseClient.auth.getSession();return data?.session?.access_token||''});

  const roles={
    superadmin:['dashboard','notifications','appointments','orders','reception','technical','bitacora','parts','sales','logistics','clients','users','permissions','reports'],
    admin:['dashboard','notifications','appointments','orders','reception','technical','bitacora','parts','sales','logistics','clients','reports'],
    reception:['dashboard','notifications','appointments','orders','reception','clients'],
    technician:['dashboard','notifications','orders','technical','bitacora','parts'],
    sales:['dashboard','notifications','orders','sales','parts','clients'],
    logistics:['dashboard','notifications','orders','logistics'],
    client:['client_status']
  };

  const roleLabels={
    superadmin:'Super Admin',
    admin:'Admin',
    reception:'Recepcionista',
    technician:'Técnico',
    sales:'Ventas',
    logistics:'Logística',
    client:'Cliente'
  };


  const SUPPORT_ICONS={
    dashboard:'<path d="M4 4h6v6H4z"/><path d="M14 4h6v10h-6z"/><path d="M4 14h6v6H4z"/><path d="M14 18h6v2h-6z"/>',
    notifications:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    appointments:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    orders:'<path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/>',
    reception:'<path d="M4 4h16v16H4z"/><path d="M12 3v11m0 0-4-4m4 4 4-4"/>',
    technical:'<path d="M14.7 6.3a4 4 0 0 0-5-5L7 4l3 3 2.7-2.7a4 4 0 0 0 2 5L7 17l-2 5 5-2 7.7-7.7a4 4 0 0 0 5-5L20 10l-3-3-2.3 2.3"/>',
    bitacora:'<path d="M6 2h9l4 4v16H6zM14 2v5h5M9 12h6M9 16h6M9 8h2"/>',
    parts:'<path d="M9 3h6l1 4 4 1v6l-4 1-1 4H9l-1-4-4-1V8l4-1 1-4Z"/><circle cx="12" cy="11" r="2"/>',
    sales:'<path d="M4 19V9M10 19V4M16 19v-7M22 19V7"/>',
    logistics:'<path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    clients:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
    users:'<circle cx="9" cy="7" r="4"/><path d="M3 21a6 6 0 0 1 12 0M17 8h4M19 6v4"/>',
    permissions:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    back:'<path d="M15 18l-6-6 6-6"/><path d="M9 12h11"/>',
    reports:'<path d="M4 19V9M10 19V4M16 19v-7M22 19V12"/>'
  };
  function supportIcon(id){const body=SUPPORT_ICONS[id]||SUPPORT_ICONS.dashboard;return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`}

  const appleDevices=[{"name": "iPhone 8", "category": "iPhone"}, {"name": "iPhone 8 Plus", "category": "iPhone"}, {"name": "iPhone X", "category": "iPhone"}, {"name": "iPhone XR", "category": "iPhone"}, {"name": "iPhone XS", "category": "iPhone"}, {"name": "iPhone XS Max", "category": "iPhone"}, {"name": "iPhone 11", "category": "iPhone"}, {"name": "iPhone 11 Pro", "category": "iPhone"}, {"name": "iPhone 11 Pro Max", "category": "iPhone"}, {"name": "iPhone SE (2da generación)", "category": "iPhone"}, {"name": "iPhone 12 mini", "category": "iPhone"}, {"name": "iPhone 12", "category": "iPhone"}, {"name": "iPhone 12 Pro", "category": "iPhone"}, {"name": "iPhone 12 Pro Max", "category": "iPhone"}, {"name": "iPhone 13 mini", "category": "iPhone"}, {"name": "iPhone 13", "category": "iPhone"}, {"name": "iPhone 13 Pro", "category": "iPhone"}, {"name": "iPhone 13 Pro Max", "category": "iPhone"}, {"name": "iPhone SE (3ra generación)", "category": "iPhone"}, {"name": "iPhone 14", "category": "iPhone"}, {"name": "iPhone 14 Plus", "category": "iPhone"}, {"name": "iPhone 14 Pro", "category": "iPhone"}, {"name": "iPhone 14 Pro Max", "category": "iPhone"}, {"name": "iPhone 15", "category": "iPhone"}, {"name": "iPhone 15 Plus", "category": "iPhone"}, {"name": "iPhone 15 Pro", "category": "iPhone"}, {"name": "iPhone 15 Pro Max", "category": "iPhone"}, {"name": "iPhone 16", "category": "iPhone"}, {"name": "iPhone 16 Plus", "category": "iPhone"}, {"name": "iPhone 16 Pro", "category": "iPhone"}, {"name": "iPhone 16 Pro Max", "category": "iPhone"}, {"name": "iPhone 16e", "category": "iPhone"}, {"name": "iPhone 17", "category": "iPhone"}, {"name": "iPhone 17 Air", "category": "iPhone"}, {"name": "iPhone 17 Pro", "category": "iPhone"}, {"name": "iPhone 17 Pro Max", "category": "iPhone"}, {"name": "iPad 6ª generación", "category": "iPad"}, {"name": "iPad 7ª generación", "category": "iPad"}, {"name": "iPad 8ª generación", "category": "iPad"}, {"name": "iPad 9ª generación", "category": "iPad"}, {"name": "iPad 10ª generación", "category": "iPad"}, {"name": "iPad A16", "category": "iPad"}, {"name": "iPad Air 3", "category": "iPad"}, {"name": "iPad Air 4", "category": "iPad"}, {"name": "iPad Air 5", "category": "iPad"}, {"name": "iPad Air M2 11 pulgadas", "category": "iPad"}, {"name": "iPad Air M2 13 pulgadas", "category": "iPad"}, {"name": "iPad Air M3 11 pulgadas", "category": "iPad"}, {"name": "iPad Air M3 13 pulgadas", "category": "iPad"}, {"name": "iPad mini 5", "category": "iPad"}, {"name": "iPad mini 6", "category": "iPad"}, {"name": "iPad mini 7", "category": "iPad"}, {"name": "iPad Pro 11 pulgadas 2018", "category": "iPad"}, {"name": "iPad Pro 11 pulgadas 2020", "category": "iPad"}, {"name": "iPad Pro 11 pulgadas M1", "category": "iPad"}, {"name": "iPad Pro 11 pulgadas M2", "category": "iPad"}, {"name": "iPad Pro 11 pulgadas M4", "category": "iPad"}, {"name": "iPad Pro 12.9 pulgadas 2018", "category": "iPad"}, {"name": "iPad Pro 12.9 pulgadas 2020", "category": "iPad"}, {"name": "iPad Pro 12.9 pulgadas M1", "category": "iPad"}, {"name": "iPad Pro 12.9 pulgadas M2", "category": "iPad"}, {"name": "iPad Pro 13 pulgadas M4", "category": "iPad"}, {"name": "AirPods 1", "category": "AirPods"}, {"name": "AirPods 2", "category": "AirPods"}, {"name": "AirPods 3", "category": "AirPods"}, {"name": "AirPods 4", "category": "AirPods"}, {"name": "AirPods Pro", "category": "AirPods"}, {"name": "AirPods Pro 2", "category": "AirPods"}, {"name": "AirPods Pro 3", "category": "AirPods"}, {"name": "AirPods Max", "category": "AirPods"}, {"name": "Apple Watch Series 3", "category": "Apple Watch"}, {"name": "Apple Watch Series 4", "category": "Apple Watch"}, {"name": "Apple Watch Series 5", "category": "Apple Watch"}, {"name": "Apple Watch Series 6", "category": "Apple Watch"}, {"name": "Apple Watch Series 7", "category": "Apple Watch"}, {"name": "Apple Watch Series 8", "category": "Apple Watch"}, {"name": "Apple Watch Series 9", "category": "Apple Watch"}, {"name": "Apple Watch Series 10", "category": "Apple Watch"}, {"name": "Apple Watch Series 11", "category": "Apple Watch"}, {"name": "Apple Watch SE 1", "category": "Apple Watch"}, {"name": "Apple Watch SE 2", "category": "Apple Watch"}, {"name": "Apple Watch Ultra", "category": "Apple Watch"}, {"name": "Apple Watch Ultra 2", "category": "Apple Watch"}, {"name": "Apple Watch Ultra 3", "category": "Apple Watch"}, {"name": "MacBook Air Intel 2018", "category": "MacBook Air"}, {"name": "MacBook Air Intel 2019", "category": "MacBook Air"}, {"name": "MacBook Air Intel 2020", "category": "MacBook Air"}, {"name": "MacBook Air M1 13 pulgadas", "category": "MacBook Air"}, {"name": "MacBook Air M2 13 pulgadas", "category": "MacBook Air"}, {"name": "MacBook Air M2 15 pulgadas", "category": "MacBook Air"}, {"name": "MacBook Air M3 13 pulgadas", "category": "MacBook Air"}, {"name": "MacBook Air M3 15 pulgadas", "category": "MacBook Air"}, {"name": "MacBook Air M4 13 pulgadas", "category": "MacBook Air"}, {"name": "MacBook Air M4 15 pulgadas", "category": "MacBook Air"}, {"name": "MacBook Pro Intel 13 pulgadas 2018", "category": "MacBook Pro"}, {"name": "MacBook Pro Intel 15 pulgadas 2018", "category": "MacBook Pro"}, {"name": "MacBook Pro Intel 13 pulgadas 2019", "category": "MacBook Pro"}, {"name": "MacBook Pro Intel 15 pulgadas 2019", "category": "MacBook Pro"}, {"name": "MacBook Pro Intel 16 pulgadas 2019", "category": "MacBook Pro"}, {"name": "MacBook Pro Intel 13 pulgadas 2020", "category": "MacBook Pro"}, {"name": "MacBook Pro M1 13 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M1 Pro 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M1 Max 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M1 Pro 16 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M1 Max 16 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M2 13 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M2 Pro 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M2 Max 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M2 Pro 16 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M2 Max 16 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M3 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M3 Pro 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M3 Max 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M3 Pro 16 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M3 Max 16 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M4 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M4 Pro 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M4 Max 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M4 Pro 16 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M4 Max 16 pulgadas", "category": "MacBook Pro"}, {"name": "iMac Intel 21.5 pulgadas", "category": "iMac"}, {"name": "iMac Intel 27 pulgadas", "category": "iMac"}, {"name": "iMac M1 24 pulgadas", "category": "iMac"}, {"name": "iMac M3 24 pulgadas", "category": "iMac"}, {"name": "iMac M4 24 pulgadas", "category": "iMac"}, {"name": "Mac mini Intel", "category": "Mac mini"}, {"name": "Mac mini M1", "category": "Mac mini"}, {"name": "Mac mini M2", "category": "Mac mini"}, {"name": "Mac mini M2 Pro", "category": "Mac mini"}, {"name": "Mac mini M4", "category": "Mac mini"}, {"name": "Mac mini M4 Pro", "category": "Mac mini"}, {"name": "Mac Studio M1 Max", "category": "Mac Studio"}, {"name": "Mac Studio M1 Ultra", "category": "Mac Studio"}, {"name": "Mac Studio M2 Max", "category": "Mac Studio"}, {"name": "Mac Studio M2 Ultra", "category": "Mac Studio"}, {"name": "Mac Studio M4 Max", "category": "Mac Studio"}, {"name": "Mac Studio M4 Ultra", "category": "Mac Studio"}, {"name": "Mac Pro Intel 2019", "category": "Mac Pro"}, {"name": "Mac Pro M2 Ultra", "category": "Mac Pro"}, {"name": "Mac Pro M4 Ultra", "category": "Mac Pro"}];
  const PRIMARY_OWNER_EMAIL='thinkstore.ve@gmail.com';
  const PRIMARY_OWNER_NAME='Freddy Sedispa';
  function canonicalSupportName(email,...values){
    const normalized=String(email||'').trim().toLowerCase();
    if(normalized===PRIMARY_OWNER_EMAIL)return PRIMARY_OWNER_NAME;
    for(const value of values){const name=String(value||'').trim();if(name)return name;}
    return normalized?normalized.split('@')[0]:'Usuario';
  }
  function canonicalizeSupportSession(value){
    if(!value)return value;
    const name=canonicalSupportName(value.email,value.name,value.nombre);
    return {...value,name,nombre:name};
  }
  let session=canonicalizeSupportSession(JSON.parse(localStorage.getItem('ts_service_session')||'null'));
  if(session)localStorage.setItem('ts_service_session',JSON.stringify(session));
  const isPanelPage=()=>/\/panel\.html$/i.test(location.pathname);
  const goToPanel=()=>{ if(!isPanelPage()) location.href='panel.html'; };
  const goToHome=()=>{ if(isPanelPage()) location.href='index.html'; };
  let orders=[];
  let bitacora=[];
  let serviceUsers=[];
  let servicePhotos=[];
  const orderFileUrlCache=new Map();
  const SUPPORT_IMAGE_RE=/\.(png|jpe?g|webp|gif|bmp|avif|heic|heif|tif|tiff)(?:$|[?#])/i;
  const SUPPORT_HEIC_RE=/\.(heic|heif)(?:$|[?#])/i;
  function supportFileDescriptor(p={}){return `${String(p.label||'')} ${String(p.storage_path||'')} ${String(p.file_url||'')}`}
  function supportUploadOptions(file){const opts={upsert:false,cacheControl:'3600'};if(file?.type)opts.contentType=file.type;return opts}
  async function supportBlobToBase64(blob){return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||'').split(',')[1]||'');r.onerror=()=>reject(r.error||new Error('No se pudo leer la imagen'));r.readAsDataURL(blob)})}
  async function normalizeSupportImage(file){
    if(!file||!String(file.type||'').toLowerCase().startsWith('image/'))return null;
    const safeType=String(file.type||'').toLowerCase();
    let bitmap=null,url='';
    try{
      // Algunos navegadores exponen createImageBitmap pero no pueden decodificar
      // ciertos JPEG/HEIC. Si falla, probamos el decodificador <img> antes de
      // delegar la conversión al backend/R2.
      if('createImageBitmap' in window){try{bitmap=await createImageBitmap(file)}catch(error){console.warn('createImageBitmap no pudo decodificar; usando alternativa:',error?.message||error)}}
      let width=bitmap?.width||0,height=bitmap?.height||0,img=null;
      if(!width||!height){
        url=URL.createObjectURL(file);
        try{img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('BROWSER_IMAGE_DECODE_FAILED'));i.src=url});width=img.naturalWidth||img.width;height=img.naturalHeight||img.height;bitmap=img}
        catch(error){throw error}
      }
      if(!width||!height)throw new Error('BROWSER_IMAGE_DECODE_FAILED');
      const max=1800,scale=Math.min(1,max/Math.max(width,height)),cw=Math.max(1,Math.round(width*scale)),ch=Math.max(1,Math.round(height*scale));
      const canvas=document.createElement('canvas');canvas.width=cw;canvas.height=ch;const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,cw,ch);ctx.drawImage(bitmap,0,0,cw,ch);
      let blob=await new Promise(r=>canvas.toBlob(r,'image/webp',.84));let mime='image/webp',ext='webp';
      if(!blob){blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.86));mime='image/jpeg';ext='jpg'}
      if(!blob)throw new Error('No se pudo optimizar la imagen');
      if(blob.size>3.8*1024*1024){blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.72));mime='image/jpeg';ext='jpg'}
      if(!blob||blob.size>4*1024*1024)throw new Error('La imagen sigue siendo demasiado pesada después de optimizarla');
      return {blob,mime,ext,name:`foto-${Date.now()}.${ext}`,original_type:safeType,original_name:file.name||'imagen'};
    }finally{try{bitmap?.close?.()}catch(_){}if(url)URL.revokeObjectURL(url)}
  }
  async function uploadOriginalImageToR2(file,orderId){
    if(!file)throw new Error('Archivo requerido');
    // El backend detecta el formato real por magic bytes y convierte HEIC/HEIF
    // a JPEG antes de guardarlo en R2. Así Chrome no necesita decodificarlo.
    if((file.size||0)>5.5*1024*1024)throw new Error('La foto original supera 5,5 MB. Usa una foto más liviana o expórtala como JPG.');
    const base64=await supportBlobToBase64(file);
    const r=await supportR2Upload({order_id:String(orderId),file_name:file.name||'imagen',mime:file.type||'',base64,allow_server_convert:true});
    if(!r?.storage_path)throw new Error('Cloudflare R2 no devolvió la ruta de la imagen');
    return {storage_path:r.storage_path,file_url:'private:r2',mime:r.mime||file.type||'',size:Number(r.size||file.size||0),provider:'r2',converted:Boolean(r.converted)};
  }
  async function storeSupportFile(file,orderId,prefix='order'){
    if(!file)throw new Error('Archivo requerido');
    const isImage=String(file.type||'').toLowerCase().startsWith('image/')||/\.(heic|heif|jpe?g|png|webp|gif|bmp|avif|tiff?)$/i.test(String(file.name||''));
    let normalized=null,decodeError=null;
    if(isImage){try{normalized=await normalizeSupportImage(file)}catch(error){decodeError=error;console.warn('La imagen se convertirá en el servidor:',error?.message||error)}}
    if(normalized){
      const base64=await supportBlobToBase64(normalized.blob);
      try{
        const r=await supportR2Upload({order_id:String(orderId),file_name:normalized.original_name,mime:normalized.mime,base64});
        if(r?.storage_path)return {storage_path:r.storage_path,file_url:'private:r2',mime:r.mime||normalized.mime,size:Number(r.size||normalized.blob.size),provider:'r2',converted:Boolean(r.converted)};
        throw new Error('Cloudflare R2 no devolvió la ruta del archivo.');
      }catch(error){
        console.error('R2 privado no disponible:',error);
        throw new Error('No se pudo guardar la imagen en Cloudflare R2: '+(error?.message||error));
      }
    }
    if(isImage){
      // Si el navegador no pudo decodificar (caso típico HEIC/HEIF), no fallamos:
      // enviamos el original al backend para conversión y almacenamiento privado.
      try{return await uploadOriginalImageToR2(file,orderId)}catch(error){
        const msg=error?.message||String(error||'');
        if(decodeError&&/BROWSER_IMAGE_DECODE_FAILED|source image could not be decoded/i.test(String(decodeError?.message||decodeError))){
          throw new Error(msg||'No se pudo convertir esta imagen. Intenta exportarla como JPG o PNG.')
        }
        throw error
      }
    }
    const ext=(file.name.split('.').pop()||'bin').replace(/[^a-z0-9]/gi,'')||'bin',path=`${orderId}/${prefix}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const {error}=await supabaseClient.storage.from('service-order-files').upload(path,file,supportUploadOptions(file));if(error)throw error;
    return {storage_path:path,file_url:'private',mime:file.type||'',size:file.size||0,provider:'supabase'};
  }
  let activeOrderId=null;
  let orderMessagePollTimer=null;
  const orderMessageLastKey=new Map();
  const orderMessageLastHash=new Map();
  let chatAudioContext=null;

  function ensureChatAudio(){
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return null;
      if(!chatAudioContext)chatAudioContext=new AC();
      if(chatAudioContext.state==='suspended')chatAudioContext.resume().catch(()=>{});
      return chatAudioContext;
    }catch{return null}
  }
  function playChatSound(kind='incoming'){
    const ctx=ensureChatAudio();if(!ctx)return;
    const now=ctx.currentTime+0.01;
    const master=ctx.createGain();
    master.gain.setValueAtTime(0.0001,now);
    master.gain.exponentialRampToValueAtTime(kind==='incoming'?0.16:0.11,now+0.012);
    master.gain.exponentialRampToValueAtTime(0.0001,now+0.34);
    master.connect(ctx.destination);
    const notes=kind==='incoming'?[[880,0,.12],[1175,.075,.16]]:[[660,0,.09],[990,.055,.13]];
    notes.forEach(([freq,delay,duration])=>{
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(freq,now+delay);
      gain.gain.setValueAtTime(0.0001,now+delay);
      gain.gain.exponentialRampToValueAtTime(0.85,now+delay+.008);
      gain.gain.exponentialRampToValueAtTime(0.0001,now+delay+duration);
      osc.connect(gain);gain.connect(master);osc.start(now+delay);osc.stop(now+delay+duration+.03);
    });
  }
  function chatMessageKey(m={}){return String(m.id??`${m.created_at||''}|${m.sender_type||''}|${m.message||''}`)}
  function stopOrderMessagePolling(){if(orderMessagePollTimer){clearInterval(orderMessagePollTimer);orderMessagePollTimer=null}}
  function startOrderMessagePolling(orderId){
    stopOrderMessagePolling();
    orderMessagePollTimer=setInterval(()=>{
      const modal=document.getElementById('orderManagerModal');
      if(!modal?.classList.contains('open')||String(activeOrderId)!==String(orderId)){stopOrderMessagePolling();return}
      renderOrderMessages(orderId,{notifyIncoming:true,preserveScroll:true}).catch(()=>{});
    },3500);
  }
  document.addEventListener('pointerdown',()=>ensureChatAudio(),{once:true,capture:true});
  document.addEventListener('keydown',()=>ensureChatAudio(),{once:true,capture:true});
  let activeReceptionOrderId=null;
  let pendingAppointmentId=null;
  let serviceParts=[];
  let serviceOrderParts=[];
  let partMovements=[];
  let repairPartSelection=new Map();
  let serviceAppointments=[];
  let registeredClients=[];
  let registeredClientsLoaded=false;
  let receptionClientDirectoryCache=[];
  let selectedReceptionClientId=null;
  let supportAlerts=[];
  let supportAlertTimer=null;
  let supportPaymentTimer=null;
  let currentPanelView='dashboard';
  let notificationFilter='all';
  const seenSupportAlertIds=new Set();

  const dateText=v=>v?new Date(v).toLocaleString('es-VE'):'Sin fecha';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function toast(message,type='ok'){let el=document.getElementById('serviceToast');if(!el){el=document.createElement('div');el.id='serviceToast';document.body.appendChild(el)}el.className=`service-toast ${type}`;el.textContent=message;requestAnimationFrame(()=>el.classList.add('show'));clearTimeout(window.__serviceToast);window.__serviceToast=setTimeout(()=>el.classList.remove('show'),4200)}
  function mapOrder(row){
    const checklist=row.reception_checklist||{},clientMeta=checklist.__client||{};
    const clientName=String(row.client_name||clientMeta.name||clientMeta.full_name||clientMeta.customer_name||row.customer_name||'').trim()||'Cliente';
    return{id:row.id,code:row.code,client:clientName,phone:row.client_phone||clientMeta.phone||'',email:row.client_email||clientMeta.email||'',clientMeta,device:row.device_model,deviceType:row.device_type||'',color:row.device_color||'',serial:row.serial_imei||'',priority:row.priority||'Normal',issue:row.reported_issue,accessories:row.accessories_received||'',visual:row.visual_condition||'',status:row.status||'Recibido',tech:row.assigned_technician_email||'',quote:row.quote_status||'Pendiente',quoteAmount:Number(row.quote_amount||0),quoteCurrency:row.quote_currency||'USD',quoteRepairDetails:row.quote_repair_details||'',quoteSentAt:row.quote_sent_at||'',quoteApprovedAt:row.quote_approved_at||'',quoteClientComment:row.quote_client_comment||'',quoteTermsVersion:row.quote_terms_version||'',quoteTermsAcceptedAt:row.quote_terms_accepted_at||'',paymentReady:Object.prototype.hasOwnProperty.call(row,'payment_status'),paymentStatus:row.payment_status||'Pendiente',amountPaid:Number(row.amount_paid||0),paymentMethod:row.payment_method||'',paymentNotes:row.payment_notes||'',paidAt:row.paid_at||'',serviceMode:row.service_mode||'Presencial',warrantyDays:Number(row.warranty_days||0),deliveryMethod:row.delivery_method||'',trackingCompany:row.tracking_company||'',trackingCode:row.tracking_code||'',technicalNotes:row.technical_notes||'',checklist,signatures:row.signatures||{},receivedByName:checklist?.__meta?.received_by_name||row.created_by_email||'',receivedByEmail:checklist?.__meta?.received_by_email||row.created_by_email||'',receivedByRole:checklist?.__meta?.received_by_role||'',receivedAt:checklist?.__meta?.received_at||row.created_at||'',passwordReceived:Boolean(row.password_received),deliveredAt:row.delivered_at||'',publicToken:row.public_token||'',updated_at:row.updated_at||'',updated:dateText(row.updated_at||row.created_at),created_at:row.created_at};}
  function orderPaymentState(o={}){
    const quote=Math.max(0,Number(o.quoteAmount||0)),paid=Math.max(0,Number(o.amountPaid||0)),raw=String(o.paymentStatus||'').toLowerCase();
    const paidOff=/pagado|cobrado/.test(raw)||(quote>0&&paid+0.0001>=quote);
    const partial=!paidOff&&(/abono/.test(raw)||paid>0);
    return paidOff?{key:'paid',label:'Pagado',detail:paid?`$${paid.toFixed(2)}`:''}:partial?{key:'partial',label:'Abono parcial',detail:paid?`$${paid.toFixed(2)}`:''}:{key:'pending',label:'Pendiente',detail:quote>0?`$${Math.max(0,quote-paid).toFixed(2)}`:''};
  }
  function paymentBadgeHtml(o={}){const p=orderPaymentState(o);return `<span class="support-payment-badge ${p.key}"><i>${p.key==='paid'?'✓':p.key==='partial'?'◐':'$'}</i><span>${esc(p.label)}</span>${p.detail?`<small>${esc(p.detail)}</small>`:''}</span>`}
  function orderClientName(o={}){
    const m=o.clientMeta||o.checklist?.__client||{};
    return String(o.client||o.client_name||m.name||m.full_name||m.customer_name||o.signatures?.client||'').trim()||'Cliente';
  }
  async function supportSecureAction(payload={}){
    const {data:{session:sb}}=await supabaseClient.auth.getSession();
    const token=sb?.access_token||'';
    if(!token)throw new Error('Tu sesión de Soporte expiró. Vuelve a iniciar sesión.');
    // Operaciones seguras (R2, correo y previews) NO deben pasar por la cola offline.
    // Si fallan, mostramos el error real para no dejar falsos "cambios por sincronizar".
    const nativeFetch=window.ThinkStoreOffline?.nativeFetch||window.fetch.bind(window);
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),45000);
    let res;
    try{res=await nativeFetch('/.netlify/functions/support-actions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload),cache:'no-store',signal:controller.signal});}
    catch(error){if(error?.name==='AbortError')throw new Error('La operación tardó demasiado. Revisa la conexión e inténtalo nuevamente.');throw error}
    finally{clearTimeout(timer)}
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok)throw new Error(data.error||`No se pudo completar la operación segura de Soporte (${res.status}).`);
    return data;
  }

  async function supportR2Upload(payload={}){
    const {data:{session:sb}}=await supabaseClient.auth.getSession();
    const token=sb?.access_token||'';
    if(!token)throw new Error('Tu sesión de Servicio Técnico expiró. Vuelve a iniciar sesión.');
    const nativeFetch=window.ThinkStoreOffline?.nativeFetch||window.fetch.bind(window);
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);
    let res;
    try{res=await nativeFetch('/.netlify/functions/support-r2-upload',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload),cache:'no-store',signal:controller.signal});}
    catch(error){if(error?.name==='AbortError')throw new Error('La imagen tardó demasiado en subir. Revisa la conexión e inténtalo nuevamente.');throw error}
    finally{clearTimeout(timer)}
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok){const extra=data?.details?` · ${String(data.details).slice(0,180)}`:'';throw new Error((data?.error||`No se pudo subir la imagen (${res.status})`)+extra)}
    return data;
  }


  function cleanClientSearchValue(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
  function clientPhoneDigits(value){return String(value||'').replace(/\D/g,'')}
  function clientDirectoryKeys(c={}){
    const keys=[];
    const doc=cleanClientSearchValue(c.document).replace(/\s/g,''),email=cleanClientSearchValue(c.email),phone=clientPhoneDigits(c.phone);
    if(doc)keys.push('doc:'+doc);if(email)keys.push('mail:'+email);if(phone)keys.push('phone:'+phone);
    if(!keys.length&&cleanClientSearchValue(c.name))keys.push('name:'+cleanClientSearchValue(c.name));
    return keys;
  }
  function supportClientFromRegistered(row={}){
    const document=row.cedula_rif||row.document||row.cedula||row.rif||'';
    const company=row.empresa||row.company||row.razon_social||'';
    return{
      source:'Cuenta ThinkStore',sourceRank:2,sourceRegistered:true,sourceSupport:false,
      name:row.nombre||row.name||row.full_name||'Cliente',
      phone:row.telefono||row.phone||'',phone_alt:row.telefono_alterno||row.phone_alt||'',
      email:row.correo||row.email||'',document,company,
      address_short:row.direccion||row.address||'',city:row.ciudad||row.city||'',state:row.estado||row.state||'',
      type:(company||/^[JEG]-?/i.test(String(document)))?'Empresa':'Particular',contact_method:row.contact_method||'WhatsApp',
      created_at:row.created_at||'',last_used_at:row.updated_at||row.created_at||'',registered_id:row.id||''
    };
  }
  function supportClientFromOrder(order={}){
    const m=order.clientMeta||{};
    return{
      source:'Servicio Técnico',sourceRank:1,sourceRegistered:false,sourceSupport:true,
      name:order.client||'Cliente',phone:order.phone||'',phone_alt:m.phone_alt||'',email:order.email||'',document:m.document||'',
      company:m.company||'',address_short:m.address_short||'',city:m.city||'',state:m.state||'',type:m.type||'Particular',contact_method:m.contact_method||'WhatsApp',
      created_at:order.created_at||'',last_used_at:order.updated_at||order.created_at||'',last_order_code:order.code||'',last_device:order.device||''
    };
  }
  function mergeDirectoryClient(existing,incoming){
    if(!existing)return {...incoming};
    const preferIncoming=Number(incoming.sourceRank||0)>=Number(existing.sourceRank||0),out={...existing};
    const fields=['name','phone','phone_alt','email','document','company','address_short','city','state','type','contact_method','registered_id'];
    fields.forEach(k=>{if(preferIncoming&&String(incoming[k]??'').trim())out[k]=incoming[k];else if(!String(out[k]??'').trim()&&String(incoming[k]??'').trim())out[k]=incoming[k]});
    out.sourceRegistered=Boolean(existing.sourceRegistered||incoming.sourceRegistered);out.sourceSupport=Boolean(existing.sourceSupport||incoming.sourceSupport);
    out.source=out.sourceRegistered&&out.sourceSupport?'Cuenta ThinkStore + Soporte':out.sourceRegistered?'Cuenta ThinkStore':'Servicio Técnico';
    out.sourceRank=Math.max(Number(existing.sourceRank||0),Number(incoming.sourceRank||0));
    if(!out.last_order_code&&incoming.last_order_code)out.last_order_code=incoming.last_order_code;
    if(!out.last_device&&incoming.last_device)out.last_device=incoming.last_device;
    const a=new Date(existing.last_used_at||0).getTime()||0,b=new Date(incoming.last_used_at||0).getTime()||0;if(b>a)out.last_used_at=incoming.last_used_at;
    return out;
  }
  function refreshReceptionClientDirectory(){
    const merged=[],aliases=new Map();
    const addClient=c=>{
      const keys=clientDirectoryKeys(c);if(!keys.length)return;
      let idx=keys.map(k=>aliases.get(k)).find(v=>Number.isInteger(v));
      if(!Number.isInteger(idx)){idx=merged.length;merged.push({...c})}else merged[idx]=mergeDirectoryClient(merged[idx],c);
      clientDirectoryKeys(merged[idx]).forEach(k=>aliases.set(k,idx));
    };
    orders.forEach(order=>addClient(supportClientFromOrder(order)));
    registeredClients.forEach(row=>addClient(supportClientFromRegistered(row)));
    receptionClientDirectoryCache=merged.sort((a,b)=>{const ra=Number(a.sourceRegistered||0),rb=Number(b.sourceRegistered||0);if(rb!==ra)return rb-ra;return (new Date(b.last_used_at||0).getTime()||0)-(new Date(a.last_used_at||0).getTime()||0)}).map((c,i)=>({...c,lookupId:'client-'+i}));
    return receptionClientDirectoryCache;
  }
  async function loadRegisteredClients(force=false){
    if(registeredClientsLoaded&&!force)return registeredClients;
    try{
      const {data:{session:sbSession}}=await supabaseClient.auth.getSession();
      const token=sbSession?.access_token||'';
      if(!token)throw new Error('Sesión de Soporte no disponible');
      const endpoint='https://thinkstore.com.ve/.netlify/functions/support-client-directory';
      const res=await fetch(endpoint,{method:'GET',headers:{Authorization:`Bearer ${token}`,Accept:'application/json'}});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data.ok)throw new Error(data.error||'No se pudo consultar el CRM principal');
      registeredClients=Array.isArray(data.clients)?data.clients:[];
      registeredClientsLoaded=true;
    }catch(error){
      console.warn('Directorio de clientes ThinkStore:',error?.message||error);
      registeredClients=[];
      registeredClientsLoaded=false;
    }
    return registeredClients;
  }
  function receptionClientSourceLabel(c={}){return c.sourceRegistered&&c.sourceSupport?'Registrado · historial de soporte':c.sourceRegistered?'Cliente registrado':'Cliente de Servicio Técnico'}
  function renderReceptionClientSelected(c=null){
    const box=document.getElementById('receptionClientSelected');if(!box)return;
    if(!c){box.hidden=true;box.innerHTML='';return}
    box.hidden=false;box.innerHTML=`<div><span class="reception-client-check">✓</span><div><b>${esc(c.name||'Cliente')}</b><small>${esc(receptionClientSourceLabel(c))}${c.phone?' · '+esc(c.phone):''}${c.email?' · '+esc(c.email):''}</small></div></div><button type="button" onclick="TSService.openReceptionClientSearch()">Cambiar</button>`;
  }
  function renderReceptionClientResults(query=''){
    const host=document.getElementById('receptionClientResults'),status=document.getElementById('receptionClientSearchStatus');if(!host)return;
    const q=cleanClientSearchValue(query),digits=clientPhoneDigits(query);let rows=refreshReceptionClientDirectory();
    if(q||digits){rows=rows.filter(c=>{const hay=cleanClientSearchValue([c.name,c.email,c.document,c.company,c.city,c.state,c.last_order_code,c.last_device].join(' ')),phones=clientPhoneDigits([c.phone,c.phone_alt].join(' '));return (q&&hay.includes(q))||(digits&&phones.includes(digits))})}
    rows=rows.slice(0,12);
    if(status)status.textContent=`${receptionClientDirectoryCache.length} cliente${receptionClientDirectoryCache.length===1?'':'s'} disponible${receptionClientDirectoryCache.length===1?'':'s'}${registeredClients.length?' · '+registeredClients.length+' cuenta(s) registrada(s)':''}`;
    host.innerHTML=rows.length?rows.map(c=>`<button type="button" class="reception-client-result" onclick="TSService.selectReceptionClient('${c.lookupId}')"><span class="reception-client-avatar">${esc(String(c.name||'C').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'C')}</span><span class="reception-client-result-main"><b>${esc(c.name||'Cliente')}</b><small>${esc([c.document,c.phone,c.email].filter(Boolean).join(' · ')||'Sin datos de contacto')}</small><em>${esc(receptionClientSourceLabel(c))}${c.last_order_code?' · Última orden '+esc(c.last_order_code):''}${c.last_device?' · '+esc(c.last_device):''}</em></span><span class="reception-client-result-arrow">›</span></button>`).join(''):`<div class="reception-client-empty"><b>No encontré coincidencias.</b><span>Puedes agregar al cliente como nuevo y quedará disponible después de guardar esta orden.</span></div>`;
  }
  async function openReceptionClientSearch(){
    const panel=document.getElementById('receptionClientSearchPanel');if(!panel)return;
    panel.hidden=false;const input=document.getElementById('receptionClientSearchInput');if(input)input.value='';
    renderReceptionClientResults('');
    if(!registeredClientsLoaded){await loadRegisteredClients();renderReceptionClientResults('')}
    setTimeout(()=>input?.focus(),80);
  }
  function closeReceptionClientSearch(){const panel=document.getElementById('receptionClientSearchPanel');if(panel)panel.hidden=true}
  function searchReceptionClients(value){renderReceptionClientResults(value)}
  function selectReceptionClient(lookupId){
    const c=receptionClientDirectoryCache.find(x=>x.lookupId===lookupId);if(!c)return;
    selectedReceptionClientId=lookupId;
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value??''};
    set('oClient',c.name||'');set('oPhone',c.phone||'');set('oEmail',c.email||'');
    applyReceptionClientMeta({type:c.type||'Particular',document:c.document||'',phone_alt:c.phone_alt||'',company:c.company||'',address_short:c.address_short||'',city:c.city||'',state:c.state||'',contact_method:c.contact_method||'WhatsApp'});
    set('sigClientName',c.name||'');renderReceptionClientSelected(c);closeReceptionClientSearch();renderReceptionSummary();toast('Cliente cargado: '+(c.name||'Cliente'));
  }
  function startNewReceptionClient(){
    selectedReceptionClientId=null;
    ['oClient','oClientDocument','oPhone','oPhoneAlt','oEmail','oCompany','oAddressShort','oCity','oState','sigClientName'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
    const type=document.getElementById('oClientType');if(type)type.value='Particular';const contact=document.getElementById('oContactMethod');if(contact)contact.value='WhatsApp';
    renderReceptionClientSelected(null);closeReceptionClientSearch();renderReceptionSummary();setTimeout(()=>document.getElementById('oClient')?.focus(),80);toast('Formulario listo para un cliente nuevo');
  }
  function mapNote(row,byId){const order=byId.get(row.order_id);return{id:row.id,orderId:row.order_id,orderCode:order?.code||'Sin orden',type:row.note_type||'Seguimiento',author:row.author_name||'Soporte ThinkStore',status:row.status_after||order?.status||'',detail:row.note||'',files:row.attachments||'',visibility:row.visibility||'internal',clientTitle:row.client_title||'',diagnosis:row.diagnosis||'',workPerformed:row.work_performed||'',partsUsed:row.parts_used||'',testsPerformed:row.tests_performed||'',clientNotes:row.client_notes||'',created:dateText(row.created_at),created_at:row.created_at};}

  function clientVisibleNotesForOrder(orderId){
    return bitacora.filter(n=>String(n.orderId)===String(orderId)&&n.visibility==='client').sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  }
  function clientNoteHtml(n){
    const blocks=[['Diagnóstico',n.diagnosis],['Trabajo realizado',n.workPerformed],['Repuestos / piezas',n.partsUsed],['Pruebas realizadas',n.testsPerformed],['Observaciones para el cliente',n.clientNotes]].filter(([,v])=>String(v||'').trim());
    return `<article class="client-note-card"><div class="client-note-head"><div><span>${esc(n.type||'Actualización')}</span><b>${esc(n.clientTitle||n.status||'Actualización de servicio')}</b></div><small>${esc(n.created)} · ${esc(n.author||'ThinkStore')}</small></div>${n.detail?`<p class="client-note-summary">${esc(n.detail)}</p>`:''}${blocks.length?`<div class="client-note-grid">${blocks.map(([k,v])=>`<div><span>${esc(k)}</span><p>${esc(v)}</p></div>`).join('')}</div>`:''}</article>`;
  }

  function relevantSupportAlerts(rows=[]){
    if(!session)return [];
    if(['superadmin','admin','reception','sales'].includes(session.role))return rows;
    return rows.filter(a=>!a.assigned_to_email||String(a.assigned_to_email).toLowerCase()===String(session.email||'').toLowerCase());
  }
  function notificationMeta(type='general'){
    const map={
      appointment_new:{label:'CITA WEB',icon:'◷',className:'appointment'},
      appointment_updated:{label:'CITA ACTUALIZADA',icon:'◷',className:'appointment'},
      client_message:{label:'MENSAJE DEL CLIENTE',icon:'✉',className:'message'},
      client_review:{label:'RESEÑA',icon:'★',className:'review'},
      quote_approved:{label:'COTIZACIÓN APROBADA',icon:'✓',className:'approved'},
      order_ready:{label:'LISTO PARA ENTREGAR',icon:'✓',className:'ready'},
      order_status:{label:'CAMBIO DE ESTADO',icon:'↻',className:'status'}
    };
    return map[type]||{label:'NOTIFICACIÓN',icon:'●',className:'general'};
  }
  function notificationPresentation(row={}){
    const meta=(row&&row.metadata&&typeof row.metadata==='object')?row.metadata:{};
    const rawTitle=String(row.title||'Actualización').trim();
    const rawMessage=String(row.message||'').trim();
    const linkedOrder=row.order_id?orders.find(o=>String(o.id)===String(row.order_id)):null;
    const linkedAppointment=row.appointment_id?serviceAppointments.find(a=>String(a.id)===String(row.appointment_id)):null;
    const orderFromTitle=(rawTitle.match(/TS-SVC-\d{4}-\d+/i)||[])[0]||'';
    const orderCode=String(meta.order_code||orderFromTitle||linkedOrder?.code||'').trim();
    const clientName=String(meta.client_name||meta.customer_name||linkedOrder?.client||linkedAppointment?.client_name||'').trim();
    const deviceModel=String(meta.device_model||meta.device||linkedOrder?.device||linkedAppointment?.device_model||'').trim();
    let title=rawTitle;
    let message=rawMessage;
    if(orderCode){
      title=title.replace(new RegExp('\\s*[·|-]\\s*'+orderCode.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')+'\\s*$','i'),'').trim();
    }
    if(clientName&&deviceModel&&message){
      const prefix=`${clientName} · ${deviceModel} · `;
      if(message.toLowerCase().startsWith(prefix.toLowerCase())) message=message.slice(prefix.length).trim();
    }else if(clientName&&message){
      const prefix=`${clientName} · `;
      if(message.toLowerCase().startsWith(prefix.toLowerCase())) message=message.slice(prefix.length).trim();
    }
    return{title:title||'Actualización',message,orderCode,clientName,deviceModel};
  }
  function updateNotificationBadge(){
    const count=supportAlerts.length;
    const badge=document.getElementById('supportNotificationBadge');
    if(badge){badge.textContent=count>99?'99+':String(count);badge.hidden=count===0}
    const btn=document.getElementById('supportNotificationButton');
    if(btn)btn.classList.toggle('has-unread',count>0);
    document.querySelectorAll('#roleMenu .support-menu-count').forEach(el=>{el.textContent=count;el.hidden=count===0});
  }
  function renderSupportAlerts(){
    updateNotificationBadge();
    let host=document.getElementById('supportAlertCenter');
    if(!supportAlerts.length){if(host)host.remove();return}
    if(!host){host=document.createElement('div');host.id='supportAlertCenter';document.body.appendChild(host)}
    host.className='support-alert-center';
    host.innerHTML=`<div class="support-alert-head"><div><span>ACTIVIDAD RECIENTE</span><b>${supportAlerts.length} sin leer</b></div><div class="support-alert-head-actions"><button type="button" onclick="TSService.renderPanel('notifications')">Ver todas</button><button type="button" onclick="document.getElementById('supportAlertCenter')?.classList.toggle('collapsed')">—</button></div></div>
      <div class="support-alert-list">${supportAlerts.slice(0,6).map(a=>{const m=notificationMeta(a.event_type),p=notificationPresentation(a);return `<article class="support-alert-card ${m.className}"><i>${m.icon}</i><div class="support-alert-copy"><div class="support-alert-kicker"><span>${m.label}</span>${p.orderCode?`<strong>${esc(p.orderCode)}</strong>`:''}</div><b>${esc(p.title)}</b>${p.clientName?`<small class="support-alert-client">${esc(p.clientName)}${p.deviceModel?` · ${esc(p.deviceModel)}`:''}</small>`:''}<p>${esc(p.message||'')}</p><small>${dateText(a.created_at)}</small></div><button type="button" onclick="TSService.openSupportNotification('${esc(a.id)}','${esc(a.entity_type||'')}','${esc(a.entity_id||'')}','${esc(a.order_id||'')}','${esc(a.appointment_id||'')}')">Abrir</button></article>`}).join('')}</div>`;
  }
  async function loadSupportAlerts(silent=true){
    if(!session)return;
    const {data,error}=await supabaseClient.from('support_notifications').select('*').is('read_at',null).order('created_at',{ascending:false}).limit(80);
    if(error){if(!silent)console.warn('Notificaciones:',error.message);return}
    const next=relevantSupportAlerts(data||[]);
    const fresh=next.filter(a=>!seenSupportAlertIds.has(a.id));
    next.forEach(a=>seenSupportAlertIds.add(a.id));
    supportAlerts=next;
    renderSupportAlerts();
    if(fresh.length)toast(fresh[0].title||'Nueva notificación de soporte','ok');
  }
  async function markNotificationRead(id){
    if(!id)return;
    await supabaseClient.from('support_notifications').update({read_at:new Date().toISOString()}).eq('id',id);
    supportAlerts=supportAlerts.filter(a=>String(a.id)!==String(id));
    renderSupportAlerts();
  }
  async function openSupportNotification(id,entityType='',entityId='',orderId='',appointmentId=''){
    await markNotificationRead(id);
    if(orderId){await openOrderManager(orderId);return}
    if(entityType==='appointment'||appointmentId){await renderPanel('appointments');return}
    await renderPanel('notifications');
  }
  async function markAllNotificationsRead(){
    const ids=supportAlerts.map(a=>a.id);
    if(!ids.length)return;
    const {error}=await supabaseClient.from('support_notifications').update({read_at:new Date().toISOString()}).in('id',ids);
    if(error)return toast('No se pudieron marcar como leídas: '+error.message,'error');
    supportAlerts=[];renderSupportAlerts();await renderPanel('notifications');toast('Notificaciones marcadas como leídas.');
  }
  function notificationMatchesFilter(row){
    if(notificationFilter==='all')return true;
    if(notificationFilter==='appointments')return String(row.event_type||'').startsWith('appointment_');
    if(notificationFilter==='messages')return row.event_type==='client_message';
    if(notificationFilter==='reviews')return row.event_type==='client_review';
    if(notificationFilter==='quotes')return row.event_type==='quote_approved';
    if(notificationFilter==='status')return ['order_status','order_ready'].includes(row.event_type);
    return true;
  }
  async function setNotificationFilter(value){notificationFilter=value||'all';await renderPanel('notifications')}
  let notificationClientGroups=new Map();
  function notificationClientInitials(name='Cliente'){
    return String(name||'Cliente').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('')||'CL';
  }
  function notificationGroupKey(row){
    const p=notificationPresentation(row);
    if(row.order_id)return `order:${row.order_id}`;
    if(row.appointment_id)return `appointment:${row.appointment_id}`;
    if(p.clientName)return `client:${p.clientName.toLowerCase()}`;
    return `event:${row.id}`;
  }
  function notificationGroupDomId(key=''){
    let hash=0;for(let i=0;i<key.length;i++)hash=((hash<<5)-hash)+key.charCodeAt(i)|0;
    return 'ng-'+Math.abs(hash);
  }
  function buildNotificationClientGroups(rows=[]){
    const groups=new Map();
    rows.forEach(row=>{
      const key=notificationGroupKey(row),p=notificationPresentation(row);
      if(!groups.has(key))groups.set(key,{key,rows:[],orderId:row.order_id||'',appointmentId:row.appointment_id||'',clientName:p.clientName||'Cliente',deviceModel:p.deviceModel||'',orderCode:p.orderCode||'',lastAt:row.created_at||'',unread:0});
      const g=groups.get(key);g.rows.push(row);
      if(!g.orderId&&row.order_id)g.orderId=row.order_id;
      if(!g.appointmentId&&row.appointment_id)g.appointmentId=row.appointment_id;
      if((!g.clientName||g.clientName==='Cliente')&&p.clientName)g.clientName=p.clientName;
      if(!g.deviceModel&&p.deviceModel)g.deviceModel=p.deviceModel;
      if(!g.orderCode&&p.orderCode)g.orderCode=p.orderCode;
      if(!g.lastAt||new Date(row.created_at||0)>new Date(g.lastAt||0))g.lastAt=row.created_at||g.lastAt;
      if(!row.read_at)g.unread++;
    });
    const list=[...groups.values()];
    list.forEach(g=>g.rows.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)));
    list.sort((a,b)=>new Date(b.lastAt||0)-new Date(a.lastAt||0));
    notificationClientGroups=new Map(list.map(g=>[g.key,g]));
    return list;
  }
  function notificationGroupPreview(group){
    const latest=group.rows[0]||{},p=notificationPresentation(latest);
    if(latest.event_type==='client_message')return p.message||p.title||'Nuevo mensaje del cliente';
    return p.message||p.title||'Actividad reciente';
  }
  async function markNotificationGroupRead(group){
    const unreadIds=(group?.rows||[]).filter(x=>!x.read_at).map(x=>x.id);
    if(!unreadIds.length)return;
    const now=new Date().toISOString();
    const {error}=await supabaseClient.from('support_notifications').update({read_at:now}).in('id',unreadIds);
    if(error){console.warn('No se pudo marcar la conversación como leída:',error.message);return}
    group.rows.forEach(x=>{if(unreadIds.some(id=>String(id)===String(x.id)))x.read_at=now});group.unread=0;
    supportAlerts=supportAlerts.filter(a=>!unreadIds.some(id=>String(id)===String(a.id)));renderSupportAlerts();
  }
  function notificationActivityHtml(group){
    return `<div class="notification-group-activity"><div class="notification-thread-subhead"><b>Actividad de la orden</b><small>${group.rows.length} evento${group.rows.length===1?'':'s'}</small></div>${group.rows.slice(0,12).map(row=>{const m=notificationMeta(row.event_type),p=notificationPresentation(row);return `<div class="notification-activity-row"><span class="notification-activity-icon">${m.icon}</span><div><b>${esc(m.label)}</b><p>${esc(p.message||p.title||'Actualización')}</p><small>${dateText(row.created_at)}</small></div></div>`}).join('')}</div>`;
  }
  async function toggleNotificationClientGroup(encodedKey){
    const key=decodeURIComponent(encodedKey||''),group=notificationClientGroups.get(key);if(!group)return;
    const domId=notificationGroupDomId(key),card=document.getElementById(`notificationGroup-${domId}`),thread=document.getElementById(`notificationThread-${domId}`);if(!card||!thread)return;
    const alreadyOpen=card.classList.contains('open');
    document.querySelectorAll('.notification-client-card.open').forEach(el=>{if(el!==card){el.classList.remove('open');const t=el.querySelector('.notification-client-thread');if(t)t.hidden=true}});
    if(alreadyOpen){card.classList.remove('open');thread.hidden=true;return}
    card.classList.add('open');thread.hidden=false;thread.innerHTML='<div class="notification-thread-loading">Cargando conversación…</div>';
    await markNotificationGroupRead(group);
    const badge=card.querySelector('.notification-client-unread');if(badge)badge.remove();
    if(group.orderId){
      const {data,error}=await supabaseClient.from('service_order_messages').select('*').eq('order_id',group.orderId).order('created_at',{ascending:true});
      if(error){thread.innerHTML=`<div class="notification-thread-error">No se pudo cargar el chat: ${esc(error.message)}</div>${notificationActivityHtml(group)}`;return}
      const messages=data||[];
      const chat=messages.length?`<div class="notification-thread-chat">${messages.map(m=>{const client=m.sender_type==='client';return `<div class="notification-thread-row ${client?'client':'staff'}"><div class="notification-thread-bubble">${esc(m.message)}</div><small>${esc(client?(m.sender_name||group.clientName||'Cliente'):(m.sender_name||'ThinkStore'))} · ${dateText(m.created_at)}</small></div>`}).join('')}</div>`:'<div class="notification-thread-empty">Todavía no hay mensajes en el chat de esta orden.</div>';
      thread.innerHTML=`<div class="notification-thread-head"><div><span>CONVERSACIÓN</span><b>${esc(group.clientName||'Cliente')}</b><small>${group.orderCode?esc(group.orderCode)+' · ':''}${esc(group.deviceModel||'Equipo')}</small></div><button type="button" onclick="event.stopPropagation();TSService.openNotificationOrder('${esc(group.orderId)}')">Abrir orden</button></div>${chat}${notificationActivityHtml(group)}`;
      requestAnimationFrame(()=>{const c=thread.querySelector('.notification-thread-chat');if(c)c.scrollTop=c.scrollHeight});
    }else{
      thread.innerHTML=`<div class="notification-thread-head"><div><span>ACTIVIDAD DEL CLIENTE</span><b>${esc(group.clientName||'Cliente')}</b><small>${esc(group.deviceModel||'Cita / solicitud')}</small></div></div><div class="notification-thread-empty">Esta actividad todavía no tiene una orden con chat asociado.</div>${notificationActivityHtml(group)}`;
    }
  }
  async function openNotificationOrder(orderId){if(orderId)await openOrderManager(orderId)}
  async function renderNotifications(box){
    box.innerHTML='<div class="tablewrap"><h3>Centro de notificaciones</h3><p>Cargando actividad…</p></div>';
    const {data,error}=await supabaseClient.from('support_notifications').select('*').order('created_at',{ascending:false}).limit(220);
    if(error){box.innerHTML=`<div class="tablewrap"><h3>Notificaciones</h3><div class="appointment-error"><b>No se pudieron cargar.</b><p>${esc(error.message)}</p></div></div>`;return}
    const rows=relevantSupportAlerts(data||[]),visible=rows.filter(notificationMatchesFilter),unread=rows.filter(x=>!x.read_at).length;
    const counts={appointments:rows.filter(x=>String(x.event_type||'').startsWith('appointment_')).length,messages:rows.filter(x=>x.event_type==='client_message').length,reviews:rows.filter(x=>x.event_type==='client_review').length,quotes:rows.filter(x=>x.event_type==='quote_approved').length,status:rows.filter(x=>['order_status','order_ready'].includes(x.event_type)).length};
    const chips=[['all','Todas',rows.length],['appointments','Citas',counts.appointments],['messages','Mensajes',counts.messages],['quotes','Cotizaciones',counts.quotes],['reviews','Reseñas',counts.reviews],['status','Estados',counts.status]];
    const groups=buildNotificationClientGroups(visible);
    box.innerHTML=`<div class="notifications-premium notifications-by-client"><section class="notifications-hero"><div><span class="eyebrow">BANDEJA POR CLIENTE</span><h2>Conversaciones y actividad</h2><p>Cada cliente queda agrupado en una sola conversación. Abre una burbuja para revisar su chat completo y la actividad de la orden.</p></div><div class="notifications-mail"><span>CORREO DE RESPALDO</span><b>soporte@thinkstore.com.ve</b><small>Las citas nuevas se notifican de forma instantánea.</small></div></section>
    <div class="notifications-toolbar"><div class="notification-chips">${chips.map(([v,l,c])=>`<button class="${notificationFilter===v?'active':''}" onclick="TSService.setNotificationFilter('${v}')">${l}<span>${c}</span></button>`).join('')}</div><div><button class="secondary" onclick="TSService.loadSupportAlerts(false).then(()=>TSService.renderPanel('notifications'))">Actualizar</button><button onclick="TSService.markAllNotificationsRead()" ${unread?'':'disabled'}>Marcar todo leído</button></div></div>
    <div class="notifications-summary"><div><span>Sin leer</span><b>${unread}</b></div><div><span>Clientes</span><b>${groups.length}</b></div><div><span>Mensajes</span><b>${counts.messages}</b></div><div><span>Citas</span><b>${counts.appointments}</b></div></div>
    <div class="notification-client-list">${groups.length?groups.map(group=>{const latest=group.rows[0]||{},m=notificationMeta(latest.event_type),domId=notificationGroupDomId(group.key),encoded=encodeURIComponent(group.key);return `<article id="notificationGroup-${domId}" class="notification-client-card ${group.unread?'has-unread':''}" onclick="TSService.toggleNotificationClientGroup('${encoded}')"><div class="notification-client-avatar">${esc(notificationClientInitials(group.clientName))}</div><div class="notification-client-main"><div class="notification-client-top"><div><h3>${esc(group.clientName||'Cliente')}</h3><div class="notification-client-meta">${group.orderCode?`<strong>${esc(group.orderCode)}</strong>`:''}${group.deviceModel?`<span>${esc(group.deviceModel)}</span>`:''}</div></div><div class="notification-client-side">${group.unread?`<b class="notification-client-unread">${group.unread}</b>`:''}<small>${dateText(group.lastAt)}</small></div></div><div class="notification-client-preview"><span>${m.icon}</span><p>${esc(notificationGroupPreview(group))}</p></div><div class="notification-client-foot"><span>${group.rows.length} actividad${group.rows.length===1?'':'es'}</span><button type="button" onclick="event.stopPropagation();TSService.toggleNotificationClientGroup('${encoded}')">Ver conversación</button></div></div><div id="notificationThread-${domId}" class="notification-client-thread" hidden onclick="event.stopPropagation()"></div></article>`}).join(''):'<div class="notifications-empty">No hay conversaciones en este filtro.</div>'}</div></div>`;
  }
  function startSupportAlertPolling(){
    clearInterval(supportAlertTimer);
    loadSupportAlerts(true).catch(()=>{});
    supportAlertTimer=setInterval(()=>loadSupportAlerts(true).catch(()=>{}),10000);
  }
  async function refreshExternalPaymentStates(){
    if(!session)return;
    let rows=[];
    try{
      const secure=await supportSecureAction({action:'payment_states'});
      rows=Array.isArray(secure.orders)?secure.orders:[];
    }catch(error){
      console.warn('Sincronización de pagos por servidor:',error?.message||error);
      const fallback=await supabaseClient.from('service_orders').select('id,payment_status,amount_paid,payment_method,payment_notes,paid_at,quote_amount,quote_currency,updated_at');
      if(fallback.error)return;
      rows=fallback.data||[];
    }
    let changed=false;
    for(const row of rows){
      const o=orders.find(x=>String(x.id)===String(row.id));if(!o)continue;
      const nextStatus=row.payment_status||'Pendiente',nextPaid=Number(row.amount_paid||0),nextQuote=Number(row.quote_amount||0),nextPaidAt=row.paid_at||'';
      if(String(o.paymentStatus)!==String(nextStatus)||Number(o.amountPaid)!==nextPaid||Number(o.quoteAmount)!==nextQuote||String(o.paidAt||'')!==String(nextPaidAt)){
        o.paymentStatus=nextStatus;o.amountPaid=nextPaid;o.paymentMethod=row.payment_method||'';o.paymentNotes=row.payment_notes||'';o.paidAt=nextPaidAt;o.quoteAmount=nextQuote;o.quoteCurrency=row.quote_currency||o.quoteCurrency||'USD';o.updated_at=row.updated_at||o.updated_at;o.updated=dateText(row.updated_at||o.updated_at||o.created_at);changed=true;
      }
    }
    if(changed&&['dashboard','orders','reception','technical','sales','logistics'].includes(currentPanelView)){await renderPanel(currentPanelView)}
  }
  function startSupportPaymentPolling(){
    clearInterval(supportPaymentTimer);
    refreshExternalPaymentStates().catch(()=>{});
    supportPaymentTimer=setInterval(()=>refreshExternalPaymentStates().catch(()=>{}),6000);
  }
  async function loadSupportData(){
    let orderQuery=supabaseClient.from('service_orders').select('*').order('created_at',{ascending:false});
    const techScoped=session?.role==='technician'&&String(session?.email||'').trim();
    if(techScoped)orderQuery=orderQuery.ilike('assigned_technician_email',String(session.email).trim());
    const [orderRes,noteRes,photoRes,partsRes,orderPartsRes,movementsRes,appointmentsRes]=await Promise.all([
      orderQuery,
      supabaseClient.from('service_order_notes').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('service_order_photos').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('service_parts').select('*').order('name',{ascending:true}),
      supabaseClient.from('service_order_parts').select('*').order('created_at',{ascending:false}).limit(2000),
      supabaseClient.from('service_part_movements').select('*').order('created_at',{ascending:false}).limit(300),
      supabaseClient.from('service_appointments').select('*').order('preferred_date',{ascending:true}).order('preferred_time',{ascending:true})
    ]);
    if(orderRes.error)throw new Error('No se pudieron cargar las órdenes: '+orderRes.error.message);
    if(noteRes.error)throw new Error('No se pudo cargar la bitácora: '+noteRes.error.message);
    if(photoRes.error)console.warn('No se pudieron cargar archivos:',photoRes.error.message);
    orders=(orderRes.data||[]).map(mapOrder);
    const visibleIds=new Set(orders.map(o=>String(o.id)));
    const visibleCodes=new Set(orders.map(o=>String(o.code||'').toUpperCase()));
    const byId=new Map(orders.map(o=>[o.id,o]));
    const rawNotes=noteRes.data||[];
    const rawPhotos=photoRes.data||[];
    const rawOrderParts=orderPartsRes.error?[]:(orderPartsRes.data||[]);
    const rawMovements=movementsRes.data||[];
    bitacora=(techScoped?rawNotes.filter(r=>visibleIds.has(String(r.order_id))):rawNotes).map(row=>mapNote(row,byId));
    servicePhotos=techScoped?rawPhotos.filter(r=>visibleIds.has(String(r.order_id))):rawPhotos;
    serviceParts=partsRes.data||[];
    serviceOrderParts=techScoped?rawOrderParts.filter(r=>visibleIds.has(String(r.service_order_id))||visibleCodes.has(String(r.order_code||'').toUpperCase())):rawOrderParts;
    partMovements=techScoped?rawMovements.filter(r=>visibleIds.has(String(r.service_order_id))||visibleCodes.has(String(r.order_id||r.order_code||'').toUpperCase())):rawMovements;
    serviceAppointments=techScoped?[]:(appointmentsRes.error?[]:(appointmentsRes.data||[]));
    if(orderPartsRes.error)console.warn('No se pudieron cargar repuestos preparados por orden:',orderPartsRes.error.message);
    if(appointmentsRes.error)console.warn('No se pudieron cargar citas web:',appointmentsRes.error.message);
    refreshReceptionClientDirectory();
    if(!techScoped)loadRegisteredClients().then(()=>refreshReceptionClientDirectory()).catch(()=>{});
  }
  async function audit(action,entityId,beforeData,afterData){try{await supabaseClient.from('service_audit_log').insert({actor_email:session?.email||null,actor_role:session?.role||null,action,entity_type:'service_order',entity_id:String(entityId||''),before_data:beforeData||null,after_data:afterData||null})}catch(_){}}
  function can(view){return session&&roles[session.role]?.includes(view)}
  function technicianCanAccessOrder(order){if(session?.role!=='technician')return true;return !!order&&String(order.tech||'').trim().toLowerCase()===String(session?.email||'').trim().toLowerCase()}
  function requireTechnicianOrder(order){if(technicianCanAccessOrder(order))return true;toast('Esta orden no está asignada a tu usuario.','error');return false}
  function openLogin(){document.getElementById('loginModal').classList.add('open')}
  function openClientLookup(){document.getElementById('clientLookupModal').classList.add('open')}
  function openPasswordSetup(){document.getElementById('passwordSetupModal').classList.add('open')}
  function closeModals(){stopOrderMessagePolling();document.querySelectorAll('.modal').forEach(m=>m.classList.remove('open'))}

  function supportProfileInitials(value=session?.name||session?.email||'TS'){
    const parts=String(value||'TS').trim().split(/\s+/).filter(Boolean);
    return (parts.slice(0,2).map(x=>(x[0]||'').toUpperCase()).join('')||'TS').slice(0,2);
  }
  async function refreshSupportIdentity(){
    const name=document.getElementById('supportProfileName'),role=document.getElementById('supportProfileRole');
    const fallback=document.getElementById('supportProfileAvatarFallback'),img=document.getElementById('supportProfileAvatarImage');
    const back=document.getElementById('supportBackMainTechnical');
    const initials=supportProfileInitials();
    if(name)name.textContent=session?.name||session?.email||'Usuario';
    if(role)role.textContent=roleLabels[session?.role]||session?.role||'Soporte';
    if(fallback){fallback.textContent=initials;fallback.hidden=false}
    if(img){img.hidden=true;img.removeAttribute('src')}
    if(back)back.hidden=session?.role!=='technician';
    const path=String(session?.avatarPath||'').trim();
    if(path&&navigator.onLine){
      try{
        const {data,error}=await supabaseClient.storage.from('support-profile-photos').createSignedUrl(path,3600);
        if(error)throw error;
        if(data?.signedUrl&&img){img.src=data.signedUrl;img.hidden=false;if(fallback)fallback.hidden=true}
      }catch(err){console.warn('Avatar Soporte:',err?.message||err)}
    }
  }
  function backToMainPanel(){
    const host=String(location.hostname||'').toLowerCase();
    const target=host==='support.thinkstore.com.ve'?'https://thinkstore.com.ve/panel.html':'/panel.html';
    location.assign(target);
  }
  function openProfilePhoto(){
    const modal=document.getElementById('profilePhotoModal');if(!modal)return;
    const fallback=document.getElementById('supportProfileModalFallback'),img=document.getElementById('supportProfileModalImage');
    const current=document.getElementById('supportProfileAvatarImage'),file=document.getElementById('supportProfilePhotoFile');
    if(file)file.value='';
    if(fallback){fallback.textContent=supportProfileInitials();fallback.hidden=false}
    if(img){img.hidden=true;img.removeAttribute('src')}
    if(current&&!current.hidden&&current.src&&img){img.src=current.src;img.hidden=false;if(fallback)fallback.hidden=true}
    const remove=document.getElementById('supportRemoveProfilePhoto');if(remove)remove.hidden=!String(session?.avatarPath||'').trim();
    modal.classList.add('open');
  }
  function previewProfilePhoto(input){
    const file=input?.files?.[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(String(file.type||'').toLowerCase())){toast('Usa una imagen JPG, PNG o WebP.','error');input.value='';return}
    if(file.size>8*1024*1024){toast('La foto original no puede superar 8 MB.','error');input.value='';return}
    const img=document.getElementById('supportProfileModalImage'),fallback=document.getElementById('supportProfileModalFallback');
    if(img){img.src=URL.createObjectURL(file);img.hidden=false;if(fallback)fallback.hidden=true;img.onload=()=>{try{URL.revokeObjectURL(img.src)}catch(_){}}}
  }
  async function optimizedProfileBlob(file){
    if(!file)throw new Error('Selecciona una foto.');
    if(!['image/jpeg','image/png','image/webp'].includes(String(file.type||'').toLowerCase()))throw new Error('Usa una imagen JPG, PNG o WebP.');
    if(file.size>8*1024*1024)throw new Error('La foto original no puede superar 8 MB.');
    const url=URL.createObjectURL(file);
    try{
      const source=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('No pude leer esa imagen.'));im.src=url});
      const size=640,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('No se pudo preparar la imagen.');
      const side=Math.min(source.naturalWidth||source.width,source.naturalHeight||source.height),sx=((source.naturalWidth||source.width)-side)/2,sy=((source.naturalHeight||source.height)-side)/2;
      ctx.drawImage(source,sx,sy,side,side,0,0,size,size);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.86));
      if(!blob)throw new Error('No se pudo optimizar la foto.');
      return blob;
    }finally{URL.revokeObjectURL(url)}
  }
  async function saveProfilePhoto(e){
    e?.preventDefault();
    const input=document.getElementById('supportProfilePhotoFile'),file=input?.files?.[0];
    if(!file){toast('Selecciona una foto primero.','error');return}
    const submit=e?.submitter||document.querySelector('#profilePhotoModal button[type="submit"]');if(submit)submit.disabled=true;
    try{
      const {data:{user}}=await supabaseClient.auth.getUser();if(!user?.id)throw new Error('Tu sesión de Soporte expiró.');
      const blob=await optimizedProfileBlob(file),path=`${user.id}/avatar.webp`;
      const {error:upError}=await supabaseClient.storage.from('support-profile-photos').upload(path,blob,{contentType:'image/webp',cacheControl:'3600',upsert:true});
      if(upError)throw upError;
      const {data,error}=await supabaseClient.rpc('ts_update_own_service_avatar',{p_avatar_path:path});
      if(error)throw error;
      session=canonicalizeSupportSession({...session,avatarPath:String(data||path)});localStorage.setItem('ts_service_session',JSON.stringify(session));
      closeModals();await refreshSupportIdentity();toast('Foto de perfil actualizada.');
    }catch(err){toast(err?.message||'No se pudo actualizar la foto.','error')}
    finally{if(submit)submit.disabled=false}
  }
  async function removeProfilePhoto(){
    if(!String(session?.avatarPath||'').trim()){closeModals();return}
    try{
      const path=String(session.avatarPath).trim();
      const {error}=await supabaseClient.rpc('ts_clear_own_service_avatar');if(error)throw error;
      await supabaseClient.storage.from('support-profile-photos').remove([path]).catch(()=>{});
      session=canonicalizeSupportSession({...session,avatarPath:''});localStorage.setItem('ts_service_session',JSON.stringify(session));
      closeModals();await refreshSupportIdentity();toast('Foto de perfil eliminada.');
    }catch(err){toast(err?.message||'No se pudo quitar la foto.','error')}
  }


  async function getServiceProfile(email){
    const {data,error}=await supabaseClient
      .from('service_users')
      .select('email,nombre,rol,activo,avatar_path')
      .eq('email',email.toLowerCase())
      .maybeSingle();

    if(error) throw error;
    if(!data) throw new Error('Este correo no está autorizado para soporte.');
    if(data.activo===false) throw new Error('Este usuario está desactivado.');
    if(!roles[data.rol]) throw new Error('Rol inválido o no configurado: '+data.rol);
    const canonicalName=canonicalSupportName(data.email,data.nombre);
    return {...data,nombre:canonicalName};
  }

  async function login(e){
    e.preventDefault();
    const email=document.getElementById('loginUser').value.trim().toLowerCase();
    const password=document.getElementById('loginPass').value;

    const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
    if(error){alert('Acceso no autorizado: '+error.message);return}

    try{
      const profile=await getServiceProfile(email);
      session=canonicalizeSupportSession({name:profile.nombre,role:profile.rol,email:profile.email,user:profile.email,avatarPath:profile.avatar_path||''});
      localStorage.setItem('ts_service_session',JSON.stringify(session));
      sessionStorage.setItem('ts_support_welcome_pending','1');
      closeModals();
      goToPanel();
    }catch(err){
      await supabaseClient.auth.signOut();
      localStorage.removeItem('ts_service_session');
      session=null;
      alert(err.message||'No tienes permiso para acceder a soporte.');
    }
  }

  async function saveNewPassword(e){
    e.preventDefault();
    const p1=document.getElementById('newPassword').value;
    const p2=document.getElementById('confirmPassword').value;
    const msg=document.getElementById('passwordSetupMsg');
    if(p1!==p2){msg.textContent='Las contraseñas no coinciden.';return}
    if(p1.length<8){msg.textContent='La contraseña debe tener mínimo 8 caracteres.';return}

    const {error}=await supabaseClient.auth.updateUser({password:p1});
    if(error){msg.textContent='No se pudo guardar: '+error.message;return}

    msg.textContent='Contraseña creada correctamente. Iniciando panel...';
    const {data:{user}}=await supabaseClient.auth.getUser();
    if(user?.email){
      try{
        const profile=await getServiceProfile(user.email);
        session=canonicalizeSupportSession({name:profile.nombre,role:profile.rol,email:profile.email,user:profile.email,avatarPath:profile.avatar_path||''});
        localStorage.setItem('ts_service_session',JSON.stringify(session));
        sessionStorage.setItem('ts_support_welcome_pending','1');
        history.replaceState(null,'',location.pathname);
        closeModals();
        goToPanel();
      }catch(err){
        msg.textContent=err.message||'Contraseña creada, pero el correo no está autorizado en service_users.';
      }
    }
  }

  async function logout(){
    await supabaseClient.auth.signOut();
    localStorage.removeItem('ts_service_session');
    session=null;
    clearInterval(supportAlertTimer);supportAlertTimer=null;clearInterval(supportPaymentTimer);supportPaymentTimer=null;supportAlerts=[];renderSupportAlerts();
    const dash=document.getElementById('roleDashboard');
    if(dash) dash.classList.add('hidden');
    location.href='index.html';
  }

  function menuItems(){return[
    {id:'dashboard',label:'Dashboard',icon:'dashboard',group:'Resumen'},
    {id:'notifications',label:'Notificaciones',icon:'notifications',group:'Resumen'},
    {id:'appointments',label:'Citas web',icon:'appointments',group:'Operación'},
    {id:'orders',label:'Órdenes de servicio',icon:'orders',group:'Operación'},
    {id:'reception',label:'Recepción',icon:'reception',group:'Operación'},
    {id:'technical',label:'Área técnica',icon:'technical',group:'Operación'},
    {id:'bitacora',label:'Bitácora',icon:'bitacora',group:'Operación'},
    {id:'parts',label:'Inventario de repuestos',icon:'parts',group:'Gestión'},
    {id:'sales',label:'Ventas / cotizaciones',icon:'sales',group:'Gestión'},
    {id:'logistics',label:'Logística',icon:'logistics',group:'Gestión'},
    {id:'clients',label:'Clientes',icon:'clients',group:'Gestión'},
    {id:'users',label:'Usuarios y roles',icon:'users',group:'Administración'},
    {id:'permissions',label:'Permisos',icon:'permissions',group:'Administración'},
    {id:'reports',label:'Reportes',icon:'reports',group:'Administración'}
  ].filter(i=>can(i.id))}

  function renderRoleMenu(){
    const nav=document.getElementById('roleMenu');
    if(!nav)return;
    const items=menuItems();
    let lastGroup='';
    nav.innerHTML=items.map(i=>{
      const group=i.group!==lastGroup?`<span class="nav-group-label">${i.group}</span>`:'';
      lastGroup=i.group;
      return `${group}<button type="button" class="support-nav-btn" data-view="${i.id}" onclick="TSService.renderPanel('${i.id}')"><span class="support-nav-icon" aria-hidden="true">${supportIcon(i.icon)}</span><span>${i.label}</span>${i.id==='notifications'?`<small class="support-menu-count" ${supportAlerts.length?'':'hidden'}>${supportAlerts.length}</small>`:''}</button>`;
    }).join('');
  }

  function supportGreeting(){
    try{
      const parts=new Intl.DateTimeFormat('es-VE',{timeZone:'America/Caracas',hour:'2-digit',hour12:false}).formatToParts(new Date());
      const hour=Number(parts.find(x=>x.type==='hour')?.value||12);
      return hour<12?'Buenos días':hour<19?'Buenas tardes':'Buenas noches';
    }catch{
      const hour=new Date().getHours();return hour<12?'Buenos días':hour<19?'Buenas tardes':'Buenas noches';
    }
  }
  function showSupportWelcome(){
    if(sessionStorage.getItem('ts_support_welcome_pending')!=='1'||!session)return;
    sessionStorage.removeItem('ts_support_welcome_pending');
    const host=document.getElementById('supportWelcome');if(!host)return;
    const title=document.getElementById('supportWelcomeTitle'),role=document.getElementById('supportWelcomeRole');
    const first=String(session.name||session.nombre||session.email||'').trim().split(/\s+/)[0]||'';
    if(title)title.textContent=`${supportGreeting()}, ${first}`;
    if(role)role.textContent=`${roleLabels[session.role]||session.role||'Soporte'} · Tu espacio de trabajo está listo`;
    host.hidden=false;requestAnimationFrame(()=>host.classList.add('show'));
    setTimeout(()=>{host.classList.remove('show');setTimeout(()=>{host.hidden=true},320)},1800);
  }

  async function renderApp(){
    if(!session)return;
    const dash=document.getElementById('roleDashboard');
    const nav=document.getElementById('roleMenu');
    if(!dash||!nav)return;
    renderRoleMenu();
    await refreshSupportIdentity();
    const box=document.getElementById('panelContent');if(box)box.innerHTML='<div class="notice">Cargando datos reales de soporte…</div>';
    try{await loadSupportData();await renderPanel('dashboard');startSupportAlertPolling();startSupportPaymentPolling()}catch(error){if(box)box.innerHTML=`<div class="tablewrap"><h3>No se pudo cargar Soporte</h3><p>${error.message||error}</p><p>Ejecuta supabase_soporte_produccion.sql en el proyecto de soporte.</p></div>`}
    dash.classList.remove('hidden');
    showSupportWelcome();
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        document.body.classList.add('support-panel-ready');
        const loader=document.getElementById('supportPanelLoader');
        if(loader){loader.classList.add('done');setTimeout(()=>loader.remove(),520);}
      });
    });
  }

  function stats(){return{total:orders.length,received:orders.filter(o=>o.status==='Recibido').length,diagnosis:orders.filter(o=>['En diagnóstico','Diagnóstico disponible'].includes(o.status)).length,ready:orders.filter(o=>o.status==='Listo para entregar').length}}

  async function loadServiceUsers(){
    const {data,error}=await supabaseClient.from('service_users').select('email,nombre,rol,activo,avatar_path,created_at').order('created_at',{ascending:false});
    if(error){return []}
    serviceUsers=data||[];
    return serviceUsers;
  }


  const CARACAS_TZ='America/Caracas';
  function caracasKey(value=new Date()){
    const d=value instanceof Date?value:new Date(value||'');
    if(Number.isNaN(d.getTime()))return '';
    try{return new Intl.DateTimeFormat('en-CA',{timeZone:CARACAS_TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}catch{return d.toISOString().slice(0,10)}
  }
  function weekKeysCaracas(){
    const today=caracasKey(new Date()),anchor=new Date(today+'T12:00:00-04:00'),shift=(anchor.getDay()+6)%7;
    const monday=new Date(anchor);monday.setDate(monday.getDate()-shift);
    return Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);return caracasKey(d)});
  }
  function isCancelledService(o){return /cancel|no aprobado|rechaz/i.test(String(o?.status||''))}
  function isCollectedService(o){return Number(o?.amountPaid||0)>0||/cobrado|pagado/i.test(String(o?.paymentStatus||''))}
  function servicePendingAmount(o){
    if(isCancelledService(o))return 0;
    return Math.max(0,Number(o?.quoteAmount||0)-Number(o?.amountPaid||0));
  }
  function servicePaymentDate(o){return o?.paidAt||(/cobrado|pagado|abono/i.test(String(o?.paymentStatus||''))?o?.updated_at:'')||''}
  function serviceDeliveredDate(o){return o?.deliveredAt||(/entregado/i.test(String(o?.status||''))?o?.updated_at:'')||''}
  function serviceAtHome(o){
    const raw=[o?.serviceMode,o?.deliveryMethod,o?.technicalNotes].join(' ').toLowerCase();
    return /domicilio|delivery|a casa|home/.test(raw);
  }
  function serviceDashboardSnapshot(){
    const keys=weekKeysCaracas(),today=keys.find(k=>k===caracasKey(new Date()))||caracasKey(new Date()),weekSet=new Set(keys);
    const weekReceived=orders.filter(o=>weekSet.has(caracasKey(o.created_at)));
    const weekCollected=orders.filter(o=>isCollectedService(o)&&weekSet.has(caracasKey(servicePaymentDate(o))));
    const weekDelivered=orders.filter(o=>/entregado/i.test(o.status)&&weekSet.has(caracasKey(serviceDeliveredDate(o))));
    const weekAppointments=(serviceAppointments||[]).filter(a=>weekSet.has(String(a.preferred_date||caracasKey(a.created_at))));
    const paidAmount=weekCollected.reduce((n,o)=>n+Number(o.amountPaid||0),0);
    const pendingAmount=weekReceived.reduce((n,o)=>n+servicePendingAmount(o),0);
    const ready=weekReceived.filter(o=>/listo para entregar|listo/i.test(o.status)).length;
    const toDeliver=weekReceived.filter(o=>!isCancelledService(o)&&!/entregado/i.test(o.status)).length;
    const atHome=weekReceived.filter(serviceAtHome).length;
    const apptHome=weekAppointments.filter(a=>/domicilio|delivery|a casa|home/i.test(String(a.service_mode||''))).length;
    const daily=keys.map(key=>{
      const recv=orders.filter(o=>caracasKey(o.created_at)===key);
      const paid=orders.filter(o=>isCollectedService(o)&&caracasKey(servicePaymentDate(o))===key);
      const del=orders.filter(o=>/entregado/i.test(o.status)&&caracasKey(serviceDeliveredDate(o))===key);
      const appts=(serviceAppointments||[]).filter(a=>String(a.preferred_date||caracasKey(a.created_at))===key);
      return{key,received:recv.length,collected:paid.reduce((n,o)=>n+Number(o.amountPaid||0),0),paid_count:paid.length,delivered:del.length,appointments:appts.length,home:recv.filter(serviceAtHome).length};
    });
    const todayRow=daily.find(x=>x.key===today)||{received:0,collected:0,paid_count:0,delivered:0,appointments:0,home:0};
    return{
      keys,today,todayRow,
      week:{received:weekReceived.length,collected_count:weekCollected.length,collected_amount:paidAmount,pending_count:weekReceived.filter(o=>servicePendingAmount(o)>0).length,pending_amount:pendingAmount,ready,delivered:weekDelivered.length,to_deliver:toDeliver,appointments:weekAppointments.length,home_services:atHome,home_appointments:apptHome},
      split:{company:paidAmount*.50,partner_a:paidAmount*.25,partner_b:paidAmount*.25},
      daily,
      financeReady:orders.length===0||orders.every(o=>o.paymentReady)
    };
  }
  function shortDayLabel(key){
    try{return new Date(key+'T12:00:00-04:00').toLocaleDateString('es-VE',{weekday:'short',day:'2-digit',month:'short'})}catch{return key}
  }

  async function renderPanel(view){
    if(!can(view)){alert('Tu rol no tiene permiso para esta sección');return}
    currentPanelView=view;
    document.querySelectorAll('#roleMenu .support-nav-btn').forEach(btn=>{
      const active=btn.dataset.view===view;
      btn.classList.toggle('active',active);
      if(active)btn.setAttribute('aria-current','page'); else btn.removeAttribute('aria-current');
    });
    const title=document.getElementById('panelTitle');
    const box=document.getElementById('panelContent');
    box?.classList.remove('dashboard-high-contrast','notifications-client-view');
    if(view==='dashboard')box?.classList.add('dashboard-high-contrast');
    if(view==='notifications')box?.classList.add('notifications-client-view');
    const s=stats();
    const titles={dashboard:'Dashboard',notifications:'Notificaciones',appointments:'Citas web',orders:'Órdenes de servicio',reception:'Recepción de equipos',technical:'Área técnica',bitacora:'Bitácora técnica',parts:'Inventario de repuestos',sales:'Ventas y cotizaciones',logistics:'Logística',clients:'Clientes',users:'Usuarios y roles',permissions:'Permisos',reports:'Reportes'};
    title.textContent=titles[view]||'Panel';

    if(view==='dashboard'&&session?.role==='technician'){
      const repaired=orders.filter(o=>/listo para entregar|entregado|reparado|completado|finalizado/i.test(o.status)).length;
      const notRepaired=orders.filter(o=>/no reparado|irreparable|no reparable/i.test(o.status)).length;
      const approved=orders.filter(o=>o.quoteApprovedAt||/aprobado/i.test(o.quote)||/aprobado por cliente/i.test(o.status)).length;
      const notApproved=orders.filter(o=>/no aprobado|rechazado|rechaz/i.test(`${o.quote} ${o.status}`)).length;
      const paid=orders.filter(o=>orderPaymentState(o).key==='paid');
      const open=orders.filter(o=>!/entregado|cancelado|no aprobado|no reparado/i.test(o.status)).length;
      const reservedParts=serviceOrderParts.filter(r=>r.status==='reserved').reduce((n,r)=>n+Number(r.quantity_reserved||r.quantity||0),0);
      const recent=orders.slice(0,8);
      box.innerHTML=`<section class="dash-hero support-v82-hero"><div><span class="eyebrow">MI ÁREA TÉCNICA</span><h2>${esc(supportGreeting())}, ${esc(String(session?.name||'Técnico').split(/\s+/)[0])}</h2><p>Solo ves equipos asignados a tu usuario, su diagnóstico, reparación, repuestos y seguimiento técnico.</p></div><div class="dash-session"><span>Órdenes abiertas</span><b>${open}</b><small>${orders.length} asignadas</small></div></section>
      <div class="support-week-grid"><div><span>Asignados</span><b>${orders.length}</b><small>Órdenes a tu nombre</small></div><div><span>Reparados</span><b>${repaired}</b><small>Listos / entregados</small></div><div><span>No reparados</span><b>${notRepaired}</b><small>Diagnóstico final</small></div><div><span>Aprobados</span><b>${approved}</b><small>Por el cliente</small></div><div><span>No aprobados</span><b>${notApproved}</b><small>Cotización rechazada</small></div><div><span>Cobrados</span><b>${paid.length}</b><small>Sin acceso a cobro</small></div><div><span>Repuestos preparados</span><b>${reservedParts}</b><small>Reservados en tus órdenes</small></div><div><span>En proceso</span><b>${open}</b><small>Trabajo pendiente</small></div></div>
      <div class="tablewrap dash-panel"><div class="dash-panel-head"><div><h3>Mis órdenes asignadas</h3><p>Acceso limitado a tus equipos.</p></div><button class="secondary" onclick="TSService.renderPanel('orders')">Ver todas</button></div><div class="dash-list">${recent.length?recent.map(o=>`<button class="dash-list-row" onclick="TSService.openOrderManager('${esc(o.id)}')"><span><b>${esc(o.code)}</b><small>${esc(o.client)} · ${esc(o.device)}</small></span><span class="badge">${esc(o.status)}</span></button>`).join(''):'<div class="dash-empty">No tienes órdenes asignadas todavía.</div>'}</div></div>`;
      return;
    }

    if(view==='dashboard'){
      const snap=serviceDashboardSnapshot(),w=snap.week,t=snap.todayRow;
      const activeOrders=orders.filter(o=>!['Entregado','Cancelado','No aprobado'].includes(o.status)).length;
      const lowParts=serviceParts.filter(p=>Number(p.quantity||0)<=Number(p.min_stock||p.minimum_stock||0)).length;
      const recentOrders=orders.slice(0,6);
      const rows=snap.daily.map(d=>`<div class="support-day-row ${d.key===snap.today?'today':''}"><b>${esc(shortDayLabel(d.key))}</b><span>${d.received} recibido${d.received===1?'':'s'}</span><span>${d.appointments} cita${d.appointments===1?'':'s'}</span><span>${d.paid_count} cobro${d.paid_count===1?'':'s'}</span><strong>$${Number(d.collected||0).toFixed(2)}</strong><span>${d.delivered} entregado${d.delivered===1?'':'s'}</span></div>`).join('');
      box.innerHTML=`
        <section class="dash-hero support-v82-hero">
          <div><span class="eyebrow">DATOS REALES · AMERICA/CARACAS</span><h2>Dashboard diario y semanal</h2><p>Órdenes, cobros, citas, entregas y servicios a domicilio conectados a ThinkStore-Soporte.</p></div>
          <div class="dash-session"><span>Semana actual</span><b>${esc(shortDayLabel(snap.keys[0]))}</b><small>hasta ${esc(shortDayLabel(snap.keys[6]))}</small></div>
        </section>
        ${snap.financeReady?'':`<div class="support-finance-warning"><b>Cobranza aún no activada en Supabase.</b><span>Ejecuta MIGRACION-SOPORTE-V8.2-COBRANZA-ENTERPRISE.sql para habilitar montos cobrados y Enterprise.</span></div>`}
        <div class="support-day-title"><div><b>Hoy</b><small>${esc(shortDayLabel(snap.today))}</small></div><button class="secondary" onclick="TSService.renderPanel('dashboard')">Actualizar</button></div>
        <div class="dash-grid support-daily-kpis">
          <button class="dash-kpi" onclick="TSService.renderPanel('orders')"><span>Recibidos hoy</span><b>${t.received}</b><small>Ingresos físicos / órdenes</small></button>
          <button class="dash-kpi"><span>Cobrado hoy</span><b>$${Number(t.collected||0).toFixed(2)}</b><small>${t.paid_count} servicio(s) con cobro</small></button>
          <button class="dash-kpi" onclick="TSService.renderPanel('appointments')"><span>Citas de hoy</span><b>${t.appointments}</b><small>Agenda real de soporte</small></button>
          <button class="dash-kpi" onclick="TSService.renderPanel('orders')"><span>Entregados hoy</span><b>${t.delivered}</b><small>${activeOrders} orden(es) aún abiertas</small></button>
        </div>

        <div class="support-week-title"><div><span class="eyebrow">RESUMEN SEMANAL</span><h3>Operación de Servicio Técnico</h3></div><small>Actualizado ${new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'})}</small></div>
        <div class="support-week-grid">
          <div><span>Recibidos</span><b>${w.received}</b><small>Órdenes ingresadas</small></div>
          <div><span>Cobrados</span><b>${w.collected_count}</b><small>$${Number(w.collected_amount||0).toFixed(2)}</small></div>
          <div><span>Pendientes por cobrar</span><b>${w.pending_count}</b><small>$${Number(w.pending_amount||0).toFixed(2)}</small></div>
          <div><span>Listos</span><b>${w.ready}</b><small>Listos para entregar</small></div>
          <div><span>Entregados</span><b>${w.delivered}</b><small>Entregas de la semana</small></div>
          <div><span>Por entregar</span><b>${w.to_deliver}</b><small>Abiertas no entregadas</small></div>
          <div><span>Citas</span><b>${w.appointments}</b><small>${w.home_appointments} a domicilio</small></div>
          <div><span>Servicio a domicilio</span><b>${w.home_services}</b><small>Órdenes recibidas</small></div>
        </div>

        <div class="support-split-panel">
          <div class="support-split-copy"><span class="eyebrow">DISTRIBUCIÓN SEMANAL · SOBRE LO COBRADO</span><h3>$${Number(w.collected_amount||0).toFixed(2)}</h3><p>El reparto se calcula únicamente sobre cobros registrados; no incluye montos pendientes.</p></div>
          <div class="support-split-grid">
            <div><span>Empresa · 50%</span><b>$${snap.split.company.toFixed(2)}</b></div>
            <div><span>Socio A · 25%</span><b>$${snap.split.partner_a.toFixed(2)}</b></div>
            <div><span>Socio B · 25%</span><b>$${snap.split.partner_b.toFixed(2)}</b></div>
          </div>
        </div>

        <div class="dash-columns support-dash-columns">
          <div class="tablewrap dash-panel"><div class="dash-panel-head"><div><h3>Movimiento por día</h3><p>Semana actual completa.</p></div></div><div class="support-day-list">${rows}</div></div>
          <div class="tablewrap dash-panel"><div class="dash-panel-head"><div><h3>Órdenes recientes</h3><p>Últimos ingresos reales.</p></div><button class="secondary" onclick="TSService.renderPanel('orders')">Ver todas</button></div>
            <div class="dash-list">${recentOrders.length?recentOrders.map(o=>`<button class="dash-list-row" onclick="TSService.openOrderManager('${esc(o.id)}')"><span><b>${esc(o.code)}</b><small>${esc(o.client)} · ${esc(o.device)}</small></span><span class="badge">${esc(o.status)}</span></button>`).join(''):'<div class="dash-empty">Aún no hay órdenes registradas.</div>'}</div>
          </div>
        </div>

        <div class="support-enterprise-link">
          <div><b>Enterprise global</b><small>Ventas online + presenciales + citas + soporte + cobros + servicio a domicilio.</small></div>
          <a href="https://enterprise.thinkstore.com.ve" target="_blank" rel="noopener">Abrir Enterprise ↗</a>
        </div>`;
      return;
    }

    if(view==='notifications'){await renderNotifications(box);return}

    if(view==='appointments'){await renderAppointments(box);return}

    if(view==='orders'||view==='reception'||view==='technical'||view==='sales'||view==='logistics'){box.innerHTML=ordersTable(view);if(view==='sales')window.ThinkStoreFX?.mountCalculator('tsFxSupportSales',box);return}


    if(view==='bitacora'){
      box.innerHTML=bitacoraPanel();
      return;
    }
    if(view==='parts'){box.innerHTML=partsPanel();return}

    if(view==='users'){
      const rows=await loadServiceUsers();
      box.innerHTML=`<div class="tablewrap"><h3>Usuarios internos de soporte</h3><table><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Activo</th></tr>${rows.map(u=>`<tr><td>${u.nombre}</td><td>${u.email}</td><td><span class="badge">${u.rol}</span></td><td>${u.activo?'Sí':'No'}</td></tr>`).join('')}</table><p>Los usuarios y contraseñas se gestionan con Supabase Auth del proyecto ThinkStore-Soporte.</p></div>`;
      return;
    }

    if(view==='permissions'){
      box.innerHTML=`<div class="tablewrap"><h3>Matriz de permisos</h3><table><tr><th>Rol</th><th>Accesos</th></tr>${Object.entries(roles).map(([r,p])=>`<tr><td><b>${r}</b></td><td><div class="pill-row">${p.map(x=>`<span class="badge">${x}</span>`).join('')}</div></td></tr>`).join('')}</table></div>`;
      return;
    }

    box.innerHTML=`<div class="tablewrap"><h3>${titles[view]}</h3><p>Módulo preparado para datos reales en Supabase.</p></div>`;
  }


  function buildAppointmentTechNote(a={}){
    const date=String(a&&a.preferred_date||'').trim();
    const time=String(a&&a.preferred_time||'').trim();
    const when=[date,time].filter(Boolean).join(' ');
    return when?`Cita web agendada: ${when}`:'';
  }
  function sanitizeTechnicalNotes(value=''){
    const raw=String(value||'').trim();
    if(!raw) return '';
    const normalized=raw.replace(/\s+/g,' ').trim();
    if(/origen:\s*cita web/i.test(normalized)){
      const dateMatch=normalized.match(/(?:preferencia|cita):\s*([^·]+)/i);
      if(dateMatch&&dateMatch[1]) return `Cita web agendada: ${dateMatch[1].trim()}`;
      const cleaned=normalized.split('·').map(x=>x.trim()).filter(Boolean).filter(part=>!/^origen:\s*cita web/i.test(part)&&!/^servicio:/i.test(part)&&!/^modalidad:/i.test(part));
      return cleaned.join(' · ');
    }
    return normalized;
  }
  function appointmentStatusLabel(v){return ({pendiente_confirmacion:'Pendiente',pendiente:'Pendiente',agendada:'Agendada',confirmada:'Agendada',en_recepcion:'En recepción',convertida_orden:'Orden creada',cancelada:'Cancelada'}[v]||v||'Pendiente')}
  async function loadAppointments(){
    const {data,error}=await supabaseClient.from('service_appointments').select('*').order('preferred_date',{ascending:true}).order('preferred_time',{ascending:true});
    if(error) throw error;
    return data||[];
  }
  async function renderAppointments(box){
    box.innerHTML='<div class="tablewrap"><h3>Citas recibidas desde ThinkStore</h3><p>Cargando solicitudes…</p></div>';
    try{
      const rows=await loadAppointments();
      const pending=rows.filter(x=>['pendiente_confirmacion','pendiente'].includes(x.status)).length;
      const confirmed=rows.filter(x=>['agendada','confirmada'].includes(x.status)).length;
      box.innerHTML=`<div class="appointments-head"><div><h3>Citas recibidas desde ThinkStore</h3><p>Solicitudes enviadas desde la agenda de revisión/reparación de thinkstore.com.ve.</p></div><button class="secondary" onclick="TSService.renderPanel('appointments')">Actualizar</button></div>
      <div class="cards"><div class="metric"><span>Total citas</span><b>${rows.length}</b></div><div class="metric"><span>Pendientes</span><b>${pending}</b></div><div class="metric"><span>Agendadas</span><b>${confirmed}</b></div></div>
      <div class="tablewrap appointments-table"><table><tr><th>Fecha / hora</th><th>Cliente</th><th>Equipo</th><th>Servicio / detalle</th><th>Modalidad</th><th>Estado</th><th>Acción</th></tr>${rows.length?rows.map(a=>`<tr><td><b>${esc(a.preferred_date)}</b><br><small>${esc(a.preferred_time)}</small></td><td><b>${esc(a.client_name)}</b><br><small>${esc(a.client_phone)} · ${esc(a.client_email)}</small></td><td>${esc(a.device_type)}<br><b>${esc(a.device_model)}</b></td><td>${esc(a.service_type)}<br><small>${esc(a.reported_issue)}</small></td><td>${esc(a.service_mode)}</td><td><span class="badge">${esc(appointmentStatusLabel(a.status))}</span></td><td><div class="appointment-actions">${a.status!=='convertida_orden'?`<button onclick="TSService.convertAppointment('${a.id}')">Recibir equipo</button>`:`<span class="badge">Orden creada</span>`}<select onchange="TSService.updateAppointmentStatus('${a.id}',this.value)" ${a.status==='convertida_orden'?'disabled':''}>${['agendada','en_recepcion','cancelada'].map(st=>`<option value="${st}" ${a.status===st?'selected':''}>${appointmentStatusLabel(st)}</option>`).join('')}</select></div></td></tr>`).join(''):'<tr><td colspan="7">No hay citas registradas todavía.</td></tr>'}</table></div>`;
    }catch(err){
      console.error('Citas web:',err);
      box.innerHTML=`<div class="tablewrap"><h3>Citas web</h3><div class="appointment-error"><b>No se pudieron leer las citas.</b><p>${esc(err.message||'Error de Supabase')}</p><p>Verifica que <b>service_appointments</b> exista y que el SQL de acceso del panel esté ejecutado en ThinkStore-Soporte.</p></div></div>`;
    }
  }
  async function updateAppointmentStatus(id,status){
    const {error}=await supabaseClient.from('service_appointments').update({status,updated_at:new Date().toISOString()}).eq('id',id);
    if(error){toast('No se pudo actualizar la cita: '+error.message,'error');return}
    toast('Estado de la cita actualizado.');
    await renderPanel('appointments');
  }
  async function convertAppointment(id){
    try{
      const {data:a,error}=await supabaseClient.from('service_appointments').select('*').eq('id',id).single();
      if(error) throw error;
      if(a.status==='convertida_orden'){toast('Esta cita ya fue convertida en orden.','error');return}
      resetReceptionForm();
      pendingAppointmentId=a.id;
      activeReceptionOrderId=null;
      document.getElementById('orderModalTitle').textContent='Recepción desde cita web';
      document.getElementById('orderModalSubtitle').textContent='Completa todos los datos del ingreso. La orden de servicio se generará únicamente al finalizar y guardar la recepción.';
      document.getElementById('orderSaveBtn').textContent='Finalizar ingreso y crear orden';
      oClient.value=a.client_name||''; oPhone.value=a.client_phone||''; oEmail.value=a.client_email||''; clearReceptionClientMeta();
      oDevice.value=a.device_model||''; deviceModelSearch.value=a.device_model||''; oIssue.value=a.reported_issue||a.service_type||'';
      if(document.getElementById('oServiceMode'))oServiceMode.value=a.service_mode||'Presencial';if(document.getElementById('oIntakeSource'))oIntakeSource.value='Cita web';
      const d=findAppleDevice(a.device_model||''); if(d){oCategory.value=d.category||'';previewSelectedDevice(a.device_model);selectDeviceFromSearch(a.device_model)}
      oTechNotes.value=buildAppointmentTechNote(a);
      sigClientName.value=a.client_name||''; sigReceptionName.value=session?.name||'';
      await supabaseClient.from('service_appointments').update({status:'en_recepcion',updated_at:new Date().toISOString()}).eq('id',id);
      document.body.classList.add('order-tab');document.getElementById('orderModal').classList.add('open');setTimeout(()=>oSerial?.focus(),120);
    }catch(err){
      console.error('Iniciar recepción desde cita:',err);
      toast('No se pudo iniciar la recepción: '+(err.message||'Error'),'error');
    }
  }


  function bitacoraOrder(){
    const code=String(document.getElementById('bOrderCode')?.value||'').trim().toUpperCase();
    return orders.find(o=>String(o.code||'').toUpperCase()===code)||null;
  }
  function openBitacora(code=''){
    const scoped=code?orders.find(o=>String(o.code)===String(code)):null;if(scoped&&!requireTechnicianOrder(scoped))return;
    if(!can('bitacora')){alert('Tu rol no tiene permiso para bitácora');return}
    bOrderCode.value=code||'';bAuthor.value=session?.name||'';bType.value='Diagnóstico';bDetail.value='';bFiles.value='';
    bStatus.value=scoped?.status&&Array.from(bStatus.options).some(o=>o.value===scoped.status)?scoped.status:'En diagnóstico';
    bClientVisible.checked=false;bNotifyClient.checked=false;bClientTitle.value='';bDiagnosis.value='';bWorkPerformed.value='';bPartsUsed.value='';bTestsPerformed.value='';bClientNotes.value='';
    const ctx=document.getElementById('bOrderContext');if(ctx)ctx.innerHTML=scoped?`<div><span>ORDEN</span><b>${esc(scoped.code)}</b></div><div><span>CLIENTE</span><b>${esc(scoped.client||'Cliente')}</b></div><div><span>EQUIPO</span><b>${esc(scoped.device||'Equipo')}</b></div><div><span>ESTADO ACTUAL</span><b>${esc(scoped.status||'Recibido')}</b></div>`:'<small>Escribe o selecciona una orden para preparar la actualización.</small>';
    syncBitacoraVisibility();renderBitacoraClientHistory(code);renderBitacoraPreview();document.getElementById('bitacoraModal').classList.add('open');
  }
  function syncBitacoraVisibility(){
    const visible=Boolean(document.getElementById('bClientVisible')?.checked),wrap=document.getElementById('bClientFields'),notify=document.getElementById('bNotifyClient'),order=bitacoraOrder();
    if(wrap)wrap.hidden=!visible;
    if(notify){notify.disabled=!visible||!order?.email;if(!visible||!order?.email)notify.checked=false}
    const help=document.getElementById('bNotifyClientHelp');if(help)help.textContent=!visible?'Activa “Visible para el cliente” para habilitar el envío.':order?.email?`Se enviará a ${order.email}.`:'Esta orden no tiene correo; la actualización sí quedará visible en el seguimiento.';
    const send=document.getElementById('bSendClientUpdate');if(send)send.disabled=!order;
    renderBitacoraPreview();
  }
  function renderBitacoraClientHistory(code=''){
    const box=document.getElementById('bClientHistory');if(!box)return;
    const order=orders.find(o=>o.code.toUpperCase()===String(code||'').trim().toUpperCase());
    const ctx=document.getElementById('bOrderContext');if(ctx&&order)ctx.innerHTML=`<div><span>ORDEN</span><b>${esc(order.code)}</b></div><div><span>CLIENTE</span><b>${esc(order.client||'Cliente')}</b></div><div><span>EQUIPO</span><b>${esc(order.device||'Equipo')}</b></div><div><span>ESTADO ACTUAL</span><b>${esc(order.status||'Recibido')}</b></div>`;
    if(!order){box.innerHTML='<small>Selecciona una orden para ver las actualizaciones publicadas.</small>';syncBitacoraVisibility();return}
    const notes=clientVisibleNotesForOrder(order.id).slice(0,3);
    box.innerHTML=notes.length?notes.map(clientNoteHtml).join(''):'<small>Esta orden todavía no tiene actualizaciones visibles para el cliente.</small>';
    syncBitacoraVisibility();
  }
  function applyBitacoraTemplate(key){
    const map={
      diagnostic:{type:'Diagnóstico',status:'Diagnóstico disponible',title:'Diagnóstico de tu equipo disponible',detail:'Completamos la revisión técnica de tu equipo.'},
      repairing:{type:'Seguimiento',status:'En reparación',title:'Tu reparación está en proceso',detail:'Nuestro técnico continúa trabajando en la reparación autorizada.'},
      waiting:{type:'Repuesto',status:'Esperando repuesto',title:'Estamos esperando un repuesto para continuar',detail:'La orden sigue activa y continuaremos apenas el repuesto esté disponible.'},
      testing:{type:'Prueba realizada',status:'Listo para entregar',title:'Reparación finalizada y pruebas completadas',detail:'Finalizamos el trabajo técnico y realizamos las pruebas de funcionamiento.'},
      completed:{type:'Entrega',status:'Listo para entregar',title:'Tu equipo está listo para entregar',detail:'La reparación fue completada y el equipo superó las pruebas finales de funcionamiento.'}
    };
    const t=map[key];if(!t)return;
    bType.value=t.type;bStatus.value=t.status;if(!bClientTitle.value.trim())bClientTitle.value=t.title;if(!bDetail.value.trim())bDetail.value=t.detail;
    bClientVisible.checked=true;const order=bitacoraOrder();if(bNotifyClient)bNotifyClient.checked=Boolean(order?.email);syncBitacoraVisibility();renderBitacoraPreview();
  }
  function renderBitacoraPreview(){
    const box=document.getElementById('bClientPreview');if(!box)return;
    const visible=Boolean(document.getElementById('bClientVisible')?.checked);box.hidden=!visible;if(!visible)return;
    const order=bitacoraOrder(),title=String(bClientTitle?.value||'').trim()||String(bStatus?.value||'Actualización de reparación'),summary=String(bDetail?.value||'').trim();
    const sections=[['Diagnóstico',bDiagnosis?.value],['Trabajo realizado',bWorkPerformed?.value],['Repuestos / piezas',bPartsUsed?.value],['Pruebas realizadas',bTestsPerformed?.value],['Observaciones',bClientNotes?.value]].filter(([,v])=>String(v||'').trim());
    box.innerHTML=`<div class="bitacora-preview-head"><span>VISTA DEL CLIENTE</span><b>${esc(title)}</b><small>${esc(order?.device||'Equipo')} · ${esc(bStatus?.value||'')}</small></div>${summary?`<p>${esc(summary)}</p>`:''}${sections.length?`<div class="bitacora-preview-grid">${sections.map(([k,v])=>`<div><span>${esc(k)}</span><p>${esc(String(v||'').trim())}</p></div>`).join('')}</div>`:'<small>Completa los campos del reporte para ver aquí el resumen que recibirá el cliente.</small>'}`;
  }
  function sendBitacoraUpdate(){
    const order=bitacoraOrder();if(!order)return toast('Selecciona una orden antes de enviar la actualización.','error');
    bClientVisible.checked=true;bNotifyClient.checked=Boolean(order.email);syncBitacoraVisibility();
    const form=document.querySelector('#bitacoraModal form');if(form?.requestSubmit)form.requestSubmit();
  }
  async function saveBitacora(e){
    e.preventDefault();const code=bOrderCode.value.trim().toUpperCase();const order=orders.find(o=>o.code.toUpperCase()===code);
    if(!order){alert('No existe una orden con el código '+code);return}
    if(!requireTechnicianOrder(order))return;
    const clientVisible=Boolean(bClientVisible.checked),notifyClient=clientVisible&&Boolean(bNotifyClient.checked)&&Boolean(order.email);
    const entry={orderCode:code,type:bType.value,author:bAuthor.value.trim()||session?.name||'Sin responsable',status:bStatus.value,detail:bDetail.value.trim(),files:bFiles.value.trim(),visibility:clientVisible?'client':'internal',clientTitle:bClientTitle.value.trim(),diagnosis:bDiagnosis.value.trim(),workPerformed:bWorkPerformed.value.trim(),partsUsed:bPartsUsed.value.trim(),testsPerformed:bTestsPerformed.value.trim(),clientNotes:bClientNotes.value.trim(),created:new Date().toLocaleString('es-VE')};
    if(clientVisible&&!entry.clientTitle)entry.clientTitle=entry.type==='Entrega'?'Resumen de tu reparación':entry.status;
    if(clientVisible&&!entry.detail&&!entry.workPerformed&&!entry.diagnosis&&!entry.testsPerformed){alert('Para publicar al cliente añade al menos un resumen, diagnóstico, trabajo realizado o pruebas.');return}
    const payload={order_id:order.id,note:entry.detail||entry.workPerformed||entry.diagnosis||entry.testsPerformed,visibility:entry.visibility,author_name:entry.author,note_type:entry.type,status_after:entry.status,attachments:entry.files||null,client_title:entry.clientTitle||null,diagnosis:entry.diagnosis||null,work_performed:entry.workPerformed||null,parts_used:entry.partsUsed||null,tests_performed:entry.testsPerformed||null,client_notes:entry.clientNotes||null};
    const {error:noteError}=await supabaseClient.from('service_order_notes').insert(payload);if(noteError){alert('No se pudo guardar la bitácora: '+noteError.message);return}
    const changes={status:entry.status};if(entry.status==='Entregado')changes.delivered_at=new Date().toISOString();
    const {error:updateError}=await supabaseClient.from('service_orders').update(changes).eq('id',order.id);if(updateError){alert('La nota se guardó, pero no se actualizó el estado: '+updateError.message);return}
    await audit('add_note',order.id,null,entry);
    let mailSent=false;
    if(notifyClient){
      try{
        await supportSecureAction({action:'notify_repair_update',order_id:order.id,update:{title:entry.clientTitle,summary:entry.detail,diagnosis:entry.diagnosis,work_performed:entry.workPerformed,parts_used:entry.partsUsed,tests_performed:entry.testsPerformed,client_notes:entry.clientNotes,status:entry.status,author:entry.author}});mailSent=true;
      }catch(err){console.warn('Correo de actualización técnica:',err);toast('La actualización quedó publicada, pero el correo no pudo enviarse: '+(err?.message||err),'error')}
    }
    await loadSupportData();closeModals();await renderPanel('bitacora');
    toast(clientVisible?(mailSent?'Actualización publicada y correo enviado al cliente.':'Actualización publicada en el seguimiento del cliente.'):'Entrada interna guardada correctamente.');
  }
  function bitacoraPanel(){
    const recent=bitacora.slice(0,80),publicCount=bitacora.filter(x=>x.visibility==='client').length;
    return `<div class="bitacora-header"><div><h3>Bitácora técnica</h3><p>Documenta el trabajo interno y publica al cliente únicamente la información que quieras mostrarle.</p></div><button onclick="TSService.openBitacora()">Nueva entrada</button></div>
    <div class="cards bitacora-stats"><div class="metric"><span>Entradas</span><b>${bitacora.length}</b></div><div class="metric"><span>Visibles al cliente</span><b>${publicCount}</b></div><div class="metric"><span>Diagnósticos</span><b>${bitacora.filter(x=>x.type==='Diagnóstico').length}</b></div><div class="metric"><span>Reparaciones / pruebas</span><b>${bitacora.filter(x=>/Prueba|Repuesto|Entrega|Seguimiento|Reparación/i.test(x.type)).length}</b></div></div>
    <div class="tablewrap"><h3>Últimas entradas</h3>${recent.length?`<table><tr><th>Fecha</th><th>Orden</th><th>Visibilidad</th><th>Tipo</th><th>Responsable</th><th>Estado</th><th>Detalle</th></tr>${recent.map(b=>`<tr><td>${b.created}</td><td><b>${b.orderCode}</b></td><td><span class="badge ${b.visibility==='client'?'client-visible-badge':''}">${b.visibility==='client'?'Cliente':'Interna'}</span></td><td><span class="badge">${b.type}</span></td><td>${b.author}</td><td>${b.status}</td><td>${b.clientTitle?`<b>${esc(b.clientTitle)}</b><br>`:''}${esc(b.detail)}${b.workPerformed?`<br><small><b>Trabajo:</b> ${esc(b.workPerformed)}</small>`:''}${b.files?`<br><small>Archivos: ${esc(b.files)}</small>`:''}</td></tr>`).join('')}</table>`:'<p>Aún no hay entradas de bitácora.</p>'}</div>`;
  }
  function partCatalogMeta(p){const d=p?.catalog_details&&typeof p.catalog_details==='object'?p.catalog_details:{};return{group:String(d.inventory_group||p.category||'General'),model:String(d.model||p.compatible_models||''),color:String(d.color||''),quality:String(d.quality||''),repair:String(d.repair||''),series:String(d.series||p.category||'')}}
  function partAvailabilityState(p){const qty=Math.max(0,Number(p?.quantity||0)),min=Math.max(0,Number(p?.minimum_stock||0));if(qty<=0)return{key:'out',label:'Sin stock'};if(qty<=min)return{key:'low',label:'Stock bajo'};return{key:'ok',label:'Disponible'}}
  function technicianPartCard(p){const meta=partCatalogMeta(p),state=partAvailabilityState(p),price=Number(p.sale_price||0),img=servicePartImage(p);return `<article class="tech-inventory-card" data-search="${esc([p.sku,p.name,p.category,p.compatible_models,meta.model,meta.color,meta.quality,meta.repair,meta.group,state.label].filter(Boolean).join(' ').toLowerCase())}" data-category="${esc(meta.group)}" data-status="${state.key}">
    <div class="tech-inventory-card-top">${img?`<span class="tech-inventory-thumb"><img src="${esc(img)}" alt="" loading="lazy"></span>`:`<span class="tech-inventory-thumb empty">${supportIcon('parts')}</span>`}<div class="tech-inventory-title"><small>${esc(p.sku||'SIN SKU')}</small><h4>${esc(p.name||'Repuesto')}</h4><span class="inventory-stock-badge ${state.key}">${state.label}</span></div></div>
    <div class="tech-inventory-specs"><div><span>Modelo</span><b>${esc(meta.model||'No indicado')}</b></div><div><span>Color / variante</span><b>${esc(meta.color||'No indicado')}</b></div><div><span>Calidad</span><b>${esc(meta.quality||'Estándar')}</b></div><div><span>Ubicación</span><b>${esc(p.location||'Servicio técnico')}</b></div></div>
    <div class="tech-inventory-bottom"><div><span>Stock físico</span><b>${Math.max(0,Number(p.quantity||0))}</b><small>Mínimo ${Math.max(0,Number(p.minimum_stock||0))}</small></div><div><span>Precio instalado</span><b>${price>0?'$'+price.toFixed(2):'Por definir'}</b><small>${esc(meta.repair||'Precio de venta')}</small></div></div>
  </article>`}
  function filterTechnicianInventory(){const root=document.getElementById('techInventoryCatalog');if(!root)return;const q=String(document.getElementById('techInventorySearch')?.value||'').trim().toLowerCase(),cat=String(document.getElementById('techInventoryCategory')?.value||''),status=String(document.getElementById('techInventoryStatus')?.value||'');let visible=0;root.querySelectorAll('.tech-inventory-card').forEach(card=>{const ok=(!q||card.dataset.search.includes(q))&&(!cat||card.dataset.category===cat)&&(!status||card.dataset.status===status);card.hidden=!ok;if(ok)visible++});const count=document.getElementById('techInventoryVisibleCount');if(count)count.textContent=`${visible} referencia${visible===1?'':'s'}`;root.querySelectorAll('.tech-inventory-group').forEach(group=>{group.hidden=![...group.querySelectorAll('.tech-inventory-card')].some(card=>!card.hidden)})}
  function technicianPartsPanel(){const active=serviceParts.filter(p=>p.active!==false),low=active.filter(p=>partAvailabilityState(p).key==='low'),out=active.filter(p=>partAvailabilityState(p).key==='out'),units=active.reduce((s,p)=>s+Math.max(0,Number(p.quantity||0)),0),groups=new Map();active.forEach(p=>{const key=partCatalogMeta(p).group||'General';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p)});const categories=[...groups.keys()].sort((a,b)=>a.localeCompare(b,'es'));const sections=categories.map(key=>`<section class="tech-inventory-group"><div class="tech-inventory-group-head"><div><span>GRUPO</span><h3>${esc(key)}</h3></div><small>${groups.get(key).length} referencia${groups.get(key).length===1?'':'s'}</small></div><div class="tech-inventory-grid">${groups.get(key).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es')).map(technicianPartCard).join('')}</div></section>`).join('');return `<section class="tech-inventory-readonly"><div class="tech-inventory-hero"><div><span class="eyebrow">INVENTARIO TÉCNICO · SOLO LECTURA</span><h2>Repuestos disponibles</h2><p>Consulta referencias, modelos, variantes, stock físico y precio instalado. Los movimientos y cambios de inventario se gestionan únicamente desde Inventory / Administración.</p></div><span class="readonly-pill">${supportIcon('permissions')} Solo lectura</span></div>
    <div class="cards tech-inventory-metrics"><div class="metric"><span>Referencias activas</span><b>${active.length}</b></div><div class="metric"><span>Unidades físicas</span><b>${units}</b></div><div class="metric"><span>Stock bajo</span><b>${low.length}</b></div><div class="metric"><span>Sin stock</span><b>${out.length}</b></div></div>
    <div class="tech-inventory-toolbar"><label class="tech-inventory-search">${supportIcon('parts')}<input id="techInventorySearch" type="search" placeholder="Buscar repuesto, modelo, color o SKU…" oninput="TSService.filterTechnicianInventory()"></label><select id="techInventoryCategory" onchange="TSService.filterTechnicianInventory()"><option value="">Todas las categorías</option>${categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select><select id="techInventoryStatus" onchange="TSService.filterTechnicianInventory()"><option value="">Todo el stock</option><option value="ok">Disponible</option><option value="low">Stock bajo</option><option value="out">Sin stock</option></select><span id="techInventoryVisibleCount" class="tech-inventory-count">${active.length} referencias</span></div>
    <div id="techInventoryCatalog" class="tech-inventory-catalog">${sections||'<div class="empty-state"><h3>Sin referencias</h3><p>No hay repuestos activos para consultar.</p></div>'}</div></section>`}
  function partsPanel(){
    if(session?.role==='technician')return technicianPartsPanel();
    const low=serviceParts.filter(p=>p.active!==false&&Number(p.quantity)<=Number(p.minimum_stock));
    const rows=serviceParts.map(p=>`<tr><td><b>${esc(p.sku)}</b></td><td>${esc(p.name)}<br><small>${esc(p.compatible_models||'Compatibilidad no indicada')}</small></td><td>${esc(p.category||'General')}<br><small>${p.financial_type==='service_software'?'Servicio software':p.financial_type==='service_hardware'?'Servicio hardware':'Repuesto + instalación'}</small></td><td><b class="${Number(p.quantity)<=Number(p.minimum_stock)?'stock-low':''}">${Number(p.quantity||0)}</b><br><small>Mínimo ${Number(p.minimum_stock||0)}</small></td><td>${p.unit_cost!=null?'$'+Number(p.unit_cost).toFixed(2):'—'} / ${p.sale_price!=null?'$'+Number(p.sale_price).toFixed(2):'—'}</td><td>${esc(p.location||'—')}</td><td><button onclick="TSService.openPartMovement('${esc(p.id)}','in')">Entrada</button> <button class="secondary" onclick="TSService.openPartMovement('${esc(p.id)}','out')">Usar</button> <button class="secondary" onclick="TSService.openPartEditor('${esc(p.id)}')">Editar</button></td></tr>`).join('');
    const moves=partMovements.slice(0,20).map(m=>{const p=serviceParts.find(x=>x.id===m.part_id);return `<tr><td>${dateText(m.created_at)}</td><td>${esc(p?.name||m.part_id)}</td><td>${esc(m.movement_type)}</td><td>${m.quantity>0?'+':''}${m.quantity}</td><td>${m.balance_after}</td><td>${esc(m.order_id||m.note||'—')}</td></tr>`}).join('');
    return `<div class="cards"><div class="metric"><span>Repuestos activos</span><b>${serviceParts.filter(p=>p.active!==false).length}</b></div><div class="metric"><span>Unidades totales</span><b>${serviceParts.reduce((s,p)=>s+Number(p.quantity||0),0)}</b></div><div class="metric"><span>Stock bajo</span><b>${low.length}</b></div></div><div class="tablewrap"><div class="bitacora-header"><div><h3>Stock de repuestos</h3><p>Entradas, consumos por orden y alertas mínimas.</p></div><button onclick="TSService.openPartEditor()">Añadir repuesto</button></div><table><tr><th>SKU</th><th>Repuesto</th><th>Categoría</th><th>Stock</th><th>Costo / venta</th><th>Ubicación</th><th>Acciones</th></tr>${rows||'<tr><td colspan="7">Aún no hay repuestos registrados.</td></tr>'}</table></div><div class="tablewrap"><h3>Últimos movimientos</h3><table><tr><th>Fecha</th><th>Repuesto</th><th>Tipo</th><th>Cantidad</th><th>Saldo</th><th>Orden / nota</th></tr>${moves||'<tr><td colspan="6">Sin movimientos.</td></tr>'}</table></div>`;
  }
  function openPartEditor(id=''){
    if(session?.role==='technician'){toast('Tu acceso al inventario es solo de lectura.','info');return}
    const p=serviceParts.find(x=>String(x.id)===String(id));partId.value=p?.id||'';partSku.value=p?.sku||'';partName.value=p?.name||'';partCategory.value=p?.category||'';if(document.getElementById('partFinancialType'))partFinancialType.value=p?.financial_type||(/^Servicios · Software$/i.test(p?.category||'')?'service_software':/^Servicios/i.test(p?.category||'')?'service_hardware':'part');partModels.value=p?.compatible_models||'';partMin.value=p?.minimum_stock||0;partCost.value=p?.unit_cost??'';partPrice.value=p?.sale_price??'';partLocation.value=p?.location||'';document.getElementById('partEditorModal').classList.add('open');
  }
  async function savePart(e){
    e.preventDefault();if(session?.role==='technician'){toast('Tu acceso al inventario es solo de lectura.','error');return}const id=partId.value;const row={sku:partSku.value.trim().toUpperCase(),name:partName.value.trim(),category:partCategory.value.trim()||null,financial_type:document.getElementById('partFinancialType')?.value||'part',compatible_models:partModels.value.trim()||null,minimum_stock:Number(partMin.value||0),unit_cost:partCost.value===''?null:Number(partCost.value),sale_price:partPrice.value===''?null:Number(partPrice.value),location:partLocation.value.trim()||null,active:true};
    const q=id?supabaseClient.from('service_parts').update(row).eq('id',id):supabaseClient.from('service_parts').insert({...row,quantity:0});const {error}=await q;if(error)return toast('No se pudo guardar: '+error.message,'error');await loadSupportData();closeModals();await renderPanel('parts');toast(id?'Repuesto actualizado.':'Repuesto creado; registra una entrada de stock.');
  }
  function openPartMovement(id,direction){if(session?.role==='technician'){toast('Los movimientos de inventario se gestionan desde Inventory / Administración.','info');return}const p=serviceParts.find(x=>String(x.id)===String(id));if(!p)return;movementPartId.value=p.id;movementDirection.value=direction;movementTitle.textContent=`${direction==='in'?'Entrada':'Uso'} · ${p.name}`;movementQty.value=1;movementOrder.value='';movementNote.value='';document.getElementById('partMovementModal').classList.add('open')}
  async function savePartMovement(e){
    e.preventDefault();if(session?.role==='technician'){toast('Tu acceso al inventario es solo de lectura.','error');return}const direction=movementDirection.value;const qty=Math.abs(Number(movementQty.value||0))*(direction==='out'?-1:1);if(!qty)return toast('Indica una cantidad válida.','error');const orderCode=movementOrder.value.trim().toUpperCase();const {data,error}=await supabaseClient.rpc('adjust_service_part_stock',{p_part_id:movementPartId.value,p_quantity:qty,p_type:direction==='out'?'consumo_orden':'entrada',p_order_id:orderCode||null,p_note:movementNote.value.trim()||null});if(error)return toast(error.message,'error');if(direction==='out'&&orderCode){const order=orders.find(o=>o.code.toUpperCase()===orderCode);if(order)await supabaseClient.from('service_order_notes').insert({order_id:order.id,note:`Repuesto utilizado: ${serviceParts.find(p=>p.id===movementPartId.value)?.name||'Repuesto'} · Cantidad ${Math.abs(qty)}`,visibility:'internal',author_name:session?.name||'Soporte',note_type:'Repuesto',status_after:order.status})}await loadSupportData();closeModals();await renderPanel('parts');toast(`Movimiento registrado. Stock actual: ${data?.quantity??data?.[0]?.quantity??'actualizado'}.`);
  }


  function orderPartRowsForOrder(order){
    if(!order)return [];
    return serviceOrderParts.filter(r=>String(r.order_code||'').toUpperCase()===String(order.code||'').toUpperCase()&&r.status!=='released');
  }
  function reservedOtherQty(partId,orderCode){
    return serviceOrderParts.reduce((sum,r)=>{
      if(String(r.part_id)!==String(partId)||r.status!=='reserved'||String(r.order_code||'').toUpperCase()===String(orderCode||'').toUpperCase())return sum;
      return sum+Math.max(0,Number(r.quantity_reserved||0)-Number(r.quantity_consumed||0));
    },0);
  }
  function availablePartQty(part,order){return Math.max(0,Number(part?.quantity||0)-reservedOtherQty(part?.id,order?.code));}
  function servicePartImage(part){
    const url=String(part?.catalog_details?.image_url||part?.image_url||'').trim();
    return /^(https?:|data:image\/)/i.test(url)?url:'';
  }
  function partThumbHtml(part){const url=servicePartImage(part);return `<span class="repair-part-thumb ${url?'has-image':''}">${url?`<img src="${esc(url)}" alt="" loading="lazy">`:'<span>▦</span>'}</span>`}
  function existingReservedRow(order,partId){return orderPartRowsForOrder(order).find(r=>String(r.part_id)===String(partId)&&r.status==='reserved')||null}
  async function releasePreparedParts(order,reason='Liberación de repuestos'){
    if(!order)return;
    try{
      const {error}=await supabaseClient.rpc('ts_save_service_order_parts',{p_order_code:order.code,p_parts:[],p_actor_email:session?.email||null});
      if(error)throw error;
    }catch(err){
      console.warn('RPC de liberación no disponible, usando fallback:',err?.message||err);
      await supabaseClient.from('service_order_parts').update({status:'released',updated_at:new Date().toISOString()}).eq('order_code',order.code).eq('status','reserved');
      await supabaseClient.from('service_orders').update({reserved_parts_cost:0}).eq('id',order.id);
    }
    await supabaseClient.from('service_order_notes').insert({order_id:order.id,note:`${reason}. Los repuestos preparados volvieron a estar disponibles.`,visibility:'internal',author_name:session?.name||'Soporte',note_type:'Repuesto',status_after:order.status});
  }
  function repairPartMovementsForOrder(order){
    if(!order)return [];
    return partMovements.filter(m=>String(m.order_id||'').toUpperCase()===String(order.code||'').toUpperCase()&&Number(m.quantity)<0);
  }
  function repairPartSearchText(part){
    return [part?.sku,part?.name,part?.category,part?.compatible_models,part?.location].filter(Boolean).join(' ').toLowerCase();
  }
  function renderOrderPartPicker(query=''){
    const order=orders.find(x=>String(x.id)===String(activeOrderId));
    const results=document.getElementById('mPartResults'),selected=document.getElementById('mPartSelection'),history=document.getElementById('mOrderPartHistory'),badge=document.getElementById('mPartOrderBadge');
    if(!order||!results||!selected||!history)return;
    if(badge)badge.textContent=order.code||'Orden';
    const q=String(query||document.getElementById('mPartSearch')?.value||'').trim().toLowerCase();
    const paid=orderPaymentState(order).key==='paid';
    const available=serviceParts.filter(p=>p.active!==false&&(!q||repairPartSearchText(p).includes(q)));
    results.innerHTML=available.length?available.map(p=>{
      const stock=availablePartQty(p,order),low=stock<=Number(p.minimum_stock||0),inCart=repairPartSelection.has(String(p.id)),prepared=!!existingReservedRow(order,p.id),price=Number(p.sale_price||0);
      return `<button type="button" class="repair-part-result ${stock<=0&&!inCart?'is-empty':''} ${inCart?'is-selected':''} ${prepared?'is-prepared':''}" ${paid||stock<=0&&!inCart?'disabled':''} onclick="TSService.addRepairPart('${esc(p.id)}')">${partThumbHtml(p)}<span class="repair-part-result-copy"><b>${esc(p.name)}</b><small>${esc(p.sku||'Sin SKU')} · ${esc(p.category||'General')}${p.compatible_models?` · ${esc(p.compatible_models)}`:''}</small><small class="repair-part-price">${price>0?`Cobro $${price.toFixed(2)}`:'Precio no configurado'}${prepared?' · Preparado':''}</small></span><span class="repair-part-stock ${low?'stock-low':''}"><b>${stock}</b><small>disponible${stock===1?'':'s'}</small></span></button>`;
    }).join(''):`<div class="repair-part-empty">${q?'No encontré productos con esa búsqueda.':'No hay productos activos en inventario.'}</div>`;

    const entries=[...repairPartSelection.entries()].map(([id,qty])=>({part:serviceParts.find(p=>String(p.id)===String(id)),qty:Number(qty||1)})).filter(x=>x.part);
    const selectedTotal=entries.reduce((sum,{part,qty})=>sum+(Number(existingReservedRow(order,part.id)?.sale_price_snapshot||part.sale_price||0)*qty),0);
    selected.innerHTML=entries.length?entries.map(({part,qty})=>{const saved=existingReservedRow(order,part.id),price=Number(saved?.sale_price_snapshot||part.sale_price||0),subtotal=price*qty,stock=availablePartQty(part,order);return `<article class="repair-part-selected ${saved?'is-prepared':'is-draft'}">${partThumbHtml(part)}<div class="repair-part-selected-copy"><div class="repair-part-selected-title"><b>${esc(part.name)}</b><span class="repair-part-status ${saved?'prepared':'draft'}">${saved?'Preparado':'Por agregar'}</span></div><small>${esc(part.sku||'')} · Disponible ${stock}${price>0?` · Precio $${price.toFixed(2)}`:' · Precio no configurado'}</small><strong>${price>0?`A cobrar: $${subtotal.toFixed(2)}`:'Sin precio de venta'}</strong></div><div class="repair-part-stepper"><button type="button" ${paid?'disabled':''} onclick="TSService.changeRepairPartQty('${esc(part.id)}',-1)">−</button><input type="number" min="1" max="${Math.max(1,stock)}" value="${qty}" ${paid?'disabled':''} onchange="TSService.setRepairPartQty('${esc(part.id)}',this.value)"><button type="button" ${paid?'disabled':''} onclick="TSService.changeRepairPartQty('${esc(part.id)}',1)">+</button><button type="button" class="repair-part-remove" ${paid?'disabled':''} onclick="TSService.removeRepairPart('${esc(part.id)}')">×</button></div></article>`}).join('')+`<div class="repair-part-selection-total"><span>Total repuestos a cobrar</span><b>$${selectedTotal.toFixed(2)}</b></div>`:'<div class="repair-part-empty">Selecciona uno o varios repuestos para preparar esta reparación.</div>';
    const existingReserved=orderPartRowsForOrder(order).some(r=>r.status==='reserved');
    const consumeButton=document.getElementById('mConsumePartsButton');
    if(consumeButton){consumeButton.disabled=paid||(!entries.length&&!existingReserved);consumeButton.textContent=entries.length?'Agregar repuesto':existingReserved?'Guardar cambios':'Agregar repuesto';}

    const linked=orderPartRowsForOrder(order).slice(0,30);
    history.innerHTML=linked.length?`<div class="repair-part-history-head"><b>Repuestos de esta reparación</b><small>${linked.length} registro${linked.length===1?'':'s'}</small></div><div class="repair-part-order-list">${linked.map(r=>{const p=serviceParts.find(x=>String(x.id)===String(r.part_id)),qty=r.status==='consumed'?Number(r.quantity_consumed||r.quantity_reserved||0):Number(r.quantity_reserved||0),price=Number(r.sale_price_snapshot||p?.sale_price||0),state=r.status==='consumed'?'Consumido':'Preparado';return `<article class="repair-part-order-card ${r.status==='reserved'?'prepared':'consumed'}">${partThumbHtml(p)}<div><b>${esc(p?.name||'Repuesto')}</b><small>${qty}× · ${price>0?`$${price.toFixed(2)} c/u · $${(qty*price).toFixed(2)}`:'Precio no configurado'}</small></div><span>${state}</span></article>`}).join('')}</div>`:'<small class="repair-part-history-empty">Todavía no hay repuestos preparados para esta orden.</small>';
    if(paid&&consumeButton){consumeButton.disabled=true;consumeButton.textContent='Repuestos consumidos al pagar'}
  }
  function filterRepairParts(value){renderOrderPartPicker(value)}
  function addRepairPart(id){
    const order=orders.find(x=>String(x.id)===String(activeOrderId)),p=serviceParts.find(x=>String(x.id)===String(id));if(!p||!order)return;
    const stock=availablePartQty(p,order);if(stock<=0&&!repairPartSelection.has(String(id)))return toast('Este repuesto no tiene unidades disponibles.','error');
    const key=String(p.id),next=Math.min(Math.max(1,stock),Number(repairPartSelection.get(key)||0)+1);repairPartSelection.set(key,next);renderOrderPartPicker();
  }
  function setRepairPartQty(id,value){
    const order=orders.find(x=>String(x.id)===String(activeOrderId)),p=serviceParts.find(x=>String(x.id)===String(id));if(!p||!order)return;
    const stock=availablePartQty(p,order),qty=Math.max(1,Math.min(Math.max(1,stock),Math.floor(Number(value)||1)));repairPartSelection.set(String(id),qty);renderOrderPartPicker();
  }
  function changeRepairPartQty(id,delta){const current=Number(repairPartSelection.get(String(id))||1);setRepairPartQty(id,current+Number(delta||0))}
  function removeRepairPart(id){repairPartSelection.delete(String(id));renderOrderPartPicker()}
  async function commitRepairParts(){
    const order=orders.find(x=>String(x.id)===String(activeOrderId));if(!order)return toast('No hay una orden activa.','error');if(!requireTechnicianOrder(order))return;
    if(orderPaymentState(order).key==='paid')return toast('La orden ya está pagada; los repuestos ya no pueden modificarse.','error');
    const items=[...repairPartSelection.entries()].map(([id,qty])=>({part:serviceParts.find(p=>String(p.id)===String(id)),qty:Number(qty||0)})).filter(x=>x.part&&x.qty>0);
    for(const item of items){const available=availablePartQty(item.part,order);if(item.qty>available)return toast(`Stock insuficiente para ${item.part.name}. Disponible real: ${available}.`,'error')}
    const existingReserved=orderPartRowsForOrder(order).filter(r=>r.status==='reserved');
    if(!items.length&&!existingReserved.length)return toast('Selecciona al menos un repuesto.','error');
    const summary=items.length?items.map(x=>`${x.qty}× ${x.part.name}${Number(x.part.sale_price||0)>0?` ($${Number(x.part.sale_price).toFixed(2)} c/u)`:''}`).join(', '):'Liberar todos los repuestos preparados';
    if(!confirm(`${items.length?'Se prepararán estos repuestos para':'Se liberarán los repuestos preparados de'} ${order.code}:\n\n${summary}\n\nEl stock físico NO se descontará hasta que la orden quede Pagada. ¿Continuar?`))return;
    const btn=document.getElementById('mConsumePartsButton');if(btn){btn.disabled=true;btn.textContent=items.length?'Preparando…':'Liberando…'}
    const payload=items.map(x=>({part_id:x.part.id,quantity:x.qty}));
    const {error}=await supabaseClient.rpc('ts_save_service_order_parts',{p_order_code:order.code,p_parts:payload,p_actor_email:session?.email||null});
    if(error){renderOrderPartPicker();return toast('No se pudieron preparar los repuestos: '+error.message,'error')}
    const saleTotal=items.reduce((s,x)=>s+Number(x.part.sale_price||0)*x.qty,0);
    const note=items.length?`Repuestos preparados para la reparación: ${summary}${saleTotal?` · Valor de repuestos $${saleTotal.toFixed(2)}`:''}. El inventario se descontará únicamente al completar el pago.`:'Repuestos preparados liberados; vuelven a estar disponibles para otras reparaciones.';
    await supabaseClient.from('service_order_notes').insert({order_id:order.id,note,visibility:'internal',author_name:session?.name||'Soporte',note_type:'Repuesto',status_after:order.status,parts_used:items.map(x=>`${x.qty}× ${x.part.name}`).join(', ')||null});
    await audit(items.length?'prepare_repair_inventory':'release_repair_inventory',order.id,null,{order_code:order.code,items:items.map(x=>({part_id:x.part.id,sku:x.part.sku,name:x.part.name,quantity:x.qty,sale_price:x.part.sale_price??null})),sale_total:saleTotal});
    await loadSupportData();repairPartSelection.clear();orderPartRowsForOrder(order).filter(r=>r.status==='reserved').forEach(r=>repairPartSelection.set(String(r.part_id),Number(r.quantity_reserved||1)));renderOrderPartPicker();toast(items.length?'Repuesto preparado. Se descontará del inventario solo cuando la orden quede Pagada.':'Repuestos liberados y nuevamente disponibles.');
  }


  function supportStatusOptions(order){
    const all=['Solicitud web','Recibido','En diagnóstico','Diagnóstico disponible','Cotización enviada','Aprobado por cliente','En reparación','Esperando repuesto','Listo para entregar','Entregado','No reparado','No aprobado','Cancelado'];
    if(session?.role!=='technician')return all;
    const allowed=['En diagnóstico','Diagnóstico disponible','En reparación','Esperando repuesto','Listo para entregar','No reparado'];
    const current=String(order?.status||'');
    return current&&!allowed.includes(current)?[current,...allowed]:allowed;
  }

  function ordersTable(scope='orders'){
    const filtered=orders.filter(o=>scope==='technical'?['En diagnóstico','Diagnóstico disponible','Aprobado por cliente','En reparación','Esperando repuesto'].includes(o.status):scope==='sales'?['Cotización enviada','No aprobado'].includes(o.status):scope==='logistics'?['Listo para entregar','Entregado'].includes(o.status):true);
    return `<div class="tablewrap"><div class="bitacora-header"><div><h3>Órdenes reales</h3><p>${filtered.length} registro(s) visibles · Los pagos de App Ventas se sincronizan automáticamente</p></div>${can('reception')?'<button onclick="TSService.openServiceOrder()">Nueva recepción</button>':''}</div><table><tr><th>Código</th><th>Cliente</th><th>Equipo</th><th>Técnico / presupuesto</th><th>Estado técnico / pago</th><th>Acciones</th></tr>${filtered.map(o=>{const i=orders.findIndex(x=>String(x.id)===String(o.id)),pay=orderPaymentState(o);return `<tr class="${pay.key==='paid'?'support-order-paid':''}"><td><b>${esc(o.code)}</b><br><small>${esc(o.updated)}</small>${o.receivedByName?`<br><small>Recibió: ${esc(o.receivedByName)}</small>`:''}</td><td>${esc(o.client)}<br><small>${esc(o.phone)}${o.email?' · '+esc(o.email):''}</small></td><td>${esc(o.device)}<br><small>${esc(o.serial||'Sin serial')} ${o.color?'· '+esc(o.color):''}</small></td><td>${esc(o.tech||'Sin asignar')}<br><small>${o.quoteAmount?`${esc(o.quoteCurrency)} ${o.quoteAmount.toFixed(2)} · `:''}${esc(o.quote)}</small></td><td><div class="support-order-state">${paymentBadgeHtml(o)}<small class="support-order-tech-label">Estado técnico</small><select onchange="TSService.updateStatus(${i},this.value)">${supportStatusOptions(o).map(st=>`<option ${o.status===st?'selected':''}>${st}</option>`).join('')}</select></div></td><td><button onclick="TSService.openOrderManager('${esc(o.id)}')">Gestionar</button> ${can('reception')?`<button class="secondary" onclick="TSService.openExistingReception('${esc(o.id)}')">${o.checklist&&Object.keys(o.checklist).length?'Editar recepción':'Recepción'}</button>`:''} <button class="secondary" onclick="TSService.openBitacora('${esc(o.code)}')">Bitácora</button> <button class="secondary" onclick="TSService.printOrder(${i})">Hoja</button> <button class="secondary" onclick="TSService.printLabel(${i})">Etiqueta QR</button></td></tr>`}).join('')||'<tr><td colspan="6">No hay órdenes para este módulo.</td></tr>'}</table></div>`}

  async function openOrderManager(id){
    const o=orders.find(x=>String(x.id)===String(id));if(!o||!requireTechnicianOrder(o))return;
    activeOrderId=o.id;await loadServiceUsers();
    const modal=document.getElementById('orderManagerModal');
    document.getElementById('mOrderTitle').textContent=`${o.code} · ${o.device}`;
    document.getElementById('mTechnician').innerHTML=`<option value="">Sin asignar</option>${serviceUsers.filter(u=>u.activo&&['technician','admin','superadmin'].includes(u.rol)).map(u=>`<option value="${esc(u.email)}" ${u.email===o.tech?'selected':''}>${esc(u.nombre)} · ${esc(u.email)}</option>`).join('')}`;
    mQuoteAmount.value=o.quoteAmount||'';mQuoteStatus.value=o.quote;mQuoteRepairDetails.value=o.quoteRepairDetails||'';mPaymentStatus.value=o.paymentStatus||'Pendiente';mAmountPaid.value=o.amountPaid||'';mPaymentMethod.value=o.paymentMethod||'';mPaymentNotes.value=o.paymentNotes||'';mServiceMode.value=o.serviceMode||'Presencial';mWarrantyDays.value=o.warrantyDays||0;mDeliveryMethod.value=o.deliveryMethod||'';mTrackingCompany.value=o.trackingCompany||'';mTrackingCode.value=o.trackingCode||'';mTechnicalNotes.value=sanitizeTechnicalNotes(o.technicalNotes||'');const techMode=session?.role==='technician';[mTechnician,mPaymentStatus,mAmountPaid,mPaymentMethod,mPaymentNotes,mServiceMode,mDeliveryMethod,mTrackingCompany,mTrackingCode].forEach(el=>{if(el)el.disabled=techMode});const qa=document.getElementById('mQuoteApprovalState');if(qa)qa.innerHTML=o.quoteApprovedAt?`<div class="notice success"><b>Cotización aprobada por el cliente</b><small>${dateText(o.quoteApprovedAt)}${o.quoteClientComment?` · Comentario: ${esc(o.quoteClientComment)}`:''}</small></div>`:o.quoteSentAt?`<div class="notice"><b>Cotización enviada</b><small>${dateText(o.quoteSentAt)} · En espera de aprobación.</small></div>`:'';
    repairPartSelection.clear();orderPartRowsForOrder(o).filter(r=>r.status==='reserved').forEach(r=>repairPartSelection.set(String(r.part_id),Number(r.quantity_reserved||1)));const partSearch=document.getElementById('mPartSearch');if(partSearch)partSearch.value='';renderOrderPartPicker('');
    await renderOrderFiles(o.id);await renderOrderMessages(o.id,{initial:true});startOrderMessagePolling(o.id);const clientTimeline=document.getElementById('mClientTimeline');if(clientTimeline){const visible=clientVisibleNotesForOrder(o.id).slice(0,5);clientTimeline.innerHTML=visible.length?visible.map(clientNoteHtml).join(''):'<small>No hay actualizaciones públicas todavía.</small>'}modal.classList.add('open');
  }
  async function resolveOrderFileMedia(p={}){
    const key=String(p.id||p.storage_path||p.file_url||'');
    const cached=orderFileUrlCache.get(key);
    if(cached&&cached.expires>Date.now()&&cached.url)return cached;
    let url='',mime='',isImage=false,source='';
    if(p.storage_path){
      // V15.15: no confiar en la extensión. El backend inspecciona el archivo real.
      try{
        const secure=await supportSecureAction({action:'file_preview',storage_path:p.storage_path});
        const candidate=String(secure.url||'').trim();
        if(candidate){url=candidate;mime=String(secure.mime||'').toLowerCase();isImage=secure.preview===true||mime.startsWith('image/');source='preview'}
      }catch(error){console.warn('Vista previa segura:',error?.message||error)}
      if(!url||!isImage){
        try{
          const secure=await supportSecureAction({action:'file_data',storage_path:p.storage_path});
          const candidate=String(secure.data_url||'').trim();
          const detectedMime=String(secure.mime||'').toLowerCase();
          if(candidate){url=candidate;mime=detectedMime;isImage=secure.is_image===true||/^data:image\//i.test(candidate)||detectedMime.startsWith('image/');source='data'}
          else if(secure.is_image===true||detectedMime.startsWith('image/')){isImage=true;mime=detectedMime}
        }catch(error){console.warn('Datos seguros del archivo:',error?.message||error)}
      }
      if(!url){
        try{
          const secure=await supportSecureAction({action:'file_url',storage_path:p.storage_path});
          url=String(secure.url||'').trim();source='signed';
        }catch(error){
          console.warn('URL segura de archivo:',error?.message||error);
          try{
            const {data,error:signError}=await supabaseClient.storage.from('service-order-files').createSignedUrl(p.storage_path,3600);
            if(!signError){url=String(data?.signedUrl||'').trim();source='supabase'}
          }catch(_){}
        }
      }
    }
    if(!url&&/^https?:\/\//i.test(String(p.file_url||''))){url=String(p.file_url).trim();source='legacy'}
    // Solo como último respaldo usamos nombre/extensión; ya no decide el flujo principal.
    if(!isImage&&SUPPORT_IMAGE_RE.test(supportFileDescriptor(p)))isImage=true;
    const media={url,mime,isImage,source,expires:Date.now()+(url.startsWith('data:')?15*60*1000:50*60*1000)};
    if(url)orderFileUrlCache.set(key,media);
    return media;
  }
  async function resolveOrderFileUrl(p={}){return (await resolveOrderFileMedia(p)).url||''}
  async function orderFileDataMedia(p={}){
    const key='data:'+String(p.id||p.storage_path||p.file_url||'');
    const cached=orderFileUrlCache.get(key);
    if(cached&&cached.expires>Date.now()&&cached.url)return cached;
    if(!p.storage_path)throw new Error('Esta imagen no tiene una ruta privada válida.');
    const secure=await supportSecureAction({action:'file_data',storage_path:p.storage_path});
    const url=String(secure.data_url||'').trim(),mime=String(secure.mime||'').toLowerCase();
    if(!url||!/^data:image\//i.test(url))throw new Error('El servidor no devolvió una imagen compatible.');
    const media={url,mime,isImage:true,source:String(secure.provider||'private-data'),expires:Date.now()+12*60*1000};
    orderFileUrlCache.set(key,media);return media;
  }
  function orderFilePreviewId(fileId){return 'orderFilePreview-'+String(fileId||'').replace(/[^a-zA-Z0-9_-]/g,'')}
  async function testImageUrl(url){
    if(!url)throw new Error('La imagen no tiene una URL válida.');
    return await new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(url);
      img.onerror=()=>reject(new Error('El navegador no pudo mostrar la imagen privada.'));
      img.src=url;
    });
  }
  async function orderFileDisplayMedia(p={}){
    // Preferimos el proxy privado binario de ThinkStore. Evita meter imágenes grandes
    // dentro de JSON/base64 y mantiene las credenciales de R2 fuera del navegador.
    let firstError=null;
    try{
      const media=await resolveOrderFileMedia(p);
      if(media?.url&&media?.isImage!==false){await testImageUrl(media.url);return media}
    }catch(error){firstError=error;console.warn('Proxy privado de imagen:',error?.message||error)}
    try{
      const fallback=await orderFileDataMedia(p);
      await testImageUrl(fallback.url);return fallback;
    }catch(error){
      console.warn('Fallback de imagen:',error?.message||error);
      throw firstError||error;
    }
  }
  async function hydrateOrderFilePreview(fileId){
    const p=servicePhotos.find(x=>String(x.id)===String(fileId)),holder=document.getElementById(orderFilePreviewId(fileId));if(!p||!holder)return;
    holder.classList.add('loading');holder.classList.remove('broken','ready');holder.onclick=null;
    try{
      const media=await orderFileDisplayMedia(p);
      holder.innerHTML=`<img src="${esc(media.url)}" alt="${esc(p.client_caption||p.label||'Imagen de la reparación')}"><span class="order-file-zoom-label">Ver imagen</span><button type="button" class="order-file-zoom" aria-label="Ampliar imagen" title="Ampliar imagen"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.8"></circle><path d="m15 15 5 5"></path><path d="M10.5 7.8v5.4M7.8 10.5h5.4"></path></svg></button>`;
      holder.classList.remove('loading');holder.classList.add('ready');holder.onclick=()=>openOrderImage(fileId);
    }catch(error){
      console.warn('Miniatura no disponible:',error?.message||error);
      holder.classList.remove('loading');holder.classList.add('broken');holder.innerHTML=`<div class="order-file-preview-error"><span>Vista previa no disponible</span><small>${esc(error?.message||'No se pudo leer la imagen')}</small><button type="button" class="secondary">Reintentar</button></div>`;
      holder.querySelector('button')?.addEventListener('click',e=>{e.stopPropagation();const cacheKey=String(p.id||p.storage_path||p.file_url||'');orderFileUrlCache.delete(cacheKey);orderFileUrlCache.delete('data:'+cacheKey);hydrateOrderFilePreview(fileId)});
    }
  }
  async function openOrderImage(fileId){
    const p=servicePhotos.find(x=>String(x.id)===String(fileId));if(!p)return toast('No encontré la imagen seleccionada.','error');
    let media;try{media=await orderFileDisplayMedia(p)}catch(error){return toast('No se pudo abrir la imagen: '+(error?.message||error),'error')}
    const url=media.url;if(!url)return toast('Este archivo no tiene una vista previa disponible.','error');
    document.getElementById('orderImageLightbox')?.remove();
    const modal=document.createElement('div');modal.id='orderImageLightbox';modal.className='order-image-lightbox';
    modal.innerHTML=`<div class="order-image-lightbox-backdrop" data-close-image></div><div class="order-image-lightbox-card"><button type="button" class="order-image-lightbox-close" data-close-image aria-label="Cerrar vista previa"><span>×</span><small>Cerrar</small></button><div class="order-image-lightbox-stage"><img src="${esc(url)}" alt="${esc(p.client_caption||p.label||'Imagen de la orden')}"></div><div class="order-image-lightbox-caption"><div><b>${esc(p.client_caption||p.label||'Imagen de la orden')}</b><small>Vista privada del Centro de Servicio Técnico</small></div><span>${dateText(p.created_at)}</span></div></div>`;
    document.body.appendChild(modal);document.body.classList.add('order-image-open');
    const close=()=>{modal.remove();document.body.classList.remove('order-image-open');document.removeEventListener('keydown',key)};
    modal.querySelectorAll('[data-close-image]').forEach(el=>el.addEventListener('click',close));
    const key=e=>{if(e.key==='Escape')close()};document.addEventListener('keydown',key);
  }
  async function retryOrderImage(img,fileId){return hydrateOrderFilePreview(fileId)}
  async function renderOrderFiles(orderId){
    const box=document.getElementById('mOrderFiles');if(!box)return;
    const files=servicePhotos.filter(p=>String(p.order_id)===String(orderId));
    box.innerHTML=files.map(p=>{
      const visible=(p.visibility||'internal')==='client';
      const likelyImage=SUPPORT_IMAGE_RE.test(supportFileDescriptor(p))||String(p.file_url||'').includes('private:r2')||String(p.storage_path||'').startsWith('r2:');
      const preview=likelyImage?`<button type="button" id="${orderFilePreviewId(p.id)}" class="order-file-preview image-preview loading" aria-label="Cargando vista previa"><span class="order-file-preview-loader"></span><small>Cargando imagen…</small></button>`:`<div class="order-file-preview document-preview"><span class="file-doc">ARCHIVO</span></div>`;
      const safeId=String(p.id||'').replace(/[^a-zA-Z0-9_-]/g,'');
      const trash=`<button type="button" class="order-file-trash" onclick="event.stopPropagation();TSService.confirmDeleteOrderFile('${esc(p.id)}')" aria-label="Eliminar imagen" title="Eliminar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5M14 11v5"></path></svg></button>`;
      return `<article id="order-file-card-${safeId}" class="order-file-card"><div class="order-file-media-wrap">${preview}${trash}</div><div class="order-file-meta"><b>${esc(p.client_caption||p.label||'Archivo')}</b><small>${dateText(p.created_at)}</small><span class="badge ${visible?'client-visible-badge':''}">${visible?'Visible al cliente':'Interno'}</span></div><div class="order-file-actions"><button type="button" class="secondary" onclick="TSService.toggleOrderFileVisibility('${esc(p.id)}','${visible?'internal':'client'}')">${visible?'Ocultar':'Publicar'}</button></div></article>`;
    }).join('')||'<small>Sin fotografías o archivos.</small>';
    files.filter(p=>SUPPORT_IMAGE_RE.test(supportFileDescriptor(p))||String(p.file_url||'').includes('private:r2')||String(p.storage_path||'').startsWith('r2:')).forEach(p=>hydrateOrderFilePreview(p.id));
  }
  async function uploadOrderFile(){
    const input=document.getElementById('mOrderFile'),file=input?.files?.[0],o=orders.find(x=>String(x.id)===String(activeOrderId)),button=document.getElementById('mOrderFileUploadBtn'),status=document.getElementById('mOrderFileUploadStatus');
    if(!file||!o)return toast('Selecciona una fotografía o archivo.','error');
    if(file.size>8*1024*1024)return toast('El archivo supera el límite de 8 MB.','error');
    const oldLabel=button?.textContent||'Subir archivo';if(button){button.disabled=true;button.textContent='Subiendo…'}if(status){status.hidden=false;status.className='order-file-upload-status working';status.textContent='Preparando y guardando la imagen de forma privada…'}
    try{
      const stored=await storeSupportFile(file,o.id,'orden');
      const visibility=document.getElementById('mOrderFileVisible')?.checked?'client':'internal';
      const caption=document.getElementById('mOrderFileCaption')?.value.trim()||file.name;
      const {error}=await supabaseClient.from('service_order_photos').insert({order_id:o.id,file_url:stored.file_url,storage_path:stored.storage_path,label:file.name,client_caption:caption,visibility,created_by_email:session?.email||null});
      if(error)throw new Error('La imagen llegó a R2, pero no se pudo registrar en la orden: '+error.message);
      orderFileUrlCache.clear();
      await audit('upload_order_file',o.id,null,{label:file.name,storage_path:stored.storage_path,storage_provider:stored.provider,mime:stored.mime,visibility,client_caption:caption});
      await loadSupportData();await renderOrderFiles(o.id);input.value='';if(document.getElementById('mOrderFileCaption'))document.getElementById('mOrderFileCaption').value='';
      if(status){status.className='order-file-upload-status success';status.textContent='Imagen subida correctamente.'}
      toast(visibility==='client'?'Imagen publicada para el cliente.':'Imagen guardada de forma privada en Cloudflare R2.');
    }catch(error){
      console.error('Subida de imagen:',error);if(status){status.className='order-file-upload-status error';status.textContent=error?.message||'No se pudo subir la imagen.'}toast('No se pudo subir: '+(error?.message||error),'error');
    }finally{if(button){button.disabled=false;button.textContent=oldLabel}}
  }
  async function toggleOrderFileVisibility(id,visibility){
    const row=servicePhotos.find(p=>String(p.id)===String(id));if(!row)return;
    const {error}=await supabaseClient.from('service_order_photos').update({visibility}).eq('id',id);if(error)return toast('No se pudo cambiar la visibilidad: '+error.message,'error');
    await audit('update_file_visibility',row.order_id,{visibility:row.visibility},{visibility});await loadSupportData();await renderOrderFiles(row.order_id);toast(visibility==='client'?'Imagen publicada para el cliente.':'Imagen ocultada del portal.');
  }
  function confirmDeleteOrderFile(id){
    const row=servicePhotos.find(p=>String(p.id)===String(id));if(!row)return toast('No encontré la imagen seleccionada.','error');
    document.getElementById('orderFileDeleteModal')?.remove();
    const visible=(row.visibility||'internal')==='client';
    const modal=document.createElement('div');modal.id='orderFileDeleteModal';modal.className='order-file-delete-modal';
    modal.innerHTML=`<div class="order-file-delete-backdrop" data-cancel-delete></div><div class="order-file-delete-card"><div class="order-file-delete-icon"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5M14 11v5"></path></svg></div><h3>¿Eliminar esta imagen?</h3><p><b>${esc(row.client_caption||row.label||'Imagen de la reparación')}</b></p><small>${visible?'Está publicada para el cliente. Al eliminarla también desaparecerá de su seguimiento.':'Se eliminará definitivamente de esta orden y del almacenamiento privado.'}</small><div class="order-file-delete-buttons"><button type="button" class="secondary" data-cancel-delete>Cancelar</button><button type="button" class="danger" data-confirm-delete>Eliminar definitivamente</button></div></div>`;
    document.body.appendChild(modal);document.body.classList.add('order-file-delete-open');
    const close=()=>{modal.remove();document.body.classList.remove('order-file-delete-open')};
    modal.querySelectorAll('[data-cancel-delete]').forEach(el=>el.addEventListener('click',close));
    modal.querySelector('[data-confirm-delete]')?.addEventListener('click',async e=>{const btn=e.currentTarget;btn.disabled=true;btn.textContent='Eliminando…';try{await deleteOrderFile(id);close()}catch(error){btn.disabled=false;btn.textContent='Eliminar definitivamente';toast('No se pudo eliminar: '+(error?.message||error),'error')}});
  }
  async function deleteOrderFile(id){
    const row=servicePhotos.find(p=>String(p.id)===String(id));if(!row)throw new Error('La imagen ya no existe.');
    const card=document.getElementById('order-file-card-'+String(id).replace(/[^a-zA-Z0-9_-]/g,''));if(card)card.classList.add('deleting');
    try{await supportSecureAction({action:'delete_order_file',file_id:String(id)})}catch(error){if(card)card.classList.remove('deleting');throw error}
    const cacheKey=String(row.id||row.storage_path||row.file_url||'');orderFileUrlCache.delete(cacheKey);orderFileUrlCache.delete('data:'+cacheKey);
    const orderId=row.order_id;await loadSupportData();await renderOrderFiles(orderId);
    toast('Imagen eliminada correctamente.');
  }
  async function renderOrderMessages(orderId,options={}){
    const box=document.getElementById('mOrderMessages');if(!box)return;
    const {data,error}=await supabaseClient.from('service_order_messages').select('*').eq('order_id',orderId).order('created_at',{ascending:true});
    if(error){box.innerHTML=`<div class="chat-empty-state"><span>!</span><small>No se pudieron cargar los mensajes: ${esc(error.message)}</small></div>`;return}
    const rows=data||[];
    const newHash=rows.map(chatMessageKey).join('|');
    const oldHash=orderMessageLastHash.get(String(orderId));
    if(options.preserveScroll&&oldHash===newHash)return;
    const previousKey=orderMessageLastKey.get(String(orderId));
    const newest=rows[rows.length-1]||null;
    const newestKey=newest?chatMessageKey(newest):'';
    const hasNew=Boolean(previousKey&&newestKey&&previousKey!==newestKey);
    const shouldNotify=Boolean(options.notifyIncoming&&hasNew&&newest?.sender_type==='client');
    const wasNearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<80;
    box.innerHTML=rows.length?rows.map((m,index)=>{
      const isClient=m.sender_type==='client';
      const isLast=index===rows.length-1;
      const animateIncoming=Boolean(hasNew&&isLast&&isClient);
      const animateOutgoing=Boolean(options.animateLast&&isLast&&!isClient);
      return `<div class="staff-chat-row ${isClient?'client-row':'staff-row'} ${animateIncoming?'chat-arrive-in':''} ${animateOutgoing?'chat-send-pop':''}"><div class="staff-chat-bubble ${isClient?'from-client':'from-staff'}"><p>${esc(m.message)}</p></div><div class="staff-chat-meta ${isClient?'client-meta':'staff-meta'}"><b>${esc(isClient?(m.sender_name||'Cliente'):(m.sender_name||'ThinkStore'))}</b><span>·</span><small>${dateText(m.created_at)}</small></div></div>`
    }).join(''):'<div class="chat-empty-state"><span>•••</span><b>Sin mensajes todavía</b><small>Cuando el cliente escriba desde su seguimiento, aparecerá aquí.</small></div>';
    if(options.initial||wasNearBottom||options.animateLast||hasNew)box.scrollTop=box.scrollHeight;
    orderMessageLastHash.set(String(orderId),newHash);
    orderMessageLastKey.set(String(orderId),newestKey);
    if(shouldNotify){playChatSound('incoming');box.classList.remove('chat-pulse');void box.offsetWidth;box.classList.add('chat-pulse')}
  }
  async function sendStaffOrderMessage(){
    const o=orders.find(x=>String(x.id)===String(activeOrderId));const input=document.getElementById('mOrderMessage');const message=input?.value.trim();if(!o||!message)return toast('Escribe un mensaje para el cliente.','error');
    if(message.length>2000)return toast('El mensaje no puede superar 2000 caracteres.','error');
    ensureChatAudio();
    const sendButton=input?.parentElement?.querySelector('button');if(sendButton){sendButton.disabled=true;sendButton.classList.add('is-sending')}
    const row={order_id:o.id,sender_type:'staff',sender_name:session?.name||'ThinkStore Soporte',message,created_by_email:session?.email||null};
    const {error}=await supabaseClient.from('service_order_messages').insert(row);
    if(error){if(sendButton){sendButton.disabled=false;sendButton.classList.remove('is-sending')}return toast('No se pudo enviar el mensaje: '+error.message,'error')}
    input.value='';playChatSound('outgoing');await audit('staff_message',o.id,null,{message});await renderOrderMessages(o.id,{animateLast:true});
    if(sendButton){sendButton.disabled=false;sendButton.classList.remove('is-sending');sendButton.classList.add('sent-ok');setTimeout(()=>sendButton.classList.remove('sent-ok'),520)}
    toast('Mensaje enviado al cliente.');
  }
  function openCashierForOrder(){
    const o=orders.find(x=>String(x.id)===String(activeOrderId));if(!o)return toast('No hay una orden activa.','error');
    const base=String(window.THINKSTORE_SALES_URL||'https://thinkstore.com.ve/staff/').replace(/\/?$/,'/');
    const url=base+'?service_order='+encodeURIComponent(o.code)+'#repairs';
    window.open(url,'_blank','noopener');
  }

  async function saveOrderManager(e){
    e.preventDefault();const o=orders.find(x=>String(x.id)===String(activeOrderId));if(!o||!requireTechnicianOrder(o))return;
    const quoteAmount=mQuoteAmount.value?Number(mQuoteAmount.value):0;
    const cleanTechnicalNotes=sanitizeTechnicalNotes(mTechnicalNotes.value.trim());
    const changes=session?.role==='technician'?{quote_amount:quoteAmount||null,quote_status:mQuoteStatus.value,quote_repair_details:mQuoteRepairDetails.value.trim()||null,warranty_days:Number(mWarrantyDays.value||0),technical_notes:cleanTechnicalNotes||null}:{assigned_technician_email:mTechnician.value||null,quote_amount:quoteAmount||null,quote_status:mQuoteStatus.value,quote_repair_details:mQuoteRepairDetails.value.trim()||null,service_mode:mServiceMode.value||'Presencial',warranty_days:Number(mWarrantyDays.value||0),delivery_method:mDeliveryMethod.value.trim()||null,tracking_company:mTrackingCompany.value.trim()||null,tracking_code:mTrackingCode.value.trim()||null,technical_notes:cleanTechnicalNotes||null};
    const {error}=await supabaseClient.from('service_orders').update(changes).eq('id',o.id);if(error){toast('No se pudo guardar: '+error.message,'error');return}
    if(mQuoteStatus.value==='Rechazado')await releasePreparedParts(o,'Cotización marcada como rechazada');
    await supabaseClient.from('service_order_notes').insert({order_id:o.id,note:`Datos operativos actualizados: técnico, presupuesto, garantía, entrega y diagnóstico. La cobranza se gestiona desde App Ventas.`,visibility:'internal',author_name:session?.name||'Soporte',note_type:'Gestión de orden',status_after:o.status});await audit('update_order_details',o.id,o,changes);
    await loadSupportData();closeModals();await renderPanel('orders');toast('Orden actualizada correctamente.');
  }

  async function sendQuoteToClient(){
    const o=orders.find(x=>String(x.id)===String(activeOrderId));if(!o)return;
    const amount=Number(mQuoteAmount.value||0);
    const details=mQuoteRepairDetails.value.trim();
    if(!o.email)return toast('La orden no tiene correo del cliente.','error');
    if(!(amount>0))return toast('Indica el monto de la cotización antes de enviarla.','error');
    if(!details)return toast('Detalla la reparación propuesta antes de enviar la cotización.','error');
    if(!confirm(`¿Enviar cotización de ${o.quoteCurrency||'USD'} ${amount.toFixed(2)} a ${o.email}?`))return;

    const now=new Date().toISOString();
    const changes={
      assigned_technician_email:mTechnician.value||o.tech||null,
      quote_amount:amount,
      quote_status:'Enviado',
      quote_repair_details:details,
      quote_sent_at:now,
      quote_approved_at:null,
      quote_terms_accepted_at:null,
      quote_terms_version:null,
      quote_client_comment:null,
      status:'Cotización enviada',
      updated_at:now
    };
    const {error}=await supabaseClient.from('service_orders').update(changes).eq('id',o.id);
    if(error)return toast('No se pudo enviar la cotización: '+error.message,'error');

    await supabaseClient.from('service_order_notes').insert({
      order_id:o.id,
      note:'Cotización enviada para revisión y aprobación del cliente.',
      visibility:'client',
      author_name:session?.name||'ThinkStore Soporte',
      note_type:'Presupuesto',
      status_after:'Cotización enviada',
      client_title:'Cotización enviada'
    });
    await audit('quote_sent',o.id,{status:o.status,quote:o.quote,quoteAmount:o.quoteAmount},{...changes});
    await loadSupportData();
    const current=orders.find(x=>String(x.id)===String(o.id))||{...o,...changes,quoteAmount:amount,quoteRepairDetails:details};
    await sendOrderEmail(current,false);
    closeModals();await renderPanel('sales');
    toast('Cotización enviada. El cliente puede revisarla y aprobarla desde su seguimiento.');
  }
  async function notifyOrderClient(){
    const o=orders.find(x=>String(x.id)===String(activeOrderId));if(!o?.email)return toast('La orden no tiene correo del cliente.','error');
    if(!confirm(`¿Enviar actualización de ${o.code} a ${o.email}?`))return;
    await sendOrderEmail(o,false);
  }
  async function sendOrderEmail(o,silent=true){
    try{const data=await supportSecureAction({action:'notify_client',order_id:o.id});if(!silent)toast('Correo enviado al cliente.');return data}
    catch(error){if(!silent)toast(error.message||'No se pudo enviar el correo.','error');throw error}
  }


  function deviceClass(category){
    const c=(category||'').toLowerCase();
    if(c.includes('iphone')) return 'device-iphone';
    if(c.includes('ipad')) return 'device-ipad';
    if(c.includes('airpods')) return 'device-airpods';
    if(c.includes('watch')) return 'device-watch';
    if(c.includes('macbook')) return 'device-macbook';
    if(c.includes('imac')) return 'device-imac';
    if(c.includes('mac mini')) return 'device-mini';
    if(c.includes('mac studio')) return 'device-studio';
    if(c.includes('mac pro')) return 'device-macpro';
    return 'device-generic';
  }
  function findAppleDevice(value){
    const v=(value||'').trim().toLowerCase();
    if(!v)return null;
    return appleDevices.find(d=>d.name.toLowerCase()===v) || appleDevices.find(d=>d.name.toLowerCase().includes(v));
  }
  function findAppleDeviceExact(value){
    const v=(value||'').trim().toLowerCase();
    if(!v)return null;
    return appleDevices.find(d=>d.name.toLowerCase()===v)||null;
  }
  function fillAppleDeviceList(){
    const list=document.getElementById('appleDeviceModels');
    if(!list) return;
    list.innerHTML=appleDevices.map(d=>`<option value="${d.name}">${d.category}</option>`).join('');
  }
  const deviceVisualAssets={
    'iphone x':{
      displayScale:{all:'92%',front:'92%',side:'92%',back:'92%'},
      thumbnail:'assets/iphone-x-thumbnail.png',
      inspection:'assets/iphone-x-inspection.png',
      inspectionViews:{
        all:'assets/iphone-x-inspection.png',
        front:'assets/iphone-x-front.png',
        side:'assets/iphone-x-side.png',
        back:'assets/iphone-x-back.png'
      }
    },
    'iphone 8 plus':{
      displayScale:{all:'88%',front:'92%',side:'92%',back:'92%'},
      thumbnail:'assets/iphone-8-plus-thumbnail.png',
      inspection:'assets/iphone-8-plus-inspection.png',
      inspectionViews:{
        all:'assets/iphone-8-plus-inspection.png',
        front:'assets/iphone-8-plus-front.png',
        side:'assets/iphone-8-plus-side.png',
        back:'assets/iphone-8-plus-back.png'
      }
    },
    'iphone 8':{
      thumbnail:'assets/iphone-8-thumbnail.png',
      inspection:'assets/iphone-8-inspection.png',
      inspectionViews:{
        all:'assets/iphone-8-inspection.png',
        front:'assets/iphone-8-front.png',
        side:'assets/iphone-8-side.png',
        back:'assets/iphone-8-back.png'
      }
    },
    'iphone 16':{
      thumbnail:'assets/iphone-16-thumbnail.png',
      inspection:'assets/iphone-16-inspection.png',
      inspectionViews:{
        all:'assets/iphone-16-inspection.png',
        front:'assets/iphone-16-front.png',
        side:'assets/iphone-16-side.png',
        back:'assets/iphone-16-back.png'
      }
    }
  };
  function visualAssetFor(name){
    return deviceVisualAssets[(name||'').trim().toLowerCase()]||null;
  }
  let currentDeviceView='all';

  let receptionDeviceCategory='apple';
  let receptionQuickFailures=[];
  const receptionPhotoFiles={front:null,back:null,detail:null};
  const receptionCatalog={
    apple:{brand:'Apple',categories:['iPhone','iPad','AirPods','Apple Watch','MacBook Air','MacBook Pro','iMac','Mac mini','Mac Studio','Mac Pro'],placeholder:'Buscar modelo de iPhone, iPad, Mac, AirPods, Apple Watch…',failures:['No enciende','Pantalla rota','No carga','Batería','Cámara','Audio','Face ID / Touch ID','Humedad','Software','Se reinicia'],checklist:[['Pantalla','Funciona','No funciona','No aplica'],['Táctil','Funciona','No funciona','No aplica'],['Botones','Funciona','No funciona','No aplica'],['Cámara frontal','Funciona','No funciona','No aplica'],['Cámara trasera','Funciona','No funciona','No aplica'],['Flash','Funciona','No funciona','No aplica'],['Altavoz','Funciona','No funciona','No aplica'],['Micrófono','Funciona','No funciona','No aplica'],['Auricular','Funciona','No funciona','No aplica'],['WiFi','Funciona','No funciona','No aplica'],['Bluetooth','Funciona','No funciona','No aplica'],['Red celular','No aplica','Funciona','No funciona'],['Batería','No aplica','Funciona','No retiene carga'],['Cargador','No aplica','Incluido','No incluido'],['Face ID / Touch ID','No aplica','Funciona','No funciona'],['iCloud / Cuenta','No aplica','Cerrada','Abierta'],['SIM','No aplica','Incluida','No incluida']]},
    other:{brand:'',categories:['Android','Laptop','Tablet','Audio','Smartwatch','Otro'],placeholder:'Escribe marca y modelo del equipo…',failures:['No enciende','Pantalla rota','No carga','Batería','Puerto de carga','Audio','Cámara','WiFi / Bluetooth','Humedad','Software'],checklist:[['Pantalla','Funciona','No funciona','No aplica'],['Táctil','Funciona','No funciona','No aplica'],['Botones','Funciona','No funciona','No aplica'],['Cámara','Funciona','No funciona','No aplica'],['Altavoz','Funciona','No funciona','No aplica'],['Micrófono','Funciona','No funciona','No aplica'],['WiFi','Funciona','No funciona','No aplica'],['Bluetooth','Funciona','No funciona','No aplica'],['USB / Puertos','Funciona','No funciona','No aplica'],['Carga','Funciona','No funciona','No aplica'],['Batería','Funciona','No retiene carga','No aplica'],['Teclado / Controles','No aplica','Funciona','No funciona']]},
    gaming:{brand:'',categories:['PlayStation','Xbox','Nintendo','Consola portátil','Control / mando','Otro gaming'],placeholder:'Escribe consola o modelo del control…',failures:['No enciende','No da video','HDMI','Sobrecalienta','No lee discos','No carga','Joystick drift','Botones / gatillos','Conectividad','Humedad'],checklist:[['Encendido','Funciona','No funciona','No aplica'],['Video / HDMI','Funciona','No funciona','No aplica'],['Puerto HDMI','Funciona','No funciona','No aplica'],['USB / Puertos','Funciona','No funciona','No aplica'],['WiFi / Bluetooth','Funciona','No funciona','No aplica'],['Lector','Funciona','No funciona','No aplica'],['Almacenamiento','Funciona','No funciona','No aplica'],['Ventilación','Funciona','No funciona','No aplica'],['Temperatura','Normal','Alta','No aplica'],['Joystick / sticks','Funciona','Drift / falla','No aplica'],['Botones / gatillos','Funciona','No funciona','No aplica'],['Carga / batería','Funciona','No funciona','No aplica']]}
  };

  function applyInspectionView(asset,view){
    const diagram=document.getElementById('deviceDiagram');
    if(!diagram||!asset)return;
    const selected=(asset.inspectionViews&&asset.inspectionViews[view])||asset.inspection;
    diagram.style.backgroundImage=selected?`url("${selected}")`:'';
    diagram.style.backgroundSize=selected?((asset.displayScale&&asset.displayScale[view])||'contain'):'';
    diagram.style.backgroundPosition=selected?'center':'';
    diagram.style.backgroundRepeat=selected?'no-repeat':'';
    diagram.style.backgroundColor=selected?'#070a10':'';
  }
  function applyDeviceVisualAssets(d){
    const asset=visualAssetFor(d?.name||'');
    const art=document.getElementById('selectedDeviceArt');
    const img=document.getElementById('selectedDeviceImg');
    const diagram=document.getElementById('deviceDiagram');
    if(art){
      art.style.backgroundImage='';
      art.classList.toggle('has-model-image',!!asset);
    }
    if(img){
      if(asset){ img.src=asset.thumbnail; img.alt=d?.name||'Equipo'; img.style.display='block'; }
      else { img.removeAttribute('src'); img.alt=''; img.style.display='none'; }
    }
    if(diagram){
      if(asset) applyInspectionView(asset,currentDeviceView);
      else { diagram.style.backgroundImage=''; diagram.style.backgroundSize=''; diagram.style.backgroundPosition=''; diagram.style.backgroundRepeat=''; diagram.style.backgroundColor=''; }
      diagram.classList.toggle('has-model-image',!!asset);
      diagram.querySelectorAll('.diagram-side,.diagram-front,.diagram-back,.diagram-top,.diagram-bottom').forEach(el=>{
        el.style.display=asset?'none':'';
      });
      const damageLayer=diagram.querySelector('.damage-layer');
      if(damageLayer) damageLayer.style.display='block';
    }
  }

  function previewSelectedDevice(value){
    const d=findAppleDevice(value);
    const name=document.getElementById('selectedDeviceName');
    const meta=document.getElementById('selectedDeviceMeta');
    const art=document.getElementById('selectedDeviceArt');
    const large=document.getElementById('serviceDeviceArt');
    const title=document.getElementById('serviceDeviceTitle');
    const desc=document.getElementById('serviceDeviceDesc');
    if(!d){
      if(name) name.textContent='Seleccione un modelo Apple';
      if(meta) meta.textContent='Busca y selecciona un modelo del listado.';
      if(art) art.className='device-art device-generic';
      const selectedImg=document.getElementById('selectedDeviceImg'); if(selectedImg){selectedImg.removeAttribute('src');selectedImg.style.display='none';}
      if(large) large.className='device-art-large device-generic';
      if(title) title.textContent='Detalle del equipo';
      if(desc) desc.textContent='Selecciona un modelo para cargar su diseño referencial en recepción.';
      const diagram=document.getElementById('deviceDiagram');
      if(diagram){diagram.className='device-diagram device-diagram-generic';diagram.dataset.model='';diagram.style.backgroundImage='';diagram.classList.remove('has-model-image');clearDamageMarks();}
      return;
    }
    if(name) name.textContent=d.name;
    if(meta) meta.textContent=d.category+' · Diseño referencial para recepción';
    if(art) art.className='device-art '+deviceClass(d.category);
    if(large) large.className='device-art-large '+deviceClass(d.category);
    if(title) title.textContent=d.name;
    if(desc) desc.textContent='Categoría: '+d.category+'. Esquema referencial para registrar condición física, accesorios y observaciones.';
    currentDeviceView='all';
    document.querySelectorAll('.device-view-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.view==='all'));
    updateDeviceDiagram(d);
    applyDeviceVisualAssets(d);
  }
  function selectDeviceFromSearch(value){handleModelSearch(value)}


  let currentDamageTool='detalle';
  let damageMarks=[];


  function modelGeneration(name){
    const n=(name||'').toLowerCase();
    if(n.includes('iphone 8') || n.includes('se')) return 'classic';
    if(n.includes('iphone x') || n.includes('iphone xr') || n.includes('iphone xs') || n.includes('iphone 11')) return 'notch';
    if(n.includes('iphone 12') || n.includes('iphone 13') || n.includes('iphone 14') && !n.includes('pro')) return 'notch-flat';
    if(n.includes('iphone 14 pro') || n.includes('iphone 15') || n.includes('iphone 16') || n.includes('iphone 17')) return 'dynamic';
    if(n.includes('ipad')) return 'tablet';
    if(n.includes('airpods max')) return 'headphones';
    if(n.includes('airpods')) return 'pods';
    if(n.includes('watch') && n.includes('ultra')) return 'watch-ultra';
    if(n.includes('watch')) return 'watch';
    if(n.includes('macbook')) return 'macbook';
    if(n.includes('imac')) return 'imac';
    if(n.includes('mac mini')) return 'mini';
    if(n.includes('mac studio')) return 'studio';
    if(n.includes('mac pro')) return 'macpro';
    return 'generic';
  }

  function modelFinish(name){
    const n=(name||'').toLowerCase();
    if(n.includes('pro max') || n.includes('pro') || n.includes('max')) return 'pro';
    if(n.includes('air')) return 'air';
    if(n.includes('mini')) return 'mini';
    if(n.includes('ultra')) return 'ultra';
    return 'base';
  }

  function updateDeviceDiagram(d){
    const diagram=document.getElementById('deviceDiagram');
    if(!diagram)return;
    const gen=modelGeneration(d?.name||'');
    const finish=modelFinish(d?.name||'');
    const cat=d?.category||'';
    diagram.className=`device-diagram ${diagramClassFor(cat)} model-${gen} finish-${finish}`;
    diagram.dataset.model=d?.name||'';
    clearDamageMarks();
  }

  function setDeviceView(view){
    currentDeviceView=view||'all';
    const diagram=document.getElementById('deviceDiagram');
    if(diagram){
      diagram.dataset.view=currentDeviceView;
      const d=findAppleDevice(document.getElementById('oDevice')?.value||document.getElementById('deviceModelSearch')?.value||'');
      const asset=visualAssetFor(d?.name||'');
      if(asset) applyInspectionView(asset,currentDeviceView);
    }
    document.querySelectorAll('.device-view-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===currentDeviceView));
    renderDamageMarks();
  }


  function diagramClassFor(category){
    const c=(category||'').toLowerCase();
    if(c.includes('iphone')) return 'device-diagram-iphone';
    if(c.includes('ipad')) return 'device-diagram-ipad';
    if(c.includes('airpods')) return 'device-diagram-airpods';
    if(c.includes('watch')) return 'device-diagram-watch';
    if(c.includes('macbook')) return 'device-diagram-macbook';
    if(c.includes('imac')) return 'device-diagram-imac';
    if(c.includes('mac mini')) return 'device-diagram-mini';
    if(c.includes('mac studio')) return 'device-diagram-studio';
    if(c.includes('mac pro')) return 'device-diagram-macpro';
    return 'device-diagram-generic';
  }

  function setDamageTool(tool){
    currentDamageTool=tool;
    document.querySelectorAll('.mark-tool,.mark-dot').forEach(b=>b.classList.toggle('active',b.dataset.mark===tool));
  }

  function addDamageMark(event){
    const layer=document.getElementById('damageLayer');
    const box=document.getElementById('deviceDiagram');
    if(!layer||!box)return;
    const rect=box.getBoundingClientRect();
    const x=((event.clientX-rect.left)/rect.width)*100;
    const y=((event.clientY-rect.top)/rect.height)*100;
    const mark={x,y,type:currentDamageTool,view:currentDeviceView};
    damageMarks.push(mark);
    renderDamageMarks();
  }

  function renderDamageMarks(){
    const layer=document.getElementById('damageLayer');
    const visual=document.getElementById('oVisual');
    if(!layer)return;
    const visible=damageMarks.map((m,i)=>({...m,index:i})).filter(m=>(m.view||'all')===currentDeviceView);
    layer.innerHTML=visible.map(m=>`<span class="damage-mark damage-${m.type}" style="left:${m.x}%;top:${m.y}%">${m.index+1}</span>`).join('');
    if(visual) visual.value=damageMarks.map((m,i)=>`${i+1}. ${m.type} [${m.view||'all'}] en X:${m.x.toFixed(1)} Y:${m.y.toFixed(1)}`).join(' | ');
  }

  function clearDamageMarks(){
    damageMarks=[];
    renderDamageMarks();
  }

  function filterDeviceCategory(category){
    if(receptionDeviceCategory!=='apple'){renderReceptionSummary();return}
    const list=document.getElementById('appleDeviceModels');
    const filtered=category?appleDevices.filter(d=>d.category===category||d.category.includes(category)):appleDevices;
    if(list)list.innerHTML=filtered.map(d=>`<option value="${d.name}">${d.category}</option>`).join('');
    const pill=document.getElementById('modelCategoryPill');if(pill)pill.textContent=category||'Apple';
    if(!document.getElementById('modelDropdown')?.hidden)renderModelDropdown(true);
    else{const count=document.getElementById('modelSelectorCount');if(count)count.textContent=`${filtered.length} modelo${filtered.length===1?'':'s'}${category?' · '+category:' · catálogo Apple'}`;}
    renderReceptionSummary();
  }



  function collectReceptionClientMeta(){
    return{
      name:document.getElementById('oClient')?.value?.trim()||'',
      phone:document.getElementById('oPhone')?.value?.trim()||'',
      email:document.getElementById('oEmail')?.value?.trim()||'',
      type:document.getElementById('oClientType')?.value||'Particular',
      document:document.getElementById('oClientDocument')?.value?.trim()||'',
      phone_alt:document.getElementById('oPhoneAlt')?.value?.trim()||'',
      company:document.getElementById('oCompany')?.value?.trim()||'',
      address_short:document.getElementById('oAddressShort')?.value?.trim()||'',
      city:document.getElementById('oCity')?.value?.trim()||'',
      state:document.getElementById('oState')?.value?.trim()||'',
      contact_method:document.getElementById('oContactMethod')?.value||'WhatsApp'
    };
  }
  function applyReceptionClientMeta(meta={}){
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value??''};
    set('oClientType',meta.type||'Particular');
    set('oClientDocument',meta.document||'');
    set('oPhoneAlt',meta.phone_alt||'');
    set('oCompany',meta.company||'');
    set('oAddressShort',meta.address_short||'');
    set('oCity',meta.city||'');
    set('oState',meta.state||'');
    set('oContactMethod',meta.contact_method||'WhatsApp');
  }
  function clearReceptionClientMeta(){applyReceptionClientMeta({})}

  function deviceCategoryGlyph(category){
    const c=String(category||'').toLowerCase();
    if(c.includes('iphone'))return '▯';
    if(c.includes('ipad'))return '▭';
    if(c.includes('airpods'))return '◉';
    if(c.includes('watch'))return '◌';
    if(c.includes('macbook'))return '⌘';
    if(c.includes('imac'))return '◫';
    if(c.includes('mini')||c.includes('studio')||c.includes('pro'))return '◇';
    return '';
  }
  function modelListForCurrentCategory(ignoreQuery=false){
    const category=document.getElementById('oCategory')?.value||'';
    const query=ignoreQuery?'':(document.getElementById('deviceModelSearch')?.value||'').trim().toLowerCase();
    let rows=appleDevices.slice();
    if(category)rows=rows.filter(d=>d.category===category||d.category.includes(category));
    if(query)rows=rows.filter(d=>d.name.toLowerCase().includes(query)||d.category.toLowerCase().includes(query));
    return rows;
  }
  function renderModelDropdown(ignoreQuery=false){
    const box=document.getElementById('modelDropdown');if(!box||receptionDeviceCategory!=='apple')return;
    const rows=modelListForCurrentCategory(ignoreQuery),category=document.getElementById('oCategory')?.value||'',count=document.getElementById('modelSelectorCount'),pill=document.getElementById('modelCategoryPill');
    if(count)count.textContent=`${rows.length} modelo${rows.length===1?'':'s'}${category?' · '+category:' · catálogo Apple'}`;
    if(pill)pill.textContent=category||'Apple';
    if(!rows.length){box.innerHTML='<div class="premium-model-empty"><b>No encontré modelos</b><span>Prueba otra búsqueda o cambia la categoría.</span></div>';return}
    const groups={};rows.forEach(d=>(groups[d.category]||(groups[d.category]=[])).push(d));
    box.innerHTML=Object.entries(groups).map(([group,items])=>`<section class="premium-model-group"><header><span>${deviceCategoryGlyph(group)}</span><b>${esc(group)}</b><small>${items.length}</small></header><div>${items.map(d=>{const asset=visualAssetFor(d.name);return `<button type="button" class="premium-model-option" data-model="${esc(d.name)}">${asset?.thumbnail?`<img src="${asset.thumbnail}" alt="">`:`<span class="premium-model-glyph">${deviceCategoryGlyph(d.category)}</span>`}<span><b>${esc(d.name)}</b><small>${esc(d.category)}</small></span><em>Seleccionar</em></button>`}).join('')}</div></section>`).join('');
    box.querySelectorAll('[data-model]').forEach(btn=>btn.onclick=()=>chooseModelFromDropdown(btn.dataset.model));
  }
  function openModelDropdown(ignoreQuery=false){
    if(receptionDeviceCategory!=='apple')return;
    const box=document.getElementById('modelDropdown'),toggle=document.getElementById('modelDropdownToggle');if(!box)return;
    renderModelDropdown(ignoreQuery);box.hidden=false;document.getElementById('premiumModelSelect')?.classList.add('open');
    if(toggle)toggle.setAttribute('aria-expanded','true');
  }
  function closeModelDropdown(){
    const box=document.getElementById('modelDropdown'),toggle=document.getElementById('modelDropdownToggle');
    if(box)box.hidden=true;document.getElementById('premiumModelSelect')?.classList.remove('open');
    if(toggle)toggle.setAttribute('aria-expanded','false');
  }
  function toggleModelDropdown(){
    const box=document.getElementById('modelDropdown');if(!box)return;
    if(box.hidden)openModelDropdown(true);else closeModelDropdown();
  }
  function handleModelSearch(value){
    if(receptionDeviceCategory!=='apple'){oDevice.value=value;updateReceptionDeviceVisual();renderReceptionSummary();return}
    oDevice.value=value;
    const exact=findAppleDeviceExact(value);
    if(exact){oDevice.value=exact.name;oCategory.value=exact.category;previewSelectedDevice(exact.name)}
    else if(!String(value||'').trim())previewSelectedDevice('');
    openModelDropdown(false);renderReceptionSummary();
  }
  function chooseModelFromDropdown(name){
    const d=findAppleDeviceExact(name);if(!d)return;
    const search=document.getElementById('deviceModelSearch');if(search)search.value=d.name;
    oDevice.value=d.name;oCategory.value=d.category;previewSelectedDevice(d.name);filterDeviceCategory(d.category);closeModelDropdown();renderReceptionSummary();
  }
  function clearSelectedModel(){
    const search=document.getElementById('deviceModelSearch');if(search)search.value='';
    oDevice.value='';previewSelectedDevice('');closeModelDropdown();renderReceptionSummary();
  }

  function receptionChecklistHtml(items){return items.map(([name,...values])=>`<label><input type="checkbox" /> ${esc(name)} <select>${values.map(v=>`<option>${esc(v)}</option>`).join('')}</select></label>`).join('')}
  function renderReceptionQuickFailures(){
    const box=document.getElementById('quickFailureChips');if(!box)return;
    box.innerHTML=(receptionCatalog[receptionDeviceCategory]?.failures||[]).map(x=>`<button type="button" class="${receptionQuickFailures.includes(x)?'active':''}" data-failure="${esc(x)}">${esc(x)}</button>`).join('');
    box.querySelectorAll('[data-failure]').forEach(b=>b.onclick=()=>toggleQuickFailure(b.dataset.failure));
  }
  function renderAdaptiveReceptionChecklist(savedChecklist=null){
    const box=document.getElementById('receptionChecklist');if(!box)return;
    box.innerHTML=receptionChecklistHtml(receptionCatalog[receptionDeviceCategory]?.checklist||[]);
    if(savedChecklist)applyReceptionChecklist(savedChecklist);
  }
  function renderReceptionSummary(){
    const box=document.getElementById('receptionV2Summary');if(!box)return;
    const kindLabel=receptionDeviceCategory==='apple'?'Apple':receptionDeviceCategory==='gaming'?'Consolas y controles':'Otros equipos';
    const photoCount=Object.values(receptionPhotoFiles).filter(Boolean).length;
    const checklistDone=[...document.querySelectorAll('#receptionChecklist input[type=checkbox]')].filter(x=>x.checked).length;
    const model=document.getElementById('oDevice')?.value?.trim()||'Sin modelo';
    const issue=document.getElementById('oIssue')?.value?.trim()||'Sin falla reportada';
    const doc=document.getElementById('oClientDocument')?.value?.trim()||'Sin documento';
    const location=[document.getElementById('oCity')?.value?.trim(),document.getElementById('oState')?.value?.trim()].filter(Boolean).join(' · ')||'Sin ubicación';
    box.innerHTML=`<div><span>Tipo</span><b>${esc(kindLabel)}</b></div><div><span>Equipo</span><b>${esc(model)}</b></div><div><span>Cédula / RIF</span><b>${esc(doc)}</b></div><div><span>Ubicación</span><b>${esc(location)}</b></div><div><span>Falla</span><b>${esc(issue)}</b></div><div><span>Pruebas marcadas</span><b>${checklistDone}</b></div><div><span>Fotos</span><b>${photoCount} / 3</b></div>${receptionQuickFailures.length?`<div class="wide"><span>Fallas rápidas</span><b>${receptionQuickFailures.map(esc).join(' · ')}</b></div>`:''}`;
    const count=document.getElementById('receptionPhotoCount');if(count)count.textContent=`${photoCount} / 3`;
  }
  function updateReceptionDeviceVisual(){
    const title=document.getElementById('serviceDeviceTitle'),desc=document.getElementById('serviceDeviceDesc'),selectedName=document.getElementById('selectedDeviceName'),selectedMeta=document.getElementById('selectedDeviceMeta'),diagram=document.getElementById('deviceDiagram');
    if(receptionDeviceCategory==='apple'){previewSelectedDevice(document.getElementById('oDevice')?.value||'');return}
    if(selectedName)selectedName.textContent=receptionDeviceCategory==='gaming'?'Consola o control':'Equipo no Apple';
    if(selectedMeta)selectedMeta.textContent='Escribe marca y modelo. La inspección se adapta al tipo seleccionado.';
    if(title)title.textContent=receptionDeviceCategory==='gaming'?'Inspección de consola / control':'Inspección del equipo';
    if(desc)desc.textContent=receptionDeviceCategory==='gaming'?'Marca golpes, puertos dañados, carcasa, sticks, gatillos o zonas con sobrecalentamiento.':'Marca golpes, rayas, pantalla, puertos, bisagras o daños visibles.';
    const img=document.getElementById('selectedDeviceImg');if(img){img.removeAttribute('src');img.style.display='none'}
    if(diagram){diagram.style.backgroundImage='';diagram.classList.remove('has-model-image');diagram.className=`device-diagram device-diagram-generic reception-${receptionDeviceCategory}`;diagram.querySelectorAll('.diagram-side,.diagram-front,.diagram-back,.diagram-top,.diagram-bottom').forEach(el=>el.style.display='');clearDamageMarks()}
  }
  function setReceptionDeviceCategory(kind='apple',savedChecklist=null){
    receptionDeviceCategory=['apple','other','gaming'].includes(kind)?kind:'apple';
    const cfg=receptionCatalog[receptionDeviceCategory];
    const hidden=document.getElementById('oDeviceCategoryV2');if(hidden)hidden.value=receptionDeviceCategory;
    document.querySelectorAll('.reception-device-tab').forEach(b=>b.classList.toggle('active',b.dataset.deviceKind===receptionDeviceCategory));
    const brand=document.getElementById('oBrand'),category=document.getElementById('oCategory'),search=document.getElementById('deviceModelSearch'),device=document.getElementById('oDevice');
    if(brand){brand.value=cfg.brand;brand.placeholder=receptionDeviceCategory==='apple'?'Apple':'Marca del equipo'}
    if(category)category.innerHTML=`<option value="">Todas</option>${cfg.categories.map(x=>`<option>${esc(x)}</option>`).join('')}`;
    if(search){search.placeholder=cfg.placeholder;search.value=device?.value||'';search.removeAttribute('list')}
    const arrow=document.getElementById('modelDropdownToggle'),pill=document.getElementById('modelCategoryPill'),hint=document.getElementById('modelSelectorHint');
    if(arrow)arrow.hidden=receptionDeviceCategory!=='apple';
    if(pill)pill.textContent=receptionDeviceCategory==='apple'?(category?.value||'Apple'):(receptionDeviceCategory==='gaming'?'Gaming':'Otro equipo');
    if(hint)hint.textContent=receptionDeviceCategory==='apple'?'Busca un modelo o usa la flecha para ver toda la categoría seleccionada.':'Escribe manualmente la marca y el modelo del equipo.';
    closeModelDropdown();
    if(receptionDeviceCategory==='apple')filterDeviceCategory(category?.value||'');else{const list=document.getElementById('appleDeviceModels');if(list)list.innerHTML=''}
    receptionQuickFailures=[];renderReceptionQuickFailures();renderAdaptiveReceptionChecklist(savedChecklist);updateReceptionDeviceVisual();renderReceptionSummary();
  }
  function toggleQuickFailure(value){
    const i=receptionQuickFailures.indexOf(value);if(i>=0)receptionQuickFailures.splice(i,1);else receptionQuickFailures.push(value);
    const issue=document.getElementById('oIssue');
    if(issue){const all=[...new Set([...receptionQuickFailures,...issue.value.split(' · ').filter(Boolean).filter(x=>!receptionCatalog[receptionDeviceCategory].failures.includes(x))])];issue.value=all.join(' · ')}
    renderReceptionQuickFailures();renderReceptionSummary();
  }
  function clearQuickFailures(){receptionQuickFailures=[];renderReceptionQuickFailures();renderReceptionSummary()}
  function previewReceptionPhoto(slot,input){
    const file=input?.files?.[0]||null;receptionPhotoFiles[slot]=file;
    const id=slot==='front'?'receptionPhotoPreviewFront':slot==='back'?'receptionPhotoPreviewBack':'receptionPhotoPreviewDetail',box=document.getElementById(id);if(!box)return;
    if(!file){box.innerHTML='＋';renderReceptionSummary();return}
    const url=URL.createObjectURL(file);box.innerHTML=`<img src="${url}" alt="Foto de recepción"><button type="button" data-remove-photo="${slot}">×</button>`;box.querySelector('button').onclick=e=>{e.preventDefault();e.stopPropagation();removeReceptionPhoto(slot)};renderReceptionSummary();
  }
  function removeReceptionPhoto(slot){
    receptionPhotoFiles[slot]=null;
    const input=document.getElementById(slot==='front'?'receptionPhotoFront':slot==='back'?'receptionPhotoBack':'receptionPhotoDetail');if(input)input.value='';
    const box=document.getElementById(slot==='front'?'receptionPhotoPreviewFront':slot==='back'?'receptionPhotoPreviewBack':'receptionPhotoPreviewDetail');if(box)box.innerHTML='＋';renderReceptionSummary();
  }
  function resetReceptionPhotos(){for(const k of Object.keys(receptionPhotoFiles))receptionPhotoFiles[k]=null;['receptionPhotoFront','receptionPhotoBack','receptionPhotoDetail'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});['receptionPhotoPreviewFront','receptionPhotoPreviewBack','receptionPhotoPreviewDetail'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='＋'})}
  async function uploadReceptionPhotos(orderId){
    for(const [slot,file] of Object.entries(receptionPhotoFiles).filter(([,f])=>f)){
      try{
        if(file.size>8*1024*1024)continue;
        const stored=await storeSupportFile(file,orderId,`recepcion-${slot}`);
        await supabaseClient.from('service_order_photos').insert({order_id:orderId,file_url:stored.file_url,storage_path:stored.storage_path,label:`Recepción · ${slot==='front'?'Frontal':slot==='back'?'Trasera':'Detalle'}`,created_by_email:session?.email||null});
      }catch(err){console.warn('Reception photo',err)}
    }
  }


  function resetReceptionForm(){
    activeReceptionOrderId=null; pendingAppointmentId=null;
    const form=document.querySelector('#orderModal form');if(form)form.reset();
    selectedReceptionClientId=null;renderReceptionClientSelected(null);closeReceptionClientSearch();
    clearReceptionClientMeta();closeModelDropdown();
    document.querySelectorAll('#receptionChecklist label').forEach(label=>{const cb=label.querySelector('input[type=checkbox]');const sel=label.querySelector('select');if(cb)cb.checked=false;if(sel)sel.selectedIndex=0;});
    document.getElementById('oPriority').value='Normal';
    document.getElementById('oBrand').value='Apple';
    if(document.getElementById('oServiceMode'))oServiceMode.value='Presencial';if(document.getElementById('oIntakeSource'))oIntakeSource.value='Recepción directa';
    document.getElementById('oPasswordFlag').value='No';
    document.getElementById('orderModalTitle').textContent='Nueva recepción';
    document.getElementById('orderModalSubtitle').textContent='Complete todos los datos del ingreso. La orden de servicio se genera únicamente al finalizar la recepción.';
    document.getElementById('orderSaveBtn').textContent='Finalizar ingreso y crear orden';
    document.getElementById('deviceModelSearch').value='';
    document.getElementById('selectedDeviceName').textContent='Seleccione un modelo Apple';
    document.getElementById('selectedDeviceMeta').textContent='Se cargará un esquema referencial según la categoría seleccionada.';
    currentDeviceView='all';
    document.querySelectorAll('.device-view-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.view==='all'));
    clearDamageMarks();
    resetReceptionPhotos();
    setReceptionDeviceCategory('apple');
    renderReceptionSummary();
  }
  function openServiceOrder(){
    if(!can('reception')&&!can('orders')){alert('No tienes permiso para crear órdenes');return}
    resetReceptionForm();
    if(!location.hash.includes('new-order') && !document.body.classList.contains('order-tab')){
      const opened=window.open(location.origin+location.pathname+'#new-order','_blank');
      if(opened)return;
      history.replaceState(null,'',location.pathname+'#new-order');
    }
    document.body.classList.add('order-tab');
    document.getElementById('orderModal').classList.add('open');
    ['oClient','oClientDocument','oPhone','oEmail','oAddressShort','oCity','oState','oDevice','oIssue','oCategory','oBrand'].forEach(id=>document.getElementById(id)?.addEventListener('input',renderReceptionSummary));
    document.getElementById('receptionChecklist')?.addEventListener('change',renderReceptionSummary);
    renderReceptionSummary();
    setTimeout(()=>document.getElementById('deviceModelSearch')?.focus(),120);
  }
  function applyReceptionChecklist(checklist={}){
    document.querySelectorAll('#receptionChecklist label').forEach(label=>{
      const name=label.childNodes[1]?.textContent?.trim()||label.textContent.trim().split(/Funciona|No funciona|No aplica/)[0].trim();
      const entry=checklist?.[name]; const cb=label.querySelector('input[type=checkbox]'); const sel=label.querySelector('select');
      if(cb)cb.checked=Boolean(entry?.checked); if(sel&&entry?.value){const opt=[...sel.options].find(o=>o.value===entry.value||o.text===entry.value);if(opt)sel.value=opt.value;}
    });
  }
  function openExistingReception(id){
    if(!can('reception')&&!can('orders')){alert('No tienes permiso para registrar recepción');return}
    const o=orders.find(x=>String(x.id)===String(id));if(!o)return;
    resetReceptionForm(); activeReceptionOrderId=o.id;
    document.getElementById('orderModalTitle').textContent=`Recepción · ${o.code}`;
    document.getElementById('orderModalSubtitle').textContent='Completa o actualiza la recepción física del equipo sin crear una orden duplicada.';
    document.getElementById('orderSaveBtn').textContent='Guardar recepción';
    oClient.value=o.client||'';oPhone.value=o.phone||'';oEmail.value=o.email||'';oPriority.value=o.priority||'Normal';applyReceptionClientMeta(o.clientMeta||o.checklist?.__client||{});renderReceptionClientSelected(supportClientFromOrder(o));
    oDevice.value=o.device||'';deviceModelSearch.value=o.device||'';oColor.value=o.color||'';oSerial.value=o.serial||'';oIssue.value=o.issue||'';oAccessories.value=o.accessories||'';oVisual.value=o.visual||'';oTechNotes.value=o.technicalNotes||'';
    oPasswordFlag.value=o.passwordReceived?'Sí':'No';
    if(document.getElementById('oServiceMode'))oServiceMode.value=o.serviceMode||'Presencial';
    const meta=o.checklist?.__meta||{};
    const savedKind=meta.device_category||((o.deviceType||'').toLowerCase().startsWith('gaming')?'gaming':(o.deviceType||'').toLowerCase().startsWith('other')?'other':'apple');
    setReceptionDeviceCategory(savedKind,o.checklist||{});
    receptionQuickFailures=Array.isArray(meta.quick_failures)?meta.quick_failures.slice():[];renderReceptionQuickFailures();
    if(savedKind==='apple'){const d=findAppleDevice(o.device||'');if(d){oCategory.value=d.category||'';previewSelectedDevice(o.device);selectDeviceFromSearch(o.device)}}else{
      const typeText=String(o.deviceType||'').split('·').slice(1).join('·').trim();if(typeText)oCategory.value=typeText;
    }
    const sig=o.signatures||{};sigReceptionName.value=sig.reception||session?.name||'';sigClientName.value=sig.client||o.client||'';sigTechName.value=sig.technician||'';sigSupervisorName.value=sig.supervisor||'';
    renderReceptionSummary();
    document.body.classList.add('order-tab');document.getElementById('orderModal').classList.add('open');setTimeout(()=>oSerial?.focus(),120);
  }
  function code(){const year=new Date().getFullYear(),nums=orders.filter(o=>String(o.code).includes(`TS-SVC-${year}-`)).map(o=>Number(String(o.code).split('-').pop())||0);return `TS-SVC-${year}-${String(Math.max(0,...nums)+1).padStart(4,'0')}`}
  async function saveOrder(e){
    e.preventDefault();
    const device=receptionDeviceCategory==='apple'?findAppleDevice(oDevice.value):null;
    const existingOrder=activeReceptionOrderId?orders.find(x=>String(x.id)===String(activeReceptionOrderId)):null;
    const previousReceptionMeta=existingOrder?.checklist?.__meta||{};
    const checklist={};document.querySelectorAll('#receptionChecklist label').forEach(label=>{const name=label.childNodes[1]?.textContent?.trim()||label.textContent.trim().split(/Funciona|No funciona|No aplica/)[0].trim();const checked=label.querySelector('input')?.checked||false;const value=label.querySelector('select')?.value||'';checklist[name]={checked,value}});
    checklist.__meta={...previousReceptionMeta,device_category:receptionDeviceCategory,quick_failures:receptionQuickFailures.slice(),reception_v2:true,received_by_name:previousReceptionMeta.received_by_name||session?.name||'',received_by_email:previousReceptionMeta.received_by_email||session?.email||'',received_by_role:previousReceptionMeta.received_by_role||session?.role||'',received_at:previousReceptionMeta.received_at||new Date().toISOString(),last_reception_by_name:session?.name||'',last_reception_by_email:session?.email||'',last_reception_at:new Date().toISOString()};
    checklist.__client=collectReceptionClientMeta();
    const signatures={reception:sigReceptionName.value.trim()||session?.name||'',client:sigClientName.value.trim(),technician:sigTechName.value.trim(),supervisor:sigSupervisorName.value.trim()};
    const deviceType=receptionDeviceCategory==='apple'?(device?.category||oCategory.value||'Apple'):receptionDeviceCategory==='gaming'?`Gaming · ${oCategory.value||'Consola / control'}`:`Other · ${oCategory.value||'Otro equipo'}`;
    const base={client_name:oClient.value.trim(),client_phone:oPhone.value.trim(),client_email:oEmail.value.trim()||null,device_type:deviceType,device_model:oDevice.value.trim(),device_color:oColor.value.trim()||null,serial_imei:oSerial.value.trim()||null,password_received:oPasswordFlag.value==='Sí',priority:oPriority.value,reported_issue:oIssue.value.trim(),accessories_received:oAccessories.value.trim()||null,visual_condition:oVisual.value.trim()||null,technical_notes:[oTechNotes.value.trim(),`Ingreso: ${document.getElementById('oIntakeSource')?.value||'Recepción directa'}`].filter(Boolean).join(' · ')||null,service_mode:document.getElementById('oServiceMode')?.value||'Presencial',reception_checklist:checklist,signatures,status:'Recibido'};
    if(activeReceptionOrderId){
      const previous=existingOrder;
      const {data,error}=await supabaseClient.from('service_orders').update(base).eq('id',activeReceptionOrderId).select('*').single();
      if(error){alert('No se pudo guardar la recepción: '+error.message);return}
      await uploadReceptionPhotos(activeReceptionOrderId);
      await supabaseClient.from('service_order_notes').insert({order_id:activeReceptionOrderId,note:`Recepción actualizada por ${session?.name||session?.email||'Recepción'} · ${receptionDeviceCategory}. Checklist, fotos y condición guardados.`,visibility:'internal',author_name:session?.name||'Recepción',note_type:'Recepción',status_after:'Recibido'});
      await audit('update_reception',activeReceptionOrderId,previous||null,base);
      activeReceptionOrderId=null;await loadSupportData();closeModals();await renderPanel('orders');toast('Recepción V2 guardada en la orden '+(data?.code||previous?.code||''));return;
    }
    const row={...base,code:code(),quote_status:'Pendiente',public_token:(globalThis.crypto?.randomUUID?globalThis.crypto.randomUUID():undefined),created_by_email:session?.email||null};
    const {data,error}=await supabaseClient.from('service_orders').insert(row).select('*').single();
    if(error){alert('No se pudo crear la orden: '+error.message);return}
    await uploadReceptionPhotos(data.id);
    await supabaseClient.from('service_order_notes').insert({order_id:data.id,note:`Equipo recibido por ${session?.name||session?.email||'Recepción'} · ${receptionDeviceCategory}. Checklist y fotos registrados.`,visibility:'internal',author_name:session?.name||'Recepción',note_type:'Recepción',status_after:'Recibido'});await audit('create_order',data.id,null,row);
    if(pendingAppointmentId)await supabaseClient.from('service_appointments').update({status:'convertida_orden',updated_at:new Date().toISOString()}).eq('id',pendingAppointmentId);
    const createdOrder=mapOrder(data);pendingAppointmentId=null;await loadSupportData();closeModals();await renderPanel('orders');showReceptionComplete(createdOrder);toast('Ingreso V2 finalizado. Orden creada: '+row.code);if(createdOrder.email)sendOrderEmail(createdOrder,true).catch(error=>console.warn('Correo automático de recepción:',error));
  }
  function publicStatusMessage(status){
    const map={
      'Recibido':'Tu equipo fue recibido y la orden quedó registrada.',
      'En diagnóstico':'Tu equipo ingresó a diagnóstico técnico.',
      'Diagnóstico disponible':'El diagnóstico técnico ya está disponible para revisión.',
      'Aprobado por cliente':'La cotización fue aprobada y la reparación quedó autorizada.',
      'En reparación':'Estamos trabajando en la reparación autorizada de tu equipo.',
      'Esperando repuesto':'La orden sigue activa y estamos esperando el repuesto necesario para continuar.',
      'Listo para entregar':'La reparación y las pruebas finales fueron completadas. Tu equipo está listo para entregar.',
      'Entregado':'El equipo fue entregado y la orden de servicio quedó completada.',
      'No reparado':'El diagnóstico concluyó que el equipo no pudo ser reparado. ThinkStore coordinará contigo los siguientes pasos.',
      'No aprobado':'La cotización no fue aprobada. ThinkStore coordinará contigo los siguientes pasos.',
      'Cancelado':'La orden fue cancelada.'
    };return map[status]||`El estado de tu reparación cambió a ${status}.`;
  }
  async function updateStatus(i,status){
    const order=orders[i];if(!order||!requireTechnicianOrder(order))return;
    if(session?.role==='technician'&&!['En diagnóstico','Diagnóstico disponible','En reparación','Esperando repuesto','Listo para entregar','No reparado'].includes(status)){toast('Ese estado debe gestionarlo Recepción o Administración.','error');await renderPanel('orders');return}
    if(status==='Cotización enviada'){
      await openOrderManager(order.id);
      const qs=document.getElementById('mQuoteStatus');if(qs)qs.value='Enviado';
      toast('Completa monto y detalle de la reparación, luego pulsa “Enviar cotización al cliente”.');
      return;
    }
    const previous=order.status;
    const changes={status};if(status==='Entregado')changes.delivered_at=new Date().toISOString();
    const {error}=await supabaseClient.from('service_orders').update(changes).eq('id',order.id);
    if(error){alert('No se pudo actualizar el estado: '+error.message);await renderPanel('orders');return}
    if(['No aprobado','Cancelado'].includes(status))await releasePreparedParts(order,status==='No aprobado'?'Cotización no aprobada':'Orden cancelada');
    await supabaseClient.from('service_order_notes').insert({order_id:order.id,note:publicStatusMessage(status),visibility:'client',author_name:session?.name||'Soporte ThinkStore',note_type:'Cambio de estado',status_after:status,client_title:status});
    await audit('update_status',order.id,{status:previous},{status});await loadSupportData();await renderPanel('orders');toast('Estado actualizado y registrado en el seguimiento.');
    const autoEmailStates=new Set(['Diagnóstico disponible','Aprobado por cliente','En reparación','Listo para entregar','Entregado','No aprobado']);
    if(order.email&&autoEmailStates.has(status))sendOrderEmail({...order,status},true).catch(error=>console.warn('Correo automático de soporte:',error));
  }
  function trackingUrl(order){
    const base='https://soporte.thinkstore.com.ve/seguimiento.html';
    const q=new URLSearchParams({orden:String(order?.code||'')});
    if(order?.publicToken)q.set('token',String(order.publicToken));
    return `${base}?${q.toString()}`;
  }
  function cleanReceptionObservation(o){
    const raw=String(o?.technicalNotes||o?.visual||'').trim();
    if(!raw) return 'Sin observaciones adicionales';
    const parts=raw.split(/\s*[·•|]\s*/).map(x=>x.trim()).filter(Boolean);
    const publicParts=parts.filter(part=>{
      const low=part.toLowerCase();
      if(low.startsWith('origen: cita web')) return false;
      if(low.startsWith('servicio:')) return false;
      if(low.startsWith('modalidad:')) return false;
      if(low.startsWith('cita:')) return false;
      if(/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(part)) return false;
      return true;
    });
    return publicParts.join(' · ') || 'Sin observaciones adicionales';
  }
  function qrUrl(text,size=240){return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(text)}`}
  function checklistSummary(o){
    return Object.entries(o.checklist||{}).filter(([,v])=>v?.checked).map(([k,v])=>`${esc(k)}: ${esc(v.value||'Revisado')}`).join(' · ')||'Sin checklist marcado';
  }
  function openPrintWindow(title,html){
    const w=window.open('','_blank','width=900,height=1000'); if(!w){toast('El navegador bloqueó la ventana de impresión.','error');return}
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      *{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#111;margin:0;padding:28px;background:#fff}.sheet{max-width:820px;margin:auto}.head{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #111;padding-bottom:16px}.brand{display:flex;gap:12px;align-items:center}.brand-logo{width:48px;height:48px;object-fit:contain;display:block;filter:grayscale(1) brightness(0) contrast(1.3);-webkit-filter:grayscale(1) brightness(0) contrast(1.3)}.code{text-align:right}.code b{font-size:24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}.box{border:1px solid #ccc;border-radius:12px;padding:14px}.box h3{margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.05em}.full{grid-column:1/-1}.qr{display:flex;align-items:center;gap:18px}.qr img{width:145px;height:145px}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:48px}.sign{border-top:1px solid #111;padding-top:8px;text-align:center;font-size:12px}.policy p{margin:0;font-size:11px;line-height:1.45;color:#333}.foot{text-align:center;margin-top:30px;font-size:12px;color:#555}@media print{body{padding:0}.no-print{display:none!important}}
    </style></head><body>${html}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),500));<\/script></body></html>`);w.document.close();
  }
  function printReceptionSheetByOrder(o){
    if(!o)return; const url=trackingUrl(o); const qr=qrUrl(url,300);
    openPrintWindow(`Hoja de recepción ${o.code}`,`<div class="sheet"><div class="head"><div class="brand"><img class="brand-logo" src="data:image/png;base64,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" alt="ThinkStore"><div><h1 style="margin:0">ThinkStore</h1><div>Servicio Técnico Apple</div></div></div><div class="code"><small>ORDEN DE SERVICIO</small><br><b>${esc(o.code)}</b><br><span>${new Date().toLocaleString('es-VE')}</span></div></div>
    <div class="grid"><div class="box"><h3>Datos del cliente</h3><b>${esc(o.client)}</b><br>${o.clientMeta?.document?`Cédula / RIF: ${esc(o.clientMeta.document)}<br>`:''}${esc(o.phone)}${o.clientMeta?.phone_alt?` · ${esc(o.clientMeta.phone_alt)}`:''}<br>${esc(o.email||'')}${o.clientMeta?.company?`<br>${esc(o.clientMeta.company)}`:''}${o.clientMeta?.address_short?`<br>${esc(o.clientMeta.address_short)}`:''}${o.clientMeta?.city||o.clientMeta?.state?`<br>${esc([o.clientMeta.city,o.clientMeta.state].filter(Boolean).join(' · '))}`:''}</div><div class="box"><h3>Datos del equipo</h3><b>${esc(o.device)}</b><br>Color: ${esc(o.color||'No indicado')}<br>Serial / IMEI: ${esc(o.serial||'No indicado')}</div><div class="box full"><h3>Falla reportada</h3>${esc(o.issue)}</div><div class="box"><h3>Accesorios recibidos</h3>${esc(o.accessories||'Ninguno indicado')}</div><div class="box"><h3>Condición / checklist</h3>${checklistSummary(o)}</div><div class="box full"><h3>Observaciones</h3>${esc(cleanReceptionObservation(o))}</div><div class="box full qr"><img src="${qr}" alt="QR"><div><h3>Seguimiento en vivo</h3><b>${esc(o.code)}</b><p>Escanea este código para consultar el estado actualizado del equipo.</p><small>Acceso seguro mediante QR · soporte.thinkstore.com.ve</small></div></div><div class="box full policy"><h3>Política de recepción</h3><p>El cliente declara ser propietario del equipo o estar autorizado para entregarlo a revisión. ThinkStore registrará el estado visible, accesorios y pruebas realizadas al momento de la recepción. Se recomienda mantener una copia de seguridad de la información antes de cualquier diagnóstico o reparación. Cuando el diagnóstico requiera apertura o pruebas internas del equipo, se realizará únicamente como parte del proceso técnico. Cualquier reparación, repuesto o cargo adicional deberá ser informado y aprobado antes de ejecutarse. La presente hoja y el número de orden sirven como comprobante de recepción y referencia para el seguimiento del servicio.</p></div></div>
    <div class="signatures"><div class="sign">Firma del cliente<br>${esc(o.signatures?.client||o.client||'')}</div><div class="sign">Firma de recepción<br>${esc(o.signatures?.reception||session?.name||'')}</div></div><div class="foot">ThinkStore · Tecnología. Todo en un solo lugar.</div></div>`);
  }
  function label40x60Markup(o,qr){
    const clientName=orderClientName(o);
    return `<div style="width:40mm;height:60mm;padding:2.3mm 2.5mm 2mm;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;overflow:hidden;background:#fff;color:#111"><div style="width:100%;text-align:center;border-bottom:.35mm solid #111;padding-bottom:1.1mm"><b style="font-size:12.2pt;letter-spacing:-.25pt">ThinkStore</b><div style="font-size:6.2pt;margin-top:.25mm">Servicio Técnico</div></div><div style="width:100%;text-align:center;margin-top:1.1mm"><b style="display:block;font-size:9.5pt;line-height:1.05">${esc(o.code)}</b><div style="font-size:5.2pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-top:.85mm">Cliente</div><div style="font-size:8.1pt;font-weight:900;line-height:1.05;margin-top:.15mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(clientName)}</div><div style="font-size:7pt;font-weight:700;line-height:1.08;margin-top:.8mm;max-height:6.2mm;overflow:hidden">${esc(o.device)}</div>${o.color?`<div style="font-size:6pt;margin-top:.4mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(o.color)}</div>`:''}</div><img src="${qr}" style="width:19.5mm;height:19.5mm;margin-top:1mm" alt="QR"><div style="font-size:5.7pt;text-align:center;line-height:1.1;margin-top:.7mm">Escanea para ver el estado</div></div>`;
  }
  function labelLegacyMarkup(o,qr){
    // Formato anterior ORIGINAL: 76x50 mm, escalado completo sin
    // alterar distribución para papel físico 40x60 en horizontal.
    const legacyScale=60/76;
    const original=`<div style="width:76mm;height:50mm;border:1px solid #111;border-radius:4mm;padding:4mm;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;display:grid;grid-template-columns:1fr 28mm;gap:3mm;align-items:center;background:#fff;color:#111">
      <div>
        <b style="font-size:13pt">ThinkStore</b>
        <div style="font-size:7pt;margin-bottom:3mm">Servicio Técnico</div>
        <b style="font-size:11pt">${esc(o.code)}</b>
        <div style="font-size:5.8pt;font-weight:700;letter-spacing:.07em;text-transform:uppercase;margin-top:1.2mm">Cliente</div><div style="font-size:9pt;font-weight:900;margin-top:.25mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(orderClientName(o))}</div>
        <div style="font-size:8.5pt;margin-top:1.3mm">${esc(o.device)}</div>
        <div style="font-size:7.5pt">${esc(o.color||'')}</div>
        <div style="font-size:6.2pt;margin-top:1.5mm">Escanea para ver el estado</div>
      </div>
      <img src="${qr}" style="width:28mm;height:28mm" alt="QR">
    </div>`;
    return `<div style="width:60mm;height:40mm;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:flex-start">
      <div style="width:76mm;height:50mm;transform:scale(${legacyScale});transform-origin:left center;flex:0 0 auto">${original}</div>
    </div>`;
  }
  function printDeviceLabelByOrder(o,format='legacy'){
    if(!o)return;
    const url=trackingUrl(o);
    const qr=qrUrl(url,260);
    const isCurrent=format==='40x60';
    const markup=isCurrent?label40x60Markup(o,qr):labelLegacyMarkup(o,qr);
    const pageW=isCurrent?40:60;
    const pageH=isCurrent?60:40;
    const w=window.open('','_blank',isCurrent?'width=520,height=760':'width=760,height=520');
    if(!w){toast('El navegador bloqueó la ventana de impresión.','error');return}
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(`Etiqueta ${o.code}`)}</title><style>
      *{box-sizing:border-box}
      html,body{margin:0!important;padding:0!important;width:${pageW}mm;height:${pageH}mm;background:#fff;overflow:hidden}
      @page{size:${pageW}mm ${pageH}mm;margin:0}
      @media print{html,body{width:${pageW}mm!important;height:${pageH}mm!important;margin:0!important;padding:0!important}}
    </style></head><body>${markup}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),500));<\/script></body></html>`);
    w.document.close();
  }
  function sanitizeLabelFileName(value){
    return String(value||'etiqueta').trim().replace(/[^a-z0-9._-]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'etiqueta';
  }
  function createQrDataUrl(text,size=720){
    if(typeof QRCode==='undefined') throw new Error('No se cargó el generador QR');
    const holder=document.createElement('div');
    holder.setAttribute('aria-hidden','true');
    holder.style.cssText='position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;overflow:hidden;background:#fff';
    document.body.appendChild(holder);
    try{
      new QRCode(holder,{text:String(text||''),width:size,height:size,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
      const canvas=holder.querySelector('canvas');
      const img=holder.querySelector('img');
      const dataUrl=canvas?.toDataURL?.('image/png')||img?.src||'';
      if(!dataUrl) throw new Error('No se pudo convertir el QR');
      return dataUrl;
    }finally{holder.remove()}
  }
  function createLabelPdfFile(o,format='40x60'){
    if(!o) throw new Error('Orden no disponible');
    const jsPDF=window.jspdf?.jsPDF;
    if(!jsPDF) throw new Error('No se cargó el generador PDF');

    const url=trackingUrl(o);
    const qrData=createQrDataUrl(url,720);
    const isCurrent=format==='40x60';

    // Etiqueta actual: 40x60 vertical.
    // Formato anterior: mismo papel 40x60, girado horizontal = 60x40.
    const pageW=isCurrent?40:60;
    const pageH=isCurrent?60:40;
    const doc=new jsPDF({
      orientation:isCurrent?'portrait':'landscape',
      unit:'mm',
      format:[pageW,pageH],
      compress:true
    });

    doc.setProperties({
      title:`Etiqueta ${o.code}`,
      subject:isCurrent?'Etiqueta 40x60 mm de servicio técnico ThinkStore':'Etiqueta anterior ThinkStore · papel 40x60 horizontal',
      author:'ThinkStore',
      creator:'ThinkStore Support'
    });
    doc.setTextColor(17,17,17);
    doc.setDrawColor(17,17,17);

    if(isCurrent){
      doc.setFont('helvetica','bold');
      doc.setFontSize(13);
      doc.text('ThinkStore',20,6.6,{align:'center'});

      doc.setFont('helvetica','normal');
      doc.setFontSize(6.8);
      doc.text('Servicio Tecnico',20,9.9,{align:'center'});

      doc.setLineWidth(.35);
      doc.line(3,12,37,12);

      doc.setFont('helvetica','bold');
      doc.setFontSize(9.8);
      doc.text(String(o.code||''),20,15.7,{align:'center'});

      const clientName=orderClientName(o);
      doc.setFont('helvetica','normal');
      doc.setFontSize(5.2);
      doc.text('CLIENTE',20,18.7,{align:'center'});
      doc.setFont('helvetica','bold');
      doc.setFontSize(8.1);
      const clientLine=doc.splitTextToSize(clientName,33).slice(0,1);
      doc.text(clientLine,20,21.4,{align:'center'});

      doc.setFontSize(7);
      const deviceLines=doc.splitTextToSize(String(o.device||'Equipo'),34).slice(0,2);
      doc.text(deviceLines,20,24.6,{align:'center',lineHeightFactor:1.02});

      let colorY=24.6+(deviceLines.length*3.0)+.1;
      if(o.color){
        doc.setFont('helvetica','normal');
        doc.setFontSize(6.2);
        doc.text(doc.splitTextToSize(String(o.color),32).slice(0,1),20,colorY,{align:'center'});
        colorY+=2.7;
      }

      const qrY=Math.max(29,colorY+.8);
      doc.addImage(qrData,'PNG',9.75,qrY,20.5,20.5,undefined,'FAST');
      doc.setFont('helvetica','normal');
      doc.setFontSize(5.9);
      doc.text('Escanea para ver el estado',20,Math.min(57.1,qrY+23.3),{align:'center'});
    }else{
      // Formato anterior ORIGINAL 76x50, escalado uniformemente a 60x39.47.
      // No se altera su composición horizontal.
      const S=60/76;
      const Y=(40-(50*S))/2;
      const X=0;
      const sx=v=>X+(v*S);
      const sy=v=>Y+(v*S);

      doc.setLineWidth(.25*S);
      doc.roundedRect(sx(1.5),sy(1.5),73*S,47*S,2.8*S,2.8*S);

      doc.setFont('helvetica','bold');
      doc.setFontSize(13*S);
      doc.text('ThinkStore',sx(4),sy(7));

      doc.setFont('helvetica','normal');
      doc.setFontSize(7*S);
      doc.text('Servicio Tecnico',sx(4),sy(10.5));

      doc.setFont('helvetica','bold');
      doc.setFontSize(11*S);
      doc.text(String(o.code||''),sx(4),sy(17));

      doc.setFont('helvetica','normal');
      doc.setFontSize(5.8*S);
      doc.text('CLIENTE',sx(4),sy(20.2));
      doc.setFont('helvetica','bold');
      doc.setFontSize(9*S);
      const clientLine=doc.splitTextToSize(orderClientName(o),38*S).slice(0,1);
      doc.text(clientLine,sx(4),sy(24));

      doc.setFontSize(8.2*S);
      const deviceWidth=38*S;
      const deviceLines=doc.splitTextToSize(String(o.device||'Equipo'),deviceWidth).slice(0,2);
      doc.text(deviceLines,sx(4),sy(28),{lineHeightFactor:1.05});

      if(o.color){
        doc.setFont('helvetica','normal');
        doc.setFontSize(6.8*S);
        doc.text(doc.splitTextToSize(String(o.color),38*S).slice(0,1),sx(4),sy(37));
      }

      doc.setFontSize(6*S);
      doc.text('Escanea para ver el estado',sx(4),sy(43));

      doc.addImage(qrData,'PNG',sx(46),sy(10.5),26*S,26*S,undefined,'FAST');
    }

    const blob=doc.output('blob');
    const suffix=isCurrent?'40x60':'anterior-40x60-horizontal';
    return new File([blob],`${sanitizeLabelFileName(o.code)}-${suffix}.pdf`,{type:'application/pdf'});
  }
  function downloadLabelFile(file){
    const url=URL.createObjectURL(file); const a=document.createElement('a');
    a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2500);
  }
  async function openLabelInHereLabel(o,format='40x60'){
    try{
      toast('Preparando etiqueta para HereLabel…');
      const file=createLabelPdfFile(o,format);
      const shareData={files:[file],title:`Etiqueta ${o.code}`,text:'Etiqueta ThinkStore lista para imprimir en HereLabel'};
      const canShareFiles=!!navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}));
      if(canShareFiles){
        try{
          await navigator.share(shareData);
          toast('Etiqueta enviada. Selecciona HereLabel para abrirla e imprimir.');
          return;
        }catch(err){
          if(err?.name==='AbortError') return;
          console.warn('HereLabel share fallback',err);
        }
      }
      downloadLabelFile(file);
      toast('Se descargó el PDF de la etiqueta. Ábrelo con HereLabel para imprimir.');
    }catch(err){console.error(err);toast('No pude preparar la etiqueta para HereLabel: '+(err?.message||err),'error')}
  }
  function openLabelFormatSelector(o){
    if(!o)return;
    document.getElementById('tsLabelFormatModal')?.remove();
    const saved=localStorage.getItem('ts_label_format')||'40x60';
    const modal=document.createElement('div'); modal.id='tsLabelFormatModal'; modal.className='modal open';
    modal.innerHTML=`<div class="card" style="max-width:560px"><h2 style="margin-top:0">Etiqueta del equipo</h2><p style="color:var(--muted);margin-top:-6px">Selecciona el formato y envíalo directamente a HereLabel o usa la impresión del navegador.</p><div style="display:grid;gap:10px;margin:18px 0"><label style="display:flex;align-items:flex-start;gap:12px;border:1px solid var(--line);border-radius:16px;padding:14px;cursor:pointer"><input type="radio" name="tsLabelFormat" value="40x60" ${saved==='40x60'?'checked':''} style="width:auto;margin-top:3px"><span><b>40 × 60 mm</b><small style="display:block;color:var(--muted);margin-top:3px">Formato actual de la etiquetadora M1 · vertical</small></span></label><label style="display:flex;align-items:flex-start;gap:12px;border:1px solid var(--line);border-radius:16px;padding:14px;cursor:pointer"><input type="radio" name="tsLabelFormat" value="legacy" ${saved==='legacy'?'checked':''} style="width:auto;margin-top:3px"><span><b>Formato anterior · 40 × 60 mm horizontal</b><small style="display:block;color:var(--muted);margin-top:3px">Mismo diseño horizontal anterior, ajustado al papel 40 × 60 mm de la Hanin M1</small></span></label></div><div style="background:#f5f7fb;border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-bottom:16px;font-size:13px;line-height:1.5"><b>HereLabel</b><br><span style="color:var(--muted)">ThinkStore genera un PDF con la medida real. En iPhone/iPad se abrirá el menú Compartir: toca <b>HereLabel</b> y la etiqueta llegará lista para imprimir, sin tener que diseñarla de nuevo.</span></div><div class="actions" style="flex-wrap:wrap"><button type="button" id="tsOpenHereLabel">Abrir en HereLabel</button><button type="button" class="secondary" id="tsPrintSelectedLabel">Imprimir desde navegador</button><button type="button" class="secondary" id="tsCancelLabelFormat">Cancelar</button></div></div>`;
    document.body.appendChild(modal);
    const selectedFormat=()=>modal.querySelector('input[name="tsLabelFormat"]:checked')?.value||'40x60';
    modal.querySelector('#tsCancelLabelFormat').onclick=()=>modal.remove();
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
    modal.querySelector('#tsOpenHereLabel').onclick=async()=>{const format=selectedFormat();localStorage.setItem('ts_label_format',format);modal.remove();await openLabelInHereLabel(o,format)};
    modal.querySelector('#tsPrintSelectedLabel').onclick=()=>{const format=selectedFormat();localStorage.setItem('ts_label_format',format);modal.remove();printDeviceLabelByOrder(o,format)};
  }
  function showReceptionComplete(o){
    const m=document.getElementById('receptionCompleteModal'); if(!m)return; m.dataset.orderId=o.id;
    document.getElementById('rcCode').textContent=o.code;document.getElementById('rcDevice').textContent=o.device;const rb=document.getElementById('rcReceivedBy');if(rb)rb.textContent=o.receivedByName||session?.name||session?.email||'Recepción';document.getElementById('rcTracking').textContent='Enlace seguro disponible mediante QR';m.classList.add('open');
  }
  function completedOrder(){const id=document.getElementById('receptionCompleteModal')?.dataset.orderId;return orders.find(x=>String(x.id)===String(id))}
  function printCompletedReception(){printReceptionSheetByOrder(completedOrder())}
  function printCompletedLabel(){openLabelFormatSelector(completedOrder())}
  function openCompletedTracking(){const o=completedOrder();if(o)window.open(trackingUrl(o),'_blank')}
  function printOrder(i){const o=orders[i];printReceptionSheetByOrder(o)}
  function printLabel(i){const o=orders[i];openLabelFormatSelector(o)}
  async function lookupOrder(e){e.preventDefault();const q=lookupCode.value.trim().toUpperCase();lookupResult.innerHTML='<p>Consultando…</p>';const {data,error}=await supabaseClient.rpc('lookup_service_order',{p_code:q});const o=Array.isArray(data)?data[0]:data;lookupResult.innerHTML=!error&&o?`<div class="metric"><b>${o.status}</b><p>${o.device_model}<br>Última actualización: ${dateText(o.updated_at)}</p></div>`:`<p>No encontré esa orden.</p>`}

  async function initAuth(){
    // V14.93 · Compatibilidad SSO del Main unificado. Interfaz V8.8.7 intacta.
    const ssoQuery=new URLSearchParams(location.search);
    const ssoToken=ssoQuery.get('sso_token_hash');
    const ssoType=ssoQuery.get('sso_type')||'magiclink';
    if(ssoToken){
      try{
        const {error:ssoError}=await supabaseClient.auth.verifyOtp({token_hash:ssoToken,type:ssoType});
        if(ssoError)throw ssoError;
        sessionStorage.setItem('ts_support_welcome_pending','1');
        const cleanUrl=new URL(location.href);
        ['sso_token_hash','sso_type','sso_v'].forEach(k=>cleanUrl.searchParams.delete(k));
        history.replaceState(null,'',cleanUrl.pathname+(cleanUrl.search||'')+(cleanUrl.hash||''));
      }catch(err){console.warn('SSO Soporte:',err?.message||err)}
    }
    const params=new URLSearchParams(location.hash.replace('#',''));
    const type=params.get('type');
    const accessToken=params.get('access_token');

    if(accessToken&&(type==='invite'||type==='recovery')){
      openPasswordSetup();
      return;
    }

    const {data:{session:sbSession}}=await supabaseClient.auth.getSession();
    if(sbSession?.user?.email){
      try{
        const profile=await getServiceProfile(sbSession.user.email);
        session=canonicalizeSupportSession({name:profile.nombre,role:profile.rol,email:profile.email,user:profile.email,avatarPath:profile.avatar_path||''});
        localStorage.setItem('ts_service_session',JSON.stringify(session));
        if(isPanelPage()) await renderApp(); else goToPanel();
      }catch(err){
        const local=JSON.parse(localStorage.getItem('ts_service_session')||'null');
        if(!navigator.onLine&&local?.email){
          session=canonicalizeSupportSession(local);
          if(isPanelPage())await renderApp();else goToPanel();
          return;
        }
        await supabaseClient.auth.signOut();
        localStorage.removeItem('ts_service_session');
        session=null;
        if(isPanelPage()) location.replace('index.html');
      }
    }else if(isPanelPage()){
      const local=JSON.parse(localStorage.getItem('ts_service_session')||'null');
      if(!navigator.onLine&&local?.email){session=canonicalizeSupportSession(local);await renderApp();return}
      location.replace('index.html');
    }
  }

  document.addEventListener('click',e=>{if(!e.target.closest('#premiumModelSelect'))closeModelDropdown()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModelDropdown()});
  document.addEventListener('DOMContentLoaded',()=>{
    fillAppleDeviceList();
    initAuth();
    if(location.hash.includes('new-order')){document.body.classList.add('order-tab');setTimeout(()=>openServiceOrder(),250);}
    const url=new URL(location.href);
    const q=url.searchParams.get('orden');
    if(q){openClientLookup();lookupCode.value=q;}
  });

  return{openLogin,openClientLookup,closeModals,login,logout,backToMainPanel,openProfilePhoto,previewProfilePhoto,saveProfilePhoto,removeProfilePhoto,renderPanel,updateAppointmentStatus,convertAppointment,openServiceOrder,openExistingReception,openReceptionClientSearch,closeReceptionClientSearch,searchReceptionClients,selectReceptionClient,startNewReceptionClient,saveOrder,updateStatus,printOrder,printLabel,printCompletedReception,printCompletedLabel,openCompletedTracking,lookupOrder,saveNewPassword,openBitacora,saveBitacora,sendBitacoraUpdate,applyBitacoraTemplate,renderBitacoraPreview,syncBitacoraVisibility,renderBitacoraClientHistory,openSupportNotification,markNotificationRead,markAllNotificationsRead,setNotificationFilter,loadSupportAlerts,toggleNotificationClientGroup,openNotificationOrder,sendQuoteToClient,openOrderManager,saveOrderManager,openCashierForOrder,uploadOrderFile,toggleOrderFileVisibility,confirmDeleteOrderFile,openOrderImage,retryOrderImage,renderOrderMessages,sendStaffOrderMessage,notifyOrderClient,openPartEditor,savePart,openPartMovement,savePartMovement,filterTechnicianInventory,filterRepairParts,addRepairPart,setRepairPartQty,changeRepairPartQty,removeRepairPart,commitRepairParts,renderOrderPartPicker,previewSelectedDevice,selectDeviceFromSearch,handleModelSearch,openModelDropdown,closeModelDropdown,toggleModelDropdown,chooseModelFromDropdown,clearSelectedModel,setDamageTool,addDamageMark,clearDamageMarks,filterDeviceCategory,setDeviceView,setReceptionDeviceCategory,toggleQuickFailure,clearQuickFailures,previewReceptionPhoto,removeReceptionPhoto};
})();
