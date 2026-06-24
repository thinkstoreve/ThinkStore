const titles = {
  executive:["Panel Ejecutivo","Resumen general de tu negocio en tiempo real."],
  commercial:["Control Comercial ThinkStore","Ventas, clientes, inventario, pagos, notas de entrega y correos. Lectura segura sin tocar el flujo actual."],
  sales:["Ventas","Pedidos, ingresos, canales y rendimiento comercial."],
  products:["Productos","Catálogo estratégico, top ventas y rentabilidad por modelo."],
  inventory:["Inventario Pro","Stock crítico, agotados, rotación y reposición preparada."],
  clients:["CRM Clientes","Clientes VIP, frecuentes, inactivos y valor comercial."],
  staff:["Accesos de vendedores","Crea, administra y limita accesos del equipo como Shopify Staff."],
  marketing:["Marketing Center","Audiencias, segmentos y campañas preparadas sin enviar correos."],
  finance:["Finanzas Pro","Ventas, ticket promedio, pagos pendientes y control financiero."],
  reports:["Inteligencia Comercial","BI, segmentos, top clientes, productos y reportes ejecutivos."],
  support:["Centro de Soporte","Control ejecutivo de soporte.thinkstore.com.ve: órdenes, diagnósticos, técnicos y entregas."],
  client360:["Cliente 360","Ficha consolidada de cliente con compras, soporte, garantías y alertas."],
  warranties:["Garantías","Garantías activas, vencidas y próximas a vencer por cliente/equipo."],
  alerts:["Centro de Alertas","Alertas comerciales, soporte, pagos, inventario y seguimiento ejecutivo."],
  integrations:["Integraciones","Conexiones con Supabase, Stripe, Shopify, correo y logística."],
  automations:["Automatizaciones","Flujos inteligentes para ventas, soporte y marketing."],
  settings:["Configuración","Permisos, roles, accesos y seguridad del panel."]
};

let currentProfile = null;
let deferredPwaPrompt = null;
let pwaReady = false;

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
function showApp(){ qs('lockScreen')?.classList.add('hidden'); qs('app')?.classList.remove('hidden'); renderHome(); renderModules(); renderStaffAccess(); loadEnterpriseV1Real(); loadEnterpriseV6Support(); }

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
  if(['support','client360','warranties','alerts'].includes(id)) loadEnterpriseV6Support();
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


window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPwaPrompt = event;
  pwaReady = true;
  const btn = qs('installPwaBtn');
  if(btn) btn.textContent = 'Instalar app ahora';
});
window.addEventListener('appinstalled', () => {
  deferredPwaPrompt = null;
  pwaReady = true;
  console.log('ThinkStore Enterprise instalada como PWA');
});

document.addEventListener('DOMContentLoaded',()=>{
  qs('loginForm')?.addEventListener('submit', unlock);
  qs('forgotPasswordBtn')?.addEventListener('click', sendPasswordRecovery);
  qs('logoutBtn')?.addEventListener('click',logout);
  qs('logoutMini')?.addEventListener('click',logout);
  document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
  qs('searchInput')?.addEventListener('input',e=>{const q=e.target.value.toLowerCase(); document.querySelectorAll('.module-card,.product-row,.activity-item,.status-row,.table-row').forEach(el=>{el.style.outline = q && el.textContent.toLowerCase().includes(q) ? '1px solid rgba(38,119,255,.7)' : ''})});
  const initialView = new URLSearchParams(location.search).get('view');
  if(initialView && qs(initialView)) setTimeout(()=>switchView(initialView), 350);
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

/* ==========================================================
   Enterprise V2 Real · módulos vivos en modo seguro
   - Solo lectura sobre Supabase
   - No modifica Resend, pedidos, notas de entrega ni panel actual
   ========================================================== */
const V2_TABLES = {
  customers: ['clientes','customers','profiles_clientes','usuarios_clientes'],
  orders: ['pedidos','orders','ordenes','compras'],
  payments: ['comprobantes','payments','payment_receipts','pagos'],
  products: ['productos','products','catalogo','inventory','inventario'],
  preorders: ['preordenes','preorders','orders_preorder','pre_orders']
};

function v2Date(value){
  if(!value) return 'Sin fecha';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('es-VE');
}
function v2Short(value, fallback='—'){
  const text = String(value ?? '').trim();
  if(!text) return fallback;
  return text.length > 42 ? `${text.slice(0,39)}...` : text;
}
function v2StatusClass(value){
  const status = normalizeStatus(value);
  if(status.includes('pag') || status.includes('entreg') || status.includes('aprob')) return 'ok';
  if(status.includes('pend') || status.includes('verif') || status.includes('proces')) return 'warn';
  if(status.includes('cancel') || status.includes('rechaz')) return 'bad';
  return 'info';
}
function v2ProductName(row){ return pick(row,['nombre','name','titulo','title','modelo','model','product_name']) || 'Producto'; }
function v2ProductCategory(row){ return pick(row,['categoria','category','tipo','type']) || 'Catálogo'; }
function v2ProductPrice(row){ return Number(String(pick(row,['precio','price','precio_usd','price_usd','amount']) || '0').replace(/[^0-9.-]/g,'')) || 0; }
function v2ProductStock(row){
  const raw = pick(row,['stock','cantidad','quantity','qty','existencia','inventory']);
  const n = Number(String(raw ?? '').replace(/[^0-9.-]/g,''));
  return Number.isFinite(n) ? n : null;
}
function v2CustomerName(row){ return pick(row,['nombre','name','full_name','cliente','display_name']) || 'Cliente'; }
function v2CustomerEmail(row){ return pick(row,['correo','email','customer_email']) || 'Sin correo'; }
function v2CustomerPhone(row){ return pick(row,['telefono','phone','whatsapp','celular']) || '—'; }
function v2OrderCode(row){ return pick(row,['codigo','code','order_code','numero','number','id']) || 'Pedido'; }
function v2OrderStatus(row){ return pick(row,['estado','status','estatus','payment_status']) || 'Sin estado'; }
function v2OrderDate(row){ return rowDate(row) || pick(row,['fecha_creacion','createdAt','created']) || ''; }
function v2PaymentStatus(row){ return pick(row,['estado','status','estatus','payment_status']) || 'Pendiente'; }

async function v2Count(tableNames){
  for(const table of tableNames){
    try{
      const { count, error } = await getClient().from(table).select('*', { count:'exact', head:true });
      if(!error) return { table, count: count || 0 };
      console.warn(`[Enterprise V2] Conteo ${table}:`, error.message || error);
    }catch(error){ console.warn(`[Enterprise V2] Conteo ${table}:`, error.message || error); }
  }
  return { table:null, count:0 };
}
async function v2Read(tableNames, limit=80){
  for(const table of tableNames){
    try{
      let res = await getClient().from(table).select('*').order('created_at', { ascending:false }).limit(limit);
      if(res.error){
        res = await getClient().from(table).select('*').limit(limit);
      }
      if(!res.error) return { table, data: res.data || [] };
      console.warn(`[Enterprise V2] Lectura ${table}:`, res.error.message || res.error);
    }catch(error){ console.warn(`[Enterprise V2] Lectura ${table}:`, error.message || error); }
  }
  return { table:null, data:[] };
}

function renderV2Table(rows, emptyText='Sin datos visibles'){
  return rows.length ? rows.join('') : `<div class="table-row"><div><b>${safe(emptyText)}</b><br><small>Puede ser una tabla vacía, RLS o nombre diferente.</small></div><span>Solo lectura</span><i class="tag">Info</i></div>`;
}

async function loadEnterpriseV1Real(){
  if(!window.supabaseClient || !currentProfile) return null;
  try{
    const [customersCount, ordersCount, paymentsCount, productsCount, preordersCount, customersRows, ordersRows, paymentsRows, productsRows] = await Promise.all([
      v2Count(V2_TABLES.customers),
      v2Count(V2_TABLES.orders),
      v2Count(V2_TABLES.payments),
      v2Count(V2_TABLES.products),
      v2Count(V2_TABLES.preorders),
      v2Read(V2_TABLES.customers, 60),
      v2Read(V2_TABLES.orders, 100),
      v2Read(V2_TABLES.payments, 80),
      v2Read(V2_TABLES.products, 80)
    ]);

    const orders = ordersRows.data || [];
    const payments = paymentsRows.data || [];
    const productsData = productsRows.data || [];
    const salesTotal = orders.reduce((sum,row)=>sum + orderTotal(row), 0);
    const pendingPayments = orders.filter(isPendingPayment).length || payments.filter(isPendingPayment).length;
    const lowStock = productsData.filter(p => {
      const stock = v2ProductStock(p);
      return stock !== null && stock <= 2;
    }).length;

    enterpriseRealCache = {
      version:'V2',
      tables: {
        customers: customersCount.table,
        orders: ordersCount.table,
        payments: paymentsCount.table,
        products: productsCount.table,
        preorders: preordersCount.table
      },
      counts: {
        customers: customersCount.count,
        orders: ordersCount.count,
        payments: paymentsCount.count,
        products: productsCount.count,
        preorders: preordersCount.count
      },
      salesTotal,
      pendingPayments,
      lowStock,
      recentOrders: orders.slice(0,12),
      recentCustomers: (customersRows.data || []).slice(0,12),
      recentPayments: payments.slice(0,12),
      products: productsData.slice(0,40)
    };

    updateExecutiveReal(enterpriseRealCache);
    renderCommercialControl(enterpriseRealCache);
    renderRealModules(enterpriseRealCache);
    renderV2Reports(enterpriseRealCache);
    return enterpriseRealCache;
  }catch(error){
    console.error('Enterprise V2 Real:', error);
    renderCommercialError(error);
    return null;
  }
}

function updateExecutiveReal(data){
  setText('metricSalesMonth', formatUSD(data.salesTotal));
  setText('metricOrdersTotal', formatNumber(data.counts.orders));
  setText('metricCustomersTotal', formatNumber(data.counts.customers));
  setText('metricPendingPayments', formatNumber(data.pendingPayments));
  setText('metricSalesNote', `Fuente: ${data.tables.orders || 'pedidos/orders no disponible'}`);
  setText('metricOrdersNote', `${formatNumber(data.counts.preorders)} preórdenes detectadas`);
  setText('metricCustomersNote', `Fuente: ${data.tables.customers || 'clientes no disponible'}`);
  setText('metricPendingNote', 'No cambia validaciones ni correos');
  setText('chartTooltipValue', `${formatUSD(data.salesTotal)} registrados`);
  setText('stripRevenue', formatUSD(data.salesTotal));
  setText('stripCustomers', formatNumber(data.counts.customers));
  setText('stripOrders', formatNumber(data.counts.orders));
  setText('stripPayments', formatNumber(data.counts.payments));

  const realActivity = [];
  data.recentOrders.slice(0,5).forEach((o,idx)=>{
    realActivity.push([idx%2?'blue':'green','▢',`Pedido ${v2Short(v2OrderCode(o),'reciente')}`, `${rowCustomerName(o)} · ${v2OrderStatus(o)}`, v2Date(v2OrderDate(o))]);
  });
  data.recentCustomers.slice(0,2).forEach((c)=>{
    realActivity.push(['purple','♙',`Cliente registrado`, `${v2CustomerName(c)} · ${v2CustomerEmail(c)}`, v2Date(rowDate(c))]);
  });
  if(qs('activityList')){
    qs('activityList').innerHTML = renderV2Table(realActivity.map(([color,icon,title,sub,time]) => `<div class="activity-item"><div class="round ${color}">${icon}</div><div><b>${safe(title)}</b><span>${safe(sub)}</span></div><time>${safe(time)}</time></div>`), 'Sin actividad visible');
  }

  if(qs('topProducts')){
    const productRows = data.products.slice(0,5).map((p,idx)=>{
      const stock = v2ProductStock(p);
      const percent = Math.max(8, Math.min(100, stock === null ? 32 + idx*10 : stock*12));
      return `<div class="product-row"><div class="product-img">📱</div><div><b>${safe(v2ProductName(p))}</b><small>${safe(v2ProductCategory(p))}${stock !== null ? ` · Stock: ${stock}` : ''}</small><div class="barline"><i style="width:${percent}%"></i></div></div><strong>${formatUSD(v2ProductPrice(p))}</strong></div>`;
    }).join('');
    if(productRows) qs('topProducts').innerHTML = productRows;
  }
}

function renderCommercialControl(data){
  const el = qs('commercial'); if(!el) return;
  const recentOrders = data.recentOrders.map(o=>`
    <div class="table-row v2-row" data-search="${safe(`${v2OrderCode(o)} ${rowCustomerName(o)} ${v2OrderStatus(o)} ${rowCustomerEmail(o)}`)}">
      <div><b>${safe(v2OrderCode(o))}</b><br><small>${safe(rowCustomerName(o))} · ${safe(rowCustomerEmail(o))}</small></div>
      <span class="status-dot ${v2StatusClass(v2OrderStatus(o))}">${safe(v2OrderStatus(o))}</span>
      <i class="tag">${formatUSD(orderTotal(o))}</i>
    </div>`).join('');
  const recentCustomers = data.recentCustomers.map(c=>`
    <div class="table-row v2-row" data-search="${safe(`${v2CustomerName(c)} ${v2CustomerEmail(c)} ${v2CustomerPhone(c)}`)}">
      <div><b>${safe(v2CustomerName(c))}</b><br><small>${safe(v2CustomerEmail(c))}</small></div>
      <span>${safe(v2CustomerPhone(c))}</span>
      <i class="tag">${v2Date(rowDate(c))}</i>
    </div>`).join('');

  el.innerHTML = `
    <article class="panel safe-panel">
      <div class="panel-head"><h3>Control Comercial ThinkStore</h3><span class="tag safe-tag">V2 · solo lectura</span></div>
      <p class="staff-help">Centro de control para ventas, clientes, inventario, comprobantes, notas de entrega y correos. Esta versión lee datos reales de Supabase, pero no modifica Resend, estados, notas de entrega, pedidos ni el panel actual.</p>
    </article>
    <div class="module-grid control-cards">
      <article class="module-card"><h3>Ventas registradas</h3><strong>${formatUSD(data.salesTotal)}</strong><p>Calculado desde ${safe(data.tables.orders || 'pedidos/orders')}.</p></article>
      <article class="module-card"><h3>Pedidos</h3><strong>${formatNumber(data.counts.orders)}</strong><p>Conteo real desde Supabase.</p></article>
      <article class="module-card"><h3>Clientes registrados</h3><strong>${formatNumber(data.counts.customers)}</strong><p>Clientes reales de la página.</p></article>
      <article class="module-card"><h3>Comprobantes</h3><strong>${formatNumber(data.counts.payments)}</strong><p>Control visual; validación intacta.</p></article>
      <article class="module-card"><h3>Preórdenes</h3><strong>${formatNumber(data.counts.preorders)}</strong><p>Lectura segura si la tabla existe.</p></article>
      <article class="module-card"><h3>Inventario bajo</h3><strong>${formatNumber(data.lowStock)}</strong><p>Alerta visual sin modificar stock.</p></article>
    </div>
    <div class="v2-toolbar"><input id="commercialSearch" type="search" placeholder="Buscar clientes, pedidos o estados..." /><button onclick="loadEnterpriseV1Real()">Actualizar datos</button></div>
    <div class="main-grid" style="margin-top:18px">
      <article class="panel"><div class="panel-head"><h3>Pedidos recientes</h3><span class="tag">${safe(data.tables.orders || 'sin tabla')}</span></div><div class="table searchable-commercial">${renderV2Table([recentOrders].filter(Boolean), 'Sin pedidos visibles')}</div></article>
      <article class="panel"><div class="panel-head"><h3>Clientes recientes</h3><span class="tag">${safe(data.tables.customers || 'sin tabla')}</span></div><div class="table searchable-commercial">${renderV2Table([recentCustomers].filter(Boolean), 'Sin clientes visibles')}</div></article>
    </div>
    <article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Blindaje de seguridad</h3></div><div class="table">
      <div class="table-row"><div><b>Panel actual intacto</b><br><small>Se mantiene como respaldo operativo de ventas, notas, pagos y correos.</small></div><span>Protegido</span><i class="tag">OK</i></div>
      <div class="table-row"><div><b>Resend intacto</b><br><small>ventas@thinkstore.com.ve y soporte@thinkstore.com.ve no se tocan.</small></div><span>Sin cambios</span><i class="tag">OK</i></div>
      <div class="table-row"><div><b>Modo lectura</b><br><small>Enterprise V2 no escribe en clientes, pedidos, comprobantes ni estados.</small></div><span>Seguro</span><i class="tag">V2</i></div>
    </div></article>`;

  qs('commercialSearch')?.addEventListener('input', (event)=>{
    const q = event.target.value.toLowerCase();
    document.querySelectorAll('#commercial .v2-row').forEach(row=>{
      row.style.display = row.textContent.toLowerCase().includes(q) || (row.dataset.search || '').toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

function renderRealModules(data){
  const salesEl = qs('sales');
  if(salesEl){
    const rows = data.recentOrders.map(o=>`<div class="table-row"><div><b>${safe(v2OrderCode(o))}</b><br><small>${safe(rowCustomerName(o))} · ${v2Date(v2OrderDate(o))}</small></div><span class="status-dot ${v2StatusClass(v2OrderStatus(o))}">${safe(v2OrderStatus(o))}</span><i class="tag">${formatUSD(orderTotal(o))}</i></div>`).join('');
    salesEl.innerHTML = `<div class="module-grid"><article class="module-card"><h3>Ventas registradas</h3><strong>${formatUSD(data.salesTotal)}</strong><p>Lectura desde ${safe(data.tables.orders || 'pedidos/orders')}.</p></article><article class="module-card"><h3>Pedidos totales</h3><strong>${formatNumber(data.counts.orders)}</strong><p>Pedidos visibles para Enterprise.</p></article><article class="module-card"><h3>Pagos por revisar</h3><strong>${formatNumber(data.pendingPayments)}</strong><p>No cambia estados ni dispara correos.</p></article></div><article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Pedidos recientes</h3><span class="tag">Solo lectura</span></div><div class="table">${renderV2Table([rows].filter(Boolean),'Sin pedidos visibles')}</div></article>`;
  }

  const clientsEl = qs('clients');
  if(clientsEl){
    const rows = data.recentCustomers.map(c=>`<div class="table-row v2-client"><div><b>${safe(v2CustomerName(c))}</b><br><small>${safe(v2CustomerEmail(c))}</small></div><span>${safe(v2CustomerPhone(c))}</span><i class="tag">${v2Date(rowDate(c))}</i></div>`).join('');
    clientsEl.innerHTML = `<div class="module-grid"><article class="module-card"><h3>Clientes registrados</h3><strong>${formatNumber(data.counts.customers)}</strong><p>Base real de clientes de ThinkStore.com.ve.</p></article><article class="module-card"><h3>Fuente</h3><strong>${safe(data.tables.customers || 'No disponible')}</strong><p>Lectura segura desde Supabase.</p></article><article class="module-card"><h3>Correos</h3><strong>Intactos</strong><p>No modifica recuperación ni bienvenida.</p></article></div><div class="v2-toolbar"><input id="clientSearchV2" type="search" placeholder="Buscar cliente, correo o teléfono..." /></div><article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Clientes recientes</h3></div><div class="table">${renderV2Table([rows].filter(Boolean),'Sin clientes visibles')}</div></article>`;
    qs('clientSearchV2')?.addEventListener('input', e=>{const q=e.target.value.toLowerCase(); document.querySelectorAll('.v2-client').forEach(r=>r.style.display = r.textContent.toLowerCase().includes(q)?'':'none')});
  }

  const inventoryEl = qs('inventory');
  if(inventoryEl){
    const rows = data.products.map(p=>{ const stock = v2ProductStock(p); const label = stock === null ? 'Sin stock' : stock <= 0 ? 'Agotado' : stock <= 2 ? 'Stock bajo' : 'Disponible'; return `<div class="table-row"><div><b>${safe(v2ProductName(p))}</b><br><small>${safe(v2ProductCategory(p))}</small></div><span class="status-dot ${stock === null ? 'info' : stock <= 2 ? 'warn':'ok'}">${safe(label)}</span><i class="tag">${stock === null ? formatUSD(v2ProductPrice(p)) : `Stock ${stock}`}</i></div>`; }).join('');
    inventoryEl.innerHTML = `<div class="module-grid"><article class="module-card"><h3>Productos conectados</h3><strong>${data.tables.products ? formatNumber(data.counts.products) : 'Pendiente'}</strong><p>${data.tables.products ? 'Tabla detectada en Supabase.' : 'No se detectó tabla productos; el catálogo actual sigue intacto en la tienda pública.'}</p></article><article class="module-card"><h3>Alertas de stock</h3><strong>${formatNumber(data.lowStock)}</strong><p>Visual, no cambia inventario.</p></article><article class="module-card"><h3>Modo inventario</h3><strong>Lectura</strong><p>No modifica stock ni fichas actuales.</p></article></div><article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Inventario visible</h3><span class="tag">Solo lectura</span></div><div class="table">${renderV2Table([rows].filter(Boolean),'Sin productos visibles')}</div></article>`;
  }

  const productsEl = qs('products');
  if(productsEl){
    const rows = data.products.slice(0,20).map(p=>`<div class="table-row"><div><b>${safe(v2ProductName(p))}</b><br><small>${safe(v2ProductCategory(p))}</small></div><span>${formatUSD(v2ProductPrice(p))}</span><i class="tag">${v2ProductStock(p) === null ? 'Catálogo' : `Stock ${v2ProductStock(p)}`}</i></div>`).join('');
    productsEl.innerHTML = `<article class="panel"><div class="panel-head"><h3>Productos / catálogo</h3><span class="tag">No edita la tienda</span></div><div class="table">${renderV2Table([rows].filter(Boolean),'Sin productos visibles')}</div></article>`;
  }

  const financeEl = qs('finance');
  if(financeEl){
    financeEl.innerHTML = `<div class="module-grid"><article class="module-card"><h3>Ingresos registrados</h3><strong>${formatUSD(data.salesTotal)}</strong><p>Estimado desde pedidos visibles.</p></article><article class="module-card"><h3>Comprobantes</h3><strong>${formatNumber(data.counts.payments)}</strong><p>Solo lectura; validación intacta.</p></article><article class="module-card"><h3>Pagos por revisar</h3><strong>${formatNumber(data.pendingPayments)}</strong><p>No dispara correos ni estados.</p></article></div>`;
  }

  const marketingEl = qs('marketing');
  if(marketingEl){
    marketingEl.innerHTML = `<div class="module-grid"><article class="module-card"><h3>Base para campañas</h3><strong>${formatNumber(data.counts.customers)}</strong><p>Clientes registrados disponibles para futuras segmentaciones.</p></article><article class="module-card"><h3>Resend</h3><strong>Intacto</strong><p>No se modifican API keys ni plantillas.</p></article><article class="module-card"><h3>Próxima fase</h3><strong>V4</strong><p>Campañas, VIP e inactivos con aprobación previa.</p></article></div>`;
  }
}

function renderV2Reports(data){
  const reportsEl = qs('reports');
  if(reportsEl){
    reportsEl.innerHTML = `<div class="module-grid"><article class="module-card"><h3>Reporte ejecutivo</h3><strong>Listo</strong><p>Exporta métricas visibles de Enterprise.</p></article><article class="module-card"><h3>Tablas detectadas</h3><strong>${Object.values(data.tables).filter(Boolean).length}</strong><p>${safe(Object.entries(data.tables).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join(' · ') || 'Sin tablas detectadas')}</p></article><article class="module-card"><h3>Modo seguro</h3><strong>Activo</strong><p>Lectura únicamente.</p></article></div><article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Exportaciones</h3><button onclick="exportCSV('executive')">Exportar CSV</button></div><p class="staff-help">La exportación usa los datos visibles del panel y no modifica Supabase.</p></article>`;
  }
}


/* ==========================================================
   Enterprise V4 Funcional · CRM Real + Staff Manager + Finanzas + Inventario
   - Sigue en modo seguro: solo lectura sobre Supabase
   - No toca Resend, correos, notas de entrega, pagos ni estados
   ========================================================== */
(function(){
  const DAY = 24 * 60 * 60 * 1000;
  const todayStart = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
  const monthStart = () => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; };
  const weekStart = () => { const d = todayStart(); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return d; };
  const toDate = (value) => { const d = new Date(value || ''); return Number.isNaN(d.getTime()) ? null : d; };
  const within = (row, start) => { const d = toDate(v2OrderDate(row) || rowDate(row)); return d ? d >= start : false; };
  const emailKey = (value) => String(value || '').trim().toLowerCase();

  window.enterpriseV3State = { customerProfiles: [], selectedCustomerEmail: null };

  function getOrderCustomerEmail(row){ return emailKey(rowCustomerEmail(row) || pick(row,['cliente_email','customerEmail','email_cliente'])); }
  function getOrderCustomerName(row){ return rowCustomerName(row) || pick(row,['cliente_nombre','customerName']) || 'Cliente'; }

  function buildCustomerProfiles(data){
    const customerMap = new Map();
    (data.recentCustomers || []).forEach(c => {
      const email = emailKey(v2CustomerEmail(c));
      const key = email || `cliente-${pick(c,['id','uid','uuid']) || customerMap.size}`;
      customerMap.set(key, {
        id: pick(c,['id','uid','uuid']) || key,
        name: v2CustomerName(c),
        email: email || v2CustomerEmail(c),
        phone: v2CustomerPhone(c),
        createdAt: rowDate(c) || pick(c,['createdAt','fecha_registro','fecha']),
        orders: [],
        totalSpent: 0,
        lastOrderDate: null,
        status: 'Nuevo'
      });
    });

    (data.recentOrders || []).forEach(order => {
      const email = getOrderCustomerEmail(order);
      const key = email || `pedido-cliente-${getOrderCustomerName(order)}`;
      if(!customerMap.has(key)){
        customerMap.set(key, {
          id: key,
          name: getOrderCustomerName(order),
          email: email || rowCustomerEmail(order) || 'Sin correo',
          phone: pick(order,['telefono','phone','whatsapp']) || '—',
          createdAt: rowDate(order),
          orders: [],
          totalSpent: 0,
          lastOrderDate: null,
          status: 'Cliente'
        });
      }
      const profile = customerMap.get(key);
      const amount = orderTotal(order);
      const date = toDate(v2OrderDate(order));
      profile.orders.push(order);
      profile.totalSpent += amount;
      if(date && (!profile.lastOrderDate || date > profile.lastOrderDate)) profile.lastOrderDate = date;
    });

    return Array.from(customerMap.values()).map(profile => {
      const daysSince = profile.lastOrderDate ? Math.floor((Date.now() - profile.lastOrderDate.getTime()) / DAY) : null;
      const orderCount = profile.orders.length;
      if(profile.totalSpent >= 1000 || orderCount >= 3) profile.status = 'VIP';
      else if(daysSince !== null && daysSince > 90) profile.status = 'Inactivo';
      else if(orderCount >= 2) profile.status = 'Frecuente';
      else if(orderCount === 1) profile.status = 'Nuevo comprador';
      else profile.status = 'Registrado';
      profile.daysSince = daysSince;
      return profile;
    }).sort((a,b)=> b.totalSpent - a.totalSpent || b.orders.length - a.orders.length);
  }

  function calcV3Finance(data){
    const orders = data.recentOrders || [];
    const total = orders.reduce((sum,o)=>sum + orderTotal(o),0);
    const today = orders.filter(o=>within(o,todayStart())).reduce((sum,o)=>sum + orderTotal(o),0);
    const week = orders.filter(o=>within(o,weekStart())).reduce((sum,o)=>sum + orderTotal(o),0);
    const month = orders.filter(o=>within(o,monthStart())).reduce((sum,o)=>sum + orderTotal(o),0);
    const average = orders.length ? total / orders.length : 0;
    return { total, today, week, month, average };
  }

  function statusBadge(status){
    const cls = status === 'VIP' ? 'ok' : status === 'Inactivo' ? 'bad' : status === 'Frecuente' ? 'warn' : 'info';
    return `<span class="status-dot ${cls}">${safe(status)}</span>`;
  }

  function renderCRM(data){
    const el = qs('clients'); if(!el) return;
    const profiles = buildCustomerProfiles(data);
    window.enterpriseV3State.customerProfiles = profiles;
    const vip = profiles.filter(c=>c.status === 'VIP').length;
    const inactive = profiles.filter(c=>c.status === 'Inactivo').length;
    const frequent = profiles.filter(c=>c.status === 'Frecuente' || c.status === 'VIP').length;
    const totalSpent = profiles.reduce((sum,c)=>sum + c.totalSpent,0);
    const rows = profiles.slice(0,80).map((c,idx)=>`
      <div class="table-row crm-row v3-row" data-filter="${safe(c.status)}" data-search="${safe(`${c.name} ${c.email} ${c.phone} ${c.status}`)}" onclick="openCRMProfile(${idx})">
        <div><b>${safe(c.name)}</b><br><small>${safe(c.email)} · ${safe(c.phone)}</small></div>
        <span>${formatUSD(c.totalSpent)} · ${c.orders.length} pedidos</span>
        ${statusBadge(c.status)}
      </div>`).join('');
    el.innerHTML = `
      <article class="panel safe-panel v3-hero">
        <div class="panel-head"><h3>CRM Clientes ThinkStore</h3><span class="tag safe-tag">V4 · CRM real</span></div>
        <p class="staff-help">Ficha comercial de clientes reales: compras, valor acumulado, segmento y última actividad. No modifica clientes, pedidos, correos ni Resend.</p>
      </article>
      <div class="module-grid v3-kpis">
        <article class="module-card"><h3>Clientes CRM</h3><strong>${formatNumber(profiles.length || data.counts.customers)}</strong><p>Clientes detectados desde Supabase.</p></article>
        <article class="module-card"><h3>Clientes VIP</h3><strong>${formatNumber(vip)}</strong><p>Alto valor o 3+ pedidos.</p></article>
        <article class="module-card"><h3>Frecuentes</h3><strong>${formatNumber(frequent)}</strong><p>Clientes con recompra.</p></article>
        <article class="module-card"><h3>Inactivos</h3><strong>${formatNumber(inactive)}</strong><p>Sin compra reciente.</p></article>
        <article class="module-card"><h3>Valor visible</h3><strong>${formatUSD(totalSpent)}</strong><p>Sobre pedidos visibles por RLS.</p></article>
        <article class="module-card"><h3>Marketing futuro</h3><strong>Preparado</strong><p>Segmentos listos sin enviar correos.</p></article>
      </div>
      <div class="v2-toolbar crm-toolbar">
        <input id="crmSearch" type="search" placeholder="Buscar cliente, correo, teléfono o estado..." />
        <button data-crm-filter="Todos">Todos</button>
        <button data-crm-filter="VIP">VIP</button>
        <button data-crm-filter="Frecuente">Frecuentes</button>
        <button data-crm-filter="Inactivo">Inactivos</button>
      </div>
      <div class="main-grid" style="margin-top:18px">
        <article class="panel"><div class="panel-head"><h3>Clientes y segmentos</h3><span class="tag">Lectura</span></div><div class="table" id="crmTable">${renderV2Table([rows].filter(Boolean),'Sin clientes visibles')}</div></article>
        <article class="panel crm-profile-panel"><div class="panel-head"><h3>Ficha del cliente</h3><span class="tag">CRM</span></div><div id="crmProfileDetail" class="crm-detail-empty">Selecciona un cliente para ver compras, valor total y estado comercial.</div></article>
      </div>`;

    qs('crmSearch')?.addEventListener('input', filterCRMRows);
    document.querySelectorAll('[data-crm-filter]').forEach(btn=>btn.addEventListener('click',()=>filterCRMRows(btn.dataset.crmFilter)));
  }

  window.openCRMProfile = function(index){
    const c = window.enterpriseV3State.customerProfiles[index];
    const detail = qs('crmProfileDetail'); if(!detail || !c) return;
    const orders = c.orders.slice(0,8).map(o=>`<div class="table-row"><div><b>${safe(v2OrderCode(o))}</b><br><small>${v2Date(v2OrderDate(o))} · ${safe(v2OrderStatus(o))}</small></div><span>${formatUSD(orderTotal(o))}</span><i class="tag">Pedido</i></div>`).join('');
    detail.innerHTML = `
      <div class="crm-detail-head">
        <div class="crm-avatar">${safe((c.name || c.email || 'C').charAt(0).toUpperCase())}</div>
        <div><h2>${safe(c.name)}</h2><p>${safe(c.email)} · ${safe(c.phone)}</p></div>
      </div>
      <div class="crm-mini-grid">
        <article><span>Total gastado</span><b>${formatUSD(c.totalSpent)}</b></article>
        <article><span>Pedidos</span><b>${formatNumber(c.orders.length)}</b></article>
        <article><span>Última compra</span><b>${c.lastOrderDate ? v2Date(c.lastOrderDate) : 'Sin compra'}</b></article>
        <article><span>Estado</span><b>${safe(c.status)}</b></article>
      </div>
      <div class="panel-head" style="margin-top:18px"><h3>Pedidos del cliente</h3><span class="tag">Solo lectura</span></div>
      <div class="table">${orders || '<div class="table-row"><div><b>Sin pedidos visibles</b><br><small>Puede no tener compras o falta permiso de lectura.</small></div><span>—</span><i class="tag">Info</i></div>'}</div>
      <p class="staff-help">Preparado para conectar garantías, soporte técnico e historial de reparaciones en una fase posterior.</p>`;
  };

  function filterCRMRows(forcedFilter){
    const query = (qs('crmSearch')?.value || '').toLowerCase();
    const active = forcedFilter || 'Todos';
    document.querySelectorAll('#crmTable .crm-row').forEach(row=>{
      const text = `${row.textContent} ${row.dataset.search || ''}`.toLowerCase();
      const filter = row.dataset.filter || '';
      const matchText = !query || text.includes(query);
      const matchFilter = active === 'Todos' || filter === active || (active === 'Frecuente' && (filter === 'Frecuente' || filter === 'VIP'));
      row.style.display = matchText && matchFilter ? '' : 'none';
    });
  }

  function renderFinancePro(data){
    const el = qs('finance'); if(!el) return;
    const f = calcV3Finance(data);
    const rows = (data.recentOrders || []).slice(0,15).map(o=>`<div class="table-row"><div><b>${safe(v2OrderCode(o))}</b><br><small>${safe(rowCustomerName(o))} · ${v2Date(v2OrderDate(o))}</small></div><span class="status-dot ${v2StatusClass(v2OrderStatus(o))}">${safe(v2OrderStatus(o))}</span><i class="tag">${formatUSD(orderTotal(o))}</i></div>`).join('');
    el.innerHTML = `<article class="panel safe-panel v3-hero"><div class="panel-head"><h3>Finanzas Pro</h3><span class="tag safe-tag">Solo lectura</span></div><p class="staff-help">Indicadores financieros sobre pedidos visibles. No valida pagos, no cambia estados y no dispara correos.</p></article><div class="module-grid v3-kpis"><article class="module-card"><h3>Ventas hoy</h3><strong>${formatUSD(f.today)}</strong><p>Pedidos visibles del día.</p></article><article class="module-card"><h3>Ventas semana</h3><strong>${formatUSD(f.week)}</strong><p>Desde el lunes actual.</p></article><article class="module-card"><h3>Ventas mes</h3><strong>${formatUSD(f.month || data.salesTotal)}</strong><p>Mes actual o total visible.</p></article><article class="module-card"><h3>Ticket promedio</h3><strong>${formatUSD(f.average)}</strong><p>Promedio por pedido visible.</p></article><article class="module-card"><h3>Pagos por revisar</h3><strong>${formatNumber(data.pendingPayments)}</strong><p>Validación intacta.</p></article><article class="module-card"><h3>Comprobantes</h3><strong>${formatNumber(data.counts.payments)}</strong><p>Lectura desde Supabase.</p></article></div><article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Movimientos recientes</h3><span class="tag">No editable</span></div><div class="table">${renderV2Table([rows].filter(Boolean),'Sin movimientos visibles')}</div></article>`;
  }

  function renderInventoryPro(data){
    const el = qs('inventory'); if(!el) return;
    const products = data.products || [];
    const low = products.filter(p=>{ const s=v2ProductStock(p); return s !== null && s > 0 && s <= 2; });
    const zero = products.filter(p=>{ const s=v2ProductStock(p); return s !== null && s <= 0; });
    const unknown = products.filter(p=>v2ProductStock(p) === null);
    const rows = products.slice(0,80).map(p=>{
      const stock = v2ProductStock(p);
      const label = stock === null ? 'Sin campo stock' : stock <= 0 ? 'Agotado' : stock <= 2 ? 'Stock bajo' : 'Disponible';
      return `<div class="table-row v3-inventory-row"><div><b>${safe(v2ProductName(p))}</b><br><small>${safe(v2ProductCategory(p))} · ${formatUSD(v2ProductPrice(p))}</small></div><span class="status-dot ${stock === null ? 'info' : stock <= 0 ? 'bad' : stock <= 2 ? 'warn':'ok'}">${safe(label)}</span><i class="tag">${stock === null ? 'Catálogo' : `Stock ${stock}`}</i></div>`;
    }).join('');
    el.innerHTML = `<article class="panel safe-panel v3-hero"><div class="panel-head"><h3>Inventario Pro</h3><span class="tag safe-tag">Lectura segura</span></div><p class="staff-help">Alertas visuales de stock y catálogo. No modifica productos, precios ni existencias.</p></article><div class="module-grid v3-kpis"><article class="module-card"><h3>Productos visibles</h3><strong>${formatNumber(products.length || data.counts.products)}</strong><p>Fuente: ${safe(data.tables.products || 'no detectada')}.</p></article><article class="module-card"><h3>Stock bajo</h3><strong>${formatNumber(low.length)}</strong><p>Productos con 1-2 unidades.</p></article><article class="module-card"><h3>Agotados</h3><strong>${formatNumber(zero.length)}</strong><p>Stock en 0 o menor.</p></article><article class="module-card"><h3>Sin campo stock</h3><strong>${formatNumber(unknown.length)}</strong><p>Productos de catálogo sin cantidad.</p></article><article class="module-card"><h3>Modo edición</h3><strong>Desactivado</strong><p>Protegemos la tienda actual.</p></article><article class="module-card"><h3>Reposición</h3><strong>Preparada</strong><p>Próxima fase con aprobación.</p></article></div><article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Inventario y alertas</h3><span class="tag">Solo lectura</span></div><div class="table">${renderV2Table([rows].filter(Boolean),'Sin productos visibles')}</div></article>`;
  }

  function renderMarketingPrepared(data){
    const el = qs('marketing'); if(!el) return;
    const profiles = window.enterpriseV3State.customerProfiles?.length ? window.enterpriseV3State.customerProfiles : buildCustomerProfiles(data);
    const vip = profiles.filter(c=>c.status === 'VIP').length;
    const inactive = profiles.filter(c=>c.status === 'Inactivo').length;
    const newBuyers = profiles.filter(c=>c.status === 'Nuevo comprador' || c.status === 'Registrado').length;
    el.innerHTML = `<article class="panel safe-panel v3-hero"><div class="panel-head"><h3>Marketing Center</h3><span class="tag safe-tag">Preparado · sin envío</span></div><p class="staff-help">Segmentación lista para campañas futuras. No toca Resend, API keys ni plantillas actuales.</p></article><div class="module-grid v3-kpis"><article class="module-card"><h3>Audiencia total</h3><strong>${formatNumber(profiles.length || data.counts.customers)}</strong><p>Clientes visibles para segmentación.</p></article><article class="module-card"><h3>Clientes VIP</h3><strong>${formatNumber(vip)}</strong><p>Campaña premium futura.</p></article><article class="module-card"><h3>Clientes inactivos</h3><strong>${formatNumber(inactive)}</strong><p>Recuperación futura.</p></article><article class="module-card"><h3>Nuevos clientes</h3><strong>${formatNumber(newBuyers)}</strong><p>Bienvenida y fidelización futura.</p></article><article class="module-card"><h3>Resend</h3><strong>Intacto</strong><p>ventas@ y soporte@ sin cambios.</p></article><article class="module-card"><h3>Envíos</h3><strong>Bloqueados</strong><p>Solo diseño y preparación.</p></article></div>`;
  }

  function renderBIReports(data){
    const el = qs('reports'); if(!el) return;
    const profiles = window.enterpriseV3State.customerProfiles || buildCustomerProfiles(data);
    const topCustomer = profiles[0];
    const topProduct = (data.products || []).slice().sort((a,b)=> (v2ProductPrice(b)||0) - (v2ProductPrice(a)||0))[0];
    el.innerHTML = `<div class="module-grid"><article class="module-card"><h3>Cliente de mayor valor</h3><strong>${safe(topCustomer?.name || 'Pendiente')}</strong><p>${topCustomer ? `${formatUSD(topCustomer.totalSpent)} visibles` : 'Sin datos visibles'}.</p></article><article class="module-card"><h3>Producto premium</h3><strong>${safe(topProduct ? v2ProductName(topProduct) : 'Pendiente')}</strong><p>${topProduct ? formatUSD(v2ProductPrice(topProduct)) : 'Sin catálogo visible'}.</p></article><article class="module-card"><h3>Ticket promedio</h3><strong>${formatUSD(calcV3Finance(data).average)}</strong><p>Pedidos visibles.</p></article><article class="module-card"><h3>Clientes VIP</h3><strong>${formatNumber(profiles.filter(c=>c.status==='VIP').length)}</strong><p>Segmento de alto valor.</p></article><article class="module-card"><h3>Modo seguro</h3><strong>Activo</strong><p>Reportes sin escritura.</p></article><article class="module-card"><h3>Exportación</h3><strong>Lista</strong><p>CSV ejecutivo disponible.</p></article></div><article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Business Intelligence preparado</h3><button onclick="exportCSV('executive')">Exportar CSV</button></div><p class="staff-help">Los indicadores se calculan sobre datos que Enterprise puede leer por permisos actuales. No modifica base de datos.</p></article>`;
  }

  const previousLoadEnterprise = window.loadEnterpriseV1Real || loadEnterpriseV1Real;
  window.loadEnterpriseV1Real = loadEnterpriseV1Real = async function(){
    const data = await previousLoadEnterprise();
    if(!data) return data;
    data.version = 'V4';
    renderCRM(data);
    renderFinancePro(data);
    renderInventoryPro(data);
    renderMarketingPrepared(data);
    renderBIReports(data);
    return data;
  };

  const oldSwitchView = window.switchView || switchView;
  window.switchView = switchView = function(id){
    oldSwitchView(id);
    if(enterpriseRealCache){
      if(id === 'clients') renderCRM(enterpriseRealCache);
      if(id === 'finance') renderFinancePro(enterpriseRealCache);
      if(id === 'inventory') renderInventoryPro(enterpriseRealCache);
      if(id === 'marketing') renderMarketingPrepared(enterpriseRealCache);
      if(id === 'reports') renderBIReports(enterpriseRealCache);
    }
  };
})();


/* ==========================================================
   Enterprise V4 Funcional · Estado de activación
   Módulos activos en modo seguro: CRM real, Staff Manager, Finanzas e Inventario.
   No toca Resend, correos, notas de entrega ni panel administrador actual.
   ========================================================== */
(function(){
  function renderV4SecurityStatus(){
    const el = qs('settings');
    if(!el) return;
    el.innerHTML = `
      <article class="panel safe-panel v3-hero">
        <div class="panel-head"><h3>Seguridad y activación Enterprise V4</h3><span class="tag safe-tag">Operativo seguro</span></div>
        <p class="staff-help">Enterprise funciona con Supabase Auth y roles. Esta versión mantiene protegidos Resend, pedidos, notas de entrega, recuperación de contraseña y el panel administrador actual.</p>
      </article>
      <div class="module-grid v3-kpis">
        <article class="module-card"><h3>CRM Clientes</h3><strong>Activo</strong><p>Lee clientes y pedidos visibles sin modificar datos.</p></article>
        <article class="module-card"><h3>Staff Manager</h3><strong>Activo</strong><p>Gestiona roles_usuarios y staff_invitations.</p></article>
        <article class="module-card"><h3>Finanzas Pro</h3><strong>Activo</strong><p>Calcula métricas sobre pedidos visibles.</p></article>
        <article class="module-card"><h3>Inventario Pro</h3><strong>Activo</strong><p>Lee productos/inventario si la tabla existe.</p></article>
        <article class="module-card"><h3>Correos / Resend</h3><strong>Intacto</strong><p>No se tocan API keys, plantillas ni funciones.</p></article>
        <article class="module-card"><h3>Panel actual</h3><strong>Respaldo</strong><p>La administración principal de ThinkStore no se modifica.</p></article>
      </div>
      <article class="panel" style="margin-top:18px">
        <div class="panel-head"><h3>Reglas de seguridad aplicadas</h3><span class="tag">V4</span></div>
        <div class="table">
          <div class="table-row"><div><b>Sin migración de datos</b><br><small>Enterprise lee las tablas existentes: clientes, pedidos, comprobantes, roles_usuarios y staff_invitations.</small></div><span>Seguro</span><i class="tag">OK</i></div>
          <div class="table-row"><div><b>Sin cambios en correos</b><br><small>ventas@thinkstore.com.ve y soporte@thinkstore.com.ve quedan con su configuración actual.</small></div><span>Intacto</span><i class="tag">OK</i></div>
          <div class="table-row"><div><b>Staff controlado</b><br><small>Los accesos se administran desde roles_usuarios y staff_invitations.</small></div><span>Activo</span><i class="tag">OK</i></div>
        </div>
      </article>`;
  }
  const previousSwitchViewV4 = window.switchView || switchView;
  window.switchView = switchView = function(id){
    previousSwitchViewV4(id);
    if(id === 'settings') renderV4SecurityStatus();
  };
})();


/* ==========================================================
   Enterprise V5 Completa · BI + CRM + Marketing Center
   - Modo seguro: lectura sobre Supabase
   - No modifica Resend, correos, pedidos, notas, comprobantes ni estados
   ========================================================== */
(function(){
  const DAY = 24 * 60 * 60 * 1000;
  const now = () => new Date();
  const startOfDay = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
  const startOfWeek = () => { const d = startOfDay(); const day = (d.getDay()+6)%7; d.setDate(d.getDate()-day); return d; };
  const startOfMonth = () => { const d = startOfDay(); d.setDate(1); return d; };
  const startOfYear = () => { const d = startOfDay(); d.setMonth(0,1); return d; };
  const toDateV5 = (value) => { const d = new Date(value || ''); return Number.isNaN(d.getTime()) ? null : d; };
  const emailKeyV5 = (value) => String(value || '').trim().toLowerCase();
  const isAfterV5 = (value, start) => { const d = toDateV5(value); return d ? d >= start : false; };

  const orderDateV5 = (o) => v2OrderDate(o) || rowDate(o) || pick(o,['fecha_creacion','createdAt','created']);
  const customerDateV5 = (c) => rowDate(c) || pick(c,['createdAt','created','fecha_registro']);
  const customerNameV5 = (c) => v2CustomerName(c) || pick(c,['nombre','name','full_name','cliente','customer_name']) || 'Cliente';
  const customerEmailV5 = (c) => emailKeyV5(v2CustomerEmail(c) || pick(c,['email','correo','customer_email','cliente_email']));
  const customerPhoneV5 = (c) => v2CustomerPhone(c) || pick(c,['telefono','phone','whatsapp','mobile']) || '—';
  const orderEmailV5 = (o) => emailKeyV5(rowCustomerEmail(o) || pick(o,['email','correo','customer_email','cliente_email','email_cliente']));
  const orderNameV5 = (o) => rowCustomerName(o) || pick(o,['cliente_nombre','customer_name','name','nombre']) || 'Cliente';

  async function v5ReadTables(tableNames, limit=300){
    for(const table of tableNames){
      try{
        let res = await getClient().from(table).select('*').order('created_at', { ascending:false }).limit(limit);
        if(res.error) res = await getClient().from(table).select('*').limit(limit);
        if(!res.error) return { table, data: res.data || [] };
        console.warn(`[Enterprise V5] Lectura ${table}:`, res.error.message || res.error);
      }catch(error){ console.warn(`[Enterprise V5] Lectura ${table}:`, error.message || error); }
    }
    return { table:null, data:[] };
  }

  function buildProfilesV5(data){
    const map = new Map();
    (data.recentCustomers || []).forEach(c=>{
      const email = customerEmailV5(c) || `cliente-${pick(c,['id','uid']) || Math.random()}`;
      if(!map.has(email)){
        map.set(email, {
          key: email,
          name: customerNameV5(c),
          email: customerEmailV5(c) || 'Sin correo',
          phone: customerPhoneV5(c),
          createdAt: customerDateV5(c),
          orders: [],
          totalSpent: 0,
          lastOrderDate: null,
          segment: 'Registrado',
          notes: []
        });
      }
    });
    (data.recentOrders || []).forEach(o=>{
      const email = orderEmailV5(o) || `pedido-${pick(o,['id','codigo','code']) || Math.random()}`;
      if(!map.has(email)){
        map.set(email, {
          key: email,
          name: orderNameV5(o),
          email: orderEmailV5(o) || 'Sin correo',
          phone: pick(o,['telefono','phone','whatsapp']) || '—',
          createdAt: orderDateV5(o),
          orders: [],
          totalSpent: 0,
          lastOrderDate: null,
          segment: 'Cliente',
          notes: []
        });
      }
      const profile = map.get(email);
      const amount = orderTotal(o);
      const date = toDateV5(orderDateV5(o));
      profile.orders.push(o);
      profile.totalSpent += amount;
      if(date && (!profile.lastOrderDate || date > profile.lastOrderDate)) profile.lastOrderDate = date;
    });
    return Array.from(map.values()).map(p=>{
      const days = p.lastOrderDate ? Math.floor((Date.now() - p.lastOrderDate.getTime()) / DAY) : null;
      const count = p.orders.length;
      if(p.totalSpent >= 1200 || count >= 4) p.segment = 'VIP';
      else if(count >= 2) p.segment = 'Frecuente';
      else if(count === 1 && days !== null && days <= 45) p.segment = 'Nuevo comprador';
      else if(days !== null && days > 90) p.segment = 'Inactivo';
      else p.segment = p.email === 'Sin correo' ? 'Por identificar' : 'Registrado';
      p.daysSince = days;
      p.averageTicket = count ? p.totalSpent / count : 0;
      return p;
    }).sort((a,b)=> b.totalSpent - a.totalSpent || b.orders.length - a.orders.length || String(a.name).localeCompare(String(b.name)));
  }

  function v5Finance(data){
    const orders = data.recentOrders || [];
    const sum = (rows) => rows.reduce((total,o)=>total + orderTotal(o), 0);
    const today = orders.filter(o=>isAfterV5(orderDateV5(o), startOfDay()));
    const week = orders.filter(o=>isAfterV5(orderDateV5(o), startOfWeek()));
    const month = orders.filter(o=>isAfterV5(orderDateV5(o), startOfMonth()));
    const year = orders.filter(o=>isAfterV5(orderDateV5(o), startOfYear()));
    const total = sum(orders);
    const average = orders.length ? total / orders.length : 0;
    return { today:sum(today), week:sum(week), month:sum(month), year:sum(year), total, average, todayCount:today.length, weekCount:week.length, monthCount:month.length, yearCount:year.length };
  }

  function orderStatusGroupsV5(data){
    const groups = {};
    (data.recentOrders || []).forEach(o=>{
      const status = String(v2OrderStatus(o) || 'Sin estado').trim() || 'Sin estado';
      groups[status] = (groups[status] || 0) + 1;
    });
    return Object.entries(groups).sort((a,b)=>b[1]-a[1]);
  }

  function productInsightsV5(data){
    const products = data.products || [];
    const items = data.orderItems || [];
    const sold = new Map();
    items.forEach(item=>{
      const name = pick(item,['producto','producto_nombre','product_name','nombre','name','title','titulo','modelo','model']) || 'Producto';
      const qty = Number(pick(item,['cantidad','qty','quantity','unidades']) || 1) || 1;
      sold.set(name, (sold.get(name) || 0) + qty);
    });
    const topSold = Array.from(sold.entries()).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const low = products.filter(p=>{ const s=v2ProductStock(p); return s !== null && s > 0 && s <= 2; });
    const zero = products.filter(p=>{ const s=v2ProductStock(p); return s !== null && s <= 0; });
    const premium = products.slice().sort((a,b)=>v2ProductPrice(b)-v2ProductPrice(a)).slice(0,6);
    return { topSold, low, zero, premium };
  }

  function renderV5CRM(data){
    const el = qs('clients'); if(!el) return;
    const profiles = buildProfilesV5(data);
    window.enterpriseV5State = window.enterpriseV5State || {};
    window.enterpriseV5State.profiles = profiles;
    const totalSpent = profiles.reduce((sum,p)=>sum+p.totalSpent,0);
    const vip = profiles.filter(p=>p.segment==='VIP').length;
    const frequent = profiles.filter(p=>p.segment==='Frecuente' || p.segment==='VIP').length;
    const inactive = profiles.filter(p=>p.segment==='Inactivo').length;
    const newClients = profiles.filter(p=>isAfterV5(p.createdAt, startOfMonth())).length;
    const rows = profiles.slice(0,120).map((p,idx)=>`
      <div class="table-row crm-row v5-row" data-filter="${safe(p.segment)}" data-search="${safe(`${p.name} ${p.email} ${p.phone} ${p.segment}`)}" onclick="openV5CRMProfile(${idx})">
        <div><b>${safe(p.name)}</b><br><small>${safe(p.email)} · ${safe(p.phone)}</small></div>
        <span>${formatUSD(p.totalSpent)} · ${formatNumber(p.orders.length)} pedidos</span>
        <i class="status-dot ${p.segment==='VIP'?'ok':p.segment==='Inactivo'?'bad':p.segment==='Frecuente'?'warn':'info'}">${safe(p.segment)}</i>
      </div>`).join('');
    el.innerHTML = `
      <article class="panel safe-panel v5-hero"><div class="panel-head"><h3>CRM Clientes Completo</h3><span class="tag safe-tag">V5 · Operativo</span></div><p class="staff-help">Ficha única del cliente, valor comercial, segmentación y compras visibles. Modo lectura: no modifica clientes, pedidos, correos ni Resend.</p></article>
      <div class="module-grid v3-kpis">
        <article class="module-card"><h3>Clientes CRM</h3><strong>${formatNumber(profiles.length || data.counts.customers)}</strong><p>Clientes detectados en Supabase.</p></article>
        <article class="module-card"><h3>VIP</h3><strong>${formatNumber(vip)}</strong><p>Alto valor o 4+ pedidos.</p></article>
        <article class="module-card"><h3>Frecuentes</h3><strong>${formatNumber(frequent)}</strong><p>Clientes con recompra.</p></article>
        <article class="module-card"><h3>Inactivos</h3><strong>${formatNumber(inactive)}</strong><p>Sin compra reciente.</p></article>
        <article class="module-card"><h3>Nuevos este mes</h3><strong>${formatNumber(newClients)}</strong><p>Fecha de registro visible.</p></article>
        <article class="module-card"><h3>Valor visible</h3><strong>${formatUSD(totalSpent)}</strong><p>Pedidos visibles por permisos actuales.</p></article>
      </div>
      <div class="v2-toolbar crm-toolbar"><input id="crmSearch" type="search" placeholder="Buscar cliente, correo, teléfono o segmento..." /><button data-v5-crm="Todos">Todos</button><button data-v5-crm="VIP">VIP</button><button data-v5-crm="Frecuente">Frecuentes</button><button data-v5-crm="Inactivo">Inactivos</button></div>
      <div class="main-grid" style="margin-top:18px"><article class="panel"><div class="panel-head"><h3>Clientes y segmentos</h3><span class="tag">Lectura</span></div><div class="table" id="crmTable">${renderV2Table([rows].filter(Boolean),'Sin clientes visibles')}</div></article><article class="panel crm-profile-panel"><div class="panel-head"><h3>Ficha 360 del cliente</h3><span class="tag">CRM</span></div><div id="crmProfileDetail" class="crm-detail-empty">Selecciona un cliente para ver valor, compras, frecuencia, segmento y preparación para soporte.</div></article></div>`;
    qs('crmSearch')?.addEventListener('input', filterV5CRM);
    document.querySelectorAll('[data-v5-crm]').forEach(btn=>btn.addEventListener('click',()=>filterV5CRM(btn.dataset.v5Crm)));
  }

  window.openV5CRMProfile = function(index){
    const p = window.enterpriseV5State?.profiles?.[index];
    const detail = qs('crmProfileDetail'); if(!p || !detail) return;
    const orders = p.orders.slice(0,10).map(o=>`<div class="table-row"><div><b>${safe(v2OrderCode(o))}</b><br><small>${v2Date(orderDateV5(o))} · ${safe(v2OrderStatus(o))}</small></div><span>${formatUSD(orderTotal(o))}</span><i class="tag">Pedido</i></div>`).join('');
    detail.innerHTML = `<div class="crm-detail-head"><div class="crm-avatar">${safe((p.name || p.email || 'C').charAt(0).toUpperCase())}</div><div><h2>${safe(p.name)}</h2><p>${safe(p.email)} · ${safe(p.phone)}</p></div></div><div class="crm-mini-grid"><article><span>Total gastado</span><b>${formatUSD(p.totalSpent)}</b></article><article><span>Ticket promedio</span><b>${formatUSD(p.averageTicket)}</b></article><article><span>Pedidos</span><b>${formatNumber(p.orders.length)}</b></article><article><span>Última compra</span><b>${p.lastOrderDate ? v2Date(p.lastOrderDate) : 'Sin compra'}</b></article><article><span>Segmento</span><b>${safe(p.segment)}</b></article><article><span>Días sin compra</span><b>${p.daysSince === null ? '—' : formatNumber(p.daysSince)}</b></article></div><div class="panel-head" style="margin-top:18px"><h3>Historial comercial</h3><span class="tag">Solo lectura</span></div><div class="table">${orders || '<div class="table-row"><div><b>Sin pedidos visibles</b><br><small>Puede no tener compras o falta permiso de lectura.</small></div><span>—</span><i class="tag">Info</i></div>'}</div><p class="staff-help">V6 conectará compras + garantías + reparaciones + historial técnico sin mezclar bases todavía.</p>`;
  };

  function filterV5CRM(forced){
    const query = (qs('crmSearch')?.value || '').toLowerCase();
    const active = forced || 'Todos';
    document.querySelectorAll('#crmTable .crm-row').forEach(row=>{
      const text = `${row.textContent} ${row.dataset.search || ''}`.toLowerCase();
      const filter = row.dataset.filter || '';
      const matchText = !query || text.includes(query);
      const matchFilter = active === 'Todos' || filter === active || (active === 'Frecuente' && (filter === 'Frecuente' || filter === 'VIP'));
      row.style.display = matchText && matchFilter ? '' : 'none';
    });
  }

  function renderV5Finance(data){
    const el = qs('finance'); if(!el) return;
    const f = v5Finance(data);
    const statusRows = orderStatusGroupsV5(data).slice(0,8).map(([status,count])=>`<div class="table-row"><div><b>${safe(status)}</b><br><small>Pedidos por estado visible</small></div><span>${formatNumber(count)}</span><i class="tag">Estado</i></div>`).join('');
    const recent = (data.recentOrders || []).slice(0,12).map(o=>`<div class="table-row"><div><b>${safe(v2OrderCode(o))}</b><br><small>${safe(orderNameV5(o))} · ${v2Date(orderDateV5(o))}</small></div><span class="status-dot ${v2StatusClass(v2OrderStatus(o))}">${safe(v2OrderStatus(o))}</span><i class="tag">${formatUSD(orderTotal(o))}</i></div>`).join('');
    el.innerHTML = `<article class="panel safe-panel v5-hero"><div class="panel-head"><h3>Finanzas Completas</h3><span class="tag safe-tag">V5 · Solo lectura</span></div><p class="staff-help">Ventas por período, ticket promedio, pagos pendientes y estados. No valida pagos, no cambia estados y no dispara correos.</p></article><div class="module-grid v3-kpis"><article class="module-card"><h3>Ventas hoy</h3><strong>${formatUSD(f.today)}</strong><p>${formatNumber(f.todayCount)} pedidos visibles.</p></article><article class="module-card"><h3>Ventas semana</h3><strong>${formatUSD(f.week)}</strong><p>${formatNumber(f.weekCount)} pedidos visibles.</p></article><article class="module-card"><h3>Ventas mes</h3><strong>${formatUSD(f.month || data.salesTotal)}</strong><p>${formatNumber(f.monthCount)} pedidos visibles.</p></article><article class="module-card"><h3>Ventas año</h3><strong>${formatUSD(f.year || data.salesTotal)}</strong><p>${formatNumber(f.yearCount)} pedidos visibles.</p></article><article class="module-card"><h3>Ticket promedio</h3><strong>${formatUSD(f.average)}</strong><p>Promedio visible.</p></article><article class="module-card"><h3>Pagos por revisar</h3><strong>${formatNumber(data.pendingPayments)}</strong><p>Validación intacta.</p></article></div><div class="main-grid" style="margin-top:18px"><article class="panel"><div class="panel-head"><h3>Movimientos recientes</h3><span class="tag">No editable</span></div><div class="table">${renderV2Table([recent].filter(Boolean),'Sin movimientos visibles')}</div></article><article class="panel"><div class="panel-head"><h3>Pedidos por estado</h3><span class="tag">BI</span></div><div class="table">${renderV2Table([statusRows].filter(Boolean),'Sin estados visibles')}</div></article></div>`;
  }

  function renderV5Inventory(data){
    const el = qs('inventory'); if(!el) return;
    const products = data.products || [];
    const insights = productInsightsV5(data);
    const rows = products.slice(0,120).map(p=>{ const stock=v2ProductStock(p); const label=stock===null?'Sin campo stock':stock<=0?'Agotado':stock<=2?'Stock bajo':'Disponible'; return `<div class="table-row v3-inventory-row"><div><b>${safe(v2ProductName(p))}</b><br><small>${safe(v2ProductCategory(p))} · ${formatUSD(v2ProductPrice(p))}</small></div><span class="status-dot ${stock===null?'info':stock<=0?'bad':stock<=2?'warn':'ok'}">${safe(label)}</span><i class="tag">${stock===null?'Catálogo':`Stock ${stock}`}</i></div>`; }).join('');
    const topRows = insights.topSold.map(([name,qty])=>`<div class="table-row"><div><b>${safe(name)}</b><br><small>Detectado desde items de pedido si la tabla está disponible.</small></div><span>${formatNumber(qty)} unidades</span><i class="tag">Top</i></div>`).join('');
    el.innerHTML = `<article class="panel safe-panel v5-hero"><div class="panel-head"><h3>Inventario Pro Completo</h3><span class="tag safe-tag">V5 · Lectura</span></div><p class="staff-help">Stock, agotados, alertas y rotación preparada. No modifica productos, precios, existencias ni catálogo público.</p></article><div class="module-grid v3-kpis"><article class="module-card"><h3>Productos visibles</h3><strong>${formatNumber(products.length || data.counts.products)}</strong><p>Fuente: ${safe(data.tables.products || 'no detectada')}.</p></article><article class="module-card"><h3>Stock bajo</h3><strong>${formatNumber(insights.low.length)}</strong><p>Productos con 1-2 unidades.</p></article><article class="module-card"><h3>Agotados</h3><strong>${formatNumber(insights.zero.length)}</strong><p>Stock en 0 o menor.</p></article><article class="module-card"><h3>Rotación detectada</h3><strong>${formatNumber(insights.topSold.length)}</strong><p>Si hay order_items/pedido_items.</p></article><article class="module-card"><h3>Producto premium</h3><strong>${safe(insights.premium[0] ? v2ProductName(insights.premium[0]) : 'Pendiente')}</strong><p>${insights.premium[0] ? formatUSD(v2ProductPrice(insights.premium[0])) : 'Sin catálogo visible'}.</p></article><article class="module-card"><h3>Edición</h3><strong>Bloqueada</strong><p>Protegemos operación actual.</p></article></div><div class="main-grid" style="margin-top:18px"><article class="panel"><div class="panel-head"><h3>Inventario y alertas</h3><span class="tag">Solo lectura</span></div><div class="table">${renderV2Table([rows].filter(Boolean),'Sin productos visibles')}</div></article><article class="panel"><div class="panel-head"><h3>Más vendidos / rotación</h3><span class="tag">BI</span></div><div class="table">${renderV2Table([topRows].filter(Boolean),'Sin datos de items todavía')}</div></article></div>`;
  }

  function renderV5Marketing(data){
    const el = qs('marketing'); if(!el) return;
    const profiles = buildProfilesV5(data);
    const vip = profiles.filter(p=>p.segment==='VIP');
    const frequent = profiles.filter(p=>p.segment==='Frecuente' || p.segment==='VIP');
    const inactive = profiles.filter(p=>p.segment==='Inactivo');
    const newer = profiles.filter(p=>isAfterV5(p.createdAt, startOfMonth()) || p.segment==='Nuevo comprador');
    const preorders = data.counts?.preorders || 0;
    const audienceRows = [
      ['Clientes VIP', vip.length, 'Campañas premium y lanzamientos Apple'],
      ['Clientes frecuentes', frequent.length, 'Recompra y accesorios'],
      ['Clientes inactivos', inactive.length, 'Recuperación futura'],
      ['Clientes nuevos', newer.length, 'Fidelización y bienvenida'],
      ['Preórdenes', preorders, 'Seguimiento de expectativa']
    ].map(([name,count,desc])=>`<div class="table-row"><div><b>${safe(name)}</b><br><small>${safe(desc)}</small></div><span>${formatNumber(count)}</span><i class="tag">Audiencia</i></div>`).join('');
    el.innerHTML = `<article class="panel safe-panel v5-hero"><div class="panel-head"><h3>Marketing Center Completo</h3><span class="tag safe-tag">Preparado · sin envío</span></div><p class="staff-help">Audiencias, segmentos y campañas preparadas. No toca Resend, API keys, plantillas, ventas@ ni soporte@.</p></article><div class="module-grid v3-kpis"><article class="module-card"><h3>Audiencia total</h3><strong>${formatNumber(profiles.length || data.counts.customers)}</strong><p>Clientes visibles.</p></article><article class="module-card"><h3>VIP</h3><strong>${formatNumber(vip.length)}</strong><p>Alto valor.</p></article><article class="module-card"><h3>Inactivos</h3><strong>${formatNumber(inactive.length)}</strong><p>Recuperación futura.</p></article><article class="module-card"><h3>Nuevos</h3><strong>${formatNumber(newer.length)}</strong><p>Bienvenida y fidelización.</p></article><article class="module-card"><h3>Campañas</h3><strong>Preparadas</strong><p>Newsletter, promociones, lanzamientos.</p></article><article class="module-card"><h3>Resend</h3><strong>Intacto</strong><p>Sin envío automático.</p></article></div><div class="main-grid" style="margin-top:18px"><article class="panel"><div class="panel-head"><h3>Audiencias listas</h3><span class="tag">Segmentación</span></div><div class="table">${audienceRows}</div></article><article class="panel"><div class="panel-head"><h3>Campañas preparadas</h3><span class="tag">Bloqueadas</span></div><div class="table"><div class="table-row"><div><b>Lanzamientos Apple</b><br><small>iPhone, MacBook, AirPods y Watch.</small></div><span>Lista</span><i class="tag">Draft</i></div><div class="table-row"><div><b>Clientes VIP</b><br><small>Ofertas premium y acceso anticipado.</small></div><span>Lista</span><i class="tag">Draft</i></div><div class="table-row"><div><b>Recuperación de clientes</b><br><small>Clientes sin compra reciente.</small></div><span>Lista</span><i class="tag">Draft</i></div></div></article></div>`;
  }

  function renderV5BI(data){
    const el = qs('reports'); if(!el) return;
    const profiles = buildProfilesV5(data);
    const f = v5Finance(data);
    const products = productInsightsV5(data);
    const topCustomer = profiles[0];
    const statuses = orderStatusGroupsV5(data).slice(0,8).map(([s,c])=>`<div class="table-row"><div><b>${safe(s)}</b><br><small>Estado de pedido visible</small></div><span>${formatNumber(c)}</span><i class="tag">Estado</i></div>`).join('');
    const topProducts = products.topSold.length ? products.topSold.map(([n,q])=>`<div class="table-row"><div><b>${safe(n)}</b><br><small>Rotación por items visibles</small></div><span>${formatNumber(q)}</span><i class="tag">Top</i></div>`).join('') : products.premium.map(p=>`<div class="table-row"><div><b>${safe(v2ProductName(p))}</b><br><small>${safe(v2ProductCategory(p))}</small></div><span>${formatUSD(v2ProductPrice(p))}</span><i class="tag">Catálogo</i></div>`).join('');
    el.innerHTML = `<article class="panel safe-panel v5-hero"><div class="panel-head"><h3>Business Intelligence Completo</h3><span class="tag safe-tag">V5 · Lectura</span></div><p class="staff-help">KPIs, clientes top, productos, estados y reportes ejecutivos sobre datos visibles. No escribe en Supabase.</p></article><div class="module-grid v3-kpis"><article class="module-card"><h3>Ventas mes</h3><strong>${formatUSD(f.month || data.salesTotal)}</strong><p>Periodo actual visible.</p></article><article class="module-card"><h3>Ventas año</h3><strong>${formatUSD(f.year || data.salesTotal)}</strong><p>Acumulado visible.</p></article><article class="module-card"><h3>Cliente top</h3><strong>${safe(topCustomer?.name || 'Pendiente')}</strong><p>${topCustomer ? formatUSD(topCustomer.totalSpent) : 'Sin datos visibles'}.</p></article><article class="module-card"><h3>Clientes VIP</h3><strong>${formatNumber(profiles.filter(p=>p.segment==='VIP').length)}</strong><p>Segmento premium.</p></article><article class="module-card"><h3>Stock crítico</h3><strong>${formatNumber(products.low.length + products.zero.length)}</strong><p>Bajo + agotado.</p></article><article class="module-card"><h3>Ticket promedio</h3><strong>${formatUSD(f.average)}</strong><p>Pedidos visibles.</p></article></div><div class="main-grid" style="margin-top:18px"><article class="panel"><div class="panel-head"><h3>Productos / rotación</h3><span class="tag">BI</span></div><div class="table">${renderV2Table([topProducts].filter(Boolean),'Sin productos visibles')}</div></article><article class="panel"><div class="panel-head"><h3>Pedidos por estado</h3><span class="tag">BI</span></div><div class="table">${renderV2Table([statuses].filter(Boolean),'Sin estados visibles')}</div></article></div><article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Exportación ejecutiva</h3><button onclick="exportCSV('executive')">Exportar CSV</button></div><p class="staff-help">Exporta datos visibles de Enterprise. No modifica ni sincroniza datos.</p></article>`;
  }

  function renderV5Settings(){
    const el = qs('settings'); if(!el) return;
    el.innerHTML = `<article class="panel safe-panel v5-hero"><div class="panel-head"><h3>Seguridad y activación Enterprise V5</h3><span class="tag safe-tag">Completa · modo seguro</span></div><p class="staff-help">V5 completa CRM, BI, Finanzas, Inventario, Marketing Center y Staff Manager sin tocar la operación actual de ThinkStore.</p></article><div class="module-grid v3-kpis"><article class="module-card"><h3>CRM Completo</h3><strong>Activo</strong><p>Ficha cliente, segmentos y valor.</p></article><article class="module-card"><h3>BI Completo</h3><strong>Activo</strong><p>KPIs, top clientes/productos y estados.</p></article><article class="module-card"><h3>Finanzas</h3><strong>Activo</strong><p>Ventas por periodo y ticket promedio.</p></article><article class="module-card"><h3>Inventario Pro</h3><strong>Activo</strong><p>Alertas, agotados y rotación preparada.</p></article><article class="module-card"><h3>Marketing Center</h3><strong>Preparado</strong><p>Audiencias sin envío ni Resend.</p></article><article class="module-card"><h3>Panel actual</h3><strong>Respaldo</strong><p>ThinkStore principal queda intacto.</p></article></div><article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Blindaje aplicado</h3><span class="tag">V5</span></div><div class="table"><div class="table-row"><div><b>Sin escrituras en pedidos</b><br><small>No cambia estados, pagos, preórdenes ni notas de entrega.</small></div><span>Seguro</span><i class="tag">OK</i></div><div class="table-row"><div><b>Resend intacto</b><br><small>No toca API keys, dominios ni plantillas.</small></div><span>Intacto</span><i class="tag">OK</i></div><div class="table-row"><div><b>Modo lectura</b><br><small>CRM, BI, inventario, finanzas y marketing solo consultan información visible.</small></div><span>Activo</span><i class="tag">OK</i></div></div></article>`;
  }

  const previousLoad = window.loadEnterpriseV1Real || loadEnterpriseV1Real;
  window.loadEnterpriseV1Real = loadEnterpriseV1Real = async function(){
    const data = await previousLoad();
    if(!data) return data;
    try{
      const [ordersFull, customersFull, productsFull, paymentsFull, orderItems] = await Promise.all([
        v5ReadTables(['orders','pedidos'], 500),
        v5ReadTables(['customers','clientes'], 500),
        v5ReadTables(['products','productos'], 500),
        v5ReadTables(['comprobantes','payments','pagos'], 300),
        v5ReadTables(['order_items','pedido_items'], 500)
      ]);
      if(ordersFull.data.length){ data.recentOrders = ordersFull.data; data.tables.orders = data.tables.orders || ordersFull.table; data.counts.orders = Math.max(data.counts.orders || 0, ordersFull.data.length); }
      if(customersFull.data.length){ data.recentCustomers = customersFull.data; data.tables.customers = data.tables.customers || customersFull.table; data.counts.customers = Math.max(data.counts.customers || 0, customersFull.data.length); }
      if(productsFull.data.length){ data.products = productsFull.data; data.tables.products = data.tables.products || productsFull.table; data.counts.products = Math.max(data.counts.products || 0, productsFull.data.length); }
      if(paymentsFull.data.length){ data.recentPayments = paymentsFull.data; data.tables.payments = data.tables.payments || paymentsFull.table; data.counts.payments = Math.max(data.counts.payments || 0, paymentsFull.data.length); }
      data.orderItems = orderItems.data || [];
      data.tables.orderItems = orderItems.table;
      data.version = 'V5';
      const f = v5Finance(data);
      data.salesTotal = f.month || f.total || data.salesTotal;
      updateExecutiveReal(data);
      renderCommercialControl(data);
      renderV5CRM(data);
      renderV5Finance(data);
      renderV5Inventory(data);
      renderV5Marketing(data);
      renderV5BI(data);
    }catch(error){ console.warn('[Enterprise V5] Refuerzo de datos:', error.message || error); }
    return data;
  };

  const previousSwitch = window.switchView || switchView;
  window.switchView = switchView = function(id){
    previousSwitch(id);
    if(!enterpriseRealCache) return;
    if(id === 'clients') renderV5CRM(enterpriseRealCache);
    if(id === 'finance') renderV5Finance(enterpriseRealCache);
    if(id === 'inventory') renderV5Inventory(enterpriseRealCache);
    if(id === 'marketing') renderV5Marketing(enterpriseRealCache);
    if(id === 'reports') renderV5BI(enterpriseRealCache);
    if(id === 'settings') renderV5Settings();
  };
})();

/* ==========================================================
   Enterprise V6 · Centro de Soporte + Cliente 360
   - Conecta Enterprise con soporte.thinkstore.com.ve en modo seguro
   - Solo lectura sobre service_orders / service_order_notes / service_users
   - No modifica Resend, pedidos, comprobantes, notas de entrega ni estados
   ========================================================== */
const V6_TABLES = {
  serviceOrders: ['service_orders','ordenes_servicio','support_orders','repair_orders'],
  serviceNotes: ['service_order_notes','bitacora_servicio','service_notes','repair_notes'],
  serviceUsers: ['service_users','support_users'],
  customers: ['clientes','customers'],
  orders: ['pedidos','orders'],
  payments: ['comprobantes','payments','payment_receipts'],
  products: ['productos','products','catalogo']
};
let enterpriseV6Cache = null;

async function readFirstAvailable(tableNames, options={}){
  const client = getClient();
  const names = Array.isArray(tableNames) ? tableNames : [tableNames];
  const limit = options.limit ?? 80;
  const select = options.select || '*';
  const orderBy = options.orderBy || 'created_at';
  for(const tableName of names){
    try{
      let query = client.from(tableName).select(select).limit(limit);
      if(options.order !== false){ query = query.order(orderBy, { ascending:false }); }
      const { data, error } = await query;
      if(error) throw error;
      return { table:tableName, data:data || [], error:null };
    }catch(error){
      console.warn(`V6: no se pudo leer ${tableName}:`, error.message || error);
    }
  }
  return { table:null, data:[], error:'No disponible o sin permisos RLS' };
}
async function countFirstAvailable(tableNames){
  const names = Array.isArray(tableNames) ? tableNames : [tableNames];
  for(const tableName of names){
    try{
      const { count, error } = await getClient().from(tableName).select('*', { count:'exact', head:true });
      if(error) throw error;
      return { table:tableName, count:count || 0 };
    }catch(error){ console.warn(`V6 count ${tableName}:`, error.message || error); }
  }
  return { table:null, count:0 };
}
function supportCode(row){ return pick(row,['code','codigo','order_code','numero','id']) || 'Orden'; }
function supportClient(row){ return pick(row,['client_name','cliente','customer_name','nombre']) || 'Cliente'; }
function supportEmail(row){ return pick(row,['client_email','email','correo','customer_email']) || ''; }
function supportPhone(row){ return pick(row,['client_phone','telefono','phone','whatsapp']) || ''; }
function supportDevice(row){
  const type = pick(row,['device_type','tipo_equipo','type']) || '';
  const model = pick(row,['device_model','modelo','model','device']) || 'Equipo';
  return `${type ? type + ' · ' : ''}${model}`;
}
function supportIssue(row){ return pick(row,['reported_issue','falla','issue','diagnostico','description']) || 'Sin detalle'; }
function supportStatus(row){ return pick(row,['status','estado','estatus']) || 'Sin estado'; }
function supportDate(row){ return pick(row,['created_at','fecha','date','updated_at']) || ''; }
function supportWarrantyDays(row){
  const raw = pick(row,['warranty_days','garantia_dias','warranty','garantia']);
  const n = Number(String(raw ?? '').replace(/[^0-9.-]/g,''));
  return Number.isFinite(n) ? n : 0;
}
function daysSince(value){
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
function statusMatches(value, terms){
  const st = normalizeStatus(value);
  return terms.some(t => st.includes(normalizeStatus(t)));
}
function isSupportDelayed(row){
  const status = supportStatus(row);
  if(statusMatches(status, ['Entregado','Cancelado','No aprobado'])) return false;
  const days = daysSince(supportDate(row));
  return days !== null && days >= 5;
}
function isWarrantyActive(row){
  const days = supportWarrantyDays(row);
  const created = new Date(supportDate(row));
  if(!days || Number.isNaN(created.getTime())) return false;
  const expires = new Date(created.getTime() + days * 86400000);
  return Date.now() <= expires.getTime();
}
function warrantyExpires(row){
  const days = supportWarrantyDays(row);
  const created = new Date(supportDate(row));
  if(!days || Number.isNaN(created.getTime())) return 'Sin fecha';
  return new Date(created.getTime() + days * 86400000).toLocaleDateString('es-VE');
}
function customerKey(row){
  return String(supportEmail(row) || rowCustomerEmail(row) || v2CustomerEmail(row) || supportPhone(row) || v2CustomerPhone(row) || supportClient(row) || v2CustomerName(row)).toLowerCase().trim();
}
function buildCustomer360(customers=[], orders=[], serviceOrders=[]){
  const map = new Map();
  function ensure(key, base={}){
    const id = key || String(base.email || base.phone || base.name || Math.random());
    if(!map.has(id)) map.set(id, { key:id, name:base.name || 'Cliente', email:base.email || '', phone:base.phone || '', orders:[], services:[], total:0, lastDate:null });
    const item = map.get(id);
    if(base.name && item.name === 'Cliente') item.name = base.name;
    if(base.email && !item.email) item.email = base.email;
    if(base.phone && !item.phone) item.phone = base.phone;
    return item;
  }
  customers.forEach(c=>{
    const base = { name:v2CustomerName(c), email:v2CustomerEmail(c), phone:v2CustomerPhone(c) };
    ensure(String(base.email || base.phone || base.name).toLowerCase(), base);
  });
  orders.forEach(o=>{
    const base = { name:rowCustomerName(o), email:rowCustomerEmail(o), phone:pick(o,['telefono','phone','whatsapp']) || '' };
    const item = ensure(String(base.email || base.phone || base.name).toLowerCase(), base);
    item.orders.push(o);
    item.total += orderTotal(o);
    const dt = new Date(rowDate(o));
    if(!Number.isNaN(dt.getTime()) && (!item.lastDate || dt > item.lastDate)) item.lastDate = dt;
  });
  serviceOrders.forEach(s=>{
    const base = { name:supportClient(s), email:supportEmail(s), phone:supportPhone(s) };
    const item = ensure(String(base.email || base.phone || base.name).toLowerCase(), base);
    item.services.push(s);
    const dt = new Date(supportDate(s));
    if(!Number.isNaN(dt.getTime()) && (!item.lastDate || dt > item.lastDate)) item.lastDate = dt;
  });
  return Array.from(map.values()).sort((a,b)=>(b.total || 0) - (a.total || 0));
}
async function loadEnterpriseV6Support(){
  if(!window.supabaseClient) return;
  try{
    const [serviceRes, notesRes, techRes, customersRes, ordersRes, paymentsRes, productsCount] = await Promise.all([
      readFirstAvailable(V6_TABLES.serviceOrders, { limit:120 }),
      readFirstAvailable(V6_TABLES.serviceNotes, { limit:80 }),
      readFirstAvailable(V6_TABLES.serviceUsers, { limit:60 }),
      readFirstAvailable(V6_TABLES.customers, { limit:120 }),
      readFirstAvailable(V6_TABLES.orders, { limit:120 }),
      readFirstAvailable(V6_TABLES.payments, { limit:80 }),
      countFirstAvailable(V6_TABLES.products)
    ]);
    const data = {
      serviceTable: serviceRes.table,
      notesTable: notesRes.table,
      serviceUsersTable: techRes.table,
      serviceOrders: serviceRes.data,
      notes: notesRes.data,
      serviceUsers: techRes.data,
      customers: customersRes.data,
      orders: ordersRes.data,
      payments: paymentsRes.data,
      productsCount: productsCount.count,
      productsTable: productsCount.table
    };
    enterpriseV6Cache = data;
    renderV6Support(data);
    renderV6Client360(data);
    renderV6Warranties(data);
    renderV6Alerts(data);
    renderV6ExecutiveSummary(data);
  }catch(error){
    console.error('V6 soporte:', error);
    ['support','client360','warranties','alerts'].forEach(id=>{
      const el = qs(id);
      if(el) el.innerHTML = `<article class="panel"><div class="panel-head"><h3>Enterprise V6</h3><span class="tag">Error</span></div><p class="staff-help">No se pudo cargar V6: ${safe(error.message || error)}. No se modificó ninguna tabla.</p></article>`;
    });
  }
}
function renderV6ExecutiveSummary(data){
  const delayed = data.serviceOrders.filter(isSupportDelayed).length;
  const activeSupport = data.serviceOrders.filter(o=>!statusMatches(supportStatus(o), ['Entregado','Cancelado','No aprobado'])).length;
  const ready = data.serviceOrders.filter(o=>statusMatches(supportStatus(o), ['Listo para entregar','Listo'])).length;
  const pendingPayments = data.payments.filter(isPendingPayment).length;
  const statusEl = qs('statusList');
  if(statusEl){
    statusEl.innerHTML = [
      ['✓','Enterprise V6','Centro de Soporte activo'],
      ['↗','Soporte abierto',`${activeSupport} órdenes`],
      ['⚠','Equipos retrasados',`${delayed} alertas`],
      ['▣','Listos para entrega',`${ready} equipos`],
      ['◇','Pagos pendientes',`${pendingPayments} comprobantes`]
    ].map(([i,n,s])=>`<div class="status-row"><i>${i}</i><b>${n}</b><span>${s}</span></div>`).join('');
  }
}
function renderV6Support(data){
  const el = qs('support'); if(!el) return;
  const orders = data.serviceOrders || [];
  const open = orders.filter(o=>!statusMatches(supportStatus(o), ['Entregado','Cancelado','No aprobado']));
  const diagnosis = orders.filter(o=>statusMatches(supportStatus(o), ['Diagnóstico','diagnostico']));
  const repair = orders.filter(o=>statusMatches(supportStatus(o), ['reparación','reparacion','aprobado']));
  const ready = orders.filter(o=>statusMatches(supportStatus(o), ['Listo para entregar','Listo']));
  const delayed = orders.filter(isSupportDelayed);
  const recent = orders.slice(0,10).map(o=>`
    <div class="table-row v6-row">
      <div><b>${safe(supportCode(o))}</b><br><small>${safe(supportClient(o))} · ${safe(supportDevice(o))}</small></div>
      <span class="status-dot ${v2StatusClass(supportStatus(o))}">${safe(supportStatus(o))}</span>
      <i class="tag">${safe(v2Date(supportDate(o)))}</i>
    </div>`).join('');
  el.innerHTML = `
    <article class="panel v6-hero">
      <div class="panel-head"><h3>Centro de Soporte integrado</h3><span class="tag safe-tag">Solo lectura · soporte.thinkstore.com.ve</span></div>
      <p class="staff-help">Enterprise V6 lee el estado del centro de soporte para llevar control ejecutivo. No cambia estados, no modifica bitácoras y no toca correos de soporte.</p>
      <div class="v2-toolbar"><button onclick="window.open('https://soporte.thinkstore.com.ve','_blank','noopener')">Abrir Soporte Técnico</button><button onclick="loadEnterpriseV6Support()">Actualizar</button></div>
    </article>
    <div class="module-grid control-cards">
      <article class="module-card"><h3>Órdenes soporte</h3><strong>${formatNumber(orders.length)}</strong><p>Fuente: ${safe(data.serviceTable || 'service_orders no disponible')}</p></article>
      <article class="module-card"><h3>Abiertas</h3><strong>${formatNumber(open.length)}</strong><p>En recepción, diagnóstico, reparación o logística.</p></article>
      <article class="module-card"><h3>Diagnóstico</h3><strong>${formatNumber(diagnosis.length)}</strong><p>Equipos esperando revisión técnica.</p></article>
      <article class="module-card"><h3>En reparación</h3><strong>${formatNumber(repair.length)}</strong><p>Aprobados o en proceso técnico.</p></article>
      <article class="module-card"><h3>Listos</h3><strong>${formatNumber(ready.length)}</strong><p>Preparados para entregar al cliente.</p></article>
      <article class="module-card"><h3>Retrasados</h3><strong>${formatNumber(delayed.length)}</strong><p>Más de 5 días sin entrega final.</p></article>
    </div>
    <div class="main-grid" style="margin-top:18px">
      <article class="panel"><div class="panel-head"><h3>Órdenes recientes</h3><span class="tag">V6</span></div><div class="table">${recent || '<div class="table-row"><div><b>Sin órdenes visibles</b><br><small>Si soporte usa localStorage o RLS bloquea service_orders, Enterprise mostrará el enlace directo a Soporte.</small></div><span></span><i class="tag">Info</i></div>'}</div></article>
      <article class="panel"><div class="panel-head"><h3>Bitácora / técnicos</h3></div><div class="table">
        <div class="table-row"><div><b>Notas técnicas</b><br><small>${safe(data.notesTable || 'service_order_notes no disponible')}</small></div><span>${formatNumber(data.notes.length)}</span><i class="tag">Notas</i></div>
        <div class="table-row"><div><b>Usuarios soporte</b><br><small>${safe(data.serviceUsersTable || 'service_users no disponible')}</small></div><span>${formatNumber(data.serviceUsers.length)}</span><i class="tag">Equipo</i></div>
        <div class="table-row"><div><b>Modo de integración</b><br><small>Lectura ejecutiva sin escribir en Soporte.</small></div><span>Seguro</span><i class="tag safe-tag">OK</i></div>
      </div></article>
    </div>`;
}
function renderV6Client360(data){
  const el = qs('client360'); if(!el) return;
  const list = buildCustomer360(data.customers, data.orders, data.serviceOrders).slice(0,12);
  const rows = list.map(c=>`
    <div class="table-row v6-row">
      <div><b>${safe(c.name)}</b><br><small>${safe(c.email || c.phone || 'Sin contacto')} · Último movimiento: ${c.lastDate ? c.lastDate.toLocaleDateString('es-VE') : '—'}</small></div>
      <span>${formatNumber(c.orders.length)} pedidos · ${formatNumber(c.services.length)} soporte</span>
      <i class="tag">${c.total >= 2000 ? 'VIP' : c.orders.length >= 2 ? 'Frecuente' : 'Cliente'}</i>
    </div>`).join('');
  el.innerHTML = `
    <article class="panel v6-hero"><div class="panel-head"><h3>Cliente 360</h3><span class="tag safe-tag">Compras + soporte + garantías</span></div><p class="staff-help">Vista consolidada del cliente. Cruza clientes, pedidos y órdenes de soporte por correo, teléfono o nombre. Solo lectura.</p></article>
    <div class="module-grid control-cards">
      <article class="module-card"><h3>Clientes unificados</h3><strong>${formatNumber(list.length)}</strong><p>Base visible combinada.</p></article>
      <article class="module-card"><h3>Con compras</h3><strong>${formatNumber(list.filter(c=>c.orders.length).length)}</strong><p>Clientes con historial comercial.</p></article>
      <article class="module-card"><h3>Con soporte</h3><strong>${formatNumber(list.filter(c=>c.services.length).length)}</strong><p>Clientes con equipos en soporte.</p></article>
    </div>
    <article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Ficha 360 resumida</h3><button onclick="loadEnterpriseV6Support()">Actualizar</button></div><div class="table">${rows || '<div class="table-row"><div><b>Sin clientes para cruzar</b><br><small>Cuando existan clientes/pedidos/soporte visibles, aparecerán aquí.</small></div><span></span><i class="tag">Info</i></div>'}</div></article>`;
}
function renderV6Warranties(data){
  const el = qs('warranties'); if(!el) return;
  const warrantyRows = data.serviceOrders.filter(o=>supportWarrantyDays(o) > 0).slice(0,12);
  const active = warrantyRows.filter(isWarrantyActive);
  const expired = warrantyRows.filter(o=>!isWarrantyActive(o));
  const rows = warrantyRows.map(o=>`
    <div class="table-row v6-row">
      <div><b>${safe(supportClient(o))}</b><br><small>${safe(supportDevice(o))} · ${safe(supportCode(o))}</small></div>
      <span>${formatNumber(supportWarrantyDays(o))} días · vence ${safe(warrantyExpires(o))}</span>
      <i class="tag ${isWarrantyActive(o) ? 'safe-tag' : ''}">${isWarrantyActive(o) ? 'Activa' : 'Vencida'}</i>
    </div>`).join('');
  el.innerHTML = `
    <article class="panel v6-hero"><div class="panel-head"><h3>Garantías</h3><span class="tag safe-tag">Preparado para servicio + ventas</span></div><p class="staff-help">Control visual de garantías asociadas a órdenes de soporte. No modifica fechas, estados ni notas.</p></article>
    <div class="module-grid control-cards">
      <article class="module-card"><h3>Garantías detectadas</h3><strong>${formatNumber(warrantyRows.length)}</strong><p>Órdenes con días de garantía.</p></article>
      <article class="module-card"><h3>Activas</h3><strong>${formatNumber(active.length)}</strong><p>Dentro del período estimado.</p></article>
      <article class="module-card"><h3>Vencidas</h3><strong>${formatNumber(expired.length)}</strong><p>Fuera del período estimado.</p></article>
    </div>
    <article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Garantías por equipo</h3></div><div class="table">${rows || '<div class="table-row"><div><b>Sin garantías visibles</b><br><small>Cuando soporte registre warranty_days, aparecerán aquí.</small></div><span></span><i class="tag">Info</i></div>'}</div></article>`;
}
function renderV6Alerts(data){
  const el = qs('alerts'); if(!el) return;
  const pendingPayments = data.payments.filter(isPendingPayment);
  const delayed = data.serviceOrders.filter(isSupportDelayed);
  const ready = data.serviceOrders.filter(o=>statusMatches(supportStatus(o), ['Listo para entregar','Listo']));
  const activeWarranties = data.serviceOrders.filter(isWarrantyActive);
  const rows = [
    ['Pagos pendientes', `${pendingPayments.length} comprobantes`, 'Revisar desde panel actual para no romper validación.', 'warn'],
    ['Equipos retrasados', `${delayed.length} órdenes`, 'Más de 5 días sin entrega final.', delayed.length ? 'bad' : 'ok'],
    ['Equipos listos', `${ready.length} para entregar`, 'Oportunidad de cierre y entrega.', 'info'],
    ['Garantías activas', `${activeWarranties.length} equipos`, 'Control postventa.', 'ok'],
    ['Productos visibles', `${data.productsCount} registros`, data.productsTable ? `Fuente: ${data.productsTable}` : 'Inventario no conectado todavía.', 'info'],
    ['Correos automáticos', 'Intactos', 'Resend no se toca en V6.', 'ok']
  ].map(([title,value,desc,kind])=>`
    <div class="table-row v6-row"><div><b>${safe(title)}</b><br><small>${safe(desc)}</small></div><span class="status-dot ${kind}">${safe(value)}</span><i class="tag">V6</i></div>`).join('');
  el.innerHTML = `
    <article class="panel v6-hero"><div class="panel-head"><h3>Centro de Alertas</h3><span class="tag safe-tag">Operación ejecutiva</span></div><p class="staff-help">Alertas consolidadas de ventas, soporte, garantías e inventario. Todo en modo lectura.</p></article>
    <article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Alertas activas</h3><button onclick="loadEnterpriseV6Support()">Actualizar</button></div><div class="table">${rows}</div></article>`;
}
window.loadEnterpriseV6Support = loadEnterpriseV6Support;

/* ==========================================================
   Enterprise V7 + V8 · Finanzas avanzadas + ThinkStore AI
   - Modo seguro: solo lectura y recomendaciones visuales
   - No modifica Resend, correos, pedidos, comprobantes ni notas
   ========================================================== */
(function(){
  titles.financeAdvanced = ["Finanzas Avanzadas", "Flujo de caja, metas, margen estimado y ranking comercial en modo lectura."];
  titles.ai = ["ThinkStore AI", "Recomendaciones inteligentes sobre clientes, inventario, ventas y soporte sin modificar datos."];

  const DAY = 24 * 60 * 60 * 1000;
  const now = () => new Date();
  const startOfDay = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
  const startOfWeek = () => { const d = startOfDay(); const day = (d.getDay()+6)%7; d.setDate(d.getDate()-day); return d; };
  const startOfMonth = () => { const d = startOfDay(); d.setDate(1); return d; };
  const startOfYear = () => { const d = startOfDay(); d.setMonth(0,1); return d; };
  const toDate = (value) => { const d = new Date(value || ''); return Number.isNaN(d.getTime()) ? null : d; };
  const after = (value, start) => { const d = toDate(value); return d ? d >= start : false; };
  const pct = (value, total) => total ? Math.min(100, Math.max(0, Math.round((Number(value || 0) / Number(total || 1)) * 100))) : 0;

  function v78OrderDate(o){ return rowDate(o) || pick(o, ['fecha_creacion','createdAt','created','order_date']); }
  function v78OrderStatus(o){ return pick(o, ['estado','status','estatus','payment_status']) || 'Sin estado'; }
  function v78Email(value){ return String(value || '').trim().toLowerCase(); }
  function v78CustomerEmailFromOrder(o){ return v78Email(rowCustomerEmail(o) || pick(o, ['correo','email','customer_email','cliente_email'])); }
  function v78CustomerEmail(c){ return v78Email(pick(c, ['correo','email','customer_email']) || ''); }
  function v78CustomerName(c){ return pick(c, ['nombre','name','full_name','cliente','display_name']) || 'Cliente'; }

  function v78BuildProfiles(data){
    const map = new Map();
    (data?.recentCustomers || []).forEach(c=>{
      const key = v78CustomerEmail(c) || `cliente-${pick(c, ['id','uid']) || Math.random()}`;
      if(!map.has(key)) map.set(key, { key, name:v78CustomerName(c), email:v78CustomerEmail(c) || 'Sin correo', orders:[], total:0, last:null, created:rowDate(c), segment:'Registrado' });
    });
    (data?.recentOrders || []).forEach(o=>{
      const key = v78CustomerEmailFromOrder(o) || `pedido-${pick(o, ['id','codigo','code']) || Math.random()}`;
      if(!map.has(key)) map.set(key, { key, name:rowCustomerName(o), email:v78CustomerEmailFromOrder(o) || 'Sin correo', orders:[], total:0, last:null, created:v78OrderDate(o), segment:'Cliente' });
      const p = map.get(key);
      const amount = orderTotal(o);
      const d = toDate(v78OrderDate(o));
      p.orders.push(o);
      p.total += amount;
      if(d && (!p.last || d > p.last)) p.last = d;
    });
    return Array.from(map.values()).map(p=>{
      const days = p.last ? Math.floor((Date.now() - p.last.getTime()) / DAY) : null;
      if(p.total >= 1200 || p.orders.length >= 4) p.segment = 'VIP';
      else if(days !== null && days > 90) p.segment = 'Inactivo';
      else if(p.orders.length >= 2) p.segment = 'Frecuente';
      else if(p.orders.length === 1) p.segment = 'Nuevo comprador';
      p.days = days;
      p.avg = p.orders.length ? p.total / p.orders.length : 0;
      return p;
    }).sort((a,b)=> b.total - a.total || b.orders.length - a.orders.length);
  }

  function v78Finance(data){
    const orders = data?.recentOrders || [];
    const sum = rows => rows.reduce((total,o)=>total + orderTotal(o), 0);
    const todayRows = orders.filter(o=>after(v78OrderDate(o), startOfDay()));
    const weekRows = orders.filter(o=>after(v78OrderDate(o), startOfWeek()));
    const monthRows = orders.filter(o=>after(v78OrderDate(o), startOfMonth()));
    const yearRows = orders.filter(o=>after(v78OrderDate(o), startOfYear()));
    const total = sum(orders);
    const pendingRows = orders.filter(isPendingPayment);
    const pending = sum(pendingRows);
    const preorders = orders.filter(o=>normalizeStatus(v78OrderStatus(o)).includes('preorden') || normalizeStatus(v78OrderStatus(o)).includes('preorder'));
    const preorderValue = sum(preorders);
    const month = sum(monthRows) || Number(data?.salesTotal || 0);
    const estimatedGrossMargin = month * 0.28;
    const estimatedNetMargin = month * 0.18;
    return { today:sum(todayRows), week:sum(weekRows), month, year:sum(yearRows) || total, total, pending, pendingCount:pendingRows.length, preorderValue, preorderCount:preorders.length, average:orders.length ? total / orders.length : 0, estimatedGrossMargin, estimatedNetMargin, ordersCount:orders.length };
  }

  function v78ProductInsights(data){
    const products = data?.products || [];
    const items = data?.orderItems || [];
    const sold = new Map();
    items.forEach(item=>{
      const name = pick(item, ['producto','producto_nombre','product_name','nombre','name','title','titulo','modelo','model']) || 'Producto';
      const qty = Number(pick(item, ['cantidad','qty','quantity','unidades']) || 1) || 1;
      sold.set(name, (sold.get(name) || 0) + qty);
    });
    const topSold = Array.from(sold.entries()).sort((a,b)=>b[1]-a[1]);
    const low = products.filter(p=>{ const s=v2ProductStock(p); return s !== null && s > 0 && s <= 2; });
    const zero = products.filter(p=>{ const s=v2ProductStock(p); return s !== null && s <= 0; });
    const premium = products.slice().sort((a,b)=>v2ProductPrice(b)-v2ProductPrice(a)).slice(0,8);
    const categories = new Map();
    products.forEach(p=>{
      const cat = v2ProductCategory(p);
      categories.set(cat, (categories.get(cat) || 0) + 1);
    });
    return { topSold, low, zero, premium, categories:Array.from(categories.entries()).sort((a,b)=>b[1]-a[1]) };
  }

  function renderProgress(label, value, goal){
    const p = pct(value, goal);
    return `<div class="table-row v7-row"><div><b>${safe(label)}</b><br><small>${formatUSD(value)} de ${formatUSD(goal)}</small></div><span>${p}%</span><i class="tag">Meta</i></div><div class="goalbar"><i style="width:${p}%"></i></div>`;
  }

  function renderFinanceAdvanced(data){
    const el = qs('financeAdvanced'); if(!el) return;
    const f = v78Finance(data || enterpriseRealCache || {});
    const monthGoal = 15000;
    const quarterGoal = 45000;
    const annualGoal = 180000;
    const categories = v78ProductInsights(data || enterpriseRealCache || {}).categories.slice(0,8).map(([name,count])=>`<div class="table-row v7-row"><div><b>${safe(name)}</b><br><small>Categoría visible en catálogo.</small></div><span>${formatNumber(count)} productos</span><i class="tag">Categoría</i></div>`).join('');
    const cashRows = [
      ['Entradas visibles', f.month, 'Pedidos visibles del mes actual', 'ok'],
      ['Cobranza pendiente', f.pending, `${f.pendingCount} registros por revisar`, f.pendingCount ? 'warn' : 'ok'],
      ['Preórdenes comprometidas', f.preorderValue, `${f.preorderCount} preórdenes visibles`, 'info'],
      ['Margen bruto estimado', f.estimatedGrossMargin, 'Estimación visual 28%; no modifica costos.', 'ok'],
      ['Margen neto estimado', f.estimatedNetMargin, 'Estimación visual 18%; preparar costos reales en V7.2.', 'info']
    ].map(([title,value,desc,kind])=>`<div class="table-row v7-row"><div><b>${safe(title)}</b><br><small>${safe(desc)}</small></div><span class="status-dot ${kind}">${formatUSD(value)}</span><i class="tag">V7</i></div>`).join('');
    el.innerHTML = `
      <article class="panel safe-panel v7-hero"><div class="panel-head"><h3>Centro Financiero Avanzado</h3><span class="tag safe-tag">V7 · solo lectura</span></div><p class="staff-help">Flujo de caja, metas, margen estimado y ranking comercial. No valida pagos, no cambia estados, no toca comprobantes, notas ni Resend.</p></article>
      <div class="module-grid v3-kpis">
        <article class="module-card"><h3>Ventas hoy</h3><strong>${formatUSD(f.today)}</strong><p>Pedidos visibles del día.</p></article>
        <article class="module-card"><h3>Ventas semana</h3><strong>${formatUSD(f.week)}</strong><p>Desde el lunes actual.</p></article>
        <article class="module-card"><h3>Ventas mes</h3><strong>${formatUSD(f.month)}</strong><p>Indicador principal V7.</p></article>
        <article class="module-card"><h3>Ventas año</h3><strong>${formatUSD(f.year)}</strong><p>Acumulado visible.</p></article>
        <article class="module-card"><h3>Ticket promedio</h3><strong>${formatUSD(f.average)}</strong><p>Promedio por pedido visible.</p></article>
        <article class="module-card"><h3>Pagos pendientes</h3><strong>${formatUSD(f.pending)}</strong><p>${formatNumber(f.pendingCount)} por revisar.</p></article>
      </div>
      <div class="main-grid" style="margin-top:18px">
        <article class="panel"><div class="panel-head"><h3>Flujo de caja ejecutivo</h3><span class="tag">Estimado</span></div><div class="table">${cashRows}</div></article>
        <article class="panel"><div class="panel-head"><h3>Metas comerciales</h3><span class="tag">V7</span></div><div class="table">${renderProgress('Meta mensual', f.month, monthGoal)}${renderProgress('Meta trimestral', f.month * 3, quarterGoal)}${renderProgress('Meta anual', f.year, annualGoal)}</div></article>
      </div>
      <article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Rentabilidad por categoría preparada</h3><span class="tag">Sin costos todavía</span></div><div class="table">${categories || '<div class="table-row"><div><b>Categorías pendientes</b><br><small>Cuando el catálogo tenga categorías visibles, aparecerán aquí.</small></div><span>—</span><i class="tag">Info</i></div>'}</div></article>`;
  }

  function buildAIRecommendations(data){
    const profiles = v78BuildProfiles(data || {});
    const finance = v78Finance(data || {});
    const products = v78ProductInsights(data || {});
    const support = window.enterpriseV6Cache || enterpriseV6Cache || null;
    const delayedSupport = support?.serviceOrders ? support.serviceOrders.filter(isSupportDelayed).length : 0;
    const inactive = profiles.filter(p=>p.segment === 'Inactivo');
    const vip = profiles.filter(p=>p.segment === 'VIP');
    const topCustomer = profiles[0];
    const topProduct = products.topSold[0]?.[0] || products.premium[0] && v2ProductName(products.premium[0]);
    const recs = [];
    recs.push({kind: products.zero.length || products.low.length ? 'bad':'ok', title:'Reposición inteligente', value:`${products.zero.length + products.low.length} productos críticos`, detail: products.zero.length || products.low.length ? 'Revisar agotados y stock bajo antes de campañas.' : 'No se detectó stock crítico visible.'});
    recs.push({kind: inactive.length ? 'warn':'ok', title:'Recuperación de clientes', value:`${inactive.length} inactivos`, detail:'Preparar campaña futura sin enviar correos todavía.'});
    recs.push({kind:'ok', title:'Clientes VIP', value:`${vip.length} detectados`, detail: vip.length ? 'Crear ofertas premium y preventas exclusivas.' : 'Aún no hay suficientes datos para VIP.'});
    recs.push({kind: finance.pendingCount ? 'warn':'ok', title:'Cobranza pendiente', value:`${finance.pendingCount} pagos`, detail:'Revisar desde el panel actual para mantener el flujo estable.'});
    recs.push({kind: delayedSupport ? 'bad':'ok', title:'Soporte retrasado', value:`${delayedSupport} alertas`, detail:'Priorizar equipos con más de 5 días sin entrega final.'});
    recs.push({kind:'info', title:'Producto recomendado', value: topProduct || 'Pendiente', detail: topProduct ? 'Úsalo como foco de campaña y reposición.' : 'Faltan items o productos visibles para recomendar.'});
    recs.push({kind:'info', title:'Cliente top', value: topCustomer?.name || 'Pendiente', detail: topCustomer ? `${formatUSD(topCustomer.total)} visibles en pedidos.` : 'Sin historial suficiente.'});
    return recs;
  }

  function renderThinkStoreAI(data){
    const el = qs('ai'); if(!el) return;
    const recs = buildAIRecommendations(data || enterpriseRealCache || {});
    const cards = recs.map(r=>`<div class="table-row v8-row"><div><b>${safe(r.title)}</b><br><small>${safe(r.detail)}</small></div><span class="status-dot ${r.kind}">${safe(r.value)}</span><i class="tag">AI</i></div>`).join('');
    const prompts = [
      '¿Qué producto debo reponer primero?',
      '¿Qué clientes debo recuperar esta semana?',
      '¿Cuál es mi mayor riesgo operativo?',
      '¿Qué segmento tiene más potencial?',
      '¿Qué debería revisar antes de lanzar una promoción?'
    ].map(q=>`<div class="table-row v8-row"><div><b>${safe(q)}</b><br><small>Pregunta preparada para ThinkStore AI. Respuesta basada en datos visibles de Supabase.</small></div><span>Disponible</span><i class="tag">Prompt</i></div>`).join('');
    el.innerHTML = `
      <article class="panel safe-panel v8-hero"><div class="panel-head"><h3>ThinkStore AI</h3><span class="tag safe-tag">V8 · recomendaciones</span></div><p class="staff-help">Motor de recomendaciones sobre ventas, clientes, inventario y soporte. En esta fase no escribe datos, no envía correos y no modifica pedidos.</p></article>
      <div class="module-grid v3-kpis">
        <article class="module-card"><h3>Recomendaciones</h3><strong>${formatNumber(recs.length)}</strong><p>Generadas con datos visibles.</p></article>
        <article class="module-card"><h3>Modo</h3><strong>Lectura</strong><p>Sin acciones automáticas.</p></article>
        <article class="module-card"><h3>Áreas</h3><strong>Ventas + CRM + Soporte</strong><p>Visión cruzada Enterprise.</p></article>
      </div>
      <div class="main-grid" style="margin-top:18px">
        <article class="panel"><div class="panel-head"><h3>Recomendaciones inteligentes</h3><button onclick="renderThinkStoreAI(enterpriseRealCache)">Actualizar</button></div><div class="table">${cards}</div></article>
        <article class="panel"><div class="panel-head"><h3>Preguntas rápidas</h3><span class="tag">Preparadas</span></div><div class="table">${prompts}</div></article>
      </div>
      <article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Protección V8</h3><span class="tag safe-tag">Seguro</span></div><div class="table"><div class="table-row"><div><b>Sin automatizaciones destructivas</b><br><small>ThinkStore AI solo recomienda; no envía correos, no valida pagos y no cambia estados.</small></div><span>Bloqueado</span><i class="tag">OK</i></div><div class="table-row"><div><b>Preparado para V8.2</b><br><small>Luego se puede conectar un asistente interno para preguntas con Supabase.</small></div><span>Listo</span><i class="tag">Next</i></div></div></article>`;
  }

  window.renderFinanceAdvanced = renderFinanceAdvanced;
  window.renderThinkStoreAI = renderThinkStoreAI;

  const previousLoad = window.loadEnterpriseV1Real || loadEnterpriseV1Real;
  window.loadEnterpriseV1Real = loadEnterpriseV1Real = async function(){
    const data = await previousLoad();
    if(data){
      try{
        renderFinanceAdvanced(data);
        renderThinkStoreAI(data);
      }catch(error){ console.warn('[Enterprise V7/V8] Render:', error.message || error); }
    }
    return data;
  };

  const previousSwitch = window.switchView || switchView;
  window.switchView = switchView = function(id){
    previousSwitch(id);
    if(!enterpriseRealCache) return;
    if(id === 'financeAdvanced') renderFinanceAdvanced(enterpriseRealCache);
    if(id === 'ai') renderThinkStoreAI(enterpriseRealCache);
  };
})();

/* ==========================================================
   Enterprise V9 · Ecosistema ThinkStore + datos reales por pantalla
   - Centro de Operaciones unificado
   - PWA para móviles/tabletas
   - Refuerzo de pantallas con datos visibles de Supabase
   - Soporte externo opcional vía support-config.js
   - Sin tocar Resend, correos, notas, pedidos ni panel actual
   ========================================================== */
(function(){
  const V9_TABLES = {
    customers: ['clientes','customers','profiles_clientes','usuarios_clientes'],
    orders: ['pedidos','orders','ordenes','compras'],
    orderItems: ['pedido_items','order_items','items_pedido'],
    payments: ['comprobantes','payments','payment_receipts','pagos'],
    products: ['productos','products','catalogo','inventory','inventario'],
    preorders: ['preordenes','preorders','orders_preorder','pre_orders'],
    orderHistory: ['order_status_history','historial_estados','pedido_historial'],
    serviceOrders: ['service_orders','ordenes_servicio','support_orders','repair_orders'],
    serviceNotes: ['service_order_notes','bitacora_servicio','service_notes','repair_notes'],
    serviceUsers: ['service_users','support_users'],
    staff: ['roles_usuarios','profiles'],
    invitations: ['staff_invitations']
  };

  let v9Cache = null;
  let externalSupportClient = null;

  function v9StatusKind(status){
    const st = normalizeStatus(status);
    if(st.includes('entreg') || st.includes('pagado') || st.includes('aprob') || st.includes('listo')) return 'ok';
    if(st.includes('pend') || st.includes('verif') || st.includes('diag') || st.includes('proceso') || st.includes('repar')) return 'warn';
    if(st.includes('cancel') || st.includes('rechaz') || st.includes('venc')) return 'bad';
    return 'info';
  }
  function v9Date(row){ return pick(row, ['created_at','fecha','date','updated_at','createdAt']) || ''; }
  function v9RecentDateLabel(value){
    if(!value) return 'Sin fecha';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('es-VE', {dateStyle:'short', timeStyle:'short'});
  }
  function v9MonthKey(value){
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 'Sin fecha' : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }
  function v9ThisMonth(value){
    const d = new Date(value); const n = new Date();
    return !Number.isNaN(d.getTime()) && d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  }
  function v9LastDays(value, days){
    const d = new Date(value);
    return !Number.isNaN(d.getTime()) && (Date.now() - d.getTime()) <= days * 86400000;
  }
  function v9Unique(arr){ return Array.from(new Set(arr.filter(Boolean))); }
  function v9AsRows(rows, empty='Sin datos visibles'){
    return rows && rows.length ? rows.join('') : `<div class="table-row"><div><b>${safe(empty)}</b><br><small>Puede ser una tabla vacía, RLS o un nombre diferente.</small></div><span>Solo lectura</span><i class="tag">Info</i></div>`;
  }
  function v9ActionButton(label, view){
    return `<button onclick="switchView('${view}')">${safe(label)}</button>`;
  }
  async function v9Read(tableNames, options={}){
    const client = options.client || getClient();
    const names = Array.isArray(tableNames) ? tableNames : [tableNames];
    const select = options.select || '*';
    const limit = options.limit ?? 150;
    for(const table of names){
      try{
        let query = client.from(table).select(select).limit(limit);
        if(options.order !== false){
          query = query.order(options.orderBy || 'created_at', { ascending: options.ascending ?? false });
        }
        let { data, error } = await query;
        if(error && options.order !== false){
          const retry = await client.from(table).select(select).limit(limit);
          data = retry.data; error = retry.error;
        }
        if(!error) return { table, data:data || [] };
        console.warn(`[Enterprise V9] Lectura ${table}:`, error.message || error);
      }catch(error){ console.warn(`[Enterprise V9] Lectura ${table}:`, error.message || error); }
    }
    return { table:null, data:[] };
  }
  async function v9Count(tableNames, client=getClient()){
    for(const table of (Array.isArray(tableNames) ? tableNames : [tableNames])){
      try{
        const { count, error } = await client.from(table).select('*', { count:'exact', head:true });
        if(!error) return { table, count:count || 0 };
      }catch(error){ console.warn(`[Enterprise V9] Conteo ${table}:`, error.message || error); }
    }
    return { table:null, count:0 };
  }
  function v9GetSupportClient(){
    const cfg = window.THINKSTORE_SUPPORT_SUPABASE;
    if(!cfg?.enabled || !cfg.url || !cfg.anonKey || !window.supabase) return null;
    if(!externalSupportClient){
      externalSupportClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    }
    return externalSupportClient;
  }

  async function v9LoadDataFromRPC(){
    try{
      const client = getClient();
      if(!client?.rpc) return null;
      const { data:snapshot, error } = await client.rpc('enterprise_dashboard_snapshot');
      if(error || !snapshot){
        console.warn('[Enterprise Data Bridge] RPC no disponible, usando lectura directa:', error?.message || error);
        return null;
      }
      const tables = snapshot.tables || {};
      const data = {
        version:'V9.5-DataBridge',
        bridge:'rpc',
        tables:{
          customers:tables.customers, orders:tables.orders, payments:tables.payments, products:tables.products,
          preorders:tables.preorders, orderItems:tables.orderItems, orderHistory:tables.orderHistory,
          staff:tables.staff, invitations:tables.invitations,
          support:tables.support, supportExternal:false,
          supportNotes:tables.supportNotes, supportUsers:tables.supportUsers
        },
        customers: Array.isArray(snapshot.customers) ? snapshot.customers : [],
        orders: Array.isArray(snapshot.orders) ? snapshot.orders : [],
        payments: Array.isArray(snapshot.payments) ? snapshot.payments : [],
        products: Array.isArray(snapshot.products) ? snapshot.products : [],
        preorders: Array.isArray(snapshot.preorders) ? snapshot.preorders : [],
        orderItems: Array.isArray(snapshot.orderItems) ? snapshot.orderItems : [],
        orderHistory: Array.isArray(snapshot.orderHistory) ? snapshot.orderHistory : [],
        staff: Array.isArray(snapshot.staff) ? snapshot.staff : [],
        invitations: Array.isArray(snapshot.invitations) ? snapshot.invitations : [],
        serviceOrders: Array.isArray(snapshot.serviceOrders) ? snapshot.serviceOrders : [],
        serviceNotes: Array.isArray(snapshot.serviceNotes) ? snapshot.serviceNotes : [],
        serviceUsers: Array.isArray(snapshot.serviceUsers) ? snapshot.serviceUsers : []
      };
      data.salesTotal = data.orders.reduce((s,o)=>s+orderTotal(o),0);
      data.salesMonth = data.orders.filter(o=>v9ThisMonth(v2OrderDate(o))).reduce((s,o)=>s+orderTotal(o),0);
      data.salesToday = data.orders.filter(o=>v9LastDays(v2OrderDate(o),1)).reduce((s,o)=>s+orderTotal(o),0);
      data.pendingOrders = data.orders.filter(o=>v9StatusKind(v2OrderStatus(o)) === 'warn').length;
      data.pendingPayments = data.orders.filter(isPendingPayment).length || data.payments.filter(isPendingPayment).length;
      data.lowStock = data.products.filter(p=>{ const stock = v2ProductStock(p); return stock !== null && stock <= 2; }).length;
      data.outOfStock = data.products.filter(p=>v2ProductStock(p) === 0).length;
      data.supportOpen = data.serviceOrders.filter(o=>!statusMatches(supportStatus(o), ['Entregado','Cancelado','No aprobado'])).length;
      data.supportReady = data.serviceOrders.filter(o=>statusMatches(supportStatus(o), ['Listo','Listo para entregar'])).length;
      data.supportDelayed = data.serviceOrders.filter(isSupportDelayed).length;
      data.preordersOpen = data.preorders.filter(o=>!statusMatches(v2OrderStatus(o), ['Entregado','Cancelado','Cerrado'])).length;
      v9Cache = data;
      window.enterpriseV9Cache = data;
      return data;
    }catch(error){
      console.warn('[Enterprise Data Bridge] Error RPC:', error.message || error);
      return null;
    }
  }

  async function v9LoadData(){
    const bridgeData = await v9LoadDataFromRPC();
    if(bridgeData) return bridgeData;
    const supportClient = v9GetSupportClient();
    const [customers, orders, payments, products, preorders, orderItems, history, staff, invitations, internalSupport, internalNotes, internalTechs, externalSupport] = await Promise.all([
      v9Read(V9_TABLES.customers, { limit:240 }),
      v9Read(V9_TABLES.orders, { limit:260 }),
      v9Read(V9_TABLES.payments, { limit:180 }),
      v9Read(V9_TABLES.products, { limit:220 }),
      v9Read(V9_TABLES.preorders, { limit:160 }),
      v9Read(V9_TABLES.orderItems, { limit:260 }),
      v9Read(V9_TABLES.orderHistory, { limit:180 }),
      v9Read(V9_TABLES.staff, { limit:120 }),
      v9Read(V9_TABLES.invitations, { limit:120 }),
      v9Read(V9_TABLES.serviceOrders, { limit:220 }),
      v9Read(V9_TABLES.serviceNotes, { limit:160 }),
      v9Read(V9_TABLES.serviceUsers, { limit:120 }),
      supportClient ? v9Read(V9_TABLES.serviceOrders, { client:supportClient, limit:220 }) : Promise.resolve({ table:null, data:[] })
    ]);
    const serviceSource = externalSupport.table ? externalSupport : internalSupport;
    const data = {
      version:'V9',
      tables:{
        customers:customers.table, orders:orders.table, payments:payments.table, products:products.table,
        preorders:preorders.table, orderItems:orderItems.table, orderHistory:history.table,
        staff:staff.table, invitations:invitations.table,
        support:serviceSource.table, supportExternal:!!externalSupport.table,
        supportNotes:internalNotes.table, supportUsers:internalTechs.table
      },
      customers: customers.data || [],
      orders: orders.data || [],
      payments: payments.data || [],
      products: products.data || [],
      preorders: preorders.data || [],
      orderItems: orderItems.data || [],
      orderHistory: history.data || [],
      staff: staff.data || [],
      invitations: invitations.data || [],
      serviceOrders: serviceSource.data || [],
      serviceNotes: internalNotes.data || [],
      serviceUsers: internalTechs.data || []
    };
    data.salesTotal = data.orders.reduce((s,o)=>s+orderTotal(o),0);
    data.salesMonth = data.orders.filter(o=>v9ThisMonth(v2OrderDate(o))).reduce((s,o)=>s+orderTotal(o),0);
    data.salesToday = data.orders.filter(o=>v9LastDays(v2OrderDate(o),1)).reduce((s,o)=>s+orderTotal(o),0);
    data.pendingOrders = data.orders.filter(o=>v9StatusKind(v2OrderStatus(o)) === 'warn').length;
    data.pendingPayments = data.orders.filter(isPendingPayment).length || data.payments.filter(isPendingPayment).length;
    data.lowStock = data.products.filter(p=>{ const stock = v2ProductStock(p); return stock !== null && stock <= 2; }).length;
    data.outOfStock = data.products.filter(p=>v2ProductStock(p) === 0).length;
    data.supportOpen = data.serviceOrders.filter(o=>!statusMatches(supportStatus(o), ['Entregado','Cancelado','No aprobado'])).length;
    data.supportReady = data.serviceOrders.filter(o=>statusMatches(supportStatus(o), ['Listo','Listo para entregar'])).length;
    data.supportDelayed = data.serviceOrders.filter(isSupportDelayed).length;
    data.preordersOpen = data.preorders.filter(o=>!statusMatches(v2OrderStatus(o), ['Entregado','Cancelado','Cerrado'])).length;
    v9Cache = data;
    window.enterpriseV9Cache = data;
    return data;
  }

  function v9BuildCustomerProfiles(data){
    const map = new Map();
    function ensure(key, base={}){
      const id = (key || base.email || base.phone || base.name || Math.random()).toString().toLowerCase();
      if(!map.has(id)) map.set(id, { key:id, name:base.name||'Cliente', email:base.email||'', phone:base.phone||'', orders:[], support:[], total:0, last:null });
      const item = map.get(id);
      if(base.name && item.name === 'Cliente') item.name = base.name;
      if(base.email && !item.email) item.email = base.email;
      if(base.phone && !item.phone) item.phone = base.phone;
      return item;
    }
    data.customers.forEach(c=>ensure(v2CustomerEmail(c)||v2CustomerPhone(c)||v2CustomerName(c), { name:v2CustomerName(c), email:v2CustomerEmail(c), phone:v2CustomerPhone(c)}));
    data.orders.forEach(o=>{
      const base = { name:rowCustomerName(o), email:rowCustomerEmail(o), phone:pick(o,['telefono','phone','whatsapp'])||'' };
      const item = ensure(base.email||base.phone||base.name, base);
      item.orders.push(o); item.total += orderTotal(o);
      const d = new Date(v2OrderDate(o)); if(!Number.isNaN(d.getTime()) && (!item.last || d > item.last)) item.last = d;
    });
    data.serviceOrders.forEach(s=>{
      const base = { name:supportClient(s), email:supportEmail(s), phone:supportPhone(s) };
      const item = ensure(base.email||base.phone||base.name, base);
      item.support.push(s);
      const d = new Date(supportDate(s)); if(!Number.isNaN(d.getTime()) && (!item.last || d > item.last)) item.last = d;
    });
    return Array.from(map.values()).sort((a,b)=>b.total-a.total);
  }
  function v9SegmentCustomer(profile){
    if(profile.total >= 2000 || profile.orders.length >= 4) return 'VIP';
    if(profile.orders.length >= 2) return 'Frecuente';
    if(profile.last && (Date.now() - profile.last.getTime()) > 90*86400000) return 'Inactivo';
    return 'Nuevo';
  }
  function v9ProductRanking(data){
    const counts = new Map();
    data.orderItems.forEach(item=>{
      const name = pick(item, ['producto','product_name','nombre','name','title','modelo']) || 'Producto';
      counts.set(name, (counts.get(name)||0) + (Number(pick(item,['cantidad','quantity','qty'])||1) || 1));
    });
    if(!counts.size){
      data.products.slice(0,12).forEach((p,idx)=>counts.set(v2ProductName(p), Math.max(1, 12-idx)));
    }
    return Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]);
  }
  function v9StatusBreakdown(rows, getStatus){
    const map = new Map();
    rows.forEach(r=>{ const st = getStatus(r) || 'Sin estado'; map.set(st, (map.get(st)||0)+1); });
    return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]);
  }

  function renderV9Operations(data){
    const el = qs('operations'); if(!el) return;
    const profiles = v9BuildCustomerProfiles(data);
    const topCustomers = profiles.slice(0,6).map(c=>`<div class="table-row v9-row"><div><b>${safe(c.name)}</b><br><small>${safe(c.email || c.phone || 'Sin contacto')} · ${c.last ? c.last.toLocaleDateString('es-VE') : 'Sin fecha'}</small></div><span>${formatUSD(c.total)}</span><i class="tag">${v9SegmentCustomer(c)}</i></div>`).join('');
    const alerts = [
      ['Pagos pendientes', `${data.pendingPayments}`, 'Comprobantes o pedidos por revisar', data.pendingPayments ? 'warn':'ok', 'finance'],
      ['Pedidos pendientes', `${data.pendingOrders}`, 'Órdenes sin cierre operativo', data.pendingOrders ? 'warn':'ok', 'sales'],
      ['Stock crítico', `${data.lowStock}`, 'Productos con 2 unidades o menos', data.lowStock ? 'bad':'ok', 'inventory'],
      ['Soporte abierto', `${data.supportOpen}`, 'Equipos en proceso técnico', data.supportOpen ? 'warn':'ok', 'support'],
      ['Equipos listos', `${data.supportReady}`, 'Oportunidad de entrega', data.supportReady ? 'info':'ok', 'support'],
      ['Preórdenes abiertas', `${data.preordersOpen}`, 'Control de entregas futuras', data.preordersOpen ? 'info':'ok', 'commercial']
    ].map(([t,v,d,k,view])=>`<div class="table-row v9-row"><div><b>${safe(t)}</b><br><small>${safe(d)}</small></div><span class="status-dot ${k}">${safe(v)}</span><button class="mini-action" onclick="switchView('${view}')">Abrir</button></div>`).join('');
    const recentOrders = data.orders.slice(0,8).map(o=>`<div class="table-row v9-row"><div><b>${safe(v2OrderCode(o))}</b><br><small>${safe(rowCustomerName(o))} · ${safe(v9RecentDateLabel(v2OrderDate(o)))}</small></div><span class="status-dot ${v9StatusKind(v2OrderStatus(o))}">${safe(v2OrderStatus(o))}</span><i class="tag">${formatUSD(orderTotal(o))}</i></div>`).join('');
    el.innerHTML = `
      <article class="panel v9-hero"><div class="panel-head"><h3>Centro de Operaciones ThinkStore</h3><span class="tag safe-tag">V9 · ecosistema conectado</span></div><p class="staff-help">Vista única de ventas, soporte, clientes, inventario, finanzas y alertas. Todo en modo lectura: no valida pagos, no cambia estados, no toca Resend ni notas de entrega.</p><div class="v2-toolbar"><button onclick="loadEnterpriseV9()">Actualizar ecosistema</button>${v9ActionButton('Abrir CRM','clients')}${v9ActionButton('Abrir Soporte','support')}</div></article>
      <div class="module-grid control-cards">
        <article class="module-card"><h3>Ventas mes</h3><strong>${formatUSD(data.salesMonth)}</strong><p>${formatNumber(data.orders.length)} pedidos visibles.</p></article>
        <article class="module-card"><h3>Clientes 360</h3><strong>${formatNumber(profiles.length)}</strong><p>Clientes cruzados con pedidos y soporte.</p></article>
        <article class="module-card"><h3>Soporte abierto</h3><strong>${formatNumber(data.supportOpen)}</strong><p>Fuente: ${safe(data.tables.support || 'pendiente')}</p></article>
        <article class="module-card"><h3>Alertas críticas</h3><strong>${formatNumber(data.pendingPayments + data.lowStock + data.supportDelayed)}</strong><p>Pagos, stock y soporte.</p></article>
        <article class="module-card"><h3>Preórdenes</h3><strong>${formatNumber(data.preordersOpen)}</strong><p>Seguimiento ejecutivo.</p></article>
        <article class="module-card"><h3>PWA móvil</h3><strong>Lista</strong><p>Instalable en iPhone, iPad y Android.</p></article>
      </div>
      <div class="main-grid" style="margin-top:18px"><article class="panel"><div class="panel-head"><h3>Alertas prioritarias</h3><span class="tag">V9</span></div><div class="table">${alerts}</div></article><article class="panel"><div class="panel-head"><h3>Top clientes 360</h3></div><div class="table">${v9AsRows([topCustomers].filter(Boolean),'Sin clientes para cruzar')}</div></article></div>
      <article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Pedidos recientes del ecosistema</h3><span class="tag">Solo lectura</span></div><div class="table">${v9AsRows([recentOrders].filter(Boolean),'Sin pedidos visibles')}</div></article>`;
  }

  function renderV9Mobile(data){
    const el = qs('mobile'); if(!el) return;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const installSteps = isIOS
      ? 'Safari → Compartir → Añadir a pantalla de inicio.'
      : 'Chrome/Edge → Instalar aplicación o Añadir a pantalla principal.';
    const canInstall = !!deferredPwaPrompt && !standalone;
    const appStatus = standalone ? 'Instalada' : (canInstall ? 'Lista para instalar' : 'Preparada');
    el.innerHTML = `
      <article class="panel v9-hero mobile-app-hero">
        <div class="panel-head"><h3>ThinkStore Enterprise Mobile App</h3><span class="tag safe-tag">PWA V1 · iPhone · iPad · Android</span></div>
        <p class="staff-help">La versión móvil usa el mismo Enterprise, Supabase Auth y roles. Es instalable como app sin tocar ThinkStore público, Resend, pedidos ni notas de entrega.</p>
        <div class="v2-toolbar mobile-actions">
          <button id="installPwaBtn" onclick="installEnterpriseApp()">${canInstall ? 'Instalar app ahora' : (standalone ? 'App instalada' : 'Ver instrucciones')}</button>
          <button onclick="switchView('operations')">Abrir Centro Operaciones</button>
          <button onclick="switchView('alerts')">Ver Alertas</button>
        </div>
      </article>
      <div class="mobile-preview-grid enterprise-app-grid">
        <article class="phone-preview"><div class="phone-notch"></div><div class="phone-card mobile-app-screen">
          <img src="assets/thinkstore-logo-white.png" alt="ThinkStore">
          <span class="mobile-status-pill">${safe(appStatus)}</span>
          <h3>Enterprise Mobile</h3>
          <p>Panel rápido</p>
          <strong>${formatUSD(data.salesMonth)}</strong>
          <small>${formatNumber(data.pendingPayments)} pagos pendientes · ${formatNumber(data.supportOpen)} soportes abiertos · ${formatNumber(data.lowStock)} stock crítico</small>
          <div class="mobile-quick-grid">
            <button onclick="switchView('clients')">CRM</button>
            <button onclick="switchView('support')">Soporte</button>
            <button onclick="switchView('inventory')">Stock</button>
            <button onclick="switchView('financeAdvanced')">Finanzas</button>
          </div>
        </div></article>
        <article class="panel"><div class="panel-head"><h3>Estado de la app</h3><span class="tag">Mobile V1</span></div><div class="table">
          <div class="table-row"><div><b>Instalación</b><br><small>${safe(installSteps)}</small></div><span>${safe(appStatus)}</span><i class="tag safe-tag">PWA</i></div>
          <div class="table-row"><div><b>Modo pantalla completa</b><br><small>Manifest, theme-color, iconos y service worker preparados.</small></div><span>Activo</span><i class="tag">Mobile</i></div>
          <div class="table-row"><div><b>Acceso seguro</b><br><small>Mismo login Supabase, mismo rol super_admin/admin y misma sesión.</small></div><span>Seguro</span><i class="tag">Auth</i></div>
          <div class="table-row"><div><b>Offline básico</b><br><small>Pantalla de respaldo cuando no hay conexión.</small></div><span>Activo</span><i class="tag">Cache</i></div>
          <div class="table-row"><div><b>Notificaciones push</b><br><small>Preparado para V10 con permisos y función de envío.</small></div><span>Preparado</span><i class="tag">Next</i></div>
        </div></article>
      </div>
      <article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Checklist para instalar</h3><span class="tag">iOS / Android</span></div>
        <div class="mobile-checklist">
          <div><b>1</b><span>Abre enterprise.thinkstore.com.ve en Safari o Chrome.</span></div>
          <div><b>2</b><span>Inicia sesión con tu usuario autorizado.</span></div>
          <div><b>3</b><span>Usa Compartir → Añadir a pantalla de inicio o Instalar app.</span></div>
          <div><b>4</b><span>Entra desde el icono ThinkStore como app de trabajo.</span></div>
        </div>
      </article>`;
  }

  async function installEnterpriseApp(){
    if(deferredPwaPrompt){
      deferredPwaPrompt.prompt();
      const choice = await deferredPwaPrompt.userChoice.catch(()=>null);
      deferredPwaPrompt = null;
      if(choice?.outcome === 'accepted') alert('ThinkStore Enterprise se está instalando.');
      else alert('Instalación cancelada. Puedes instalarla luego desde Mobile/PWA.');
      if(enterpriseRealCache) renderV9Mobile(window.__v9Cache || enterpriseRealCache);
      return;
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    alert(isIOS ? 'En iPhone/iPad: toca Compartir y luego Añadir a pantalla de inicio.' : 'En Chrome/Edge: abre el menú del navegador y toca Instalar aplicación o Añadir a pantalla principal.');
  }
  window.installEnterpriseApp = installEnterpriseApp;


  function renderV9RealClients(data){
    const el = qs('clients'); if(!el) return;
    const profiles = v9BuildCustomerProfiles(data);
    const vip = profiles.filter(c=>v9SegmentCustomer(c)==='VIP');
    const inactive = profiles.filter(c=>v9SegmentCustomer(c)==='Inactivo');
    const rows = profiles.slice(0,50).map(c=>`<div class="table-row v9-row"><div><b>${safe(c.name)}</b><br><small>${safe(c.email || c.phone || 'Sin contacto')}</small></div><span>${formatNumber(c.orders.length)} pedidos · ${formatNumber(c.support.length)} soporte</span><i class="tag">${v9SegmentCustomer(c)} · ${formatUSD(c.total)}</i></div>`).join('');
    el.innerHTML = `<article class="panel v9-hero"><div class="panel-head"><h3>CRM Clientes Real</h3><span class="tag safe-tag">Cliente 360</span></div><p class="staff-help">CRM cruzado con clientes, pedidos y soporte. Solo lectura.</p></article><div class="module-grid control-cards"><article class="module-card"><h3>Clientes unificados</h3><strong>${formatNumber(profiles.length)}</strong><p>Base visible total.</p></article><article class="module-card"><h3>VIP</h3><strong>${formatNumber(vip.length)}</strong><p>Alto valor o compra frecuente.</p></article><article class="module-card"><h3>Inactivos</h3><strong>${formatNumber(inactive.length)}</strong><p>Más de 90 días sin movimiento.</p></article></div><article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Clientes 360</h3><button onclick="loadEnterpriseV9()">Actualizar</button></div><div class="table">${v9AsRows([rows].filter(Boolean),'Sin clientes visibles')}</div></article>`;
  }

  function renderV9RealSales(data){
    const el = qs('sales'); if(!el) return;
    const statuses = v9StatusBreakdown(data.orders, v2OrderStatus).slice(0,8).map(([st,n])=>`<div class="table-row v9-row"><div><b>${safe(st)}</b><br><small>Estado visible de pedidos.</small></div><span>${formatNumber(n)}</span><i class="tag">Pedidos</i></div>`).join('');
    const rows = data.orders.slice(0,30).map(o=>`<div class="table-row v9-row"><div><b>${safe(v2OrderCode(o))}</b><br><small>${safe(rowCustomerName(o))} · ${safe(v9RecentDateLabel(v2OrderDate(o)))}</small></div><span class="status-dot ${v9StatusKind(v2OrderStatus(o))}">${safe(v2OrderStatus(o))}</span><i class="tag">${formatUSD(orderTotal(o))}</i></div>`).join('');
    el.innerHTML = `<div class="module-grid"><article class="module-card"><h3>Ventas hoy</h3><strong>${formatUSD(data.salesToday)}</strong><p>Últimas 24 horas.</p></article><article class="module-card"><h3>Ventas mes</h3><strong>${formatUSD(data.salesMonth)}</strong><p>Mes actual visible.</p></article><article class="module-card"><h3>Pedidos pendientes</h3><strong>${formatNumber(data.pendingOrders)}</strong><p>Estados por cerrar.</p></article></div><div class="main-grid" style="margin-top:18px"><article class="panel"><div class="panel-head"><h3>Pedidos reales</h3><span class="tag">${safe(data.tables.orders || 'sin tabla')}</span></div><div class="table">${v9AsRows([rows].filter(Boolean),'Sin pedidos visibles')}</div></article><article class="panel"><div class="panel-head"><h3>Pedidos por estado</h3></div><div class="table">${v9AsRows([statuses].filter(Boolean),'Sin estados visibles')}</div></article></div>`;
  }

  function renderV9RealInventory(data){
    const el = qs('inventory'); if(!el) return;
    const ranking = v9ProductRanking(data).slice(0,8).map(([name,count])=>`<div class="table-row v9-row"><div><b>${safe(name)}</b><br><small>Estimado por items/pedidos visibles.</small></div><span>${formatNumber(count)}</span><i class="tag">Rotación</i></div>`).join('');
    const rows = data.products.slice(0,50).map(p=>{ const stock=v2ProductStock(p); const kind = stock===0?'bad':stock!==null&&stock<=2?'warn':'ok'; return `<div class="table-row v9-row"><div><b>${safe(v2ProductName(p))}</b><br><small>${safe(v2ProductCategory(p))}</small></div><span class="status-dot ${kind}">${stock===null?'Sin stock':stock}</span><i class="tag">${formatUSD(v2ProductPrice(p))}</i></div>`; }).join('');
    el.innerHTML = `<div class="module-grid"><article class="module-card"><h3>Productos visibles</h3><strong>${formatNumber(data.products.length)}</strong><p>Fuente: ${safe(data.tables.products || 'pendiente')}.</p></article><article class="module-card"><h3>Stock bajo</h3><strong>${formatNumber(data.lowStock)}</strong><p>2 unidades o menos.</p></article><article class="module-card"><h3>Agotados</h3><strong>${formatNumber(data.outOfStock)}</strong><p>Stock igual a 0.</p></article></div><div class="main-grid" style="margin-top:18px"><article class="panel"><div class="panel-head"><h3>Inventario real</h3></div><div class="table">${v9AsRows([rows].filter(Boolean),'Sin productos visibles')}</div></article><article class="panel"><div class="panel-head"><h3>Rotación estimada</h3></div><div class="table">${v9AsRows([ranking].filter(Boolean),'Sin items de pedido visibles')}</div></article></div>`;
  }

  function renderV9RealMarketing(data){
    const el = qs('marketing'); if(!el) return;
    const profiles = v9BuildCustomerProfiles(data);
    const segments = ['VIP','Frecuente','Nuevo','Inactivo'].map(seg=>{
      const list = profiles.filter(p=>v9SegmentCustomer(p)===seg);
      return `<div class="table-row v9-row"><div><b>Clientes ${safe(seg)}</b><br><small>Audiencia preparada; no envía correos ni toca Resend.</small></div><span>${formatNumber(list.length)}</span><i class="tag">Audiencia</i></div>`;
    }).join('');
    const campaigns = [
      ['Lanzamientos Apple', profiles.filter(p=>['VIP','Frecuente'].includes(v9SegmentCustomer(p))).length],
      ['Recuperación de clientes', profiles.filter(p=>v9SegmentCustomer(p)==='Inactivo').length],
      ['Preórdenes', data.preordersOpen],
      ['Stock crítico', data.lowStock]
    ].map(([name,n])=>`<div class="table-row v9-row"><div><b>${safe(name)}</b><br><small>Campaña preparada en modo borrador.</small></div><span>${formatNumber(n)} objetivos</span><i class="tag">Borrador</i></div>`).join('');
    el.innerHTML = `<article class="panel safe-panel"><div class="panel-head"><h3>Marketing Center Real</h3><span class="tag safe-tag">Sin envío</span></div><p class="staff-help">Segmenta clientes reales y prepara campañas. No toca Resend, no envía correos y no modifica plantillas.</p></article><div class="main-grid" style="margin-top:18px"><article class="panel"><div class="panel-head"><h3>Audiencias reales</h3></div><div class="table">${segments}</div></article><article class="panel"><div class="panel-head"><h3>Campañas preparadas</h3></div><div class="table">${campaigns}</div></article></div>`;
  }

  function renderV9RealFinance(data){
    const el = qs('finance'); if(!el) return;
    const byMonth = new Map();
    data.orders.forEach(o=>{ const key=v9MonthKey(v2OrderDate(o)); byMonth.set(key,(byMonth.get(key)||0)+orderTotal(o)); });
    const monthly = Array.from(byMonth.entries()).slice(0,12).map(([m,v])=>`<div class="table-row v9-row"><div><b>${safe(m)}</b><br><small>Ventas visibles del período.</small></div><span>${formatUSD(v)}</span><i class="tag">Mes</i></div>`).join('');
    const avg = data.orders.length ? data.salesTotal / data.orders.length : 0;
    el.innerHTML = `<div class="module-grid"><article class="module-card"><h3>Ventas totales</h3><strong>${formatUSD(data.salesTotal)}</strong><p>Pedidos visibles.</p></article><article class="module-card"><h3>Ticket promedio</h3><strong>${formatUSD(avg)}</strong><p>Promedio por pedido.</p></article><article class="module-card"><h3>Pagos pendientes</h3><strong>${formatNumber(data.pendingPayments)}</strong><p>Sin cambiar validación.</p></article></div><article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Ventas por mes</h3><span class="tag">Real</span></div><div class="table">${v9AsRows([monthly].filter(Boolean),'Sin ventas visibles')}</div></article>`;
  }

  function renderV9BI(data){
    const el = qs('reports'); if(!el) return;
    const topProducts = v9ProductRanking(data).slice(0,8).map(([name,count])=>`<div class="table-row v9-row"><div><b>${safe(name)}</b><br><small>Ranking por items/pedidos visibles.</small></div><span>${formatNumber(count)}</span><i class="tag">Producto</i></div>`).join('');
    const topCustomers = v9BuildCustomerProfiles(data).slice(0,8).map(c=>`<div class="table-row v9-row"><div><b>${safe(c.name)}</b><br><small>${safe(c.email || c.phone || 'Sin contacto')}</small></div><span>${formatUSD(c.total)}</span><i class="tag">${v9SegmentCustomer(c)}</i></div>`).join('');
    el.innerHTML = `<article class="panel v9-hero"><div class="panel-head"><h3>Inteligencia Comercial V9</h3><span class="tag safe-tag">BI real</span></div><p class="staff-help">Lectura cruzada de ventas, productos, clientes, soporte e inventario.</p></article><div class="main-grid" style="margin-top:18px"><article class="panel"><div class="panel-head"><h3>Top productos</h3></div><div class="table">${v9AsRows([topProducts].filter(Boolean),'Sin ranking visible')}</div></article><article class="panel"><div class="panel-head"><h3>Top clientes</h3></div><div class="table">${v9AsRows([topCustomers].filter(Boolean),'Sin clientes visibles')}</div></article></div>`;
  }

  function renderV9AI2(data){
    const el = qs('ai'); if(!el) return;
    const profiles = v9BuildCustomerProfiles(data);
    const inactive = profiles.filter(p=>v9SegmentCustomer(p)==='Inactivo').length;
    const topProduct = v9ProductRanking(data)[0]?.[0] || 'Pendiente';
    const recs = [
      ['Qué debo reponer', `${data.lowStock + data.outOfStock} productos`, data.lowStock+data.outOfStock ? 'Revisar inventario crítico antes de promoción.' : 'No hay stock crítico visible.', data.lowStock+data.outOfStock?'bad':'ok'],
      ['Qué clientes recuperar', `${inactive} clientes`, 'Audiencia lista para Marketing Center, sin enviar correos.', inactive?'warn':'ok'],
      ['Producto con mejor señal', topProduct, 'Úsalo como foco comercial.', 'info'],
      ['Riesgo operativo', `${data.pendingPayments + data.supportDelayed} alertas`, 'Pagos pendientes y soporte retrasado.', data.pendingPayments+data.supportDelayed?'warn':'ok'],
      ['Prioridad de hoy', data.supportReady ? `${data.supportReady} equipos listos` : `${data.pendingOrders} pedidos pendientes`, 'Revisar Centro de Operaciones.', 'info']
    ].map(([t,v,d,k])=>`<div class="table-row v9-row"><div><b>${safe(t)}</b><br><small>${safe(d)}</small></div><span class="status-dot ${k}">${safe(v)}</span><i class="tag">AI 2.0</i></div>`).join('');
    el.innerHTML = `<article class="panel v8-hero"><div class="panel-head"><h3>ThinkStore AI 2.0</h3><span class="tag safe-tag">V9</span></div><p class="staff-help">Recomendaciones cruzadas del ecosistema. No ejecuta acciones automáticas.</p></article><article class="panel" style="margin-top:18px"><div class="panel-head"><h3>Preguntas ejecutivas</h3><button onclick="loadEnterpriseV9()">Actualizar</button></div><div class="table">${recs}</div></article>`;
  }

  function renderV9Support(data){
    // Si V6 ya tiene más detalles, reforzamos cuando haya datos externos/internos visibles.
    if(typeof renderV6Support === 'function'){
      try{
        const v6data = { serviceTable:data.tables.support, notesTable:data.tables.supportNotes, serviceUsersTable:data.tables.supportUsers, serviceOrders:data.serviceOrders, notes:data.serviceNotes, serviceUsers:data.serviceUsers, customers:data.customers, orders:data.orders, payments:data.payments, productsCount:data.products.length, productsTable:data.tables.products };
        renderV6Support(v6data); renderV6Client360(v6data); renderV6Warranties(v6data); renderV6Alerts(v6data);
      }catch(error){ console.warn('[V9 soporte] Refuerzo V6:', error.message || error); }
    }
  }

  function renderV9All(data){
    renderV9Operations(data);
    renderV9Mobile(data);
    renderV9RealClients(data);
    renderV9RealSales(data);
    renderV9RealInventory(data);
    renderV9RealMarketing(data);
    renderV9RealFinance(data);
    renderV9BI(data);
    renderV9AI2(data);
    renderV9Support(data);
    if(qs('statusList')){
      qs('statusList').innerHTML = [
        ['✓','Ecosistema V9', data.bridge === 'rpc' ? 'Conectado RPC' : 'Operativo'],
        ['▣','PWA móvil','Lista'],
        ['⚠','Alertas críticas',`${formatNumber(data.pendingPayments + data.lowStock + data.supportDelayed)}`],
        ['↗','Soporte abierto',`${formatNumber(data.supportOpen)}`],
        ['◇','Resend','Intacto']
      ].map(([i,n,s])=>`<div class="status-row"><i>${i}</i><b>${safe(n)}</b><span>${safe(s)}</span></div>`).join('');
    }
  }
  async function loadEnterpriseV9(){
    if(!window.supabaseClient || !currentProfile) return null;
    try{
      const data = await v9LoadData();
      renderV9All(data);
      return data;
    }catch(error){
      console.error('[Enterprise V9]', error);
      const el = qs('operations');
      if(el) el.innerHTML = `<article class="panel"><div class="panel-head"><h3>Enterprise V9</h3><span class="tag">Error</span></div><p class="staff-help">No se pudo cargar el ecosistema: ${safe(error.message || error)}. No se modificó ninguna tabla.</p></article>`;
      return null;
    }
  }
  window.loadEnterpriseV9 = loadEnterpriseV9;

  const prevLoad = window.loadEnterpriseV1Real || loadEnterpriseV1Real;
  window.loadEnterpriseV1Real = loadEnterpriseV1Real = async function(){
    const data = await prevLoad();
    try{ await loadEnterpriseV9(); }catch(error){ console.warn('[V9] carga adicional:', error.message || error); }
    return data;
  };
  const prevSwitch = window.switchView || switchView;
  window.switchView = switchView = function(id){
    prevSwitch(id);
    if(v9Cache){
      if(id === 'operations') renderV9Operations(v9Cache);
      if(id === 'mobile') renderV9Mobile(v9Cache);
      if(id === 'clients') renderV9RealClients(v9Cache);
      if(id === 'sales') renderV9RealSales(v9Cache);
      if(id === 'inventory') renderV9RealInventory(v9Cache);
      if(id === 'marketing') renderV9RealMarketing(v9Cache);
      if(id === 'finance') renderV9RealFinance(v9Cache);
      if(id === 'reports') renderV9BI(v9Cache);
      if(id === 'ai') renderV9AI2(v9Cache);
    }
  };

  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('sw.js').catch(error=>console.warn('PWA service worker:', error.message || error));
    });
  }
})();

/* ThinkStore Enterprise V9.5 · PWA descargable */
(function(){
  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  function isDismissed(){
    return localStorage.getItem('thinkstore_pwa_banner_dismissed') === '1';
  }
  function showPwaBanner(){
    const banner = document.getElementById('pwaInstallBanner');
    if(!banner || isStandalone() || isDismissed()) return;
    banner.classList.remove('hidden');
  }
  window.dismissPwaBanner = function(){
    localStorage.setItem('thinkstore_pwa_banner_dismissed','1');
    document.getElementById('pwaInstallBanner')?.classList.add('hidden');
  };
  function updateInstallStatus(text){
    const el = document.getElementById('installStatus');
    if(el) el.textContent = text;
  }
  const oldInstall = window.installEnterpriseApp;
  window.installEnterpriseApp = async function(){
    if(typeof oldInstall === 'function'){
      await oldInstall();
      updateInstallStatus('Proceso de instalación iniciado. En iPhone usa Compartir → Añadir a pantalla de inicio.');
      return;
    }
    updateInstallStatus('En iPhone/iPad usa Compartir → Añadir a pantalla de inicio. En Android usa Instalar aplicación.');
  };
  window.addEventListener('appinstalled', ()=>{
    localStorage.setItem('thinkstore_pwa_banner_dismissed','1');
    document.getElementById('pwaInstallBanner')?.classList.add('hidden');
    updateInstallStatus('ThinkStore Enterprise ya está instalada.');
  });
  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(showPwaBanner, 1200);
    if(isStandalone()) document.body.classList.add('pwa-standalone');
  });
  if('serviceWorker' in navigator){
    window.addEventListener('load', async ()=>{
      try{
        const reg = await navigator.serviceWorker.register('sw.js');
        reg.addEventListener('updatefound', ()=>{
          const worker = reg.installing;
          if(!worker) return;
          worker.addEventListener('statechange', ()=>{
            if(worker.state === 'installed' && navigator.serviceWorker.controller){
              const toast = document.createElement('div');
              toast.className = 'pwa-update-toast';
              toast.innerHTML = '<b>Nueva versión disponible</b><span>Actualiza para usar la última versión de ThinkStore Enterprise.</span><button onclick="location.reload()">Actualizar ahora</button>';
              document.body.appendChild(toast);
            }
          });
        });
      }catch(error){ console.warn('PWA V9.5:', error.message || error); }
    });
  }
})();

/* ==========================================================
   Enterprise Production 1.0 · Activación de botones y navegación
   - Activa botones de lectura/navegación en Dashboard y módulos
   - Agrega visor rápido para filas reales sin escribir en Supabase
   - Exportación CSV usando cache real de Enterprise V9
   - Mantiene Resend, pedidos, notas y panel actual intactos
   ========================================================== */
(function(){
  const VIEW_LABELS = {
    executive:'Panel Ejecutivo', operations:'Centro de Operaciones', commercial:'Control Comercial',
    sales:'Ventas / Pedidos', products:'Productos', inventory:'Inventario Pro', clients:'CRM Clientes',
    staff:'Accesos', marketing:'Marketing Center', finance:'Finanzas Pro', financeAdvanced:'Finanzas Avanzadas',
    reports:'Inteligencia Comercial', ai:'ThinkStore AI', support:'Centro de Soporte', client360:'Cliente 360',
    warranties:'Garantías', alerts:'Centro de Alertas', mobile:'Mobile/PWA', settings:'Configuración'
  };

  function getCache(){ return window.enterpriseV9Cache || window.__v9Cache || null; }
  function cleanText(value){ return String(value || '').replace(/\s+/g,' ').trim(); }
  function goView(view){
    if(typeof window.switchView === 'function') window.switchView(view);
    const workspace = document.querySelector('.workspace');
    if(workspace) workspace.scrollTo({ top:0, behavior:'smooth' });
    else window.scrollTo({ top:0, behavior:'smooth' });
  }
  window.openEnterpriseView = goView;

  function ensureModal(){
    let modal = document.getElementById('enterpriseDetailModal');
    if(modal) return modal;
    modal = document.createElement('div');
    modal.id = 'enterpriseDetailModal';
    modal.className = 'enterprise-modal hidden';
    modal.innerHTML = `
      <div class="enterprise-modal-backdrop" data-close-enterprise-modal></div>
      <article class="enterprise-modal-card">
        <button class="enterprise-modal-close" data-close-enterprise-modal>×</button>
        <div class="enterprise-modal-head">
          <span class="tag safe-tag">Solo lectura</span>
          <h3 id="enterpriseModalTitle">Detalle</h3>
          <p id="enterpriseModalSubtitle">Vista rápida del dato seleccionado.</p>
        </div>
        <div id="enterpriseModalBody" class="enterprise-modal-body"></div>
      </article>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event)=>{
      if(event.target.matches('[data-close-enterprise-modal]')) modal.classList.add('hidden');
    });
    document.addEventListener('keydown', (event)=>{ if(event.key === 'Escape') modal.classList.add('hidden'); });
    return modal;
  }

  function openDetail(title, rows){
    const modal = ensureModal();
    const body = modal.querySelector('#enterpriseModalBody');
    modal.querySelector('#enterpriseModalTitle').textContent = title || 'Detalle';
    body.innerHTML = (rows || []).map(([label, value])=>`
      <div class="enterprise-detail-row">
        <b>${safe(label)}</b>
        <span>${safe(value || '—')}</span>
      </div>`).join('') || '<p class="staff-help">No hay detalles disponibles.</p>';
    modal.classList.remove('hidden');
  }
  window.openEnterpriseDetail = openDetail;

  function rowToDetail(row){
    const view = document.querySelector('.view.active')?.id || 'executive';
    const title = VIEW_LABELS[view] || 'Detalle Enterprise';
    const text = cleanText(row.textContent);
    openDetail(title, [
      ['Módulo', title],
      ['Registro seleccionado', text],
      ['Estado', 'Consulta en modo seguro'],
      ['Acción', 'No modifica Supabase, Resend, pedidos ni notas de entrega']
    ]);
  }

  function exportRowsAsCSV(moduleId='executive'){
    const cache = getCache();
    const view = moduleId || document.querySelector('.view.active')?.id || 'executive';
    const visibleRows = Array.from(document.querySelectorAll(`#${CSS.escape(view)} .table-row, #${CSS.escape(view)} .module-card`));
    const rows = [['Modulo','Contenido']];
    visibleRows.forEach(row => rows.push([VIEW_LABELS[view] || view, cleanText(row.textContent)]));

    if(cache && view === 'clients') cache.customers?.forEach(c=>rows.push(['Cliente', JSON.stringify(c)]));
    if(cache && view === 'sales') cache.orders?.forEach(o=>rows.push(['Pedido', JSON.stringify(o)]));
    if(cache && view === 'inventory') cache.products?.forEach(p=>rows.push(['Producto', JSON.stringify(p)]));
    if(cache && view === 'finance') cache.payments?.forEach(p=>rows.push(['Pago/Comprobante', JSON.stringify(p)]));
    if(cache && view === 'support') cache.serviceOrders?.forEach(s=>rows.push(['Soporte', JSON.stringify(s)]));

    const csv = rows.map(r=>r.map(v=>`"${String(v ?? '').replaceAll('"','""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `thinkstore-enterprise-${view}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  window.exportCSV = exportRowsAsCSV;

  function addToolbarToActiveView(){
    const active = document.querySelector('.view.active');
    if(!active || active.id === 'executive' || active.querySelector('.production-toolbar')) return;
    const toolbar = document.createElement('div');
    toolbar.className = 'production-toolbar';
    toolbar.innerHTML = `
      <button type="button" data-prod-action="refresh">Actualizar datos</button>
      <button type="button" data-prod-action="export">Exportar CSV</button>
      <button type="button" data-prod-action="operations">Centro Operaciones</button>
      <span>Production 1.0 · modo seguro</span>`;
    active.prepend(toolbar);
  }

  function activateDashboardCards(){
    const cardMap = [
      ['metricSalesMonth','finance'], ['metricOrdersTotal','sales'], ['metricCustomersTotal','clients'], ['metricPendingPayments','finance'],
      ['stripRevenue','finance'], ['stripCustomers','clients'], ['stripOrders','sales'], ['stripPayments','finance']
    ];
    cardMap.forEach(([id, view])=>{
      const el = document.getElementById(id);
      const card = el?.closest('article');
      if(!card || card.dataset.productionActive === '1') return;
      card.dataset.productionActive = '1';
      card.classList.add('clickable-card');
      card.addEventListener('click', (event)=>{
        if(event.target.closest('button,a')) return;
        goView(view);
      });
      const button = card.querySelector('button');
      if(button){ button.textContent = 'Abrir'; button.onclick = (event)=>{ event.stopPropagation(); goView(view); }; }
    });

    const panelLinks = [
      ['.activity .panel-head a','alerts'], ['.top-products .panel-head a','inventory'], ['.channels > a','reports'],
      ['.chart-panel .panel-head button','finance']
    ];
    panelLinks.forEach(([selector,view])=>{
      const el = document.querySelector(selector);
      if(el && el.dataset.productionActive !== '1'){
        el.dataset.productionActive = '1';
        el.style.cursor = 'pointer';
        el.addEventListener('click', (event)=>{ event.preventDefault(); goView(view); });
      }
    });
  }

  function activateRows(){
    document.querySelectorAll('.table-row.v9-row, .table-row:not(.production-row), .product-row, .activity-item, .status-row').forEach(row=>{
      if(row.dataset.productionActive === '1') return;
      row.dataset.productionActive = '1';
      row.title = 'Toca para ver detalle rápido';
      row.addEventListener('click', (event)=>{
        if(event.target.closest('button,a,select,input')) return;
        rowToDetail(row);
      });
    });
  }

  function activateProductionButtons(){
    activateDashboardCards();
    addToolbarToActiveView();
    activateRows();
  }
  window.activateEnterpriseProduction = activateProductionButtons;

  document.addEventListener('click', (event)=>{
    const action = event.target.closest('[data-prod-action]')?.dataset.prodAction;
    if(!action) return;
    event.preventDefault();
    const view = document.querySelector('.view.active')?.id || 'executive';
    if(action === 'refresh'){
      if(typeof window.loadEnterpriseV9 === 'function') window.loadEnterpriseV9();
      else if(typeof window.loadEnterpriseV1Real === 'function') window.loadEnterpriseV1Real();
    }
    if(action === 'export') exportRowsAsCSV(view);
    if(action === 'operations') goView('operations');
  });

  const previousSwitch = window.switchView;
  if(typeof previousSwitch === 'function'){
    window.switchView = function(id){
      previousSwitch(id);
      setTimeout(activateProductionButtons, 60);
    };
  }

  const observer = new MutationObserver(()=>{
    clearTimeout(window.__enterpriseProductionTimer);
    window.__enterpriseProductionTimer = setTimeout(activateProductionButtons, 80);
  });
  document.addEventListener('DOMContentLoaded', ()=>{
    const app = document.getElementById('app') || document.body;
    observer.observe(app, { childList:true, subtree:true });
    activateProductionButtons();
  });
})();

/* ==========================================================
   Enterprise Production 1.1 · Acciones seguras por módulo
   - Detalle enriquecido de filas y registros
   - Buscador/filtrado real dentro de cada pantalla
   - Copiar contacto o registro
   - Abrir panel actual de ThinkStore como respaldo
   - Abrir soporte en nueva pestaña
   - No escribe en Supabase, no toca Resend, pedidos, notas ni correos
   ========================================================== */
(function(){
  const BACKUP_PANEL_URL = 'https://thinkstore.com.ve/?admin=1';
  const SUPPORT_URL = 'https://soporte.thinkstore.com.ve';

  function activeView(){ return document.querySelector('.view.active')?.id || 'executive'; }
  function clean(value){ return String(value || '').replace(/\s+/g,' ').trim(); }
  function toast(message, type='info'){
    let box = document.getElementById('prod11Toast');
    if(!box){
      box = document.createElement('div');
      box.id = 'prod11Toast';
      box.className = 'prod11-toast';
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.dataset.type = type;
    box.classList.add('show');
    clearTimeout(window.__prod11ToastTimer);
    window.__prod11ToastTimer = setTimeout(()=>box.classList.remove('show'), 2600);
  }
  async function copyText(text, label='Registro'){
    const value = clean(text);
    if(!value){ toast('No hay contenido para copiar.', 'warn'); return; }
    try{
      await navigator.clipboard.writeText(value);
      toast(`${label} copiado.`, 'ok');
    }catch(error){
      const area = document.createElement('textarea');
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      toast(`${label} copiado.`, 'ok');
    }
  }
  function extractEmail(text){ return clean(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || ''; }
  function extractPhone(text){ return clean(text).match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] || ''; }
  function openBackupPanel(){ window.open(BACKUP_PANEL_URL, '_blank', 'noopener,noreferrer'); }
  function openSupport(){ window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer'); }
  function getModalText(){ return clean(document.getElementById('enterpriseModalBody')?.textContent || ''); }
  function moduleLabel(view){
    const map = {
      executive:'Panel Ejecutivo', operations:'Centro de Operaciones', commercial:'Control Comercial', sales:'Ventas / Pedidos',
      clients:'CRM Clientes', inventory:'Inventario', products:'Productos', finance:'Finanzas', financeAdvanced:'Finanzas Avanzadas',
      marketing:'Marketing', reports:'Inteligencia Comercial', support:'Soporte', client360:'Cliente 360', warranties:'Garantías',
      alerts:'Alertas', ai:'ThinkStore AI', staff:'Accesos', settings:'Configuración'
    };
    return map[view] || view;
  }

  function enhanceModal(){
    const modal = document.getElementById('enterpriseDetailModal');
    if(!modal || modal.classList.contains('hidden')) return;
    const body = modal.querySelector('#enterpriseModalBody');
    if(!body || body.querySelector('.prod11-actions')) return;
    const view = activeView();
    const text = getModalText();
    const email = extractEmail(text);
    const phone = extractPhone(text);
    const actions = document.createElement('div');
    actions.className = 'prod11-actions';
    actions.innerHTML = `
      <button type="button" data-prod11="copy-record">Copiar registro</button>
      ${email ? '<button type="button" data-prod11="copy-email">Copiar correo</button>' : ''}
      ${phone ? '<button type="button" data-prod11="copy-phone">Copiar teléfono</button>' : ''}
      <button type="button" data-prod11="export-view">Exportar módulo</button>
      <button type="button" data-prod11="backup-panel">Panel actual</button>
      ${['support','client360','warranties','alerts'].includes(view) ? '<button type="button" data-prod11="support">Abrir soporte</button>' : ''}
    `;
    body.prepend(actions);
  }

  function filterActiveView(query){
    const view = activeView();
    const root = document.getElementById(view);
    if(!root) return;
    const q = clean(query).toLowerCase();
    root.querySelectorAll('.table-row,.module-card,.product-row,.activity-item,.status-row').forEach(row=>{
      if(row.closest('.production-toolbar')) return;
      const visible = !q || clean(row.textContent).toLowerCase().includes(q);
      row.style.display = visible ? '' : 'none';
    });
  }

  function enhanceToolbar(){
    const view = activeView();
    const root = document.getElementById(view);
    const toolbar = root?.querySelector('.production-toolbar');
    if(!toolbar || toolbar.dataset.prod11 === '1') return;
    toolbar.dataset.prod11 = '1';
    const search = document.createElement('input');
    search.className = 'prod11-filter';
    search.type = 'search';
    search.placeholder = `Buscar en ${moduleLabel(view)}...`;
    search.addEventListener('input', ()=>filterActiveView(search.value));
    toolbar.insertBefore(search, toolbar.firstChild);

    const copyVisible = document.createElement('button');
    copyVisible.type = 'button';
    copyVisible.textContent = 'Copiar vista';
    copyVisible.addEventListener('click', ()=>copyText(clean(root.textContent), moduleLabel(view)));
    toolbar.appendChild(copyVisible);

    const backup = document.createElement('button');
    backup.type = 'button';
    backup.textContent = 'Abrir respaldo';
    backup.addEventListener('click', openBackupPanel);
    toolbar.appendChild(backup);

    if(['support','client360','warranties','alerts'].includes(view)){
      const support = document.createElement('button');
      support.type = 'button';
      support.textContent = 'Abrir soporte';
      support.addEventListener('click', openSupport);
      toolbar.appendChild(support);
    }
  }

  function addQuickActionsToViews(){
    const view = activeView();
    const root = document.getElementById(view);
    if(!root || root.dataset.prod11Quick === '1') return;
    root.dataset.prod11Quick = '1';
    const firstPanel = root.querySelector('.panel, .v9-hero, .safe-panel');
    if(!firstPanel) return;
    const head = firstPanel.querySelector('.panel-head');
    if(!head || head.querySelector('.prod11-head-actions')) return;
    const wrap = document.createElement('div');
    wrap.className = 'prod11-head-actions';
    wrap.innerHTML = `
      <button type="button" data-prod11="refresh-safe">Actualizar</button>
      <button type="button" data-prod11="export-view">Exportar</button>
    `;
    head.appendChild(wrap);
  }

  function markRowsWithSafeActions(){
    document.querySelectorAll('.table-row,.product-row,.activity-item,.status-row').forEach(row=>{
      if(row.dataset.prod11 === '1' || row.closest('.production-toolbar')) return;
      row.dataset.prod11 = '1';
      row.setAttribute('aria-label', 'Ver detalle seguro');
      if(!row.querySelector('.prod11-pill')){
        const pill = document.createElement('em');
        pill.className = 'prod11-pill';
        pill.textContent = 'Ver';
        row.appendChild(pill);
      }
    });
  }

  function runProd11(){
    enhanceToolbar();
    addQuickActionsToViews();
    markRowsWithSafeActions();
    enhanceModal();
  }

  document.addEventListener('click', (event)=>{
    const action = event.target.closest('[data-prod11]')?.dataset.prod11;
    if(!action) return;
    event.preventDefault();
    event.stopPropagation();
    const modalText = getModalText();
    if(action === 'copy-record') copyText(modalText, 'Registro');
    if(action === 'copy-email') copyText(extractEmail(modalText), 'Correo');
    if(action === 'copy-phone') copyText(extractPhone(modalText), 'Teléfono');
    if(action === 'export-view') window.exportCSV?.(activeView());
    if(action === 'backup-panel') openBackupPanel();
    if(action === 'support') openSupport();
    if(action === 'refresh-safe'){
      if(typeof window.loadEnterpriseV9 === 'function') window.loadEnterpriseV9();
      else if(typeof window.loadEnterpriseV1Real === 'function') window.loadEnterpriseV1Real();
      toast('Datos actualizados en modo seguro.', 'ok');
    }
  }, true);

  const previousSwitch = window.switchView;
  if(typeof previousSwitch === 'function'){
    window.switchView = function(id){
      previousSwitch(id);
      setTimeout(runProd11, 120);
    };
  }

  const observer = new MutationObserver(()=>{
    clearTimeout(window.__prod11Timer);
    window.__prod11Timer = setTimeout(runProd11, 140);
  });
  document.addEventListener('DOMContentLoaded', ()=>{
    observer.observe(document.getElementById('app') || document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
    setTimeout(runProd11, 600);
  });
})();
