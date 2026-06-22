const ADMIN_KEY = "thinkstore2026";
const titles = {
  executive:["Panel Ejecutivo","Resumen general de tu negocio en tiempo real."],
  sales:["Ventas","Pedidos, ingresos, canales y rendimiento comercial."],
  products:["Productos","Catálogo estratégico, top ventas y rentabilidad por modelo."],
  inventory:["Inventario","Stock crítico, rotación, reposición y preórdenes."],
  clients:["Clientes","CRM, clientes VIP, recurrencia y segmentos."],
  marketing:["Marketing","Campañas, ROI, audiencias y automatizaciones."],
  finance:["Finanzas","Utilidad, costos, flujo de caja y pagos pendientes."],
  reports:["Reportes","Exportaciones ejecutivas y análisis por período."],
  integrations:["Integraciones","Conexiones con Supabase, Stripe, Shopify, correo y logística."],
  automations:["Automatizaciones","Flujos inteligentes para ventas, soporte y marketing."],
  settings:["Configuración","Permisos, roles, accesos y seguridad del panel."]
};
const activity = [
  ["green","▢","Nuevo pedido #TS-1048","Cliente: Juan Pérez","Hace 2 min"],
  ["orange","⬡","Stock bajo en 5 productos","Revisa tu inventario","Hace 15 min"],
  ["blue","♙","Nuevo cliente registrado","María García","Hace 30 min"],
  ["purple","$","Pago recibido","Orden #TS-1045","Hace 1 hora"]
];
const products = [
  ["👟","ThinkStore Air Max Pro","$45,600.00","Ventas: 320",88],
  ["🧥","ThinkStore Hoodie Premium","$33,600.00","Ventas: 280",72],
  ["🧢","ThinkStore Cap Classic","$12,600.00","Ventas: 210",42]
];
const channels = [["#2677ff","Tienda Online","62%"],["#4b93ff","Instagram","18%"],["#91a79d","WhatsApp","12%"],["#ff951f","Mercado Libre","5%"],["#8e4dff","Otros","3%"]];
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
 settings: [["Rol administrador","Activo","Acceso completo"],["Vendedores","Limitado","Ventas y clientes"],["Recepción","Limitado","Soporte técnico"],["Logística","Limitado","Envíos"],["Clientes","Privado","Solo sus órdenes"],["Clave demo","thinkstore2026","Cambiar en producción"]]
};
function qs(id){return document.getElementById(id)}
function unlock(){ const val = qs('adminKey').value.trim(); if(val !== ADMIN_KEY){ alert('Clave incorrecta'); return; } localStorage.setItem('ts_growth_enterprise_auth','true'); showApp(); }
function showApp(){ qs('lockScreen').classList.add('hidden'); qs('app').classList.remove('hidden'); renderHome(); renderModules(); }
function logout(){ localStorage.removeItem('ts_growth_enterprise_auth'); location.reload(); }
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
  qs('pageTitle').textContent = titles[id][0]; qs('pageSubtitle').textContent = titles[id][1];
}
function exportCSV(id='executive'){
  const source = modules[id] || [['Ventas del mes','$124850','KPI'],['Pedidos totales','1248','KPI'],['Clientes activos','3682','KPI'],['Utilidad estimada','$28940','KPI']];
  const rows = [['Modulo','Metrica','Valor','Descripcion'], ...source.map(r=>[id,...r])];
  const csv = rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `thinkstore-growth-${id}.csv`; a.click(); URL.revokeObjectURL(a.href);
}
document.addEventListener('DOMContentLoaded',()=>{
  qs('unlockBtn')?.addEventListener('click',unlock); qs('adminKey')?.addEventListener('keydown',e=>{if(e.key==='Enter')unlock()});
  qs('logoutBtn')?.addEventListener('click',logout); qs('logoutMini')?.addEventListener('click',logout);
  document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
  qs('searchInput')?.addEventListener('input',e=>{const q=e.target.value.toLowerCase(); document.querySelectorAll('.module-card,.product-row,.activity-item,.status-row').forEach(el=>{el.style.outline = q && el.textContent.toLowerCase().includes(q) ? '1px solid rgba(38,119,255,.7)' : ''})});
  if(localStorage.getItem('ts_growth_enterprise_auth')==='true') showApp();
});
