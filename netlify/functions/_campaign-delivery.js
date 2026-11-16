'use strict';
const crypto=require('node:crypto');
const email=v=>String(v||'').trim().toLowerCase();
const valid=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const unique=rows=>[...new Map(rows.filter(r=>valid(r.email)).map(r=>[email(r.email),{...r,email:email(r.email),nombre:String(r.nombre||'Cliente ThinkStore').slice(0,100)}])).values()].sort((a,b)=>a.email.localeCompare(b.email,'en'));
async function pages(get,path){const rows=[];for(let offset=0;offset<50000;offset+=1000){const page=await get(path+'&limit=1000&offset='+offset);if(!Array.isArray(page))throw Error('Respuesta inválida al consultar destinatarios');rows.push(...page);if(page.length<1000)return rows;}throw Error('La fuente supera 50.000 registros; segmenta la consulta.');}
async function audience(get,getAuth,payload){
 const kind=payload.audience||'all_contacts';if(!['all_contacts','registered','direct_sales','filemaker','imported','newsletter','buyers','crm_tag','manual'].includes(kind))throw Error('Audiencia no reconocida');
 const warnings=[],sources={registered:0,direct_sales:0,imported:0,filemaker:0,newsletter:0,manual:0,suppressed:0};
 const optional=async(name,fn,required=false)=>{try{return await fn()}catch(e){if(required)throw e;warnings.push('No se pudo consultar '+name);return []}};
 const [clients,profiles,auth,directory,orders,subscriptions]=await Promise.all([
 optional('clientes',()=>pages(get,'clientes?select=*&order=id.asc'),kind==='registered'||kind==='all_contacts'),
 optional('perfiles',()=>pages(get,'profiles?select=*&order=id.asc')),
 optional('cuentas registradas',getAuth),
 optional('directorio importado',()=>pages(get,'ts_customer_directory?select=*&source=neq.Registrado&order=id.asc'),['all_contacts','filemaker','imported','crm_tag'].includes(kind)),
 optional('ventas directas',()=>pages(get,'pedidos?select=*&order=id.asc'),['all_contacts','direct_sales','buyers'].includes(kind)),
 optional('suscripciones',()=>pages(get,'newsletter_subscribers?select=email,status&order=email.asc'),kind==='newsletter')
 ]);
 const registered=unique([...clients,...profiles,...auth].map(c=>({id:c.id,email:c.correo||c.email,nombre:c.nombre||c.full_name||c.name||c.user_metadata?.full_name||c.user_metadata?.name,source:'registered'})));
 const imported=unique(directory.map(c=>({id:c.id,email:c.correo||c.email,nombre:c.nombre||c.name||c.full_name,source:/filemaker|icenter/i.test(c.source||'')?'filemaker':'imported'})));
 const filemaker=imported.filter(c=>c.source==='filemaker');
 const direct=unique(orders.map(o=>({id:o.id,client_id:o.cliente_id,email:o.guest_email||o.customer_email||o.email,nombre:o.guest_name||o.customer_name,source:'direct_sales'})));
 const newsletter=unique(subscriptions.filter(n=>n.status==='subscribed').map(n=>({email:n.email,source:'newsletter'})));
 const suppressed=new Set(subscriptions.filter(n=>['unsubscribed','bounced','complained','suppressed'].includes(n.status)).map(n=>email(n.email)));
 const manual=unique((Array.isArray(payload.manualEmails)?payload.manualEmails:[]).slice(0,500).map(e=>({email:e,source:'manual'})));
 Object.assign(sources,{registered:registered.length,direct_sales:direct.length,imported:imported.length,filemaker:filemaker.length,newsletter:newsletter.length,manual:manual.length});
 let rows=kind==='registered'?registered:kind==='direct_sales'?direct:kind==='filemaker'?filemaker:kind==='imported'?imported:kind==='newsletter'?newsletter:kind==='manual'?[]:[...registered,...imported,...direct,...newsletter];
 if(kind==='buyers'){const ids=new Set(orders.map(o=>String(o.cliente_id||'')));rows=[...registered.filter(c=>ids.has(String(c.id))),...direct];}
 if(kind==='crm_tag'){if(!payload.crmTag)throw Error('Selecciona una etiqueta CRM');const crm=await pages(get,'ts_customer_crm?select=email,tags&order=email.asc');const allowed=new Set(crm.filter(c=>Array.isArray(c.tags)&&c.tags.some(t=>String(t).toLowerCase()===String(payload.crmTag).toLowerCase())).map(c=>email(c.email)));rows=rows.filter(c=>allowed.has(c.email));}
 rows=unique([...rows,...manual]);sources.suppressed=rows.filter(c=>suppressed.has(c.email)).length;rows=rows.filter(c=>!suppressed.has(c.email));
 return {recipients:rows,sources,warnings};
}
const signature=(payload,from)=>{const ignored=new Set(['action','deliveryToken','deliveryOffset','previewOnly','testEmail']);const normalized=Object.fromEntries(Object.keys(payload).sort().filter(k=>!ignored.has(k)).map(k=>[k,payload[k]]));return crypto.createHash('sha256').update(JSON.stringify({from,payload:normalized})).digest('hex');};
const key=secret=>crypto.createHash('sha256').update(secret+'\0thinkstore-marketing-delivery-v1').digest();
function seal(data,secret){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(secret),iv),body=Buffer.concat([cipher.update(JSON.stringify(data)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');}
function unseal(token,secret){try{if(typeof token!=='string'||token.length>5000000)throw Error();const b=Buffer.from(token,'base64url'),d=crypto.createDecipheriv('aes-256-gcm',key(secret),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));const value=JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]));if(!value.expiresAt||Date.now()>value.expiresAt)throw Error();return value}catch{throw Error('La preparación de la campaña venció o no es válida. Comprueba la audiencia nuevamente.');}}
function snapshot(result,payload,from){return {...result,jobId:crypto.randomUUID(),hash:signature(payload,from),expiresAt:Date.now()+6*60*60*1000};}
function chunk(data,payload,from){if(data.hash!==signature(payload,from))throw Error('El contenido cambió. Comprueba la audiencia otra vez antes de enviar.');const offset=Number(payload.deliveryOffset||0);if(!Number.isInteger(offset)||offset<0||offset%100!==0||offset>=data.recipients.length)throw Error('Posición de envío inválida');return {offset,recipients:data.recipients.slice(offset,offset+100),idempotencyKey:'marketing/'+data.jobId+'/'+offset};}
function historyId(jobId,offset){const h=crypto.createHash('sha256').update(jobId+'/'+offset).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;}
async function diagnostics(apiKey,from,replyTo){const address=(String(from).match(/<([^>]+)>/)||[])[1]||from,domain=String(address).split('@')[1];const result={from,replyTo,domain,provider:'Resend',verified:null,records:[],warnings:[]};
 try{const res=await fetch('https://api.resend.com/domains',{headers:{Authorization:'Bearer '+apiKey},signal:AbortSignal.timeout(8000)}),list=await res.json();if(res.ok){const found=(list.data||[]).find(d=>d.name===domain);if(found){const r=await fetch('https://api.resend.com/domains/'+encodeURIComponent(found.id),{headers:{Authorization:'Bearer '+apiKey},signal:AbortSignal.timeout(8000)}),d=await r.json();if(r.ok){result.verified=d.status==='verified';result.records=(d.records||[]).map(x=>({type:x.record,status:x.status,name:x.name}));}}else result.warnings.push('No se encontró este dominio en la cuenta del proveedor.');}else result.warnings.push(res.status===401||res.status===403?'La clave permite enviar pero no se pudo consultar la verificación del dominio. Revisa Domains en Resend.':'No se pudo consultar el dominio en Resend.');}catch{result.warnings.push('No se pudo consultar la verificación del dominio.');}
 try{const res=await fetch('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent('_dmarc.'+domain)+'&type=TXT',{headers:{Accept:'application/dns-json'},signal:AbortSignal.timeout(8000)}),d=await res.json();result.dmarc=(d.Answer||[]).some(r=>String(r.data).includes('v=DMARC1'));if(!result.dmarc)result.warnings.push('No se detectó un registro DMARC para el dominio del remitente.');}catch{result.dmarc=null;result.warnings.push('No se pudo consultar DMARC.');}
 return result;
}
module.exports={email,valid,unique,pages,audience,signature,seal,unseal,snapshot,chunk,historyId,diagnostics};
