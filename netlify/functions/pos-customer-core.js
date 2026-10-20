'use strict';
const clean=v=>String(v??'').trim();
const {normalize}=require('./registered-customer-core');
// POS only: selecting a CRM record is optional and never creates/edits an Auth account.
async function selectedCustomer(conf,id,email){
 id=clean(id);if(!id)return null;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw Error('Selecciona de nuevo el cliente existente.');
 const r=await fetch(conf.url+'/rest/v1/clientes?select=id,nombre,correo,telefono,cedula_rif,direccion,ciudad,estado&id=eq.'+encodeURIComponent(id)+'&limit=1',{headers:{apikey:conf.key,Authorization:'Bearer '+conf.key}});
 if(!r.ok)throw Error('No se pudo comprobar el cliente seleccionado.');
 const rows=await r.json();const c=rows[0]&&normalize(rows[0]);
 if(!c||c.id!==id||c.email!==clean(email).toLowerCase())throw Error('El cliente seleccionado cambió. Búscalo de nuevo o usa los datos manuales.');
 return c;
}
module.exports={selectedCustomer};
