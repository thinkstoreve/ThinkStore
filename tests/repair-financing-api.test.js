const {test}=require('node:test');const assert=require('node:assert/strict');
const auth=require('../netlify/functions/staff-auth-core');
auth.authenticateInternal=async()=>({ok:true,role:'admin',email:'staff@example.test',profile:{is_internal:true,role:'admin'}});
auth.mainConfig=()=>({url:'https://main.example.test',service:'test'});
const clients=require('../netlify/functions/registered-customer-core');clients.load=async()=>({id:'12345678-1234-1234-1234-123456789abc',name:'Test Customer',email:'client@example.test',phone:'+584221234567',document:'V12345678',address:'Test address',email_verified:true});
const {handler}=require('../netlify/functions/staff-repairs');
process.env.SUPPORT_SUPABASE_URL='https://support.supabase.co';process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY='test';
test('guardar plan no cobra, conserva metadatos y detecta actualización concurrente',async()=>{
 const oldFetch=global.fetch;const writes=[];
 const row={id:'123',code:'TEST',client_email:'client@example.test',quote_amount:100,quote_currency:'USD',amount_paid:30,status:'En reparación',updated_at:'2026-10-12T00:00:00Z',reception_checklist:{screen:{checked:true}}};
 let conflict=false;
 global.fetch=async(url,options={})=>{const u=new URL(url);let data=[];if(u.pathname.endsWith('/service_orders')){if(options.method==='PATCH'){writes.push({query:u.searchParams,body:JSON.parse(options.body)});data=conflict?[]:[{...row,...JSON.parse(options.body)}];}else data=[row];}return{ok:true,status:200,json:async()=>data}};
 const call=(changes={})=>handler({httpMethod:'POST',headers:{},body:JSON.stringify({action:'set_financing',order_id:'123',initial_amount:30,due_date:'2099-12-31',...changes})});
 try{
 let res=await call();assert.equal(res.statusCode,200,res.body);assert.equal(writes.length,1);assert.equal(writes[0].body.amount_paid,undefined);assert.equal(writes[0].body.payment_status,undefined);assert.equal(writes[0].body.reception_checklist.screen.checked,true);assert.equal(writes[0].query.get('updated_at'),'eq.'+row.updated_at);
 res=await call({initial_amount:101});assert.equal(res.statusCode,400);res=await call({due_date:'2099-02-30'});assert.equal(res.statusCode,400);assert.equal(writes.length,1);
 conflict=true;res=await call();assert.equal(res.statusCode,409);
 }finally{global.fetch=oldFetch;}
});
