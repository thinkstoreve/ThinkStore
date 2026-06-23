const TSService=(()=>{
  const SUPABASE_URL='https://tnezvnziqnjxhcwjtcuy.supabase.co';
  const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuZXp2bnppcW5qeGhjd2p0Y3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwODk5ODUsImV4cCI6MjA5NzY2NTk4NX0.OsFkefVeW4FN_uVML1ncE0i6FR_Dmg8eLPY9TEnezpM';
  const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

  const roles={
    superadmin:['dashboard','orders','reception','technical','bitacora','sales','logistics','clients','users','permissions','reports'],
    admin:['dashboard','orders','reception','technical','bitacora','sales','logistics','clients','reports'],
    reception:['dashboard','orders','reception','bitacora','clients'],
    technician:['dashboard','orders','technical','bitacora'],
    sales:['dashboard','orders','sales','clients'],
    logistics:['dashboard','orders','logistics'],
    client:['client_status']
  };

  const roleLabels={
    superadmin:'Super Admin',
    admin:'Admin',
    reception:'Recepción',
    technician:'Técnico',
    sales:'Ventas',
    logistics:'Logística',
    client:'Cliente'
  };

  const appleDevices=[{"name": "iPhone 8", "category": "iPhone"}, {"name": "iPhone 8 Plus", "category": "iPhone"}, {"name": "iPhone X", "category": "iPhone"}, {"name": "iPhone XR", "category": "iPhone"}, {"name": "iPhone XS", "category": "iPhone"}, {"name": "iPhone XS Max", "category": "iPhone"}, {"name": "iPhone 11", "category": "iPhone"}, {"name": "iPhone 11 Pro", "category": "iPhone"}, {"name": "iPhone 11 Pro Max", "category": "iPhone"}, {"name": "iPhone SE (2da generación)", "category": "iPhone"}, {"name": "iPhone 12 mini", "category": "iPhone"}, {"name": "iPhone 12", "category": "iPhone"}, {"name": "iPhone 12 Pro", "category": "iPhone"}, {"name": "iPhone 12 Pro Max", "category": "iPhone"}, {"name": "iPhone 13 mini", "category": "iPhone"}, {"name": "iPhone 13", "category": "iPhone"}, {"name": "iPhone 13 Pro", "category": "iPhone"}, {"name": "iPhone 13 Pro Max", "category": "iPhone"}, {"name": "iPhone SE (3ra generación)", "category": "iPhone"}, {"name": "iPhone 14", "category": "iPhone"}, {"name": "iPhone 14 Plus", "category": "iPhone"}, {"name": "iPhone 14 Pro", "category": "iPhone"}, {"name": "iPhone 14 Pro Max", "category": "iPhone"}, {"name": "iPhone 15", "category": "iPhone"}, {"name": "iPhone 15 Plus", "category": "iPhone"}, {"name": "iPhone 15 Pro", "category": "iPhone"}, {"name": "iPhone 15 Pro Max", "category": "iPhone"}, {"name": "iPhone 16", "category": "iPhone"}, {"name": "iPhone 16 Plus", "category": "iPhone"}, {"name": "iPhone 16 Pro", "category": "iPhone"}, {"name": "iPhone 16 Pro Max", "category": "iPhone"}, {"name": "iPhone 16e", "category": "iPhone"}, {"name": "iPhone 17", "category": "iPhone"}, {"name": "iPhone 17 Air", "category": "iPhone"}, {"name": "iPhone 17 Pro", "category": "iPhone"}, {"name": "iPhone 17 Pro Max", "category": "iPhone"}, {"name": "iPad 6ª generación", "category": "iPad"}, {"name": "iPad 7ª generación", "category": "iPad"}, {"name": "iPad 8ª generación", "category": "iPad"}, {"name": "iPad 9ª generación", "category": "iPad"}, {"name": "iPad 10ª generación", "category": "iPad"}, {"name": "iPad A16", "category": "iPad"}, {"name": "iPad Air 3", "category": "iPad"}, {"name": "iPad Air 4", "category": "iPad"}, {"name": "iPad Air 5", "category": "iPad"}, {"name": "iPad Air M2 11 pulgadas", "category": "iPad"}, {"name": "iPad Air M2 13 pulgadas", "category": "iPad"}, {"name": "iPad Air M3 11 pulgadas", "category": "iPad"}, {"name": "iPad Air M3 13 pulgadas", "category": "iPad"}, {"name": "iPad mini 5", "category": "iPad"}, {"name": "iPad mini 6", "category": "iPad"}, {"name": "iPad mini 7", "category": "iPad"}, {"name": "iPad Pro 11 pulgadas 2018", "category": "iPad"}, {"name": "iPad Pro 11 pulgadas 2020", "category": "iPad"}, {"name": "iPad Pro 11 pulgadas M1", "category": "iPad"}, {"name": "iPad Pro 11 pulgadas M2", "category": "iPad"}, {"name": "iPad Pro 11 pulgadas M4", "category": "iPad"}, {"name": "iPad Pro 12.9 pulgadas 2018", "category": "iPad"}, {"name": "iPad Pro 12.9 pulgadas 2020", "category": "iPad"}, {"name": "iPad Pro 12.9 pulgadas M1", "category": "iPad"}, {"name": "iPad Pro 12.9 pulgadas M2", "category": "iPad"}, {"name": "iPad Pro 13 pulgadas M4", "category": "iPad"}, {"name": "AirPods 1", "category": "AirPods"}, {"name": "AirPods 2", "category": "AirPods"}, {"name": "AirPods 3", "category": "AirPods"}, {"name": "AirPods 4", "category": "AirPods"}, {"name": "AirPods Pro", "category": "AirPods"}, {"name": "AirPods Pro 2", "category": "AirPods"}, {"name": "AirPods Pro 3", "category": "AirPods"}, {"name": "AirPods Max", "category": "AirPods"}, {"name": "Apple Watch Series 3", "category": "Apple Watch"}, {"name": "Apple Watch Series 4", "category": "Apple Watch"}, {"name": "Apple Watch Series 5", "category": "Apple Watch"}, {"name": "Apple Watch Series 6", "category": "Apple Watch"}, {"name": "Apple Watch Series 7", "category": "Apple Watch"}, {"name": "Apple Watch Series 8", "category": "Apple Watch"}, {"name": "Apple Watch Series 9", "category": "Apple Watch"}, {"name": "Apple Watch Series 10", "category": "Apple Watch"}, {"name": "Apple Watch Series 11", "category": "Apple Watch"}, {"name": "Apple Watch SE 1", "category": "Apple Watch"}, {"name": "Apple Watch SE 2", "category": "Apple Watch"}, {"name": "Apple Watch Ultra", "category": "Apple Watch"}, {"name": "Apple Watch Ultra 2", "category": "Apple Watch"}, {"name": "Apple Watch Ultra 3", "category": "Apple Watch"}, {"name": "MacBook Air Intel 2018", "category": "MacBook Air"}, {"name": "MacBook Air Intel 2019", "category": "MacBook Air"}, {"name": "MacBook Air Intel 2020", "category": "MacBook Air"}, {"name": "MacBook Air M1 13 pulgadas", "category": "MacBook Air"}, {"name": "MacBook Air M2 13 pulgadas", "category": "MacBook Air"}, {"name": "MacBook Air M2 15 pulgadas", "category": "MacBook Air"}, {"name": "MacBook Air M3 13 pulgadas", "category": "MacBook Air"}, {"name": "MacBook Air M3 15 pulgadas", "category": "MacBook Air"}, {"name": "MacBook Air M4 13 pulgadas", "category": "MacBook Air"}, {"name": "MacBook Air M4 15 pulgadas", "category": "MacBook Air"}, {"name": "MacBook Pro Intel 13 pulgadas 2018", "category": "MacBook Pro"}, {"name": "MacBook Pro Intel 15 pulgadas 2018", "category": "MacBook Pro"}, {"name": "MacBook Pro Intel 13 pulgadas 2019", "category": "MacBook Pro"}, {"name": "MacBook Pro Intel 15 pulgadas 2019", "category": "MacBook Pro"}, {"name": "MacBook Pro Intel 16 pulgadas 2019", "category": "MacBook Pro"}, {"name": "MacBook Pro Intel 13 pulgadas 2020", "category": "MacBook Pro"}, {"name": "MacBook Pro M1 13 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M1 Pro 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M1 Max 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M1 Pro 16 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M1 Max 16 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M2 13 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M2 Pro 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M2 Max 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M2 Pro 16 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M2 Max 16 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M3 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M3 Pro 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M3 Max 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M3 Pro 16 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M3 Max 16 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M4 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M4 Pro 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M4 Max 14 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M4 Pro 16 pulgadas", "category": "MacBook Pro"}, {"name": "MacBook Pro M4 Max 16 pulgadas", "category": "MacBook Pro"}, {"name": "iMac Intel 21.5 pulgadas", "category": "iMac"}, {"name": "iMac Intel 27 pulgadas", "category": "iMac"}, {"name": "iMac M1 24 pulgadas", "category": "iMac"}, {"name": "iMac M3 24 pulgadas", "category": "iMac"}, {"name": "iMac M4 24 pulgadas", "category": "iMac"}, {"name": "Mac mini Intel", "category": "Mac mini"}, {"name": "Mac mini M1", "category": "Mac mini"}, {"name": "Mac mini M2", "category": "Mac mini"}, {"name": "Mac mini M2 Pro", "category": "Mac mini"}, {"name": "Mac mini M4", "category": "Mac mini"}, {"name": "Mac mini M4 Pro", "category": "Mac mini"}, {"name": "Mac Studio M1 Max", "category": "Mac Studio"}, {"name": "Mac Studio M1 Ultra", "category": "Mac Studio"}, {"name": "Mac Studio M2 Max", "category": "Mac Studio"}, {"name": "Mac Studio M2 Ultra", "category": "Mac Studio"}, {"name": "Mac Studio M4 Max", "category": "Mac Studio"}, {"name": "Mac Studio M4 Ultra", "category": "Mac Studio"}, {"name": "Mac Pro Intel 2019", "category": "Mac Pro"}, {"name": "Mac Pro M2 Ultra", "category": "Mac Pro"}, {"name": "Mac Pro M4 Ultra", "category": "Mac Pro"}];
  const defaultOrders=[{code:'TS-SVC-2026-0001',client:'Cliente demo',phone:'0414-0000000',device:'iPhone 15 Pro Max',issue:'No carga',status:'Recibido',priority:'Normal',tech:'Sin asignar',quote:'Pendiente',updated:new Date().toLocaleString('es-VE')}];
  let session=JSON.parse(localStorage.getItem('ts_service_session')||'null');
  let orders=JSON.parse(localStorage.getItem('ts_service_orders')||JSON.stringify(defaultOrders));
  let bitacora=JSON.parse(localStorage.getItem('ts_service_bitacora')||'[]');
  let serviceUsers=[];

  function save(){localStorage.setItem('ts_service_orders',JSON.stringify(orders));localStorage.setItem('ts_service_bitacora',JSON.stringify(bitacora));}
  function can(view){return session&&roles[session.role]?.includes(view)}
  function openLogin(){document.getElementById('loginModal').classList.add('open')}
  function openClientLookup(){document.getElementById('clientLookupModal').classList.add('open')}
  function openPasswordSetup(){document.getElementById('passwordSetupModal').classList.add('open')}
  function closeModals(){document.querySelectorAll('.modal').forEach(m=>m.classList.remove('open'))}

  async function getServiceProfile(email){
    const {data,error}=await supabaseClient
      .from('service_users')
      .select('email,nombre,rol,activo')
      .eq('email',email.toLowerCase())
      .maybeSingle();

    if(error) throw error;
    if(!data) throw new Error('Este correo no está autorizado para soporte.');
    if(data.activo===false) throw new Error('Este usuario está desactivado.');
    if(!roles[data.rol]) throw new Error('Rol inválido o no configurado: '+data.rol);
    return data;
  }

  async function login(e){
    e.preventDefault();
    const email=document.getElementById('loginUser').value.trim().toLowerCase();
    const password=document.getElementById('loginPass').value;

    const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
    if(error){alert('Acceso no autorizado: '+error.message);return}

    try{
      const profile=await getServiceProfile(email);
      session={name:profile.nombre,role:profile.rol,email:profile.email,user:profile.email};
      localStorage.setItem('ts_service_session',JSON.stringify(session));
      closeModals();
      renderApp();
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
        session={name:profile.nombre,role:profile.rol,email:profile.email,user:profile.email};
        localStorage.setItem('ts_service_session',JSON.stringify(session));
        history.replaceState(null,'',location.pathname);
        closeModals();
        renderApp();
      }catch(err){
        msg.textContent=err.message||'Contraseña creada, pero el correo no está autorizado en service_users.';
      }
    }
  }

  async function logout(){
    await supabaseClient.auth.signOut();
    localStorage.removeItem('ts_service_session');
    session=null;
    document.getElementById('roleDashboard').classList.add('hidden');
  }

  function menuItems(){return[{id:'dashboard',label:'Dashboard'},{id:'orders',label:'Órdenes de servicio'},{id:'reception',label:'Recepción'},{id:'technical',label:'Área técnica'},{id:'bitacora',label:'Bitácora'},{id:'sales',label:'Ventas / cotizaciones'},{id:'logistics',label:'Logística'},{id:'clients',label:'Clientes'},{id:'users',label:'Usuarios y roles'},{id:'permissions',label:'Permisos'},{id:'reports',label:'Reportes'}].filter(i=>can(i.id))}

  function renderApp(){
    if(!session)return;
    document.getElementById('roleDashboard').classList.remove('hidden');
    const nav=document.getElementById('roleMenu');
    nav.innerHTML=menuItems().map(i=>`<button onclick="TSService.renderPanel('${i.id}')">${i.label}</button>`).join('');
    renderPanel('dashboard');
  }

  function stats(){return{total:orders.length,received:orders.filter(o=>o.status==='Recibido').length,diagnosis:orders.filter(o=>o.status==='En diagnóstico').length,ready:orders.filter(o=>o.status==='Listo para entregar').length}}

  async function loadServiceUsers(){
    const {data,error}=await supabaseClient.from('service_users').select('email,nombre,rol,activo,created_at').order('created_at',{ascending:false});
    if(error){return []}
    serviceUsers=data||[];
    return serviceUsers;
  }

  async function renderPanel(view){
    if(!can(view)){alert('Tu rol no tiene permiso para esta sección');return}
    const title=document.getElementById('panelTitle');
    const box=document.getElementById('panelContent');
    const s=stats();
    const titles={dashboard:'Dashboard',orders:'Órdenes de servicio',reception:'Recepción de equipos',technical:'Área técnica',bitacora:'Bitácora técnica',sales:'Ventas y cotizaciones',logistics:'Logística',clients:'Clientes',users:'Usuarios y roles',permissions:'Permisos',reports:'Reportes'};
    title.textContent=titles[view]||'Panel';

    if(view==='dashboard'){
      box.innerHTML=`<div class="cards"><div class="metric"><span>Sesión</span><b>${session.name}</b><small>${roleLabels[session.role]||session.role}</small></div><div class="metric"><span>Total órdenes</span><b>${s.total}</b></div><div class="metric"><span>Recibidas</span><b>${s.received}</b></div><div class="metric"><span>Diagnóstico</span><b>${s.diagnosis}</b></div><div class="metric"><span>Listas</span><b>${s.ready}</b></div></div>${ordersTable()}`;
      return;
    }

    if(view==='orders'||view==='reception'||view==='technical'||view==='sales'||view==='logistics'){box.innerHTML=ordersTable(view);return}


    if(view==='bitacora'){
      box.innerHTML=bitacoraPanel();
      return;
    }

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


  function openBitacora(code=''){
    if(!can('bitacora')){alert('Tu rol no tiene permiso para bitácora');return}
    document.getElementById('bOrderCode').value=code||'';
    document.getElementById('bAuthor').value=session?.name||'';
    document.getElementById('bitacoraModal').classList.add('open');
  }

  function saveBitacora(e){
    e.preventDefault();
    const entry={
      id:'BIT-'+Date.now(),
      orderCode:bOrderCode.value.trim().toUpperCase(),
      type:bType.value,
      author:bAuthor.value.trim()||session?.name||'Sin responsable',
      status:bStatus.value,
      detail:bDetail.value.trim(),
      files:bFiles.value.trim(),
      created:new Date().toLocaleString('es-VE')
    };
    bitacora.unshift(entry);
    const idx=orders.findIndex(o=>o.code.toUpperCase()===entry.orderCode);
    if(idx>=0){
      orders[idx].status=entry.status;
      orders[idx].updated=entry.created;
    }
    save();
    closeModals();
    renderPanel('bitacora');
    alert('Entrada de bitácora guardada.');
  }

  function bitacoraPanel(){
    const recent=bitacora.slice(0,50);
    return `<div class="bitacora-header"><div><h3>Bitácora técnica</h3><p>Historial interno de diagnósticos, pruebas, presupuestos, repuestos y seguimiento de cada orden.</p></div><button onclick="TSService.openBitacora()">Nueva entrada</button></div>
    <div class="cards bitacora-stats">
      <div class="metric"><span>Entradas</span><b>${bitacora.length}</b></div>
      <div class="metric"><span>Diagnósticos</span><b>${bitacora.filter(x=>x.type==='Diagnóstico').length}</b></div>
      <div class="metric"><span>Presupuestos</span><b>${bitacora.filter(x=>x.type==='Presupuesto').length}</b></div>
      <div class="metric"><span>Seguimientos</span><b>${bitacora.filter(x=>x.type==='Seguimiento').length}</b></div>
    </div>
    <div class="tablewrap">
      <h3>Últimas entradas</h3>
      ${recent.length?`<table><tr><th>Fecha</th><th>Orden</th><th>Tipo</th><th>Responsable</th><th>Estado</th><th>Detalle</th></tr>${recent.map(b=>`<tr><td>${b.created}</td><td><b>${b.orderCode}</b></td><td><span class="badge">${b.type}</span></td><td>${b.author}</td><td>${b.status}</td><td>${b.detail}${b.files?`<br><small>Archivos: ${b.files}</small>`:''}</td></tr>`).join('')}</table>`:'<p>Aún no hay entradas de bitácora.</p>'}
    </div>`;
  }


  function ordersTable(scope='orders'){return `<div class="tablewrap"><h3>Órdenes</h3><table><tr><th>Código</th><th>Cliente</th><th>Equipo</th><th>Falla</th><th>Estado</th><th>Acción</th></tr>${orders.map((o,i)=>`<tr><td>${o.code}</td><td>${o.client}<br><small>${o.phone}</small></td><td>${o.device}</td><td>${o.issue}</td><td><select onchange="TSService.updateStatus(${i},this.value)">${['Recibido','En diagnóstico','Cotización enviada','Aprobado por cliente','En reparación','Esperando repuesto','Listo para entregar','Entregado','No aprobado'].map(st=>`<option ${o.status===st?'selected':''}>${st}</option>`).join('')}</select></td><td><button onclick="TSService.printOrder(${i})">Nota</button> <button class="secondary" onclick="TSService.openBitacora(\`${o.code}\`)">Bitácora</button></td></tr>`).join('')}</table></div>`}


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
    return appleDevices.find(d=>d.name.toLowerCase()===v) || appleDevices.find(d=>d.name.toLowerCase().includes(v));
  }
  function fillAppleDeviceList(){
    const list=document.getElementById('appleDeviceModels');
    if(!list) return;
    list.innerHTML=appleDevices.map(d=>`<option value="${d.name}">${d.category}</option>`).join('');
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
      if(large) large.className='device-art-large device-generic';
      if(title) title.textContent='Detalle del equipo';
      if(desc) desc.textContent='Selecciona un modelo para cargar su diseño referencial en recepción.';
      const diagram=document.getElementById('deviceDiagram');
      if(diagram){diagram.className='device-diagram device-diagram-generic';diagram.dataset.model='';clearDamageMarks();}
      return;
    }
    if(name) name.textContent=d.name;
    if(meta) meta.textContent=d.category+' · Diseño referencial para recepción';
    if(art) art.className='device-art '+deviceClass(d.category);
    if(large) large.className='device-art-large '+deviceClass(d.category);
    if(title) title.textContent=d.name;
    if(desc) desc.textContent='Categoría: '+d.category+'. Esquema referencial para registrar condición física, accesorios y observaciones.';
    updateDeviceDiagram(d);
  }
  function selectDeviceFromSearch(value){
    const d=findAppleDevice(value);
    if(d){
      const deviceInput=document.getElementById('oDevice');
      if(deviceInput) deviceInput.value=d.name;
    }
    previewSelectedDevice(value);
  }


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
    const diagram=document.getElementById('deviceDiagram');
    if(diagram) diagram.dataset.view=view;
    document.querySelectorAll('.device-view-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
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
    const mark={x,y,type:currentDamageTool};
    damageMarks.push(mark);
    renderDamageMarks();
  }

  function renderDamageMarks(){
    const layer=document.getElementById('damageLayer');
    const visual=document.getElementById('oVisual');
    if(!layer)return;
    layer.innerHTML=damageMarks.map((m,i)=>`<span class="damage-mark damage-${m.type}" style="left:${m.x}%;top:${m.y}%">${i+1}</span>`).join('');
    if(visual) visual.value=damageMarks.map((m,i)=>`${i+1}. ${m.type} en X:${m.x.toFixed(1)} Y:${m.y.toFixed(1)}`).join(' | ');
  }

  function clearDamageMarks(){
    damageMarks=[];
    renderDamageMarks();
  }

  function filterDeviceCategory(category){
    const list=document.getElementById('appleDeviceModels');
    if(!list)return;
    const filtered=category?appleDevices.filter(d=>d.category===category||d.category.includes(category)):appleDevices;
    list.innerHTML=filtered.map(d=>`<option value="${d.name}">${d.category}</option>`).join('');
  }


  function openServiceOrder(){
    if(!can('reception')&&!can('orders')){alert('No tienes permiso para crear órdenes');return}
    if(!location.hash.includes('new-order') && !document.body.classList.contains('order-tab')){
      const opened=window.open(location.origin+location.pathname+'#new-order','_blank');
      if(opened)return;
      history.replaceState(null,'',location.pathname+'#new-order');
    }
    document.body.classList.add('order-tab');
    document.getElementById('orderModal').classList.add('open');
    setTimeout(()=>document.getElementById('deviceModelSearch')?.focus(),120);
  }
  function code(){return 'TS-SVC-'+new Date().getFullYear()+'-'+String(orders.length+1).padStart(4,'0')}
  function saveOrder(e){e.preventDefault();const o={code:code(),client:oClient.value,phone:oPhone.value,email:oEmail.value,device:oDevice.value,serial:oSerial.value,priority:oPriority.value,issue:oIssue.value,accessories:oAccessories.value,visual:oVisual.value,status:'Recibido',tech:'Sin asignar',quote:'Pendiente',updated:new Date().toLocaleString('es-VE')};orders.unshift(o);save();closeModals();renderPanel('orders');alert('Orden creada: '+o.code)}
  function updateStatus(i,status){orders[i].status=status;orders[i].updated=new Date().toLocaleString('es-VE');save();}
  function printOrder(i){const o=orders[i];const txt=`ORDEN DE SERVICIO THINKSTORE / ASISTECH\n${o.code}\nCliente: ${o.client}\nTeléfono: ${o.phone}\nEquipo: ${o.device}\nSerial/IMEI: ${o.serial||'No indicado'}\nFalla: ${o.issue}\nEstado: ${o.status}\nActualizado: ${o.updated}\nConsulta: soporte.thinkstore.com.ve/?orden=${o.code}`;navigator.clipboard?.writeText(txt);alert(txt)}
  function lookupOrder(e){e.preventDefault();const q=lookupCode.value.trim().toUpperCase();const o=orders.find(x=>x.code.toUpperCase()===q);lookupResult.innerHTML=o?`<div class="metric"><b>${o.status}</b><p>${o.device}<br>Última actualización: ${o.updated}</p></div>`:'<p>No encontré esa orden.</p>'}

  async function initAuth(){
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
        session={name:profile.nombre,role:profile.rol,email:profile.email,user:profile.email};
        localStorage.setItem('ts_service_session',JSON.stringify(session));
        renderApp();
      }catch(err){
        await supabaseClient.auth.signOut();
        localStorage.removeItem('ts_service_session');
        session=null;
      }
    }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    fillAppleDeviceList();
    initAuth();
    if(location.hash.includes('new-order')){document.body.classList.add('order-tab');setTimeout(()=>openServiceOrder(),250);}
    const url=new URL(location.href);
    const q=url.searchParams.get('orden');
    if(q){openClientLookup();lookupCode.value=q;}
  });

  return{openLogin,openClientLookup,closeModals,login,logout,renderPanel,openServiceOrder,saveOrder,updateStatus,printOrder,lookupOrder,saveNewPassword,openBitacora,saveBitacora,previewSelectedDevice,selectDeviceFromSearch,setDamageTool,addDamageMark,clearDamageMarks,filterDeviceCategory,setDeviceView};
})();
