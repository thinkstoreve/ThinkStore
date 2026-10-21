'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/registered-customer');
const uuid='12345678-1234-1234-1234-123456789abc';
const email='client@example.test';
const client={id:uuid,nombre:'Cliente con cita web',correo:email,telefono:'04141234567',cedula_rif:null,direccion:null};
process.env.SUPPORT_SUPABASE_URL='https://support.example.test';
process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY='support-service';
process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY='main-service';
test('una sesión autorizada de Soporte completa la cuenta registrada antes de la recepción',async()=>{
 const old=global.fetch;let patch=null;
 global.fetch=async(u,options={})=>{
  const url=String(u);
  if(url==='https://support.example.test/auth/v1/user')return{ok:true,json:async()=>({email:'reception@example.test'})};
  if(url.includes('support.example.test/rest/v1/service_users'))return{ok:true,json:async()=>[{rol:'reception',activo:true}]};
  if(url.includes('/rest/v1/clientes')&&options.method==='PATCH'){
   patch=JSON.parse(options.body);return{ok:true,json:async()=>[{...client,...patch}]};
  }
  if(url.includes('/rest/v1/clientes'))return{ok:true,json:async()=>[client]};
  if(url.includes('/auth/v1/admin/users'))return{ok:true,json:async()=>({user:{id:uuid,email,email_confirmed_at:'2026-10-11T00:00:00Z'}})};
  throw Error('Solicitud desconocida '+url);
 };
 try{
  const res=await handler({httpMethod:'POST',headers:{authorization:'Bearer valid-token'},body:JSON.stringify({source:'support',email,complete_profile:{name:'Fake',phone:'000000000',document:'V12345678',address:'Caracas Chacao'}})});
  assert.equal(res.statusCode,200,res.body);
  assert.deepEqual(patch,{cedula_rif:'V12345678',direccion:'Caracas Chacao'});
  const data=JSON.parse(res.body);assert.equal(data.customer.id,uuid);assert.equal(data.customer.name,client.nombre);assert.equal(data.customer.profile_updated,true);
 }finally{global.fetch=old}
});
test('sin autorización de Soporte no se altera el perfil',async()=>{
 const old=global.fetch;let patches=0;
 global.fetch=async(u,options={})=>{
  if(options.method==='PATCH')patches++;
  if(String(u).includes('/auth/v1/user'))return{ok:false,json:async()=>({})};
  return {ok:false,json:async()=>({})};
 };
 try{
  const res=await handler({httpMethod:'POST',headers:{authorization:'Bearer denied'},body:JSON.stringify({source:'support',email,complete_profile:{document:'V12345678',address:'Caracas'}})});
  assert.equal(res.statusCode,403);
  assert.equal(patches,0);
 }finally{global.fetch=old}
});
