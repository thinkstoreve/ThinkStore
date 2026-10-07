const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Main contiene Soporte integrado bajo /soporte',()=>{
  assert.ok(fs.existsSync(path.join(root,'soporte','panel.html')));
  assert.ok(fs.existsSync(path.join(root,'soporte','app.js')));
  assert.ok(fs.existsSync(path.join(root,'netlify','functions','support-actions.js')));
});

test('SSO abre Soporte dentro del mismo Main',()=>{
  const s=read('netlify/functions/admin-sso.js');
  assert.match(s,/support:`\$\{base\}\/soporte\/panel\.html`/);
});

test('Staff usa el RPC atómico V8.8.8 para pago final',()=>{
  const s=read('netlify/functions/staff-repairs.js');
  assert.match(s,/rpc\/ts_service_record_payment_atomic/);
  assert.doesNotMatch(s,/method:'PATCH'.*amount_paid/s);
});

test('Soporte permite guardar repuestos reservados',()=>{
  const app=read('soporte/app.js');
  const html=read('soporte/panel.html');
  assert.match(app,/ts_save_service_order_parts/);
  assert.match(html,/Guardar repuestos/);
  assert.match(app,/✓ Cobrado/);
});

test('Paquete incluye los cuatro SQL del flujo',()=>{
  for(const n of ['01-ORDEN-REPUESTOS','02-GUARDAR-REPUESTOS','03-CONSUMIR-AL-PAGO','04-PAGO-ATOMICO'])
    assert.ok(fs.existsSync(path.join(root,`SQL-SOPORTE-V8.8.8-${n}.sql`)),n);
});


test('SSO integrado usa token hash y Soporte consume verifyOtp',()=>{
  const sso=read('netlify/functions/admin-sso.js');
  const app=read('soporte/app.js');
  assert.match(sso,/directSupportOtpUrl/);
  assert.match(sso,/sso_token_hash/);
  assert.match(app,/verifyOtp\(\{token_hash:ssoHash,type:ssoType\}\)/);
});

test('App Ventas recupera la pestaña clásica Reparaciones',()=>{
  const html=read('staff/index.html');
  const app=read('staff/app.js');
  const repairs=read('staff/repairs.js');
  assert.match(html,/>Reparaciones<\/span>/);
  assert.match(html,/Pendientes por cobrar/);
  assert.match(html,/Cobradas/);
  assert.match(repairs,/Marcar pagado \+ Nota de Entrega/);
  assert.match(repairs,/Registrar abono/);
  assert.match(repairs,/Efectivo USD/);
  assert.match(repairs,/EUR/);
  assert.match(repairs,/USDT/);
  assert.match(app,/repairs:\['Servicio Técnico','Reparaciones'\]/);
});

test('Soporte muestra estado al iniciar y minimiza cuando queda online',()=>{
  const runtime=read('soporte/offline-runtime.js');
  assert.match(runtime,/Conectando…/);
  assert.match(runtime,/Sincronizando…/);
  assert.match(runtime,/Online · sincronizado/);
  assert.match(runtime,/classList\.add\('minimized'\)/);
  assert.match(runtime,/classList\.add\('offline'\)/);
  assert.doesNotMatch(runtime,/>Instalar<\/button>/);
});
