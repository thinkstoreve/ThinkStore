const clean=v=>String(v??'').trim();
const allowed={
 reception:['dashboard','appointments','orders','reception','bitacora','parts','clients','finance'],
 technician:['dashboard','orders','technical','bitacora','parts','clients']
};
// Invoked only after support-actions validates the Supabase session and active profile.
exports.manage=async({body,profile,user,req,url,key,reply})=>{
 if(!['admin','superadmin'].includes(profile.rol))return reply(403,{ok:false,error:'Solo administradores pueden gestionar el equipo.'});
 const email=clean(body.email).toLowerCase(),name=clean(body.nombre),role=clean(body.rol);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!name||name.length>120||!allowed[role])return reply(400,{ok:false,error:'Indica nombre, correo y un rol de recepcionista o técnico válido.'});
 const permissions=body.permissions;
 if(!Array.isArray(permissions)||permissions.some(p=>typeof p!=='string'||!allowed[role].includes(p)))return reply(400,{ok:false,error:'Los permisos deben pertenecer al rol seleccionado.'});
 if(email===user.email.toLowerCase())return reply(403,{ok:false,error:'No puedes modificar tu propia cuenta desde este formulario.'});
 const existing=(await req(`service_users?select=*&email=eq.${encodeURIComponent(email)}&limit=1`))?.[0];
 if(existing&&!allowed[existing.rol])return reply(403,{ok:false,error:'Este formulario no modifica cuentas administrativas ni otros roles.'});
 if(body.action==='save_user'&&!existing)return reply(404,{ok:false,error:'No se encontró el usuario. Utiliza Añadir e invitar.'});
 if(typeof body.activo!=='boolean')return reply(400,{ok:false,error:'Estado de usuario inválido.'});
 const row={email,nombre:name,rol:role,activo:body.activo,permissions:[...new Set(['dashboard',...permissions])]};
 try{await req(existing?`service_users?email=eq.${encodeURIComponent(email)}`:'service_users',{method:existing?'PATCH':'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(row)});}catch(error){return reply(400,{ok:false,error:'No se pudo guardar el usuario. Comprueba que ejecutaste la migración V14.38. '+error.message});}
 let sent=false,warning='';
 if(body.action==='invite_user'){
   const redirect=clean(process.env.SUPPORT_INVITE_REDIRECT_URL)||'https://soporte.thinkstore.com.ve/index.html';
   try{
   const r=await fetch(`${url}/auth/v1/invite?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({email,data:{name}})});
   const result=await r.json().catch(()=>({}));sent=r.ok;
   if(!sent)warning='Usuario guardado, pero el correo no se envió: '+(result.msg||result.message||result.error_description||'Error de Supabase Auth')+'. Si ya tiene cuenta, puede iniciar sesión con su contraseña.';
   }catch(error){warning='Usuario guardado, pero no se pudo confirmar el envío del correo. Revisa el usuario en Supabase Auth antes de reintentar.';}
 }
 try{await req('service_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_email:user.email,actor_role:profile.rol,action:body.action,entity_type:'service_user',entity_id:email,before_data:existing||null,after_data:{...row,invite_sent:sent}})});}catch(error){warning+=(warning?' ':'')+'Los cambios se guardaron, pero no se pudo registrar la auditoría.';}
 return reply(200,{ok:true,invite_sent:sent,warning,profile:row});
};
