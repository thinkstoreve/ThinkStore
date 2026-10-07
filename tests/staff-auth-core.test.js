'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const mod=require(path.join('..','netlify','functions','staff-auth-core.js'));

function response(status,data){return{ok:status>=200&&status<300,status,async json(){return data}}}
function event(token='good'){return{headers:{authorization:`Bearer ${token}`}}}

test('acepta metadata interna aunque no exista profile',async()=>{
  const old=global.fetch;
  global.fetch=async url=>{
    url=String(url);
    if(url.includes('/auth/v1/user'))return response(200,{id:'11111111-1111-4111-8111-111111111111',email:'socio@example.com',app_metadata:{thinkstore_internal:true,thinkstore_role:'superadmin'},user_metadata:{full_name:'Socio'}});
    if(url.includes('/rest/v1/'))return response(200,[]);
    return response(404,{});
  };
  try{const a=await mod.authenticateInternal(event());assert.equal(a.ok,true);assert.equal(a.role,'superadmin');assert.equal(a.profile.is_internal,true);}finally{global.fetch=old}
});

test('roles_usuarios interno prevalece sobre profile cliente',async()=>{
  const old=global.fetch;
  global.fetch=async url=>{
    url=String(url);
    if(url.includes('/auth/v1/user'))return response(200,{id:'22222222-2222-4222-8222-222222222222',email:'staff@example.com',app_metadata:{},user_metadata:{}});
    if(url.includes('profiles?select=*&id='))return response(200,[{id:'22222222-2222-4222-8222-222222222222',email:'staff@example.com',role:'cliente',active:true,is_internal:false}]);
    if(url.includes('roles_usuarios?'))return response(200,[{email:'staff@example.com',rol:'super_admin',activo:true,nombre:'Staff'}]);
    return response(200,[]);
  };
  try{const a=await mod.authenticateInternal(event());assert.equal(a.ok,true);assert.equal(a.role,'superadmin');assert.equal(a.profile.is_internal,true);}finally{global.fetch=old}
});

test('rechaza token inválido',async()=>{
  const old=global.fetch;
  global.fetch=async url=>String(url).includes('/auth/v1/user')?response(401,{message:'bad token'}):response(200,[]);
  try{const a=await mod.authenticateInternal(event('bad'));assert.equal(a.ok,false);assert.equal(a.code,'AUTH_TOKEN_INVALID');}finally{global.fetch=old}
});
