const titles = {
  executive:["Panel Ejecutivo","Resumen general de tu negocio en tiempo real."],
  commercial:["Control Comercial ThinkStore","Ventas, clientes, inventario, pagos, notas de entrega y correos. Lectura segura sin tocar el flujo actual."],
  sales:["Ventas","Pedidos, ingresos, canales y rendimiento comercial."],
  products:["Productos","Catálogo estratégico, top ventas y rentabilidad por modelo."],
  inventory:["Inventario","Stock crítico, rotación, reposición y preórdenes."],
  clients:["Clientes","CRM, clientes VIP, recurrencia y segmentos."],
  staff:["Accesos de vendedores","Crea, administra y limita accesos del equipo como Shopify Staff."],
  marketing:["Marketing","Campañas, ROI, audiencias y automatizaciones."],
  finance:["Finanzas","Utilidad, costos, flujo de caja y pagos pendientes."],
  reports:["Reportes","Exportaciones ejecutivas y análisis por período."],
  integrations:["Integraciones","Conexiones con Supabase, Stripe, Shopify, correo y logística."],
  automations:["Automatizaciones","Flujos inteligentes para ventas, soporte y marketing."],
  settings:["Configuración","Permisos, roles, accesos y seguridad del panel."]
};

let currentProfile = null;

const activity = [
  ["green","▢","Nuevo pedido #TS-1048","Cliente: Juan Pérez","Hace 2 min"],
  ["orange","⬡","Stock bajo en 5 productos","Revisa tu inventario","Hace 15 min"],
  ["blue","♙","Nuevo cliente registrado","María García","Hace 30 min"],
  ["purple","$","Pago recibido","Orden #TS-1045","Hace 1 hora"]
];
const products = [
  ["📱","iPhone 16 Pro Max","$45,600.00","Ventas: 320",88],
  ["🎧","AirPods Pro","$33,600.00","Ventas: 280",72],
  ["💻","MacBook Air M4","$12,600.00","Ventas: 210",42]
];
const channels = [["#2677ff","Tienda Online","62%"],["#4b93ff","Instagram","18%"],["#91a79d","WhatsApp","12%"],["#ff951f","Marketplace","5%"],["#8e4dff","Otros","3%"]];
const status = [["✓","Servidor","Operativo"],["✓","Pasarelas de pago","Operativo"],["✓","Integraciones","Operativo"],["✓","Actualizaciones","Al día"],["✓","Copias de seguridad","Al día"]];
const modules = {
 sales: [["Ingresos hoy","$8,420","Ventas cerradas y pagos confirmados"],["Pedidos pendientes","18","Órdenes por procesar o verificar"],["Ticket promedio","$98.50","Valor promedio por orden"],["Canal líder","Tienda Online","62% de las ventas"],["Preórdenes activas","34","Dentro de 15 a 25 días hábiles"],["Conversión","8.9%","De visitas a compras"]],
 products: [["Top iPhone","iPhone 16 Pro Max","Mayor margen del mes"],["Top Accesorio","AirPods Pro","Alta rotación"],["Top MacBook","MacBook Air M4","Campaña recomendada"],["Productos activos","186","Catálogo visible"],["Sin imagen","4","Revisar catálogo"],["Margen premium","32%","Promedio categoría Apple"]],
 inventory: [["Stock bajo","5","Requiere reposición"],["Sin stock","2","Activar preorden"],["Rotación alta","AirPods Pro","Reabastecer semanal"],["Valor inventario","$86,400","Costo estimado"],["Reposiciones","12","Sugeridas por demanda"],["Alertas críticas","3","Prioridad alta"]],
 clients: [["Clientes activos","3,682","Base registrada"],["Clientes VIP","124","Alto valor"],["Recurrentes","38%","Compran más de una vez"],["Nuevos este mes","286","Crecimiento CRM"],["Sin seguimiento","41","Activar campaña"],["Satisfacción","96%","Postventa y soporte"]],
 marketing: [["ROI total","312%","Campañas activas"],["Gasto mensual","$24,850","Publicidad y diseño"],["Instagram","18%","Canal secundario"],["Email premium","2.8x","Retorno estimado"],["WhatsApp","12%","Conversión directa"],["Campañas activas","7","Automatizadas"]],
 finance: [["Ingresos totales","$1,248,850","Histórico"],["Utilidad estimada","$28,940","Mes actual"],["Costos operativos","$14,600","Control mensual"],["Pagos pendientes","$3,950","Verificación"],["Margen bruto","31%","Promedio"],["Flujo proyectado","$42,200","Próximo mes"]],
 reports: [["Reporte ventas","PDF/CSV","Listo para exportar"],["Reporte inventario","CSV","Stock y rotación"],["Reporte clientes","CRM","Segmentos VIP"],["Reporte marketing","ROI","Campañas"],["Reporte soporte","SLA","Órdenes técnicas"],["Reporte finanzas","Resumen","Utilidad mensual"]],
 integrations: [["Supabase","Conectado","Auth, DB y roles"],["Correo corporativo","Activo","Estados y promociones"],["Stripe","Preparado","Pasarela internacional"],["Shopify style","UI activa","Panel admin"],["MRW / Zoom / Tealca","Listo","Logística"],["Growth API","Demo","Métricas locales"]],
 automations: [["Email de estatus","Activo","Pedidos y preórdenes"],["Stock bajo","Activo","Alertas admin"],["Clientes VIP","Programado","Campañas"],["Carrito abandonado","Pendiente","Recuperación"],["Reorden automático","Sugerido","Inventario"],["Reporte semanal","Activo","Resumen ejecutivo"]],
 settings: [["Rol administrador","Activo","Acceso completo"],["Vendedores","Gestión incluida","Ventas, clientes y pedidos"],["Recepción","Limitado","Soporte técnico"],["Logística","Limitado","Envíos"],["Clientes","Privado","Solo sus órdenes"],["Supabase Auth","Activo","Login real por correo y contraseña"],["Gestión de usuarios","Profiles + Staff invitations","Roles y accesos desde Growth Enterprise"]]
};

function qs(id){return document.getElementById(id)}
function safe(value){return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function setLoginMessage(message, type=''){
  const el = qs('loginMessage');
  if(!el) return;
  el.textContent = message;
  el.className = `login-message ${type}`.trim();
}
function getClient(){
  if(!window.supabaseClient){
    setLoginMessage('Supabase no está listo. Revisa supabase.js y recarga la página.', 'error');
    throw new Error('Supabase client missing');
  }
  return window.supabaseClient;
}
async function getAdminProfile(user){
  const client = getClient();
  const email = String(user?.email || '').trim();

  let profile = null;

  // 1) Esquema actual de ThinkStore: public.roles_usuarios
  //    Columnas: id, email, nombre, rol, activo
  //    Se consulta primero para evitar el error 500/RLS de public.profiles.
  const rolesRes = await client
    .from('roles_usuarios')
    .select('id,email,nombre,rol,activo')
    .ilike('email', email)
    .maybeSingle();

  if(rolesRes.error){
    console.warn('No se pudo consultar roles_usuarios:', rolesRes.error.message || rolesRes.error);
  }

  if(rolesRes.data){
    profile = {
      id: rolesRes.data.id,
      email: rolesRes.data.email,
      full_name: rolesRes.data.nombre,
      role: rolesRes.data.rol,
      active: rolesRes.data.activo,
      source: 'roles_usuarios'
    };
  }

  // 2) Respaldo opcional: public.profiles.
  //    Solo se usa si roles_usuarios no tiene el correo.
  //    Si profiles tiene políticas RLS recursivas, el error se ignora para no bloquear Enterprise.
  if(!profile){
    const profilesRes = await client
      .from('profiles')
      .select('id,email,full_name,role,active')
      .eq('id', user.id)
      .maybeSingle();

    if(profilesRes.error){
      console.warn('No se pudo consultar profiles:', profilesRes.error.message || profilesRes.error);
    }

    if(profilesRes.data){
      profile = {
        ...profilesRes.data,
        source: 'profiles'
      };
    }
  }

  if(!profile){
    throw new Error('Este usuario no tiene perfil/rol asignado en Supabase. Revisa roles_usuarios o profiles.');
  }

  const isActive = profile.active !== false && profile.active !== null && profile.active !== 'false';
  if(!isActive){
    throw new Error('Este usuario está desactivado.');
  }

  const allowedAdminRoles = ['admin','administrator','super_admin'];
  if(!allowedAdminRoles.includes(String(profile.role || '').toLowerCase())){
    throw new Error('Acceso restringido: este panel es solo para administradores.');
  }

  currentProfile = profile;
  return profile;
}
function applyAdminIdentity(user, profile={}){
  const email = profile.email || user.email || 'admin@thinkstore.com.ve';
  const name = profile.full_name || email.split('@')[0] || 'Administrador';
  if(qs('welcomeName')) qs('welcomeName').textContent = name;
  if(qs('adminName')) qs('adminName').textContent = name;
  if(qs('adminEmailLabel')) qs('adminEmailLabel').textContent = email;
}
async function unlock(event){
  event?.preventDefault?.();
  const email = qs('adminEmail')?.value.trim();
  const password = qs('adminPassword')?.value;
  if(!email || !password){ setLoginMessage('Ingresa correo y contraseña.', 'error'); return; }

  try{
    setLoginMessage('Validando acceso con Supabase...', '');
    const client = getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if(error) throw error;
    const profile = await getAdminProfile(data.user);
    applyAdminIdentity(data.user, profile);
    showApp();
    setLoginMessage('Acceso autorizado.', 'success');
  }catch(error){
    console.error(error);
    await window.supabaseClient?.auth?.signOut();
    setLoginMessage(error.message || 'No se pudo iniciar sesión.', 'error');
  }
}
function showApp(){ qs('lockScreen')?.classList.add('hidden'); qs('app')?.classList.remove('hidden'); renderHome(); renderModules(); renderStaffAccess(); loadEnterpriseV1Real(); }

async function sendPasswordRecovery(){
  const email = qs('adminEmail')?.value.trim();
  if(!email){
    setLoginMessage('Escribe tu correo para enviar el enlace de recuperación.', 'error');
    qs('adminEmail')?.focus();
    return;
  }

  try{
    setLoginMessage('Enviando enlace de recuperación...', '');
    const { error } = await getClient().auth.resetPasswordForEmail(email, {
      redirectTo: 'https://enterprise.thinkstore.com.ve/reset-password'
    });
    if(error) throw error;
    setLoginMessage('Te enviamos un enlace para restablecer tu contraseña.', 'success');
  }catch(error){
    console.error(error);
    setLoginMessage(error.message || 'No se pudo enviar el enlace.', 'error');
  }
}

async function logout(){ await window.supabaseClient?.auth?.signOut(); location.reload(); }
async function bootAuth(){
  try{
    const client = getClient();
    const { data:{ session } } = await client.auth.getSession();
    if(!session?.user) return;
    const profile = await getAdminProfile(session.user);
    applyAdminIdentity(session.user, profile);
    showApp();
  }catch(error){
    console.warn('Sesión no autorizada:', error.message);
    await window.supabaseClient?.auth?.signOut();
    setLoginMessage(error.message || 'Inicia sesión nuevamente.', 'error');
  }
}
function renderHome(){
  qs('activityList').innerHTML = activity.map(([color,icon,title,sub,time]) => `<div class="activity-item"><div class="round ${color}">${icon}</div><div><b>${title}</b><span>${sub}</span></div><time>${time}</time></div>`).join('');
  qs('topProducts').innerHTML = products.map(([emoji,name,price,sales,p]) => `<div class="product-row"><div class="product-img">${emoji}</div><div><b>${name}</b><small>${sales}</small><div class="barline"><i style="width:${p}%"></i></div></div><strong>${price}</strong></div>`).join('');
  qs('channelList').innerHTML = channels.map(([c,n,p]) => `<li><i style="background:${c}"></i><span>${n}</span><b>${p}</b></li>`).join('');
  qs('statusList').innerHTML = status.map(([i,n,s]) => `<div class="status-row"><i>${i}</i><b>${n}</b><span>${s}</span></div>`).join('');
}
function renderModules(){
  Object.entries(modules).forEach(([id,items])=>{
    const el = qs(id); if(!el) return;
    el.innerHTML = `<div class="module-grid">${items.map(([h,v,p])=>`<article class="module-card"><h3>${h}</h3><strong>${v}</strong><p>${p}</p></article>`).join('')}</div><article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Detalle operativo</h3><button onclick="exportCSV('${id}')">Exportar CSV</button></div><div class="table">${items.map(([h,v,p])=>`<div class="table-row"><div><b>${h}</b><br><small>${p}</small></div><span>${v}</span><i class="tag">Enterprise</i></div>`).join('')}</div></article>`;
  });
}
function switchView(id){
  document.querySelectorAll('.nav,.view').forEach(x=>x.classList.remove('active'));
  document.querySelector(`.nav[data-view="${id}"]`)?.classList.add('active');
  qs(id)?.classList.add('active');
  if(titles[id]){ qs('pageTitle').textContent = titles[id][0]; qs('pageSubtitle').textContent = titles[id][1]; }
  if(id === 'staff') loadStaffAccess();
  if(id === 'commercial') loadEnterpriseV1Real();
}
function exportCSV(id='executive'){
  const source = modules[id] || [['Ventas del mes','$124850','KPI'],['Pedidos totales','1248','KPI'],['Clientes activos','3682','KPI'],['Utilidad estimada','$28940','KPI']];
  const rows = [['Modulo','Metrica','Valor','Descripcion'], ...source.map(r=>[id,...r])];
  const csv = rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `thinkstore-growth-${id}.csv`; a.click(); URL.revokeObjectURL(a.href);
}

function roleOptions(selected='vendedor'){
  const roles = [
    ['vendedor','Vendedor'], ['gerente','Gerente'], ['marketing','Marketing'],
    ['logistica','Logística'], ['recepcion','Recepción'], ['tecnico','Técnico'], ['admin','Administrador']
  ];
  return roles.map(([value,label])=>`<option value="${value}" ${value===selected?'selected':''}>${label}</option>`).join('');
}
function permissionsForRole(role){
  const map = {
    vendedor: ['Ver pedidos asignados','Crear ventas','Ver clientes básicos','Sin acceso a finanzas'],
    gerente: ['Ver ventas','Ver clientes','Ver inventario','Reportes comerciales'],
    marketing: ['Campañas','Clientes segmentados','Reportes de ROI'],
    logistica: ['Envíos','Tracking','Entregas'],
    recepcion: ['Recepción de equipos','Órdenes de servicio'],
    tecnico: ['Diagnóstico','Bitácora técnica','Estados de reparación'],
    admin: ['Acceso completo','Usuarios','Finanzas','Configuración']
  };
  return map[role] || map.vendedor;
}
function renderStaffAccess(){
  const el = qs('staff'); if(!el) return;
  el.innerHTML = `
    <div class="staff-grid">
      <article class="panel staff-form-panel">
        <div class="panel-head"><h3>Crear acceso para vendedor</h3><span class="tag">Shopify Staff style</span></div>
        <p class="staff-help">Crea invitaciones y perfiles de equipo. Para crear el usuario Auth automáticamente necesitas la Edge Function incluida; si no está instalada, quedará como invitación pendiente.</p>
        <form id="staffForm" class="staff-form">
          <label>Nombre completo<input id="staffName" placeholder="Ej: María González" required></label>
          <label>Correo<input id="staffEmail" type="email" placeholder="vendedor@thinkstore.com.ve" required></label>
          <label>Rol<select id="staffRole">${roleOptions('vendedor')}</select></label>
          <label>Contraseña temporal<input id="staffPassword" type="password" placeholder="Mínimo 8 caracteres" minlength="8"></label>
          <label class="wide">Notas internas<input id="staffNotes" placeholder="Ej: vendedor de tienda Altamira"></label>
          <button type="submit">Crear acceso</button>
        </form>
        <small id="staffMessage" class="login-message"></small>
      </article>
      <article class="panel permissions-panel">
        <div class="panel-head"><h3>Permisos por rol</h3></div>
        <div id="permissionsPreview" class="permission-list"></div>
      </article>
    </div>
    <article class="panel" style="margin-top:18px">
      <div class="panel-head"><h3>Equipo y accesos</h3><button onclick="loadStaffAccess()">Actualizar</button></div>
      <div id="staffTable" class="table"><div class="table-row"><div><b>Cargando accesos...</b><br><small>Consultando Supabase</small></div><span></span><i class="tag">Staff</i></div></div>
    </article>
  `;
  qs('staffForm')?.addEventListener('submit', createStaffAccess);
  qs('staffRole')?.addEventListener('change', renderPermissionPreview);
  renderPermissionPreview();
}
function setStaffMessage(message, type=''){
  const el = qs('staffMessage'); if(!el) return;
  el.textContent = message;
  el.className = `login-message ${type}`.trim();
}
function renderPermissionPreview(){
  const role = qs('staffRole')?.value || 'vendedor';
  const el = qs('permissionsPreview'); if(!el) return;
  el.innerHTML = permissionsForRole(role).map(item=>`<div class="permission-row"><i>✓</i><span>${safe(item)}</span></div>`).join('');
}
async function createStaffAccess(event){
  event?.preventDefault?.();
  const client = getClient();
  const full_name = qs('staffName')?.value.trim();
  const email = qs('staffEmail')?.value.trim().toLowerCase();
  const role = qs('staffRole')?.value || 'vendedor';
  const temporary_password = qs('staffPassword')?.value || null;
  const notes = qs('staffNotes')?.value.trim() || null;
  if(!full_name || !email){ setStaffMessage('Completa nombre y correo.', 'error'); return; }
  try{
    setStaffMessage('Creando acceso...', '');

    const payload = { email, full_name, role, temporary_password, notes };
    const { data: fnData, error: fnError } = await client.functions.invoke('create-staff-user', { body: payload });

    if(fnError){
      console.warn('Edge Function no disponible, guardando invitación pendiente:', fnError.message);
      const { error } = await client.from('staff_invitations').insert({
        email, full_name, role, notes, status:'pending', invited_by: currentProfile?.id || null
      });
      if(error) throw error;
      setStaffMessage('Invitación guardada. Instala la Edge Function para enviar/crear el usuario automáticamente.', 'success');
    }else{
      setStaffMessage(fnData?.message || 'Acceso creado y perfil asignado correctamente.', 'success');
    }

    qs('staffForm')?.reset();
    renderPermissionPreview();
    await loadStaffAccess();
  }catch(error){
    console.error(error);
    setStaffMessage(error.message || 'No se pudo crear el acceso.', 'error');
  }
}
async function loadStaffAccess(){
  const table = qs('staffTable'); if(!table) return;
  const client = getClient();
  try{
    // Usamos roles_usuarios como fuente principal para evitar errores 500/RLS de profiles.
    const [rolesRes, invitesRes] = await Promise.all([
      client.from('roles_usuarios').select('id,email,nombre,rol,activo,created_at').order('created_at',{ascending:false}).limit(50),
      client.from('staff_invitations').select('id,email,full_name,role,status,created_at,notes').order('created_at',{ascending:false}).limit(50)
    ]);

    if(rolesRes.error) console.warn('No se pudieron cargar roles_usuarios:', rolesRes.error.message || rolesRes.error);
    if(invitesRes.error) console.warn('No se pudieron cargar staff_invitations:', invitesRes.error.message || invitesRes.error);

    const staff = rolesRes.error ? [] : (rolesRes.data || []).map(p=>({
      id:p.id, email:p.email, full_name:p.nombre, role:p.rol, active:p.activo, table:'roles_usuarios'
    }));

    const invites = invitesRes.error ? [] : (invitesRes.data || []);

    const staffRows = staff.map(p=>`
      <div class="table-row staff-row">
        <div><b>${safe(p.full_name || p.email)}</b><br><small>${safe(p.email)} · ${safe(p.table)}</small></div>
        <select onchange="updateStaffRole('${p.table}','${p.id}', this.value)">${roleOptions(p.role)}</select>
        <button class="mini-action ${p.active?'danger':''}" onclick="toggleStaffActive('${p.table}','${p.id}', ${p.active ? 'false':'true'})">${p.active ? 'Desactivar':'Activar'}</button>
      </div>`).join('');

    const inviteRows = invites.map(i=>`
      <div class="table-row staff-row pending">
        <div><b>${safe(i.full_name || i.email)}</b><br><small>${safe(i.email)} · ${safe(i.notes || 'Invitación pendiente')}</small></div>
        <span>${safe(i.role)}</span>
        <i class="tag">${safe(i.status)}</i>
      </div>`).join('');

    table.innerHTML = staffRows + inviteRows || `<div class="table-row"><div><b>Sin accesos todavía</b><br><small>Crea el primer vendedor desde el formulario.</small></div><span></span><i class="tag">Staff</i></div>`;
  }catch(error){
    console.error(error);
    table.innerHTML = `<div class="table-row"><div><b>No se pudieron cargar los accesos</b><br><small>${safe(error.message)}</small></div><span></span><i class="tag">Error</i></div>`;
  }
}
async function updateStaffRole(tableName, id, role){
  try{
    const table = tableName === 'roles_usuarios' ? 'roles_usuarios' : 'profiles';
    const payload = table === 'roles_usuarios'
      ? { rol: role }
      : { role, updated_at:new Date().toISOString() };
    const { error } = await getClient().from(table).update(payload).eq('id', id);
    if(error) throw error;
    await loadStaffAccess();
  }catch(error){ alert(error.message || 'No se pudo cambiar el rol.'); }
}
async function toggleStaffActive(tableName, id, active){
  try{
    const table = tableName === 'roles_usuarios' ? 'roles_usuarios' : 'profiles';
    const payload = table === 'roles_usuarios'
      ? { activo: active }
      : { active, updated_at:new Date().toISOString() };
    const { error } = await getClient().from(table).update(payload).eq('id', id);
    if(error) throw error;
    await loadStaffAccess();
  }catch(error){ alert(error.message || 'No se pudo actualizar el acceso.'); }
}
window.updateStaffRole = updateStaffRole;
window.toggleStaffActive = toggleStaffActive;
window.loadStaffAccess = loadStaffAccess;

document.addEventListener('DOMContentLoaded',()=>{
  qs('loginForm')?.addEventListener('submit', unlock);
  qs('forgotPasswordBtn')?.addEventListener('click', sendPasswordRecovery);
  qs('logoutBtn')?.addEventListener('click',logout);
  qs('logoutMini')?.addEventListener('click',logout);
  document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
  qs('searchInput')?.addEventListener('input',e=>{const q=e.target.value.toLowerCase(); document.querySelectorAll('.module-card,.product-row,.activity-item,.status-row,.table-row').forEach(el=>{el.style.outline = q && el.textContent.toLowerCase().includes(q) ? '1px solid rgba(38,119,255,.7)' : ''})});
  bootAuth();
});


/* Enterprise V1 Real: lectura segura desde Supabase
   No modifica tablas de pedidos, clientes, comprobantes, Resend ni notas de entrega. */
const ENTERPRISE_TABLES = {
  customers: ['clientes','customers'],
  orders: ['pedidos','orders'],
  payments: ['comprobantes','payments','payment_receipts'],
  products: ['productos','products','catalogo']
};
let enterpriseRealCache = null;

function setText(id, value){ const el = qs(id); if(el) el.textContent = value; }
function formatNumber(n){ return new Intl.NumberFormat('es-VE').format(Number(n || 0)); }
function formatUSD(n){ return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(n || 0)); }
function pick(obj, names){ for(const k of names){ if(obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]; } return null; }
function normalizeStatus(value){ return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function isPendingPayment(row){
  const st = normalizeStatus(pick(row, ['estado','status','payment_status','estatus']));
  return st.includes('pago por verificar') || st.includes('pendiente') || st.includes('verificar') || st.includes('pending');
}
function orderTotal(row){
  const raw = pick(row, ['total_usd','totalUSD','total','monto','amount','precio_total','subtotal']);
  const n = Number(String(raw || '0').replace(/[^0-9.-]/g,''));
  return Number.isFinite(n) ? n : 0;
}
function rowDate(row){ return pick(row, ['created_at','fecha','date','updated_at']) || ''; }
function rowCustomerName(row){
  const c = row?.clientes || row?.customer || {};
  return pick(c, ['nombre','name','full_name']) || pick(row, ['nombre','cliente','customer_name','name']) || 'Cliente';
}
function rowCustomerEmail(row){
  const c = row?.clientes || row?.customer || {};
  return pick(c, ['correo','email']) || pick(row, ['correo','email','customer_email']) || '';
}
async function countFirstAvailable(tableNames){
  const client = getClient();
  for(const table of tableNames){
    try{
      const { count, error } = await client.from(table).select('*', { count:'exact', head:true });
      if(!error) return { table, count: count || 0 };
      console.warn(`Conteo ${table}:`, error.message || error);
    }catch(error){ console.warn(`Conteo ${table}:`, error.message || error); }
  }
  return { table:null, count:0 };
}
async function selectFirstAvailable(tableNames, select='*', options={}){
  const client = getClient();
  for(const table of tableNames){
    try{
      let query = client.from(table).select(select);
      if(options.order !== false) query = query.order(options.orderBy || 'created_at', { ascending: options.ascending ?? false });
      if(options.limit) query = query.limit(options.limit);
      const { data, error } = await query;
      if(!error) return { table, data: data || [] };
      console.warn(`Lectura ${table}:`, error.message || error);
    }catch(error){ console.warn(`Lectura ${table}:`, error.message || error); }
  }
  return { table:null, data:[] };
}
async function loadEnterpriseV1Real(){
  if(!window.supabaseClient || !currentProfile) return null;
  try{
    const [customersCount, ordersCount, paymentsCount, productsCount, ordersRows, customersRows, paymentsRows] = await Promise.all([
      countFirstAvailable(ENTERPRISE_TABLES.customers),
      countFirstAvailable(ENTERPRISE_TABLES.orders),
      countFirstAvailable(ENTERPRISE_TABLES.payments),
      countFirstAvailable(ENTERPRISE_TABLES.products),
      selectFirstAvailable(ENTERPRISE_TABLES.orders, '*,clientes(*)', { limit: 80 }),
      selectFirstAvailable(ENTERPRISE_TABLES.customers, '*', { limit: 8 }),
      selectFirstAvailable(ENTERPRISE_TABLES.payments, '*', { limit: 80 })
    ]);

    const orders = ordersRows.data || [];
    const payments = paymentsRows.data || [];
    const salesTotal = orders.reduce((sum,row)=>sum + orderTotal(row), 0);
    const pendingPayments = orders.filter(isPendingPayment).length || payments.filter(isPendingPayment).length || paymentsCount.count;

    enterpriseRealCache = {
      tables: { customers:customersCount.table, orders:ordersCount.table, payments:paymentsCount.table, products:productsCount.table },
      counts: { customers:customersCount.count, orders:ordersCount.count, payments:paymentsCount.count, products:productsCount.count },
      salesTotal,
      pendingPayments,
      recentOrders: orders.slice(0,8),
      recentCustomers: (customersRows.data || []).slice(0,8),
      recentPayments: payments.slice(0,8)
    };

    updateExecutiveReal(enterpriseRealCache);
    renderCommercialControl(enterpriseRealCache);
    renderRealModules(enterpriseRealCache);
    return enterpriseRealCache;
  }catch(error){
    console.error('Enterprise V1 Real:', error);
    renderCommercialError(error);
    return null;
  }
}
function updateExecutiveReal(data){
  setText('metricSalesMonth', formatUSD(data.salesTotal));
  setText('metricOrdersTotal', formatNumber(data.counts.orders));
  setText('metricCustomersTotal', formatNumber(data.counts.customers));
  setText('metricPendingPayments', formatNumber(data.pendingPayments));
  setText('metricSalesNote', `Tabla: ${data.tables.orders || 'pedidos/orders no disponible'}`);
  setText('metricOrdersNote', 'Lectura en modo seguro');
  setText('metricCustomersNote', `Tabla: ${data.tables.customers || 'clientes no disponible'}`);
  setText('metricPendingNote', 'Sin modificar validaciones');
  setText('chartTooltipValue', `${formatUSD(data.salesTotal)} registrados`);
  setText('stripRevenue', formatUSD(data.salesTotal));
  setText('stripCustomers', formatNumber(data.counts.customers));
  setText('stripOrders', formatNumber(data.counts.orders));
  setText('stripPayments', formatNumber(data.counts.payments));

  const realActivity = [];
  data.recentOrders.slice(0,4).forEach((o,idx)=>{
    realActivity.push([idx%2?'blue':'green','▢',`Pedido ${safe(pick(o,['codigo','code','id']) || 'reciente')}`, `${rowCustomerName(o)} · ${pick(o,['estado','status']) || 'Sin estado'}`, rowDate(o) ? new Date(rowDate(o)).toLocaleDateString('es-VE') : 'Reciente']);
  });
  if(realActivity.length && qs('activityList')){
    qs('activityList').innerHTML = realActivity.map(([color,icon,title,sub,time]) => `<div class="activity-item"><div class="round ${color}">${icon}</div><div><b>${title}</b><span>${sub}</span></div><time>${time}</time></div>`).join('');
  }
}
function renderCommercialControl(data){
  const el = qs('commercial'); if(!el) return;
  const recentOrders = data.recentOrders.map(o=>`
    <div class="table-row">
      <div><b>${safe(pick(o,['codigo','code','id']) || 'Pedido')}</b><br><small>${safe(rowCustomerName(o))} · ${safe(rowCustomerEmail(o))}</small></div>
      <span>${safe(pick(o,['estado','status']) || 'Sin estado')}</span>
      <i class="tag">${formatUSD(orderTotal(o))}</i>
    </div>`).join('');
  const recentCustomers = data.recentCustomers.map(c=>`
    <div class="table-row">
      <div><b>${safe(pick(c,['nombre','name','full_name']) || 'Cliente')}</b><br><small>${safe(pick(c,['correo','email']) || '')}</small></div>
      <span>${safe(pick(c,['telefono','phone']) || '')}</span>
      <i class="tag">Cliente</i>
    </div>`).join('');

  el.innerHTML = `
    <article class="panel safe-panel">
      <div class="panel-head"><h3>Control Comercial ThinkStore</h3><span class="tag safe-tag">Modo seguro · solo lectura</span></div>
      <p class="staff-help">Esta pestaña centraliza ventas, clientes, inventario, comprobantes, notas de entrega y correos como control comercial. No modifica Resend, no cambia estados, no toca notas de entrega y no altera el panel actual de la tienda.</p>
    </article>
    <div class="module-grid control-cards">
      <article class="module-card"><h3>Ventas registradas</h3><strong>${formatUSD(data.salesTotal)}</strong><p>Calculado desde ${safe(data.tables.orders || 'pedidos/orders')}.</p></article>
      <article class="module-card"><h3>Pedidos</h3><strong>${formatNumber(data.counts.orders)}</strong><p>Conteo real desde Supabase.</p></article>
      <article class="module-card"><h3>Clientes registrados</h3><strong>${formatNumber(data.counts.customers)}</strong><p>Clientes reales de la página.</p></article>
      <article class="module-card"><h3>Comprobantes</h3><strong>${formatNumber(data.counts.payments)}</strong><p>Control visual; validación intacta.</p></article>
      <article class="module-card"><h3>Productos / inventario</h3><strong>${data.tables.products ? formatNumber(data.counts.products) : 'Tienda'}</strong><p>${data.tables.products ? 'Tabla conectada.' : 'Catálogo principal se mantiene intacto en la tienda.'}</p></article>
      <article class="module-card"><h3>Correos automáticos</h3><strong>Resend intacto</strong><p>ventas@ y soporte@ no se modifican.</p></article>
    </div>
    <div class="main-grid" style="margin-top:18px">
      <article class="panel"><div class="panel-head"><h3>Pedidos recientes</h3><button onclick="loadEnterpriseV1Real()">Actualizar</button></div><div class="table">${recentOrders || '<div class="table-row"><div><b>Sin pedidos visibles</b><br><small>Revisa permisos RLS o tabla pedidos.</small></div><span></span><i class="tag">Info</i></div>'}</div></article>
      <article class="panel"><div class="panel-head"><h3>Clientes recientes</h3></div><div class="table">${recentCustomers || '<div class="table-row"><div><b>Sin clientes visibles</b><br><small>Revisa permisos RLS o tabla clientes.</small></div><span></span><i class="tag">Info</i></div>'}</div></article>
    </div>
    <article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Protección aplicada</h3></div><div class="table">
      <div class="table-row"><div><b>No se toca el panel actual</b><br><small>El acceso por código y la administración existente quedan fuera de esta actualización.</small></div><span>Protegido</span><i class="tag">OK</i></div>
      <div class="table-row"><div><b>No se tocan correos ni Resend</b><br><small>Bienvenida, recuperación, pedidos y cambios de estado siguen con su configuración actual.</small></div><span>Intacto</span><i class="tag">OK</i></div>
      <div class="table-row"><div><b>No se alteran tablas críticas</b><br><small>clientes, pedidos, pedido_items, comprobantes y order_status_history se leen, no se escriben.</small></div><span>Solo lectura</span><i class="tag">Seguro</i></div>
    </div></article>`;
}
function renderRealModules(data){
  const salesEl = qs('sales');
  if(salesEl){
    salesEl.innerHTML = `<div class="module-grid">
      <article class="module-card"><h3>Ventas registradas</h3><strong>${formatUSD(data.salesTotal)}</strong><p>Lectura desde ${safe(data.tables.orders || 'pedidos/orders')}.</p></article>
      <article class="module-card"><h3>Pedidos totales</h3><strong>${formatNumber(data.counts.orders)}</strong><p>Pedidos visibles para Enterprise.</p></article>
      <article class="module-card"><h3>Pagos por revisar</h3><strong>${formatNumber(data.pendingPayments)}</strong><p>No cambia estados ni dispara correos.</p></article>
    </div>`;
  }
  const clientsEl = qs('clients');
  if(clientsEl){
    const rows = data.recentCustomers.map(c=>`<div class="table-row"><div><b>${safe(pick(c,['nombre','name','full_name']) || 'Cliente')}</b><br><small>${safe(pick(c,['correo','email']) || '')}</small></div><span>${safe(pick(c,['telefono','phone']) || '')}</span><i class="tag">Registrado</i></div>`).join('');
    clientsEl.innerHTML = `<div class="module-grid"><article class="module-card"><h3>Clientes registrados</h3><strong>${formatNumber(data.counts.customers)}</strong><p>Base real de clientes de ThinkStore.com.ve.</p></article><article class="module-card"><h3>Fuente</h3><strong>${safe(data.tables.customers || 'No disponible')}</strong><p>Lectura segura desde Supabase.</p></article><article class="module-card"><h3>Correos</h3><strong>Intactos</strong><p>No modifica recuperación ni bienvenida.</p></article></div><article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Clientes recientes</h3></div><div class="table">${rows}</div></article>`;
  }
  const inventoryEl = qs('inventory');
  if(inventoryEl){
    inventoryEl.innerHTML = `<div class="module-grid"><article class="module-card"><h3>Productos conectados</h3><strong>${data.tables.products ? formatNumber(data.counts.products) : 'Pendiente'}</strong><p>${data.tables.products ? 'Tabla detectada en Supabase.' : 'No se detectó tabla productos; el catálogo actual sigue intacto en la tienda pública.'}</p></article><article class="module-card"><h3>Modo inventario</h3><strong>Lectura</strong><p>No modifica stock ni fichas actuales.</p></article><article class="module-card"><h3>Control comercial</h3><strong>Activo</strong><p>Preparado para migración gradual sin tocar ventas.</p></article></div>`;
  }
}
function renderCommercialError(error){
  const el = qs('commercial'); if(!el) return;
  el.innerHTML = `<article class="panel"><div class="panel-head"><h3>Control Comercial ThinkStore</h3><span class="tag">Error</span></div><p class="staff-help">No se pudieron leer los datos reales: ${safe(error.message || error)}. No se modificó ninguna tabla ni configuración.</p></article>`;
}
window.loadEnterpriseV1Real = loadEnterpriseV1Real;
