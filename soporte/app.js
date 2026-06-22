const TSService=(()=>{
  const roles={
    superadmin:['dashboard','orders','reception','technical','sales','logistics','clients','users','permissions','reports'],
    admin:['dashboard','orders','reception','technical','sales','logistics','clients','reports'],
    reception:['dashboard','orders','reception','clients'],
    technician:['dashboard','orders','technical'],
    sales:['dashboard','orders','sales','clients'],
    logistics:['dashboard','orders','logistics'],
    client:['client_status']
  };
  const users=[
    {user:'admin',pass:'thinkstore2026',name:'Administrador ThinkStore',role:'superadmin'},
    {user:'recepcion',pass:'recepcion2026',name:'Recepción',role:'reception'},
    {user:'tecnico',pass:'tecnico2026',name:'Técnico',role:'technician'},
    {user:'ventas',pass:'ventas2026',name:'Ventas',role:'sales'},
    {user:'logistica',pass:'logistica2026',name:'Logística',role:'logistics'}
  ];
  const defaultOrders=[{code:'TS-SVC-2026-0001',client:'Cliente demo',phone:'0414-0000000',device:'iPhone 15 Pro Max',issue:'No carga',status:'Recibido',priority:'Normal',tech:'Sin asignar',quote:'Pendiente',updated:new Date().toLocaleString('es-VE')}];
  let session=JSON.parse(localStorage.getItem('ts_service_session')||'null');
  let orders=JSON.parse(localStorage.getItem('ts_service_orders')||JSON.stringify(defaultOrders));
  function save(){localStorage.setItem('ts_service_orders',JSON.stringify(orders));}
  function can(view){return session&&roles[session.role]?.includes(view)}
  function openLogin(){document.getElementById('loginModal').classList.add('open')}
  function openClientLookup(){document.getElementById('clientLookupModal').classList.add('open')}
  function closeModals(){document.querySelectorAll('.modal').forEach(m=>m.classList.remove('open'))}
  function login(e){e.preventDefault();const u=document.getElementById('loginUser').value.trim().toLowerCase();const p=document.getElementById('loginPass').value;const found=users.find(x=>x.user===u&&x.pass===p);if(!found){alert('Acceso no autorizado');return}session={name:found.name,role:found.role,user:found.user};localStorage.setItem('ts_service_session',JSON.stringify(session));closeModals();renderApp();}
  function logout(){localStorage.removeItem('ts_service_session');session=null;document.getElementById('roleDashboard').classList.add('hidden')}
  function menuItems(){return[{id:'dashboard',label:'Dashboard'},{id:'orders',label:'Órdenes de servicio'},{id:'reception',label:'Recepción'},{id:'technical',label:'Área técnica'},{id:'sales',label:'Ventas / cotizaciones'},{id:'logistics',label:'Logística'},{id:'clients',label:'Clientes'},{id:'users',label:'Usuarios y roles'},{id:'permissions',label:'Permisos'},{id:'reports',label:'Reportes'}].filter(i=>can(i.id))}
  function renderApp(){if(!session)return;document.getElementById('roleDashboard').classList.remove('hidden');const nav=document.getElementById('roleMenu');nav.innerHTML=menuItems().map(i=>`<button onclick="TSService.renderPanel('${i.id}')">${i.label}</button>`).join('');renderPanel('dashboard')}
  function stats(){return{total:orders.length,received:orders.filter(o=>o.status==='Recibido').length,diagnosis:orders.filter(o=>o.status==='En diagnóstico').length,ready:orders.filter(o=>o.status==='Listo para entregar').length}}
  function renderPanel(view){if(!can(view)){alert('Tu rol no tiene permiso para esta sección');return}const title=document.getElementById('panelTitle');const box=document.getElementById('panelContent');const s=stats();const titles={dashboard:'Dashboard',orders:'Órdenes de servicio',reception:'Recepción de equipos',technical:'Área técnica',sales:'Ventas y cotizaciones',logistics:'Logística',clients:'Clientes',users:'Usuarios y roles',permissions:'Permisos',reports:'Reportes'};title.textContent=titles[view]||'Panel';if(view==='dashboard'){box.innerHTML=`<div class="cards"><div class="metric"><span>Total órdenes</span><b>${s.total}</b></div><div class="metric"><span>Recibidas</span><b>${s.received}</b></div><div class="metric"><span>Diagnóstico</span><b>${s.diagnosis}</b></div><div class="metric"><span>Listas</span><b>${s.ready}</b></div></div>${ordersTable()}`;return}if(view==='orders'||view==='reception'||view==='technical'||view==='sales'||view==='logistics'){box.innerHTML=ordersTable(view);return}if(view==='users'){box.innerHTML=`<div class="tablewrap"><h3>Usuarios internos</h3><table><tr><th>Nombre</th><th>Usuario</th><th>Rol</th></tr>${users.map(u=>`<tr><td>${u.name}</td><td>${u.user}</td><td><span class="badge">${u.role}</span></td></tr>`).join('')}</table><p>En producción estos usuarios se gestionan desde Supabase Auth y tabla profiles.</p></div>`;return}if(view==='permissions'){box.innerHTML=`<div class="tablewrap"><h3>Matriz de permisos</h3><table><tr><th>Rol</th><th>Accesos</th></tr>${Object.entries(roles).map(([r,p])=>`<tr><td><b>${r}</b></td><td><div class="pill-row">${p.map(x=>`<span class="badge">${x}</span>`).join('')}</div></td></tr>`).join('')}</table></div>`;return}box.innerHTML=`<div class="tablewrap"><h3>${titles[view]}</h3><p>Módulo preparado para datos reales en Supabase.</p></div>`}
  function ordersTable(scope='orders'){return `<div class="tablewrap"><h3>Órdenes</h3><table><tr><th>Código</th><th>Cliente</th><th>Equipo</th><th>Falla</th><th>Estado</th><th>Acción</th></tr>${orders.map((o,i)=>`<tr><td>${o.code}</td><td>${o.client}<br><small>${o.phone}</small></td><td>${o.device}</td><td>${o.issue}</td><td><select onchange="TSService.updateStatus(${i},this.value)">${['Recibido','En diagnóstico','Cotización enviada','Aprobado por cliente','En reparación','Esperando repuesto','Listo para entregar','Entregado','No aprobado'].map(st=>`<option ${o.status===st?'selected':''}>${st}</option>`).join('')}</select></td><td><button onclick="TSService.printOrder(${i})">Nota</button></td></tr>`).join('')}</table></div>`}
  function openServiceOrder(){if(!can('reception')&&!can('orders')){alert('No tienes permiso para crear órdenes');return}document.getElementById('orderModal').classList.add('open')}
  function code(){return 'TS-SVC-'+new Date().getFullYear()+'-'+String(orders.length+1).padStart(4,'0')}
  function saveOrder(e){e.preventDefault();const o={code:code(),client:oClient.value,phone:oPhone.value,email:oEmail.value,device:oDevice.value,serial:oSerial.value,priority:oPriority.value,issue:oIssue.value,accessories:oAccessories.value,visual:oVisual.value,status:'Recibido',tech:'Sin asignar',quote:'Pendiente',updated:new Date().toLocaleString('es-VE')};orders.unshift(o);save();closeModals();renderPanel('orders');alert('Orden creada: '+o.code)}
  function updateStatus(i,status){orders[i].status=status;orders[i].updated=new Date().toLocaleString('es-VE');save();}
  function printOrder(i){const o=orders[i];const txt=`ORDEN DE SERVICIO THINKSTORE / ASISTECH\n${o.code}\nCliente: ${o.client}\nTeléfono: ${o.phone}\nEquipo: ${o.device}\nSerial/IMEI: ${o.serial||'No indicado'}\nFalla: ${o.issue}\nEstado: ${o.status}\nActualizado: ${o.updated}\nConsulta: soporte.thinkstore.com.ve/?orden=${o.code}`;navigator.clipboard?.writeText(txt);alert(txt)}
  function lookupOrder(e){e.preventDefault();const q=lookupCode.value.trim().toUpperCase();const o=orders.find(x=>x.code.toUpperCase()===q);lookupResult.innerHTML=o?`<div class="metric"><b>${o.status}</b><p>${o.device}<br>Última actualización: ${o.updated}</p></div>`:'<p>No encontré esa orden.</p>'}
  document.addEventListener('DOMContentLoaded',()=>{if(session)renderApp();const url=new URL(location.href);const q=url.searchParams.get('orden');if(q){openClientLookup();lookupCode.value=q;}});
  return{openLogin,openClientLookup,closeModals,login,logout,renderPanel,openServiceOrder,saveOrder,updateStatus,printOrder,lookupOrder};
})();
