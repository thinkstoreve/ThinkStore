const TSService=(()=>{
  const SUPABASE_URL='https://tnezvnziqnjxhcwjtcuy.supabase.co';
  const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuZXp2bnppcW5qeGhjd2p0Y3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwODk5ODUsImV4cCI6MjA5NzY2NTk4NX0.OsFkefVeW4FN_uVML1ncE0i6FR_Dmg8eLPY9TEnezpM';
  const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

  const roles={
    superadmin:['dashboard','orders','reception','technical','sales','logistics','clients','users','permissions','reports'],
    admin:['dashboard','orders','reception','technical','sales','logistics','clients','reports'],
    reception:['dashboard','orders','reception','clients'],
    technician:['dashboard','orders','technical'],
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

  const defaultOrders=[{code:'TS-SVC-2026-0001',client:'Cliente demo',phone:'0414-0000000',device:'iPhone 15 Pro Max',issue:'No carga',status:'Recibido',priority:'Normal',tech:'Sin asignar',quote:'Pendiente',updated:new Date().toLocaleString('es-VE')}];
  let session=JSON.parse(localStorage.getItem('ts_service_session')||'null');
  let orders=JSON.parse(localStorage.getItem('ts_service_orders')||JSON.stringify(defaultOrders));
  let serviceUsers=[];

  function save(){localStorage.setItem('ts_service_orders',JSON.stringify(orders));}
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

  function menuItems(){return[{id:'dashboard',label:'Dashboard'},{id:'orders',label:'Órdenes de servicio'},{id:'reception',label:'Recepción'},{id:'technical',label:'Área técnica'},{id:'sales',label:'Ventas / cotizaciones'},{id:'logistics',label:'Logística'},{id:'clients',label:'Clientes'},{id:'users',label:'Usuarios y roles'},{id:'permissions',label:'Permisos'},{id:'reports',label:'Reportes'}].filter(i=>can(i.id))}

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
    const titles={dashboard:'Dashboard',orders:'Órdenes de servicio',reception:'Recepción de equipos',technical:'Área técnica',sales:'Ventas y cotizaciones',logistics:'Logística',clients:'Clientes',users:'Usuarios y roles',permissions:'Permisos',reports:'Reportes'};
    title.textContent=titles[view]||'Panel';

    if(view==='dashboard'){
      box.innerHTML=`<div class="cards"><div class="metric"><span>Sesión</span><b>${session.name}</b><small>${roleLabels[session.role]||session.role}</small></div><div class="metric"><span>Total órdenes</span><b>${s.total}</b></div><div class="metric"><span>Recibidas</span><b>${s.received}</b></div><div class="metric"><span>Diagnóstico</span><b>${s.diagnosis}</b></div><div class="metric"><span>Listas</span><b>${s.ready}</b></div></div>${ordersTable()}`;
      return;
    }

    if(view==='orders'||view==='reception'||view==='technical'||view==='sales'||view==='logistics'){box.innerHTML=ordersTable(view);return}

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

  function ordersTable(scope='orders'){return `<div class="tablewrap"><h3>Órdenes</h3><table><tr><th>Código</th><th>Cliente</th><th>Equipo</th><th>Falla</th><th>Estado</th><th>Acción</th></tr>${orders.map((o,i)=>`<tr><td>${o.code}</td><td>${o.client}<br><small>${o.phone}</small></td><td>${o.device}</td><td>${o.issue}</td><td><select onchange="TSService.updateStatus(${i},this.value)">${['Recibido','En diagnóstico','Cotización enviada','Aprobado por cliente','En reparación','Esperando repuesto','Listo para entregar','Entregado','No aprobado'].map(st=>`<option ${o.status===st?'selected':''}>${st}</option>`).join('')}</select></td><td><button onclick="TSService.printOrder(${i})">Nota</button></td></tr>`).join('')}</table></div>`}

  function openServiceOrder(){if(!can('reception')&&!can('orders')){alert('No tienes permiso para crear órdenes');return}document.getElementById('orderModal').classList.add('open')}
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
    initAuth();
    const url=new URL(location.href);
    const q=url.searchParams.get('orden');
    if(q){openClientLookup();lookupCode.value=q;}
  });

  return{openLogin,openClientLookup,closeModals,login,logout,renderPanel,openServiceOrder,saveOrder,updateStatus,printOrder,lookupOrder,saveNewPassword};
})();
