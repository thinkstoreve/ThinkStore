const TSService=(()=>{
  const SUPABASE_URL='https://tnezvnziqnjxhcwjtcuy.supabase.co';
  const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuZXp2bnppcW5qeGhjd2p0Y3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwODk5ODUsImV4cCI6MjA5NzY2NTk4NX0.OsFkefVeW4FN_uVML1ncE0i6FR_Dmg8eLPY9TEnezpM';
  const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

  const roles={
    superadmin:['dashboard','appointments','orders','reception','technical','bitacora','parts','sales','logistics','clients','users','permissions','reports'],
    admin:['dashboard','appointments','orders','reception','technical','bitacora','parts','sales','logistics','clients','reports'],
    reception:['dashboard','appointments','orders','reception','bitacora','parts','clients'],
    technician:['dashboard','orders','technical','bitacora','parts'],
    sales:['dashboard','orders','sales','parts','clients'],
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
  let session=JSON.parse(localStorage.getItem('ts_service_session')||'null');
  const isPanelPage=()=>/\/panel\.html$/i.test(location.pathname);
  const goToPanel=()=>{ if(!isPanelPage()) location.href='panel.html'; };
  const goToHome=()=>{ if(isPanelPage()) location.href='index.html'; };
  let orders=[];
  let bitacora=[];
  let serviceUsers=[];
  let servicePhotos=[];
  let activeOrderId=null;
  let activeReceptionOrderId=null;
  let pendingAppointmentId=null;
  let serviceParts=[];
  let partMovements=[];
  let serviceAppointments=[];

  const dateText=v=>v?new Date(v).toLocaleString('es-VE'):'Sin fecha';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function toast(message,type='ok'){let el=document.getElementById('serviceToast');if(!el){el=document.createElement('div');el.id='serviceToast';document.body.appendChild(el)}el.className=`service-toast ${type}`;el.textContent=message;requestAnimationFrame(()=>el.classList.add('show'));clearTimeout(window.__serviceToast);window.__serviceToast=setTimeout(()=>el.classList.remove('show'),4200)}
  function mapOrder(row){return{id:row.id,code:row.code,client:row.client_name,phone:row.client_phone,email:row.client_email||'',device:row.device_model,deviceType:row.device_type||'',color:row.device_color||'',serial:row.serial_imei||'',priority:row.priority||'Normal',issue:row.reported_issue,accessories:row.accessories_received||'',visual:row.visual_condition||'',status:row.status||'Recibido',tech:row.assigned_technician_email||'',quote:row.quote_status||'Pendiente',quoteAmount:Number(row.quote_amount||0),quoteCurrency:row.quote_currency||'USD',warrantyDays:Number(row.warranty_days||0),deliveryMethod:row.delivery_method||'',trackingCompany:row.tracking_company||'',trackingCode:row.tracking_code||'',technicalNotes:row.technical_notes||'',checklist:row.reception_checklist||{},signatures:row.signatures||{},passwordReceived:Boolean(row.password_received),deliveredAt:row.delivered_at||'',updated:dateText(row.updated_at||row.created_at),created_at:row.created_at};}
  function mapNote(row,byId){const order=byId.get(row.order_id);return{id:row.id,orderId:row.order_id,orderCode:order?.code||'Sin orden',type:row.note_type||'Seguimiento',author:row.author_name||'Soporte ThinkStore',status:row.status_after||order?.status||'',detail:row.note||'',files:row.attachments||'',created:dateText(row.created_at)};}
  async function loadSupportData(){
    const [orderRes,noteRes,photoRes,partsRes,movementsRes,appointmentsRes]=await Promise.all([
      supabaseClient.from('service_orders').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('service_order_notes').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('service_order_photos').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('service_parts').select('*').order('name',{ascending:true}),
      supabaseClient.from('service_part_movements').select('*').order('created_at',{ascending:false}).limit(300),
      supabaseClient.from('service_appointments').select('*').order('preferred_date',{ascending:true}).order('preferred_time',{ascending:true})
    ]);
    if(orderRes.error)throw new Error('No se pudieron cargar las órdenes: '+orderRes.error.message);
    if(noteRes.error)throw new Error('No se pudo cargar la bitácora: '+noteRes.error.message);
    if(photoRes.error)console.warn('No se pudieron cargar archivos:',photoRes.error.message);
    orders=(orderRes.data||[]).map(mapOrder);
    const byId=new Map(orders.map(o=>[o.id,o]));
    bitacora=(noteRes.data||[]).map(row=>mapNote(row,byId));
    servicePhotos=photoRes.data||[];
    serviceParts=partsRes.data||[];partMovements=movementsRes.data||[];serviceAppointments=appointmentsRes.error?[]:(appointmentsRes.data||[]);
    if(appointmentsRes.error)console.warn('No se pudieron cargar citas web:',appointmentsRes.error.message);
  }
  async function audit(action,entityId,beforeData,afterData){try{await supabaseClient.from('service_audit_log').insert({actor_email:session?.email||null,actor_role:session?.role||null,action,entity_type:'service_order',entity_id:String(entityId||''),before_data:beforeData||null,after_data:afterData||null})}catch(_){}}
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
        session={name:profile.nombre,role:profile.rol,email:profile.email,user:profile.email};
        localStorage.setItem('ts_service_session',JSON.stringify(session));
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
    const dash=document.getElementById('roleDashboard');
    if(dash) dash.classList.add('hidden');
    location.href='index.html';
  }

  function menuItems(){return[
    {id:'dashboard',label:'Dashboard',icon:'⌂',group:'Resumen'},
    {id:'appointments',label:'Citas web',icon:'◷',group:'Operación'},
    {id:'orders',label:'Órdenes de servicio',icon:'▣',group:'Operación'},
    {id:'reception',label:'Recepción',icon:'⇥',group:'Operación'},
    {id:'technical',label:'Área técnica',icon:'⌁',group:'Operación'},
    {id:'bitacora',label:'Bitácora',icon:'≡',group:'Operación'},
    {id:'parts',label:'Inventario de repuestos',icon:'◇',group:'Gestión'},
    {id:'sales',label:'Ventas / cotizaciones',icon:'$',group:'Gestión'},
    {id:'logistics',label:'Logística',icon:'↗',group:'Gestión'},
    {id:'clients',label:'Clientes',icon:'○',group:'Gestión'},
    {id:'users',label:'Usuarios y roles',icon:'♙',group:'Administración'},
    {id:'permissions',label:'Permisos',icon:'⌘',group:'Administración'},
    {id:'reports',label:'Reportes',icon:'▥',group:'Administración'}
  ].filter(i=>can(i.id))}

  function renderRoleMenu(){
    const nav=document.getElementById('roleMenu');
    if(!nav)return;
    const items=menuItems();
    let lastGroup='';
    nav.innerHTML=items.map(i=>{
      const group=i.group!==lastGroup?`<span class="nav-group-label">${i.group}</span>`:'';
      lastGroup=i.group;
      return `${group}<button type="button" class="support-nav-btn" data-view="${i.id}" onclick="TSService.renderPanel('${i.id}')"><span class="support-nav-icon" aria-hidden="true">${i.icon}</span><span>${i.label}</span></button>`;
    }).join('');
  }

  async function renderApp(){
    if(!session)return;
    const dash=document.getElementById('roleDashboard');
    const nav=document.getElementById('roleMenu');
    if(!dash||!nav)return;
    renderRoleMenu();
    const box=document.getElementById('panelContent');if(box)box.innerHTML='<div class="notice">Cargando datos reales de soporte…</div>';
    try{await loadSupportData();await renderPanel('dashboard')}catch(error){if(box)box.innerHTML=`<div class="tablewrap"><h3>No se pudo cargar Soporte</h3><p>${error.message||error}</p><p>Ejecuta supabase_soporte_produccion.sql en el proyecto de soporte.</p></div>`}
    dash.classList.remove('hidden');
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        document.body.classList.add('support-panel-ready');
        const loader=document.getElementById('supportPanelLoader');
        if(loader){loader.classList.add('done');setTimeout(()=>loader.remove(),520);}
      });
    });
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
    document.querySelectorAll('#roleMenu .support-nav-btn').forEach(btn=>{
      const active=btn.dataset.view===view;
      btn.classList.toggle('active',active);
      if(active)btn.setAttribute('aria-current','page'); else btn.removeAttribute('aria-current');
    });
    const title=document.getElementById('panelTitle');
    const box=document.getElementById('panelContent');
    const s=stats();
    const titles={dashboard:'Dashboard',appointments:'Citas web',orders:'Órdenes de servicio',reception:'Recepción de equipos',technical:'Área técnica',bitacora:'Bitácora técnica',parts:'Inventario de repuestos',sales:'Ventas y cotizaciones',logistics:'Logística',clients:'Clientes',users:'Usuarios y roles',permissions:'Permisos',reports:'Reportes'};
    title.textContent=titles[view]||'Panel';

    if(view==='dashboard'){
      const dashboardAppointments=serviceAppointments||[];
      const pendingAppointments=dashboardAppointments.filter(a=>['pendiente_confirmacion','pendiente'].includes(a.status)).length;
      const scheduledAppointments=dashboardAppointments.filter(a=>['agendada','confirmada'].includes(a.status)).length;
      const activeOrders=orders.filter(o=>!['Entregado','Cancelado','No aprobado'].includes(o.status)).length;
      const deliveredOrders=orders.filter(o=>o.status==='Entregado').length;
      const waitingParts=orders.filter(o=>o.status==='Esperando repuesto').length;
      const uniqueClients=new Set(orders.map(o=>(o.email||o.phone||o.client||'').trim().toLowerCase()).filter(Boolean)).size;
      const lowParts=serviceParts.filter(p=>Number(p.quantity||0)<=Number(p.min_stock||p.minimum_stock||0)).length;
      const recentOrders=orders.slice(0,5);
      const recentNotes=bitacora.slice(0,5);
      box.innerHTML=`
        <section class="dash-hero">
          <div><span class="eyebrow">CENTRO DE OPERACIONES</span><h2>Resumen de Soporte ThinkStore</h2><p>Datos reales de órdenes, citas, clientes y repuestos.</p></div>
          <div class="dash-session"><span>Sesión activa</span><b>${esc(session.name)}</b><small>${esc(roleLabels[session.role]||session.role)}</small></div>
        </section>
        <div class="dash-grid">
          <button class="dash-kpi" onclick="TSService.renderPanel('orders')"><span>Órdenes totales</span><b>${s.total}</b><small>${activeOrders} activas · ${deliveredOrders} entregadas</small></button>
          <button class="dash-kpi" onclick="TSService.renderPanel('appointments')"><span>Citas web</span><b>${dashboardAppointments.length}</b><small>${pendingAppointments} pendientes · ${scheduledAppointments} agendadas</small></button>
          <button class="dash-kpi" onclick="TSService.renderPanel('clients')"><span>Clientes atendidos</span><b>${uniqueClients}</b><small>Calculado desde órdenes reales</small></button>
          <button class="dash-kpi" onclick="TSService.renderPanel('parts')"><span>Stock crítico</span><b>${lowParts}</b><small>${waitingParts} orden(es) esperando repuesto</small></button>
        </div>
        <div class="dash-status-row">
          <div class="dash-status"><span>Recibidas</span><b>${s.received}</b></div>
          <div class="dash-status"><span>En diagnóstico</span><b>${s.diagnosis}</b></div>
          <div class="dash-status"><span>Listas para entregar</span><b>${s.ready}</b></div>
          <div class="dash-status"><span>Esperando repuesto</span><b>${waitingParts}</b></div>
        </div>
        <div class="dash-columns">
          <div class="tablewrap dash-panel"><div class="dash-panel-head"><div><h3>Órdenes recientes</h3><p>Últimos ingresos al taller.</p></div><button class="secondary" onclick="TSService.renderPanel('orders')">Ver todas</button></div>
            <div class="dash-list">${recentOrders.length?recentOrders.map(o=>`<button class="dash-list-row" onclick="TSService.openOrderManager('${esc(o.id)}')"><span><b>${esc(o.code)}</b><small>${esc(o.client)} · ${esc(o.device)}</small></span><span class="badge">${esc(o.status)}</span></button>`).join(''):'<div class="dash-empty">Aún no hay órdenes registradas.</div>'}</div>
          </div>
          <div class="tablewrap dash-panel"><div class="dash-panel-head"><div><h3>Actividad reciente</h3><p>Movimientos de la bitácora técnica.</p></div><button class="secondary" onclick="TSService.renderPanel('bitacora')">Abrir bitácora</button></div>
            <div class="dash-list">${recentNotes.length?recentNotes.map(n=>`<div class="dash-list-row static"><span><b>${esc(n.orderCode)}</b><small>${esc(n.detail||n.type)} · ${esc(n.author)}</small></span><small>${esc(n.created)}</small></div>`).join(''):'<div class="dash-empty">Aún no hay actividad en la bitácora.</div>'}</div>
          </div>
        </div>`;
      return;
    }

    if(view==='appointments'){await renderAppointments(box);return}

    if(view==='orders'||view==='reception'||view==='technical'||view==='sales'||view==='logistics'){box.innerHTML=ordersTable(view);return}


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
      oClient.value=a.client_name||''; oPhone.value=a.client_phone||''; oEmail.value=a.client_email||'';
      oDevice.value=a.device_model||''; deviceModelSearch.value=a.device_model||''; oIssue.value=a.reported_issue||a.service_type||'';
      const d=findAppleDevice(a.device_model||''); if(d){oCategory.value=d.category||'';previewSelectedDevice(a.device_model);selectDeviceFromSearch(a.device_model)}
      oTechNotes.value=[`Origen: cita web ${a.id}`,a.service_type?`Servicio: ${a.service_type}`:'',a.service_mode?`Modalidad: ${a.service_mode}`:'',a.preferred_date?`Cita: ${a.preferred_date} ${a.preferred_time||''}`:''].filter(Boolean).join(' · ');
      sigClientName.value=a.client_name||''; sigReceptionName.value=session?.name||'';
      await supabaseClient.from('service_appointments').update({status:'en_recepcion',updated_at:new Date().toISOString()}).eq('id',id);
      document.body.classList.add('order-tab');document.getElementById('orderModal').classList.add('open');setTimeout(()=>oSerial?.focus(),120);
    }catch(err){
      console.error('Iniciar recepción desde cita:',err);
      toast('No se pudo iniciar la recepción: '+(err.message||'Error'),'error');
    }
  }


  function openBitacora(code=''){
    if(!can('bitacora')){alert('Tu rol no tiene permiso para bitácora');return}
    document.getElementById('bOrderCode').value=code||'';
    document.getElementById('bAuthor').value=session?.name||'';
    document.getElementById('bitacoraModal').classList.add('open');
  }

  async function saveBitacora(e){
    e.preventDefault();
    const code=bOrderCode.value.trim().toUpperCase();
    const order=orders.find(o=>o.code.toUpperCase()===code);
    if(!order){alert('No existe una orden con el código '+code);return}
    const entry={
      orderCode:code,
      type:bType.value,
      author:bAuthor.value.trim()||session?.name||'Sin responsable',
      status:bStatus.value,
      detail:bDetail.value.trim(),
      files:bFiles.value.trim(),
      created:new Date().toLocaleString('es-VE')
    };
    const {error:noteError}=await supabaseClient.from('service_order_notes').insert({order_id:order.id,note:entry.detail,visibility:'internal',author_name:entry.author,note_type:entry.type,status_after:entry.status,attachments:entry.files||null});
    if(noteError){alert('No se pudo guardar la bitácora: '+noteError.message);return}
    const {error:updateError}=await supabaseClient.from('service_orders').update({status:entry.status}).eq('id',order.id);
    if(updateError){alert('La nota se guardó, pero no se actualizó el estado: '+updateError.message);return}
    await audit('add_note',order.id,null,entry);await loadSupportData();closeModals();await renderPanel('bitacora');toast('Entrada guardada y reflejada en la orden.');
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

  function partsPanel(){
    const low=serviceParts.filter(p=>p.active!==false&&Number(p.quantity)<=Number(p.minimum_stock));
    const rows=serviceParts.map(p=>`<tr><td><b>${esc(p.sku)}</b></td><td>${esc(p.name)}<br><small>${esc(p.compatible_models||'Compatibilidad no indicada')}</small></td><td>${esc(p.category||'General')}</td><td><b class="${Number(p.quantity)<=Number(p.minimum_stock)?'stock-low':''}">${Number(p.quantity||0)}</b><br><small>Mínimo ${Number(p.minimum_stock||0)}</small></td><td>${p.unit_cost!=null?'$'+Number(p.unit_cost).toFixed(2):'—'} / ${p.sale_price!=null?'$'+Number(p.sale_price).toFixed(2):'—'}</td><td>${esc(p.location||'—')}</td><td><button onclick="TSService.openPartMovement('${esc(p.id)}','in')">Entrada</button> <button class="secondary" onclick="TSService.openPartMovement('${esc(p.id)}','out')">Usar</button> <button class="secondary" onclick="TSService.openPartEditor('${esc(p.id)}')">Editar</button></td></tr>`).join('');
    const moves=partMovements.slice(0,20).map(m=>{const p=serviceParts.find(x=>x.id===m.part_id);return `<tr><td>${dateText(m.created_at)}</td><td>${esc(p?.name||m.part_id)}</td><td>${esc(m.movement_type)}</td><td>${m.quantity>0?'+':''}${m.quantity}</td><td>${m.balance_after}</td><td>${esc(m.order_id||m.note||'—')}</td></tr>`}).join('');
    return `<div class="cards"><div class="metric"><span>Repuestos activos</span><b>${serviceParts.filter(p=>p.active!==false).length}</b></div><div class="metric"><span>Unidades totales</span><b>${serviceParts.reduce((s,p)=>s+Number(p.quantity||0),0)}</b></div><div class="metric"><span>Stock bajo</span><b>${low.length}</b></div></div><div class="tablewrap"><div class="bitacora-header"><div><h3>Stock de repuestos</h3><p>Entradas, consumos por orden y alertas mínimas.</p></div><button onclick="TSService.openPartEditor()">Añadir repuesto</button></div><table><tr><th>SKU</th><th>Repuesto</th><th>Categoría</th><th>Stock</th><th>Costo / venta</th><th>Ubicación</th><th>Acciones</th></tr>${rows||'<tr><td colspan="7">Aún no hay repuestos registrados.</td></tr>'}</table></div><div class="tablewrap"><h3>Últimos movimientos</h3><table><tr><th>Fecha</th><th>Repuesto</th><th>Tipo</th><th>Cantidad</th><th>Saldo</th><th>Orden / nota</th></tr>${moves||'<tr><td colspan="6">Sin movimientos.</td></tr>'}</table></div>`;
  }
  function openPartEditor(id=''){
    const p=serviceParts.find(x=>String(x.id)===String(id));partId.value=p?.id||'';partSku.value=p?.sku||'';partName.value=p?.name||'';partCategory.value=p?.category||'';partModels.value=p?.compatible_models||'';partMin.value=p?.minimum_stock||0;partCost.value=p?.unit_cost??'';partPrice.value=p?.sale_price??'';partLocation.value=p?.location||'';document.getElementById('partEditorModal').classList.add('open');
  }
  async function savePart(e){
    e.preventDefault();const id=partId.value;const row={sku:partSku.value.trim().toUpperCase(),name:partName.value.trim(),category:partCategory.value.trim()||null,compatible_models:partModels.value.trim()||null,minimum_stock:Number(partMin.value||0),unit_cost:partCost.value===''?null:Number(partCost.value),sale_price:partPrice.value===''?null:Number(partPrice.value),location:partLocation.value.trim()||null,active:true};
    const q=id?supabaseClient.from('service_parts').update(row).eq('id',id):supabaseClient.from('service_parts').insert({...row,quantity:0});const {error}=await q;if(error)return toast('No se pudo guardar: '+error.message,'error');await loadSupportData();closeModals();await renderPanel('parts');toast(id?'Repuesto actualizado.':'Repuesto creado; registra una entrada de stock.');
  }
  function openPartMovement(id,direction){const p=serviceParts.find(x=>String(x.id)===String(id));if(!p)return;movementPartId.value=p.id;movementDirection.value=direction;movementTitle.textContent=`${direction==='in'?'Entrada':'Uso'} · ${p.name}`;movementQty.value=1;movementOrder.value='';movementNote.value='';document.getElementById('partMovementModal').classList.add('open')}
  async function savePartMovement(e){
    e.preventDefault();const direction=movementDirection.value;const qty=Math.abs(Number(movementQty.value||0))*(direction==='out'?-1:1);if(!qty)return toast('Indica una cantidad válida.','error');const orderCode=movementOrder.value.trim().toUpperCase();const {data,error}=await supabaseClient.rpc('adjust_service_part_stock',{p_part_id:movementPartId.value,p_quantity:qty,p_type:direction==='out'?'consumo_orden':'entrada',p_order_id:orderCode||null,p_note:movementNote.value.trim()||null});if(error)return toast(error.message,'error');if(direction==='out'&&orderCode){const order=orders.find(o=>o.code.toUpperCase()===orderCode);if(order)await supabaseClient.from('service_order_notes').insert({order_id:order.id,note:`Repuesto utilizado: ${serviceParts.find(p=>p.id===movementPartId.value)?.name||'Repuesto'} · Cantidad ${Math.abs(qty)}`,visibility:'internal',author_name:session?.name||'Soporte',note_type:'Repuesto',status_after:order.status})}await loadSupportData();closeModals();await renderPanel('parts');toast(`Movimiento registrado. Stock actual: ${data?.quantity??data?.[0]?.quantity??'actualizado'}.`);
  }


  function ordersTable(scope='orders'){
    const filtered=orders.filter(o=>scope==='technical'?['En diagnóstico','Aprobado por cliente','En reparación','Esperando repuesto'].includes(o.status):scope==='sales'?['Cotización enviada','No aprobado'].includes(o.status):scope==='logistics'?['Listo para entregar','Entregado'].includes(o.status):true);
    return `<div class="tablewrap"><div class="bitacora-header"><div><h3>Órdenes reales</h3><p>${filtered.length} registro(s) visibles · Última carga ${new Date().toLocaleTimeString('es-VE')}</p></div>${can('reception')?'<button onclick="TSService.openServiceOrder()">Nueva recepción</button>':''}</div><table><tr><th>Código</th><th>Cliente</th><th>Equipo</th><th>Técnico / presupuesto</th><th>Estado</th><th>Acciones</th></tr>${filtered.map(o=>{const i=orders.findIndex(x=>String(x.id)===String(o.id));return `<tr><td><b>${esc(o.code)}</b><br><small>${esc(o.updated)}</small></td><td>${esc(o.client)}<br><small>${esc(o.phone)}${o.email?' · '+esc(o.email):''}</small></td><td>${esc(o.device)}<br><small>${esc(o.serial||'Sin serial')} ${o.color?'· '+esc(o.color):''}</small></td><td>${esc(o.tech||'Sin asignar')}<br><small>${o.quoteAmount?`${esc(o.quoteCurrency)} ${o.quoteAmount.toFixed(2)} · `:''}${esc(o.quote)}</small></td><td><select onchange="TSService.updateStatus(${i},this.value)">${['Recibido','En diagnóstico','Cotización enviada','Aprobado por cliente','En reparación','Esperando repuesto','Listo para entregar','Entregado','No aprobado','Cancelado'].map(st=>`<option ${o.status===st?'selected':''}>${st}</option>`).join('')}</select></td><td><button onclick="TSService.openOrderManager('${esc(o.id)}')">Gestionar</button> <button class="secondary" onclick="TSService.openExistingReception('${esc(o.id)}')">${o.checklist&&Object.keys(o.checklist).length?'Editar recepción':'Recepción'}</button> <button class="secondary" onclick="TSService.openBitacora('${esc(o.code)}')">Bitácora</button> <button class="secondary" onclick="TSService.printOrder(${i})">Hoja</button> <button class="secondary" onclick="TSService.printLabel(${i})">Etiqueta QR</button></td></tr>`}).join('')||'<tr><td colspan="6">No hay órdenes para este módulo.</td></tr>'}</table></div>`}

  async function openOrderManager(id){
    const o=orders.find(x=>String(x.id)===String(id));if(!o)return;
    activeOrderId=o.id;await loadServiceUsers();
    const modal=document.getElementById('orderManagerModal');
    document.getElementById('mOrderTitle').textContent=`${o.code} · ${o.device}`;
    document.getElementById('mTechnician').innerHTML=`<option value="">Sin asignar</option>${serviceUsers.filter(u=>u.activo&&['technician','admin','superadmin'].includes(u.rol)).map(u=>`<option value="${esc(u.email)}" ${u.email===o.tech?'selected':''}>${esc(u.nombre)} · ${esc(u.email)}</option>`).join('')}`;
    mQuoteAmount.value=o.quoteAmount||'';mQuoteStatus.value=o.quote;mWarrantyDays.value=o.warrantyDays||0;mDeliveryMethod.value=o.deliveryMethod||'';mTrackingCompany.value=o.trackingCompany||'';mTrackingCode.value=o.trackingCode||'';mTechnicalNotes.value=o.technicalNotes||'';
    await renderOrderFiles(o.id);modal.classList.add('open');
  }
  async function renderOrderFiles(orderId){
    const box=document.getElementById('mOrderFiles');if(!box)return;const files=servicePhotos.filter(p=>String(p.order_id)===String(orderId));
    const rows=await Promise.all(files.map(async p=>{let url=p.file_url;if(p.storage_path){const {data}=await supabaseClient.storage.from('service-order-files').createSignedUrl(p.storage_path,3600);url=data?.signedUrl||url}return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(p.label||'Archivo')} · ${dateText(p.created_at)}</a>`}));
    box.innerHTML=rows.join('')||'<small>Sin fotografías o archivos.</small>';
  }
  async function saveOrderManager(e){
    e.preventDefault();const o=orders.find(x=>String(x.id)===String(activeOrderId));if(!o)return;
    const changes={assigned_technician_email:mTechnician.value||null,quote_amount:mQuoteAmount.value?Number(mQuoteAmount.value):null,quote_status:mQuoteStatus.value,warranty_days:Number(mWarrantyDays.value||0),delivery_method:mDeliveryMethod.value.trim()||null,tracking_company:mTrackingCompany.value.trim()||null,tracking_code:mTrackingCode.value.trim()||null,technical_notes:mTechnicalNotes.value.trim()||null};
    const {error}=await supabaseClient.from('service_orders').update(changes).eq('id',o.id);if(error){toast('No se pudo guardar: '+error.message,'error');return}
    await supabaseClient.from('service_order_notes').insert({order_id:o.id,note:'Datos operativos actualizados: técnico, presupuesto, garantía o entrega.',visibility:'internal',author_name:session?.name||'Soporte',note_type:'Gestión de orden',status_after:o.status});await audit('update_order_details',o.id,o,changes);
    await loadSupportData();closeModals();await renderPanel('orders');toast('Orden actualizada correctamente.');
  }
  async function uploadOrderFile(){
    const input=document.getElementById('mOrderFile'),file=input?.files?.[0],o=orders.find(x=>String(x.id)===String(activeOrderId));if(!file||!o)return toast('Selecciona una fotografía o archivo.','error');
    if(file.size>8*1024*1024)return toast('El archivo supera el límite de 8 MB.','error');
    const ext=(file.name.split('.').pop()||'bin').replace(/[^a-z0-9]/gi,'');const path=`${o.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const {error:upError}=await supabaseClient.storage.from('service-order-files').upload(path,file,{upsert:false});if(upError)return toast('No se pudo subir: '+upError.message,'error');
    const {error}=await supabaseClient.from('service_order_photos').insert({order_id:o.id,file_url:'private',storage_path:path,label:file.name,created_by_email:session?.email||null});if(error)return toast('Archivo subido, pero no registrado: '+error.message,'error');
    await audit('upload_order_file',o.id,null,{label:file.name,storage_path:path});await loadSupportData();await renderOrderFiles(o.id);input.value='';toast('Archivo guardado de forma privada.');
  }
  async function notifyOrderClient(){
    const o=orders.find(x=>String(x.id)===String(activeOrderId));if(!o?.email)return toast('La orden no tiene correo del cliente.','error');
    if(!confirm(`¿Enviar actualización de ${o.code} a ${o.email}?`))return;
    await sendOrderEmail(o,false);
  }
  async function sendOrderEmail(o,silent=true){
    const {data:{session:sb}}=await supabaseClient.auth.getSession();const res=await fetch('/.netlify/functions/support-actions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${sb?.access_token||''}`},body:JSON.stringify({action:'notify_client',order_id:o.id})});const data=await res.json().catch(()=>({}));if(!res.ok||!data.ok)return toast(data.error||'No se pudo enviar el correo.','error');toast('Correo enviado al cliente.');
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
    return appleDevices.find(d=>d.name.toLowerCase()===v) || appleDevices.find(d=>d.name.toLowerCase().includes(v));
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
    const list=document.getElementById('appleDeviceModels');
    if(!list)return;
    const filtered=category?appleDevices.filter(d=>d.category===category||d.category.includes(category)):appleDevices;
    list.innerHTML=filtered.map(d=>`<option value="${d.name}">${d.category}</option>`).join('');
  }


  function resetReceptionForm(){
    activeReceptionOrderId=null; pendingAppointmentId=null;
    const form=document.querySelector('#orderModal form');if(form)form.reset();
    document.querySelectorAll('#receptionChecklist label').forEach(label=>{const cb=label.querySelector('input[type=checkbox]');const sel=label.querySelector('select');if(cb)cb.checked=false;if(sel)sel.selectedIndex=0;});
    document.getElementById('oPriority').value='Normal';
    document.getElementById('oBrand').value='Apple';
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
    oClient.value=o.client||'';oPhone.value=o.phone||'';oEmail.value=o.email||'';oPriority.value=o.priority||'Normal';
    oDevice.value=o.device||'';deviceModelSearch.value=o.device||'';oColor.value=o.color||'';oSerial.value=o.serial||'';oIssue.value=o.issue||'';oAccessories.value=o.accessories||'';oVisual.value=o.visual||'';oTechNotes.value=o.technicalNotes||'';
    oPasswordFlag.value=o.passwordReceived?'Sí':'No';
    const d=findAppleDevice(o.device||''); if(d){oCategory.value=d.category||'';previewSelectedDevice(o.device);selectDeviceFromSearch(o.device)}
    applyReceptionChecklist(o.checklist||{});
    const sig=o.signatures||{};sigReceptionName.value=sig.reception||session?.name||'';sigClientName.value=sig.client||o.client||'';sigTechName.value=sig.technician||'';sigSupervisorName.value=sig.supervisor||'';
    document.body.classList.add('order-tab');document.getElementById('orderModal').classList.add('open');setTimeout(()=>oSerial?.focus(),120);
  }
  function code(){const year=new Date().getFullYear(),nums=orders.filter(o=>String(o.code).includes(`TS-SVC-${year}-`)).map(o=>Number(String(o.code).split('-').pop())||0);return `TS-SVC-${year}-${String(Math.max(0,...nums)+1).padStart(4,'0')}`}
  async function saveOrder(e){
    e.preventDefault();
    const device=findAppleDevice(oDevice.value);
    const checklist={};document.querySelectorAll('#receptionChecklist label').forEach(label=>{const name=label.childNodes[1]?.textContent?.trim()||label.textContent.trim().split(/Funciona|No funciona|No aplica/)[0].trim();const checked=label.querySelector('input')?.checked||false;const value=label.querySelector('select')?.value||'';checklist[name]={checked,value}});
    const signatures={reception:sigReceptionName.value.trim()||session?.name||'',client:sigClientName.value.trim(),technician:sigTechName.value.trim(),supervisor:sigSupervisorName.value.trim()};
    const base={client_name:oClient.value.trim(),client_phone:oPhone.value.trim(),client_email:oEmail.value.trim()||null,device_type:device?.category||null,device_model:oDevice.value.trim(),device_color:oColor.value.trim()||null,serial_imei:oSerial.value.trim()||null,password_received:oPasswordFlag.value==='Sí',priority:oPriority.value,reported_issue:oIssue.value.trim(),accessories_received:oAccessories.value.trim()||null,visual_condition:oVisual.value.trim()||null,technical_notes:oTechNotes.value.trim()||null,reception_checklist:checklist,signatures,status:'Recibido'};
    if(activeReceptionOrderId){
      const previous=orders.find(x=>String(x.id)===String(activeReceptionOrderId));
      const {data,error}=await supabaseClient.from('service_orders').update(base).eq('id',activeReceptionOrderId).select('*').single();
      if(error){alert('No se pudo guardar la recepción: '+error.message);return}
      await supabaseClient.from('service_order_notes').insert({order_id:activeReceptionOrderId,note:'Recepción física registrada/actualizada. Checklist, accesorios, serial/IMEI y condición del equipo guardados.',visibility:'internal',author_name:session?.name||'Recepción',note_type:'Recepción',status_after:'Recibido'});
      await audit('update_reception',activeReceptionOrderId,previous||null,base);
      activeReceptionOrderId=null;await loadSupportData();closeModals();await renderPanel('orders');toast('Recepción guardada en la orden '+(data?.code||previous?.code||''));return;
    }
    const row={...base,code:code(),quote_status:'Pendiente',created_by_email:session?.email||null};
    const {data,error}=await supabaseClient.from('service_orders').insert(row).select('*').single();
    if(error){alert('No se pudo crear la orden: '+error.message);return}
    await supabaseClient.from('service_order_notes').insert({order_id:data.id,note:'Equipo recibido y checklist registrado.',visibility:'internal',author_name:session?.name||'Recepción',note_type:'Recepción',status_after:'Recibido'});await audit('create_order',data.id,null,row);
    if(pendingAppointmentId){
      await supabaseClient.from('service_appointments').update({status:'convertida_orden',updated_at:new Date().toISOString()}).eq('id',pendingAppointmentId);
    }
    const createdOrder=mapOrder(data); pendingAppointmentId=null;
    await loadSupportData();closeModals();await renderPanel('orders');showReceptionComplete(createdOrder);toast('Ingreso finalizado. Orden creada: '+row.code);
  }
  async function updateStatus(i,status){
    const order=orders[i];if(!order)return;
    const previous=order.status;
    const changes={status};if(status==='Entregado')changes.delivered_at=new Date().toISOString();
    const {error}=await supabaseClient.from('service_orders').update(changes).eq('id',order.id);
    if(error){alert('No se pudo actualizar el estado: '+error.message);await renderPanel('orders');return}
    await supabaseClient.from('service_order_notes').insert({order_id:order.id,note:`Estado actualizado de ${previous} a ${status}`,visibility:'internal',author_name:session?.name||'Soporte ThinkStore',note_type:'Cambio de estado',status_after:status});
    await audit('update_status',order.id,{status:previous},{status});await loadSupportData();await renderPanel('orders');toast('Estado actualizado y registrado en bitácora.');if(order.email)sendOrderEmail({...order,status},true).catch(error=>console.warn('Correo de soporte:',error));
  }
  function trackingUrl(order){
    // El QR siempre apunta al portal público HTTPS, incluso cuando el panel se prueba en local.
    // Así la hoja/etiqueta impresa nunca entrega una URL 127.0.0.1 al cliente.
    const base='https://soporte.thinkstore.com.ve/seguimiento.html';
    return `${base}?orden=${encodeURIComponent(order.code)}`;
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
      *{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#111;margin:0;padding:28px;background:#fff}.sheet{max-width:820px;margin:auto}.head{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #111;padding-bottom:16px}.brand{display:flex;gap:12px;align-items:center}.logo{width:48px;height:48px;border-radius:12px;background:#111;color:#fff;display:grid;place-items:center;font-weight:800;font-size:22px}.code{text-align:right}.code b{font-size:24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}.box{border:1px solid #ccc;border-radius:12px;padding:14px}.box h3{margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.05em}.full{grid-column:1/-1}.qr{display:flex;align-items:center;gap:18px}.qr img{width:145px;height:145px}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:48px}.sign{border-top:1px solid #111;padding-top:8px;text-align:center;font-size:12px}.policy p{margin:0;font-size:11px;line-height:1.45;color:#333}.foot{text-align:center;margin-top:30px;font-size:12px;color:#555}@media print{body{padding:0}.no-print{display:none!important}}
    </style></head><body>${html}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),500));<\/script></body></html>`);w.document.close();
  }
  function printReceptionSheetByOrder(o){
    if(!o)return; const url=trackingUrl(o); const qr=qrUrl(url,300);
    openPrintWindow(`Hoja de recepción ${o.code}`,`<div class="sheet"><div class="head"><div class="brand"><div class="logo">TS</div><div><h1 style="margin:0">ThinkStore</h1><div>Servicio Técnico Apple</div></div></div><div class="code"><small>ORDEN DE SERVICIO</small><br><b>${esc(o.code)}</b><br><span>${new Date().toLocaleString('es-VE')}</span></div></div>
    <div class="grid"><div class="box"><h3>Datos del cliente</h3><b>${esc(o.client)}</b><br>${esc(o.phone)}<br>${esc(o.email||'')}</div><div class="box"><h3>Datos del equipo</h3><b>${esc(o.device)}</b><br>Color: ${esc(o.color||'No indicado')}<br>Serial / IMEI: ${esc(o.serial||'No indicado')}</div><div class="box full"><h3>Falla reportada</h3>${esc(o.issue)}</div><div class="box"><h3>Accesorios recibidos</h3>${esc(o.accessories||'Ninguno indicado')}</div><div class="box"><h3>Condición / checklist</h3>${checklistSummary(o)}</div><div class="box full"><h3>Observaciones</h3>${esc(cleanReceptionObservation(o))}</div><div class="box full qr"><img src="${qr}" alt="QR"><div><h3>Seguimiento en vivo</h3><b>${esc(o.code)}</b><p>Escanea este código para consultar el estado actualizado del equipo.</p><small>${esc(url)}</small></div></div><div class="box full policy"><h3>Política de recepción</h3><p>El cliente declara ser propietario del equipo o estar autorizado para entregarlo a revisión. ThinkStore registrará el estado visible, accesorios y pruebas realizadas al momento de la recepción. Se recomienda mantener una copia de seguridad de la información antes de cualquier diagnóstico o reparación. Cuando el diagnóstico requiera apertura o pruebas internas del equipo, se realizará únicamente como parte del proceso técnico. Cualquier reparación, repuesto o cargo adicional deberá ser informado y aprobado antes de ejecutarse. La presente hoja y el número de orden sirven como comprobante de recepción y referencia para el seguimiento del servicio.</p></div></div>
    <div class="signatures"><div class="sign">Firma del cliente<br>${esc(o.signatures?.client||o.client||'')}</div><div class="sign">Firma de recepción<br>${esc(o.signatures?.reception||session?.name||'')}</div></div><div class="foot">ThinkStore · Tecnología. Todo en un solo lugar.</div></div>`);
  }
  function printDeviceLabelByOrder(o){
    if(!o)return; const url=trackingUrl(o); const qr=qrUrl(url,220);
    openPrintWindow(`Etiqueta ${o.code}`,`<div style="width:76mm;height:50mm;border:1px solid #111;border-radius:4mm;padding:4mm;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;display:grid;grid-template-columns:1fr 28mm;gap:3mm;align-items:center"><div><b style="font-size:13pt">ThinkStore</b><div style="font-size:7pt;margin-bottom:3mm">Servicio Técnico</div><b style="font-size:11pt">${esc(o.code)}</b><div style="font-size:9pt;margin-top:2mm">${esc(o.device)}</div><div style="font-size:8pt">${esc(o.color||'')}</div><div style="font-size:6.5pt;margin-top:2mm">Escanea para ver el estado</div></div><img src="${qr}" style="width:28mm;height:28mm" alt="QR"></div>`);
  }
  function showReceptionComplete(o){
    const m=document.getElementById('receptionCompleteModal'); if(!m)return; m.dataset.orderId=o.id;
    document.getElementById('rcCode').textContent=o.code;document.getElementById('rcDevice').textContent=o.device;document.getElementById('rcTracking').textContent=trackingUrl(o);m.classList.add('open');
  }
  function completedOrder(){const id=document.getElementById('receptionCompleteModal')?.dataset.orderId;return orders.find(x=>String(x.id)===String(id))}
  function printCompletedReception(){printReceptionSheetByOrder(completedOrder())}
  function printCompletedLabel(){printDeviceLabelByOrder(completedOrder())}
  function openCompletedTracking(){const o=completedOrder();if(o)window.open(trackingUrl(o),'_blank')}
  function printOrder(i){const o=orders[i];printReceptionSheetByOrder(o)}
  function printLabel(i){const o=orders[i];printDeviceLabelByOrder(o)}
  async function lookupOrder(e){e.preventDefault();const q=lookupCode.value.trim().toUpperCase();lookupResult.innerHTML='<p>Consultando…</p>';const {data,error}=await supabaseClient.rpc('lookup_service_order',{p_code:q});const o=Array.isArray(data)?data[0]:data;lookupResult.innerHTML=!error&&o?`<div class="metric"><b>${o.status}</b><p>${o.device_model}<br>Última actualización: ${dateText(o.updated_at)}</p></div>`:`<p>No encontré esa orden.</p>`}

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
        if(isPanelPage()) await renderApp(); else goToPanel();
      }catch(err){
        await supabaseClient.auth.signOut();
        localStorage.removeItem('ts_service_session');
        session=null;
        if(isPanelPage()) location.replace('index.html');
      }
    }else if(isPanelPage()){
      location.replace('index.html');
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

  return{openLogin,openClientLookup,closeModals,login,logout,renderPanel,updateAppointmentStatus,convertAppointment,openServiceOrder,openExistingReception,saveOrder,updateStatus,printOrder,printLabel,printCompletedReception,printCompletedLabel,openCompletedTracking,lookupOrder,saveNewPassword,openBitacora,saveBitacora,openOrderManager,saveOrderManager,uploadOrderFile,notifyOrderClient,openPartEditor,savePart,openPartMovement,savePartMovement,previewSelectedDevice,selectDeviceFromSearch,setDamageTool,addDamageMark,clearDamageMarks,filterDeviceCategory,setDeviceView};
})();
