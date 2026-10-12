'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../netlify/functions/registered-customer-core');
const uuid='12345678-1234-1234-1234-123456789abc';
const email='client@example.test';
const base={id:uuid,nombre:'Cliente Registrado',correo:email,telefono:'04141234567',cedula_rif:null,direccion:''};
const conf={url:'https://main.example.test',key:'secret-role'};
function mockClient(raw,{confirmed=true,patchRows=null}={}){
 const old=global.fetch,requests=[];
 global.fetch=async(u,o={})=>{
  const url=String(u);requests.push({url,options:o});
  if(url.includes('/auth/v1/admin/users/'))return{ok:true,json:async()=>({user:{id:uuid,email,email_confirmed_at:confirmed?'2026-10-01':null}})};
  if(url.includes('/rest/v1/clientes')&&o.method==='PATCH'){
   const values=JSON.parse(o.body);
   return{ok:true,json:async()=>patchRows===null?[{...raw,...values}]:patchRows};
  }
  if(url.includes('/rest/v1/clientes'))return{ok:true,json:async()=>[raw]};
  throw Error('Petición inesperada '+url);
 };
 return{requests,restore:()=>{global.fetch=old}};
}
test('recepción completa documento y dirección solo tras verificar correo; conserva datos existentes',async()=>{
 const x=mockClient(base);
 try{
  const c=await core.completeFromReception(conf,email,{name:'Alguien distinto',phone:'555000000',document:'V12345678',address:'Chacao, Caracas',city:'Caracas',state:'Miranda'});
  assert.equal(c.profile_updated,true);
  assert.equal(c.name,base.nombre);assert.equal(c.phone,base.telefono);
  assert.equal(c.document,'V12345678');assert.equal(c.address,'Chacao, Caracas');
  const patch=x.requests.filter(y=>y.options.method==='PATCH');assert.equal(patch.length,1);
  const body=JSON.parse(patch[0].options.body);
  assert.deepEqual(body,{cedula_rif:'V12345678',direccion:'Chacao, Caracas',ciudad:'Caracas',estado:'Miranda'});
  assert.match(patch[0].url,/id=eq\.12345678/);assert.match(patch[0].url,/and=\(/);
 }finally{x.restore()}
});
test('si el perfil ya está completo no se altera ni se reemplaza la identidad desde el formulario',async()=>{
 const x=mockClient({...base,cedula_rif:'V9999999',direccion:'Dirección registrada'});
 try{const c=await core.completeFromReception(conf,email,{document:'V0000001',address:'Dirección no verificada'});assert.equal(c.document,'V9999999');assert.equal(c.address,'Dirección registrada');assert.equal(c.profile_updated,false);assert.equal(x.requests.some(y=>y.options.method==='PATCH'),false)}finally{x.restore()}
});
test('no escribe datos incompletos',async()=>{
 const x=mockClient(base);
 try{await assert.rejects(core.completeFromReception(conf,email,{document:'V12345678'}),/dirección/);assert.equal(x.requests.some(y=>y.options.method==='PATCH'),false)}finally{x.restore()}
});
test('requiere correo confirmado antes de completar datos',async()=>{
 const x=mockClient(base,{confirmed:false});
 try{await assert.rejects(core.completeFromReception(conf,email,{document:'V12345678',address:'Chacao, Caracas'}),/confirmar/);assert.equal(x.requests.some(y=>y.options.method==='PATCH'),false)}finally{x.restore()}
});
test('protege frente a actualización concurrente del perfil',async()=>{
 const x=mockClient(base,{patchRows:[]});
 try{await assert.rejects(core.completeFromReception(conf,email,{document:'V12345678',address:'Chacao, Caracas'}),/cambió/)}finally{x.restore()}
});
test('cliente consultado sin recepción sigue requiriendo perfil completo',async()=>{
 const x=mockClient(base);
 try{await assert.rejects(core.load(conf,email),/CI\/RIF/)}finally{x.restore()}
});
