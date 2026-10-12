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
async function load(conf,email,options={}){
 email=clean(email).toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Indica el correo del cliente registrado.');
 const headers={apikey:conf.key,Authorization:'Bearer '+conf.key};
 const r=await fetch(conf.url+'/rest/v1/clientes?select=*&correo=eq.'+encodeURIComponent(email)+'&limit=2',{headers});
 if(!r.ok)throw Error('No se pudo consultar el cliente registrado.');
 const rows=await r.json();
 if(rows.length!==1)throw Error('El cliente debe registrarse en ThinkStore y confirmar su correo antes de continuar.');
 const c=normalize(rows[0]);
 if(!/^[0-9a-f-]{36}$/i.test(c.id))throw Error('El cliente no está vinculado a una cuenta verificada.');
 const ar=await fetch(conf.url+'/auth/v1/admin/users/'+encodeURIComponent(c.id),{headers});
 if(!ar.ok)throw Error('No se pudo verificar la cuenta del cliente.');
 const au=await ar.json(),u=au.user||au;
 if(!u.email_confirmed_at||clean(u.email).toLowerCase()!==c.email)throw Error('El cliente debe confirmar su correo antes de continuar.');
 if(!options.allowIncomplete)validate(c);
 return {...c,email_verified:true};
}

// La recepcionista solo puede completar datos faltantes de una cuenta cuyo
// correo e identidad Auth ya fueron verificados. Nunca sustituye valores existentes.
async function completeFromReception(conf,email,input={}){
 const current=await load(conf,email,{allowIncomplete:true});
 const specs={
  name:{column:'nombre',max:160},phone:{column:'telefono',max:30},
  document:{column:'cedula_rif',max:60},address:{column:'direccion',max:500},
  city:{column:'ciudad',max:120},state:{column:'estado',max:120}
 };
 const incoming=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 const changes={},merged={...current};
 for(const [field,{column,max}] of Object.entries(specs)){
  const value=clean(incoming[field]);
  if(!merged[field]&&value){
   if(value.length>max)throw Error('El dato de '+field+' es demasiado largo.');
   changes[column]=value;
   merged[field]=value;
  }
 }
 // Ningún cambio se escribe si aún falta un dato indispensable.
 validate(merged);
 if(!Object.keys(changes).length)return {...current,profile_updated:false};
 if(!conf?.url||!conf?.key)throw Error('No está configurada la actualización de clientes.');
 const headers={apikey:conf.key,Authorization:'Bearer '+conf.key,'Content-Type':'application/json',Prefer:'return=representation'};
 // PATCH condicional: si otro proceso completó alguno de estos campos entretanto,
 // no pisamos sus cambios; se devuelve un conflicto y se solicita reintentar.
 const guards=Object.keys(changes).map(col=>`or(${col}.is.null,${col}.eq.)`).join(',');
 const query=`id=eq.${encodeURIComponent(current.id)}&and=(${guards})`;
 const response=await fetch(`${conf.url}/rest/v1/clientes?${query}`,{method:'PATCH',headers,body:JSON.stringify(changes)});
 if(!response.ok)throw Error('No se pudieron guardar los datos del perfil registrado. Reintenta la recepción.');
 const rows=await response.json().catch(()=>[]);
 if(!Array.isArray(rows)||rows.length!==1)throw Error('El perfil cambió mientras se guardaba. Actualiza los datos del cliente e inténtalo nuevamente.');
 const updated=normalize(rows[0]);
 if(updated.id!==current.id||updated.email!==current.email)throw Error('No se pudo comprobar la actualización del cliente.');
 return {...validate(updated),email_verified:true,profile_updated:true};
}
module.exports={normalize,validate,load,completeFromReception};
