/* Versioned membership data stays in the existing audited request revision. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ThinkCareMembership=api;})(typeof window==='object'?window:this,()=>{
'use strict';
const marker='\n[THINKCARE_PLAN_V1]';
const names={empresas:'ThinkCare Empresas',personal:'ThinkCare Personal / Freelancer',gamer:'ThinkCare Gamer','pc-gamer':'ThinkCare PC Gamer'};
function read(note){const text=String(note||''),at=text.lastIndexOf(marker);if(at<0)return{note:text,plan:null};try{const plan=JSON.parse(text.slice(at+marker.length));if(plan.version!==1)return{note:text,plan:null};return{note:text.slice(0,at),plan};}catch{return{note:text,plan:null}}}
const number=v=>v==null||v===''?null:Number(v);
function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
function shift(start,months,day){const [y,m,d]=start.split('-').map(Number),date=new Date(Date.UTC(y,m-1+months,1,12));const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day||d,last));return date.toISOString().slice(0,10);}
function validate(p){if(!p)return null;const plan={version:1,active:!!p.active,devices:number(p.devices),visits:number(p.visits),months:number(p.months),start:String(p.start||''),price:number(p.price),reviews:String(p.reviews||'').trim().slice(0,250),confirmed:!!p.confirmed};
for(const [key,max] of [['devices',1000],['visits',60],['months',12]])if(plan[key]!==null&&(!Number.isInteger(plan[key])||plan[key]<1||plan[key]>max))throw Error('Revisa equipos, visitas y frecuencia del plan');
if(plan.price!==null&&(!Number.isFinite(plan.price)||plan.price<0||plan.price>1000000||Math.abs(plan.price*100-Math.round(plan.price*100))>.00001))throw Error('Precio inválido');
if(plan.start&&!validDate(plan.start))throw Error('Fecha inicial inválida');
if(p.code){if(!names[p.code])throw Error('Selecciona un plan ThinkCare válido');plan.code=p.code;}
if(p.term_months!==undefined&&p.term_months!==null&&p.term_months!==''){plan.term_months=Number(p.term_months);if(![1,6,12].includes(plan.term_months))throw Error('Duración inválida');}
if(p.cadence==='twice_monthly'){plan.cadence='twice_monthly';plan.second_day=Number(p.second_day);if(plan.months!==1||!Number.isInteger(plan.second_day)||plan.second_day<1||plan.second_day>28||plan.start&&Number(plan.start.slice(8))===plan.second_day)throw Error('Para dos visitas al mes, usa frecuencia mensual y un segundo día diferente entre 1 y 28');}
if(plan.active&&(!plan.confirmed||!plan.start||!plan.devices||!plan.visits||!plan.months||plan.price===null||!plan.reviews))throw Error('Para activar, completa las condiciones y confirma la aceptación del cliente');return plan;}
function write(note,p){const plan=validate(p),text=String(note||'').trim()+(plan?marker+JSON.stringify(plan):'');if(text.length>1200)throw Error('Reduce la nota interna para guardar el plan completo');return text;}
function expiry(plan){const p=validate(plan);return p?.start&&p.term_months?shift(p.start,p.term_months):null;}
function dates(plan){const p=validate(plan);if(!p?.start||!p.visits||!p.months)return[];const end=expiry(p),day=Number(p.start.slice(8));const dates=Array.from({length:p.visits},(_,i)=>{if(p.cadence!=='twice_monthly')return shift(p.start,i*p.months);const second=i%2===1,offset=Math.floor(i/2)+(second&&p.second_day<day?1:0);return shift(p.start,offset,second?p.second_day:day);}).filter(d=>!end||d<end);if(new Set(dates).size!==dates.length)throw Error('Las fechas de las visitas coinciden; ajusta los días del calendario');return dates;}
function today(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
function due(plan,now=new Date()){if(!validate(plan)?.active)return[];const horizon=today(new Date(now.getTime()+7*86400000));return dates(plan).map((date,index)=>({date,index})).filter(x=>x.date<=horizon);}
function visitLink(row){const m=String(row.problem||'').match(/Fecha prevista: (\d{4}-\d{2}-\d{2})[\s\S]*?Plan: ([a-f0-9-]{36})\./i);return row.source==='membership-calendar'&&m?{date:m[1],parent:m[2]}:null;}
function events(rows,now=new Date()){
 const result=[],links=new Map(),byId=new Map(rows.map(r=>[r.id,r]));
 for(const r of rows){const link=visitLink(r);if(link)links.set(link.parent+':'+link.date,r);}
 for(const r of rows){const p=read(r.internal_note).plan,link=visitLink(r);if(p&&p.active&&!['cancelled','completed'].includes(r.status)){try{for(const [index,date] of dates(p).entries()){if(links.has(r.id+':'+date))continue;result.push({key:r.id+':'+date,id:r.id,date,name:r.name,plan:names[p.code]||'Membresía ThinkCare',kind:'planned',label:'Visita '+(index+1)+' prevista',status:'Por coordinar',phone:r.phone,location:r.location});}const end=expiry(p);if(end)result.push({key:r.id+':renewal',id:r.id,date:end,name:r.name,plan:names[p.code]||'Membresía ThinkCare',kind:'renewal',label:'Vencimiento / renovar',status:'Revisar renovación',phone:r.phone,location:r.location});}catch{/* Invalid legacy records remain visible in the inbox. */}}
 if(['cancelled','completed'].includes(r.status))continue;
 const date=r.scheduled_at?today(new Date(r.scheduled_at)):link?.date;if(date&&!p){const parent=link?read(byId.get(link.parent)?.internal_note).plan:null;result.push({key:r.id,id:r.id,date,time:r.scheduled_at?new Intl.DateTimeFormat('es-VE',{timeZone:'America/Caracas',hour:'2-digit',minute:'2-digit'}).format(new Date(r.scheduled_at)):'',name:r.name,plan:names[parent?.code]||names[p?.code]||r.service||'ThinkCare',kind:r.status==='scheduled'?'confirmed':'pending',label:r.status==='scheduled'?'Visita agendada':'Visita por coordinar',status:r.status,phone:r.phone,location:r.location});}}
 return result.sort((a,b)=>a.date.localeCompare(b.date)||a.key.localeCompare(b.key));
}
function reminders(rows,now=new Date()){const day=today(now),horizon=today(new Date(now.getTime()+7*86400000));return events(rows,now).filter(e=>e.date<=horizon).map(e=>({...e,overdue:e.date<day}));}
return{read,write,validate,dates,due,expiry,events,reminders,names,today,visitLink};});
