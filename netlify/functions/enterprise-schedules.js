'use strict';
const {authorizeManager}=require('./enterprise-finance');
const M=require('../../growth-enterprise/payment-schedule-model');
const {getRate}=require('./fx-rate-core');
const H={'Content-Type':'application/json','Cache-Control':'no-store'};
const out=(statusCode,b)=>({statusCode,headers:H,body:JSON.stringify(b)});
const clean=v=>String(v??'').trim();const uuid=v=>/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(clean(v));
exports.handler=async e=>{
 const url='https://clhnndxsgzqnihhtrout.supabase.co',key=clean(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.THINKSTORE_SUPABASE_SERVICE_ROLE_KEY);
 if(!key)return out(503,{ok:false,error:'Finanzas no está configurado.'});
 try{
  const auth=await authorizeManager({...e,headers:e.headers||{}},url,key);if(!auth.ok)return out(403,{ok:false,error:auth.error});
  async function db(path,method='GET',body){const r=await fetch(url+'/rest/v1/'+path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json().catch(()=>null);if(!r.ok){const error=new Error(d?.message||'No se pudo consultar vencimientos.');error.status=r.status;error.code=d?.code;throw error;}return d;}
  if(e.httpMethod==='GET'){const rows=await db('enterprise_payment_schedule?select=*,expense:enterprise_finance_entries!enterprise_schedule_paid_entry_fk(id,status,amount_usd,currency,original_amount,occurred_at)&order=due_date.asc&limit=1000');return out(200,{ok:true,rows,truncated:rows.length>=1000,today:M.today()});}
  if(e.httpMethod!=='POST')return out(405,{ok:false,error:'Método no permitido.'});
  let b;try{b=JSON.parse(e.body||'{}')}catch{return out(400,{ok:false,error:'Solicitud inválida.'});}
  if(!uuid(b.id))return out(400,{ok:false,error:'Identificador de vencimiento inválido.'});
  const actor={created_by_email:auth.user.email||auth.user.id,created_by_name:auth.profile.full_name||auth.profile.nombre||auth.user.email};
  if(b.action==='create'){
   const v=M.validate(b),existing=await db('enterprise_payment_schedule?select=id&id=eq.'+b.id+'&limit=1');if(existing.length)return out(200,{ok:true,id:b.id,already_exists:true});
   const rows=await db('enterprise_payment_schedule','POST',{...v,id:b.id,...actor});return out(200,{ok:true,row:rows[0]});
  }
  const [current]=await db('enterprise_payment_schedule?select=*&id=eq.'+b.id+'&limit=1');if(!current)return out(404,{ok:false,error:'Vencimiento no encontrado.'});
  if(b.action==='pay'){
   if(current.category==='supplier')return out(409,{ok:false,error:'Gestiona esta compra en Inventory para evitar duplicar gastos.'});
   if(current.status==='paid')return out(200,{ok:true,already_paid:true,entry_id:current.paid_entry_id});
   if(current.status!=='planned')return out(409,{ok:false,error:'Este recordatorio ya no está pendiente.'});
   if(b.updated_at!==current.updated_at)return out(409,{ok:false,error:'El vencimiento cambió. Actualiza antes de registrar el pago.'});
   if(b.settled!==true)return out(400,{ok:false,error:'Confirma que este importe salda completamente el pago.'});
   const original=M.amount(b.amount),currency=b.currency,payer=b.funded_by||'company',method=clean(b.payment_method),day=b.paid_on||M.today();
   if(original===null||!['USD','VES'].includes(currency)||!['company','freddy','nelson'].includes(payer)||!M.date(day)||day>M.today())return out(400,{ok:false,error:'Revisa importe, moneda, responsable y fecha del pago.'});
   const methods=['Efectivo USD','Efectivo Bs','Pago Móvil','Transferencia','Zelle','USDT','Punto de Venta','Otro'];if(!methods.includes(method))return out(400,{ok:false,error:'Método de pago inválido.'});
   const vesMethods=['Efectivo Bs','Pago Móvil','Punto de Venta'],usdMethods=['Efectivo USD','Zelle','USDT'];if((vesMethods.includes(method)&&currency!=='VES')||(usdMethods.includes(method)&&currency!=='USD'))return out(400,{ok:false,error:'El método y la moneda no coinciden.'});
   if(!/^Efectivo/.test(method)&&clean(b.reference).length<3)return out(400,{ok:false,error:'Indica la referencia del pago.'});
   let rate=null,amount_usd=original;if(currency==='VES'){if(day!==M.today())return out(400,{ok:false,error:'Para usar la tasa BCV actual, el pago en Bs debe corresponder a hoy.'});rate=await getRate(true);if(rate.stale||!(rate.rate>0))return out(409,{ok:false,error:'No se pudo verificar la tasa BCV.'});amount_usd=Math.round(original/rate.rate*100)/100;if(amount_usd<=0)return out(400,{ok:false,error:'El equivalente USD es menor a un centavo.'});}
   const result=await db('rpc/enterprise_pay_scheduled','POST',{p_id:b.id,p_payment:{...actor,expected_updated_at:current.updated_at,amount_usd,original_amount:original,currency,exchange_rate:rate?.rate||null,rate_date:rate?.effective_date||null,payment_method:method,reference:clean(b.reference).slice(0,180),funded_by:payer,occurred_at:day+'T12:00:00-04:00'}});return out(200,{ok:true,...result});
  }
  if(current.status!=='planned')return out(409,{ok:false,error:'Solo puedes cambiar un vencimiento pendiente.'});
  if(!b.updated_at||b.updated_at!==current.updated_at)return out(409,{ok:false,error:'El recordatorio cambió. Actualiza y reintenta.'});
  let patch;if(b.action==='edit')patch=M.validate(b);else if(b.action==='archive'){if(clean(b.reason).length<5)return out(400,{ok:false,error:'Indica por qué se archiva el aviso.'});patch={status:'cancelled',cancelled_reason:clean(b.reason).slice(0,500)};}else return out(400,{ok:false,error:'Acción inválida.'});
  const rows=await db('enterprise_payment_schedule?id=eq.'+b.id+'&status=eq.planned&updated_at=eq.'+encodeURIComponent(current.updated_at),'PATCH',{...patch,updated_at:new Date().toISOString()});if(!rows.length)return out(409,{ok:false,error:'Otro usuario cambió el registro. Actualiza y reintenta.'});return out(200,{ok:true,row:rows[0]});
 }catch(error){if(['42P01','PGRST205','PGRST200','PGRST202'].includes(error.code))return out(503,{ok:false,migration_required:true,error:'Falta activar la estructura de vencimientos en Supabase principal.'});return out(error.status&&error.status<500?error.status:400,{ok:false,error:error.message||'No se pudo completar la operación.'});}
};
