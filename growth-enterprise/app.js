const titles = {
  executive:["Panel Ejecutivo","Resumen general de tu negocio en tiempo real."],
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

  // 1) Nuevo esquema recomendado: public.profiles
  let profile = null;
  let source = 'profiles';

  const profilesRes = await client
    .from('profiles')
    .select('id,email,full_name,role,active')
    .eq('id', user.id)
    .maybeSingle();

  if(!profilesRes.error && profilesRes.data){
    profile = profilesRes.data;
  }

  // 2) Compatibilidad con tu esquema actual: public.roles_usuarios
  //    Columnas vistas en Supabase: id, email, nombre, rol, activo
  if(!profile){
    source = 'roles_usuarios';
    const rolesRes = await client
      .from('roles_usuarios')
      .select('id,email,nombre,rol,activo')
      .ilike('email', user.email || '')
      .maybeSingle();

    if(rolesRes.error){
      console.error('Error consultando roles_usuarios:', rolesRes.error);
    }

    if(rolesRes.data){
      profile = {
        id: rolesRes.data.id,
        email: rolesRes.data.email,
        full_name: rolesRes.data.nombre,
        role: rolesRes.data.rol,
        active: rolesRes.data.activo,
        source
      };
    }
  }

  if(!profile){
    throw new Error('Este usuario no tiene perfil/rol asignado en Supabase. Revisa profiles o roles_usuarios.');
  }

  if(profile.active === false){
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
function showApp(){ qs('lockScreen')?.classList.add('hidden'); qs('app')?.classList.remove('hidden'); renderHome(); renderModules(); renderStaffAccess(); }
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
    const [profilesRes, rolesRes, invitesRes] = await Promise.all([
      client.from('profiles').select('id,email,full_name,role,active,created_at').order('created_at',{ascending:false}).limit(30),
      client.from('roles_usuarios').select('id,email,nombre,rol,activo,created_at').order('created_at',{ascending:false}).limit(30),
      client.from('staff_invitations').select('id,email,full_name,role,status,created_at,notes').order('created_at',{ascending:false}).limit(30)
    ]);

    const profiles = profilesRes.error ? [] : (profilesRes.data || []).map(p=>({
      id:p.id, email:p.email, full_name:p.full_name, role:p.role, active:p.active, table:'profiles'
    }));

    const legacyRoles = rolesRes.error ? [] : (rolesRes.data || []).map(p=>({
      id:p.id, email:p.email, full_name:p.nombre, role:p.rol, active:p.activo, table:'roles_usuarios'
    }));

    const invites = invitesRes.error ? [] : (invitesRes.data || []);

    const byEmail = new Map();
    [...profiles, ...legacyRoles].forEach(p => {
      const key = String(p.email || p.id).toLowerCase();
      if(!byEmail.has(key)) byEmail.set(key, p);
    });

    const staffRows = [...byEmail.values()].map(p=>`
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
  qs('logoutBtn')?.addEventListener('click',logout);
  qs('logoutMini')?.addEventListener('click',logout);
  document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
  qs('searchInput')?.addEventListener('input',e=>{const q=e.target.value.toLowerCase(); document.querySelectorAll('.module-card,.product-row,.activity-item,.status-row,.table-row').forEach(el=>{el.style.outline = q && el.textContent.toLowerCase().includes(q) ? '1px solid rgba(38,119,255,.7)' : ''})});
  bootAuth();
});
