'use strict';
const {resolveCashAccess}=require('./staff-pos');
const {mainConfig}=require('./staff-auth-core');
const {ledger,METHODS,cents}=require('./staff-cash-core');
const HEAD={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'authorization,content-type'};
const respond=(code,data)=>({statusCode:code,headers:HEAD,body:JSON.stringify(data)});
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
const clean=(v,max=500)=>String(v??'').trim().slice(0,max);
const num=(v,max=1e9)=>{if(v===''||v===null||v===undefined||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>max||Math.abs(Number(v)*100-Math.round(Number(v)*100))>0.00001)throw Error('Monto inválido: usa valores positivos con máximo dos decimales.');return Number(v)};
const rateNum=v=>{const n=Number(v);if(!Number.isFinite(n)||n<=0||n>1e9)throw Error('Tasa BCV inválida.');return n};
const config=()=>{const c=mainConfig();return{url:c.url,key:c.service};};
async function rest(url,key,table,params={},opts={}){
 const address=new URL(url+'/rest/v1/'+table);
 for(const [k,v]of Object.entries(params))if(v!==undefined&&v!==null)address.searchParams.set(k,String(v));
 const r=await fetch(address,{...opts,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...(opts.headers||{})}});
 const body=await r.json().catch(()=>null);
 if(!r.ok){let e=new Error(body?.message||body?.details||body?.error||'Error al consultar Supabase');e.status=r.status;throw e}
 return body;
}
async function loadSessions(url,key,actor){
 const params={select:'id,user_id,business_date,status,opened_at,opening_usd,opening_ves,closed_at,counted_usd,counted_ves,closing_note,verified_methods',order:'opened_at.desc',limit:60};
 if(!actor.is_manager)params.user_id=`eq.${actor.user_id}`;
 else params.opened_at=`gte.${new Date(Date.now()-30*86400000).toISOString()}`;
 const sessions=await rest(url,key,'ts_staff_cash_sessions',params);
 if(actor.is_manager&&sessions.length){
   const ids=[...new Set(sessions.map(s=>s.user_id))];
   try{
     const profiles=await rest(url,key,'profiles',{select:'*',id:`in.(${ids.join(',')})`,limit:100});
     const map=new Map(profiles.map(p=>[p.id,clean(p.full_name||p.nombre||p.name||p.email||p.correo,70)]));
     sessions.forEach(s=>{s.owner_name=map.get(s.user_id)||'Vendedor';});
   }catch(e){console.warn('[cash] nombres no disponibles',e.message);}
 }
 return sessions;
}
async function loadCash(url,key,session){
 if(session.status==='closed'){
   const frozen=await rest(url,key,'ts_staff_cash_sessions',{select:'closing_snapshot',id:`eq.${session.id}`,limit:1});
   if(frozen?.[0]?.closing_snapshot&&Array.isArray(frozen[0].closing_snapshot.entries))return frozen[0].closing_snapshot;
 }
 const stop=session.status==='closed'?session.closed_at:new Date().toISOString();
 const params={select:'id,codigo,estado,payment_decision,payment_decision_at,total_usd,total_bs,bcv_rate,metodo_pago,referencia_pago,salesperson_user_id',salesperson_user_id:`eq.${session.user_id}`,order_channel:'eq.presencial',payment_decision:'eq.approved',payment_decision_at:`gte.${session.opened_at}`,order:'payment_decision_at.asc',limit:1001};
 // No contabilizamos ventas confirmadas después de cerrar caja.
 if(session.status==='closed')params['payment_decision_at']=`gte.${session.opened_at}`; // La cota superior se aplica también en JS para PostgREST.
 const all=await rest(url,key,'pedidos',params);
 const orders=all.filter(p=>p.payment_decision_at&&new Date(p.payment_decision_at)<=new Date(stop)&&!/cancel|rechaz/i.test(String(p.estado||'')));
 const mixed=orders.filter(p=>p.metodo_pago==='Pago mixto').map(p=>p.id);
 let lines=[];
 // Particiones para URLs PostgREST razonables; evita ejecutar >100 ids en la URL.
 for(let i=0;i<mixed.length;i+=75){
   const batch=mixed.slice(i,i+75);
   const next=await rest(url,key,'ts_order_payments',{select:'pedido_id,method,currency,amount,usd_equivalent,reference,confirmed_at,status',pedido_id:`in.(${batch.join(',')})`,status:'eq.confirmed',order:'confirmed_at.asc',limit:1001});
   lines=lines.concat(next.filter(p=>new Date(p.confirmed_at)<=new Date(stop)));
 }
 const movements=await rest(url,key,'ts_staff_cash_movements',{select:'id,session_id,type,direction,method,currency,amount,usd_equivalent,bcv_rate,bcv_effective_date,bcv_source,bcv_checked_at,concept,reference,created_at',session_id:`eq.${session.id}`,order:'created_at.desc',limit:1001});
 const result=ledger(session,orders,lines,movements);
 if(all.length>=1001||movements.length>=1001||mixed.length>0&&lines.length>=1001)result.warnings.push('Demasiados movimientos para cargar completamente; no se puede cerrar hasta ampliar el período de consulta.');
 return result;
}
function validatedMovement(b){
 const type=clean(b.type,30),direction=clean(b.direction,10),method=clean(b.method,80),currency=METHODS[method];
 if(!['ingreso','gasto','retiro','devolucion','ajuste'].includes(type))throw Error('Tipo de movimiento inválido.');
 if(!['in','out'].includes(direction))throw Error('Selecciona entrada o salida.');
 if(type!=='ajuste'&&direction!==(type==='ingreso'?'in':'out'))throw Error('Dirección incompatible con movimiento.');
 if(!currency)throw Error('Método de pago inválido.');
 const amount=num(b.amount,1e10),concept=clean(b.concept,180),reference=clean(b.reference,120);
 if(amount<=0||concept.length<3)throw Error('Agrega el concepto y un monto positivo.');
 if(!method.startsWith('Efectivo')&&!reference)throw Error('Indica la referencia bancaria.');
 let usd_equivalent=amount,bcv_rate=null,bcv_effective_date=null,bcv_source=null,bcv_checked_at=null;
 if(currency==='VES'){
   bcv_rate=rateNum(b.bcv_rate);bcv_effective_date=clean(b.bcv_effective_date,10);bcv_source=clean(b.bcv_source,120);bcv_checked_at=clean(b.bcv_checked_at,50);
   usd_equivalent=num(b.usd_equivalent,1e9);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(bcv_effective_date)||!bcv_checked_at)throw Error('Tasa BCV histórica incompleta.');
   if(Math.abs(Math.round(amount/bcv_rate*100)-Math.round(usd_equivalent*100))>0)throw Error('La equivalencia BCV no coincide con el monto en bolívares.');
 }
 return{type,direction,method,currency,amount,concept,reference,usd_equivalent,bcv_rate,bcv_effective_date,bcv_source,bcv_checked_at};
}
exports.handler=async event=>{
 if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:HEAD,body:''};
 if(!['GET','POST'].includes(event.httpMethod))return respond(405,{ok:false,error:'Método no permitido'});
 const {url,key}=config();if(!url||!key)return respond(503,{ok:false,error:'Faltan variables Supabase en Netlify Main.'});
 try{
   const actor=await resolveCashAccess(event,url,key);
   if(!actor)return respond(403,{ok:false,error:'Acceso a Caja exclusivo de personal con permiso de Ventas.'});
   if(event.httpMethod==='GET'){
     const sessions=await loadSessions(url,key,actor);
     const chosen=clean(event.queryStringParameters?.session_id,40);
     const session=chosen?sessions.find(x=>x.id===chosen):sessions.find(x=>x.user_id===actor.user_id&&x.status==='open')||sessions.find(x=>x.user_id===actor.user_id)||null;
     if(chosen&&!session)return respond(403,{ok:false,error:'No puedes ver esta caja o está fuera del historial reciente.'});
     return respond(200,{ok:true,actor,sessions,session,cash:session?await loadCash(url,key,session):null,generated_at:new Date().toISOString()});
   }
   const b=JSON.parse(event.body||'{}'),action=clean(b.action,30),payload={};
   if(!['open','movement','draft','close','reopen'].includes(action))return respond(400,{ok:false,error:'Acción desconocida'});
   if(action==='open'){
      payload.opening_usd=num(b.opening_usd);payload.opening_ves=num(b.opening_ves,1e11);payload.note=clean(b.note);
   }else{
      const id=clean(b.session_id,40);
      if(!uuid(id))return respond(400,{ok:false,error:'ID de caja inválido'});
      const sessions=await loadSessions(url,key,actor),session=sessions.find(s=>s.id===id);
      if(!session)return respond(403,{ok:false,error:'Caja no autorizada o fuera del historial reciente'});
      if(session.user_id!==actor.user_id&&!(actor.is_manager&&action==='reopen'))return respond(403,{ok:false,error:'Solo puedes operar tu propia caja'});
      payload.session_id=id;
      if(action==='movement'){
        if(session.status!=='open')return respond(409,{ok:false,error:'La caja está cerrada'});
        Object.assign(payload,validatedMovement(b));
        if(payload.direction==='out'&&payload.method.startsWith('Efectivo')){
          const current=await loadCash(url,key,session);
          if(current.warnings.length)return respond(409,{ok:false,error:'Revisa las advertencias de cobros antes de retirar efectivo de caja.'});
          const available=payload.currency==='USD'?current.expected_usd:current.expected_ves;
          if(cents(payload.amount)>cents(available))return respond(409,{ok:false,error:'El importe supera el efectivo disponible en caja.'});
        }
      }
      if(action==='draft'||action==='close'){
        if(session.status!=='open')return respond(409,{ok:false,error:'La caja ya está cerrada'});
        payload.counted_usd=num(b.counted_usd);payload.counted_ves=num(b.counted_ves,1e11);
        payload.note=clean(b.note);payload.verified_methods=Array.isArray(b.verified_methods)?b.verified_methods.filter(x=>Object.hasOwn(METHODS,x)&&!x.startsWith('Efectivo')):[];
        if(action==='close'){
          const data=await loadCash(url,key,session);
          if(data.expected_usd<0||data.expected_ves<0)return respond(409,{ok:false,error:'Saldo teórico de efectivo negativo. Revisa las salidas antes de cerrar.'});
          if(data.warnings.length)return respond(409,{ok:false,error:'La caja contiene cobros que requieren revisión. No se puede cerrar hasta corregirlos.',warnings:data.warnings});
          const nonCash=Object.keys(data.by_method).filter(x=>!x.startsWith('Efectivo')&&data.by_method[x].net!==0);
          if(nonCash.some(x=>!payload.verified_methods.includes(x)))return respond(409,{ok:false,error:'Valida los métodos electrónicos antes del cierre.'});
          const dUsd=cents(payload.counted_usd)-cents(data.expected_usd),dVes=cents(payload.counted_ves)-cents(data.expected_ves);
          if((dUsd||dVes)&&payload.note.length<5)return respond(400,{ok:false,error:'Existe una diferencia: registra una observación para cerrar.'});
          payload.snapshot={...data,warnings:[],counted_usd:payload.counted_usd,counted_ves:payload.counted_ves,difference_usd:dUsd/100,difference_ves:dVes/100,verified_methods:payload.verified_methods,as_of:new Date().toISOString()};
        }
      }
      if(action==='reopen'){
         if(!actor.is_manager)return respond(403,{ok:false,error:'Solo administración puede reabrir la caja'});
         payload.reason=clean(b.reason);
         if(payload.reason.length<8)return respond(400,{ok:false,error:'Indica un motivo de reapertura (8 caracteres mínimo).'});
      }
   }
   const data=await rest(url,key,'rpc/ts_staff_cash_action',{}, {method:'POST',body:JSON.stringify({p_actor:actor.user_id,p_action:action,p_data:payload,p_manager:actor.is_manager})});
   return respond(200,{ok:true,session:data});
 }catch(e){console.error('[staff-cash]',e?.message);const msg=e?.message||'No se pudo completar la operación';
   if(/ts_staff_cash|does not exist|schema cache|relation |function public|PGRST202|PGRST205/i.test(msg))return respond(409,{ok:false,migration_required:true,error:'Falta aplicar MIGRACION-V14.80-CAJA-STAFF.sql en Supabase principal. Detalle: '+msg});
   return respond(e?.status>=400&&e.status<500?e.status:400,{ok:false,error:msg});
 }
};
