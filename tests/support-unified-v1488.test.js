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
