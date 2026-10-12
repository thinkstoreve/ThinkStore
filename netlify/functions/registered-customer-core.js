'use strict';
const clean=v=>String(v??'').trim();
function normalize(r={}){return{id:clean(r.id),name:clean(r.nombre||r.name||r.full_name),email:clean(r.correo||r.email).toLowerCase(),phone:clean(r.telefono||r.phone),document:clean(r.cedula_rif||r.document||r.cedula),address:clean(r.direccion||r.address),city:clean(r.ciudad||r.city),state:clean(r.estado||r.state)}}
function validate(c){
 const missing=[];
 if(c.name.length<3)missing.push('nombre completo');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))missing.push('correo válido');
 if(!/^\+?[\d\s().-]{7,25}$/.test(c.phone)||c.phone.replace(/\D/g,'').length<7)missing.push('teléfono');
 if(c.document.length<5)missing.push('CI/RIF');
 if(c.address.length<5)missing.push('dirección');
 if(missing.length)throw Error('Completa el perfil registrado: '+missing.join(', ')+'.');
 return c;
}
async function load(conf,email){
 email=clean(email).toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Indica el correo del cliente registrado.');
 const headers={apikey:conf.key,Authorization:'Bearer '+conf.key};
 const r=await fetch(conf.url+'/rest/v1/clientes?select=*&correo=eq.'+encodeURIComponent(email)+'&limit=2',{headers});
 if(!r.ok)throw Error('No se pudo consultar el cliente registrado.');
 const rows=await r.json();
 if(rows.length!==1)throw Error('El cliente debe registrarse en ThinkStore y confirmar su correo antes de continuar.');
 const c=validate(normalize(rows[0]));
 if(!/^[0-9a-f-]{36}$/i.test(c.id))throw Error('El cliente no está vinculado a una cuenta verificada.');
 const ar=await fetch(conf.url+'/auth/v1/admin/users/'+encodeURIComponent(c.id),{headers});
 if(!ar.ok)throw Error('No se pudo verificar la cuenta del cliente.');
 const au=await ar.json(),u=au.user||au;
 if(!u.email_confirmed_at||clean(u.email).toLowerCase()!==c.email)throw Error('El cliente debe confirmar su correo antes de continuar.');
 return {...c,email_verified:true};
}
module.exports={normalize,validate,load};
