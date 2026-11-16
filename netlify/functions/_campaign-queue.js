'use strict';
const D=require('./_campaign-delivery');
const KIND='daily_marketing_v1',STATE='daily_marketing_state_v1',BUDGET='daily_marketing_budget_v1';
const budgetId=D.historyId('thinkstore','daily-marketing-budget-v1');
const day=now=>new Date(now).toISOString().slice(0,10),month=now=>day(now).slice(0,7);
const nextDay=now=>new Date(Date.parse(day(now)+'T00:10:00Z')+86400000).toISOString();
const nextMonth=now=>{const d=new Date(now);return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1,0,10)).toISOString()};
const stamp=now=>new Date(now).toISOString();
const waitUntil=(code,now)=>['monthly_quota_exceeded','daily_quota_exceeded'].includes(code)?nextDay(now):new Date(now+3600000).toISOString();
const quotaNumber=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Math.max(0,Number(v)):null;
function summary(row){const q=row.content_json;return {id:row.id,name:row.subject,status:q.status,cursor:q.cursor||0,total:row.recipients_count,accepted:q.accepted||0,skipped:q.skipped||0,alreadySent:q.alreadySent||0,nextAttemptAt:q.nextAttemptAt,lastError:q.lastError||'',lastResult:q.lastResult||'',createdAt:row.created_at,updatedAt:q.updatedAt,version:q.version,dailyLimit:100};}
function repository(config){const c=config||{url:process.env.SUPABASE_URL,service:process.env.SUPABASE_SERVICE_ROLE_KEY};const base=String(c.url||'').replace(/\/$/,'')+'/rest/v1/marketing_campaigns';
 async function request(query='',method='GET',body,prefer='return=representation'){if(!c.url||!c.service)throw Error('No hay configuración de almacenamiento de campañas');const r=await fetch(base+query,{method,headers:{apikey:c.service,Authorization:'Bearer '+c.service,'Content-Type':'application/json',Prefer:prefer},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(7000)});const text=await r.text();let data=[];try{data=text?JSON.parse(text):[]}catch{}if(!r.ok)throw Error(data.message||data.error||'No se pudo guardar la cola diaria (HTTP '+r.status+')');return data;}
 return {
 async get(id){return (await request('?id=eq.'+encodeURIComponent(id)+'&limit=1'))[0]||null;},
 async create(row){await request('?on_conflict=id','POST',[row],'resolution=ignore-duplicates,return=minimal');return this.get(row.id);},
 async list(){return request('?content_json->>kind=eq.'+STATE+'&order=created_at.asc&limit=100');},
 async batches(jobId){return request('?content_json->>jobId=eq.'+encodeURIComponent(jobId)+'&select=id,recipients_count,sent_count,content_json,created_at&order=created_at.asc&limit=1000');},
 async cas(row,state,extra={}){const json={...state,version:Number(row.content_json.version||0)+1,updatedAt:stamp(Date.now())};const rows=await request('?id=eq.'+row.id+'&content_json->>version=eq.'+row.content_json.version,'PATCH',{content_json:json,...extra});return rows[0]||null;},
 async totals(id,accepted,skipped){await request('?id=eq.'+id,'PATCH',{sent_count:accepted,failed_count:skipped},'return=minimal');}
 };
}
async function create(repo,data,payload,from,{offset=0,alreadySent=[]}={},now=Date.now()){
 if(data.hash!==D.signature(payload,from))throw Error('El contenido cambió. Conserva la campaña original para programarla');
 const id=D.historyId(data.jobId,'daily-state'),existing=await repo.get(id);if(existing)return summary(existing);
 const duplicate=(await repo.list()).find(r=>['active','paused'].includes(r.content_json.status)&&r.content_json.contentHash===data.hash&&r.recipients_count===data.recipients.length);if(duplicate)return summary(duplicate);
 const batches=(await repo.batches(data.jobId)).sort((a,b)=>(a.content_json?.batchOffset||0)-(b.content_json?.batchOffset||0));let cursor=0,accepted=0,skipped=0;const acceptedByDay={};
 for(const b of batches){const at=Number(b.content_json?.batchOffset);if(at!==cursor)break;const count=Number(b.recipients_count);if(!Number.isInteger(count)||count<=0)break;cursor+=count;accepted+=Number(b.sent_count||0);skipped+=b.content_json?.skippedRecipients?.length||0;const date=day(Date.parse(b.created_at));acceptedByDay[date]=(acceptedByDay[date]||0)+Number(b.sent_count||0);}
 if(Number(offset)>cursor)throw Error('El avance local no coincide con los lotes confirmados. Se necesita revisar el historial antes de programar para evitar duplicados');
 const clean={...payload};['action','deliveryToken','deliveryOffset','deliveryCount'].forEach(k=>delete clean[k]);
 const exclude=[...new Set(alreadySent.map(D.email).filter(D.valid))].filter(e=>data.recipients.some(r=>r.email===e));
 const payloadId=D.historyId(data.jobId,'daily-payload');
 const row={id:payloadId,subject:clean.subject||'Campaña ThinkStore',title:clean.title||'',subtitle:clean.subtitle||'',audience:clean.audience||'all_contacts',recipients_count:data.recipients.length,sent_count:accepted,failed_count:skipped,banner_url:clean.bannerUrl||null,content_json:{...clean,kind:KIND,jobId:data.jobId,queueStateId:id,payload:clean,recipients:data.recipients,exclude,hash:data.hash,from,sources:data.sources},created_at:stamp(now)};
 await repo.create(row);
 const state={id,subject:row.subject,title:row.title,subtitle:'Cola diaria automática',audience:row.audience,recipients_count:row.recipients_count,sent_count:accepted,failed_count:skipped,banner_url:null,content_json:{kind:STATE,version:0,payloadId,jobId:data.jobId,contentHash:data.hash,status:cursor>=data.recipients.length?'completed':'active',cursor,accepted,skipped,alreadySent:exclude.length,acceptedByDay,nextAttemptAt:stamp(now),lastError:'',lastResult:'Programada para comprobar el cupo disponible',inflight:null,updatedAt:stamp(now)},created_at:stamp(now)};
 return summary(await repo.create(state));
}
async function change(repo,id,pause){for(let i=0;i<3;i++){const row=await repo.get(id);if(!row||row.content_json?.kind!==STATE)throw Error('No se encontró la cola');if(row.content_json.status==='completed')return summary(row);if(row.content_json.status==='needs_review'&&!pause)throw Error('Esta cola necesita revisar un intento no confirmado antes de reanudar');const state={...row.content_json,pauseRequested:pause,status:pause?'paused':'active',nextAttemptAt:pause?row.content_json.nextAttemptAt:stamp(Date.now())};const saved=await repo.cas(row,state);if(saved)return summary(saved);}throw Error('La cola cambió en otra sesión; actualiza su estado');}
async function commitState(repo,row,patch){for(let i=0;i<3;i++){const current=i?await repo.get(row.id):row;const state={...current.content_json,...patch};if(current.content_json.pauseRequested&&state.status!=='completed')state.status='paused';const saved=await repo.cas(current,state,{sent_count:state.accepted||0,failed_count:state.skipped||0});if(saved)return saved;}throw Error('No se pudo confirmar el avance; el siguiente intento conservará la misma referencia');}
async function run(repo,dispatch,{now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms)),maxMillis=22000,maxCalls=12}={}){
 const started=now();let budget=await repo.get(budgetId);if(!budget)budget=await repo.create({id:budgetId,subject:'Control de cuota diaria de marketing',title:'Control interno',audience:'manual',recipients_count:0,sent_count:0,failed_count:0,content_json:{kind:BUDGET,version:0,leaseUntil:0,day:day(started),month:month(started),daySent:0,monthSent:0,nextAttemptAt:stamp(started)},created_at:stamp(started)});
 if(budget.content_json.leaseUntil>started)return {ok:true,status:'busy'};
 const lease=await repo.cas(budget,{...budget.content_json,leaseUntil:started+120000});if(!lease)return {ok:true,status:'busy'};budget=lease;
 let q,record,calls=0;
 try{
  const states=await repo.list(),date=day(started),period=month(started);let b={...budget.content_json};
  if(b.day!==date){Object.assign(b,{day:date,daySent:0,providerDaily:null});}if(b.month!==period){Object.assign(b,{month:period,monthSent:0,providerMonthly:null});}
  b.daySent=Math.max(b.daySent||0,states.reduce((s,r)=>s+(r.content_json.acceptedByDay?.[date]||0),0));
  b.monthSent=Math.max(b.monthSent||0,states.reduce((s,r)=>s+Object.entries(r.content_json.acceptedByDay||{}).filter(([d])=>d.startsWith(period)).reduce((a,[,n])=>a+n,0),0));
  if(b.nextAttemptAt&&Date.parse(b.nextAttemptAt)>started){budget=await repo.cas(budget,b)||budget;return {ok:true,status:'waiting_quota',nextAttemptAt:b.nextAttemptAt};}
  record=states.find(r=>r.content_json.status==='active'&&Date.parse(r.content_json.nextAttemptAt||0)<=started);if(!record)return {ok:true,status:'idle'};
  q=record.content_json;const stored=await repo.get(q.payloadId);if(stored?.content_json?.kind!==KIND)throw Error('No se encontró el contenido persistente de la campaña');const content=stored.content_json;
  if(content.from!==(process.env.FROM_MARKETING_EMAIL||process.env.FROM_INFO_EMAIL||'ThinkStore <info@thinkstore.com.ve>')){record=await commitState(repo,record,{status:'needs_review',lastError:'Cambió el remitente. Revisa la campaña antes de continuar'});return{ok:true,status:'needs_review'};}
  while(calls<maxCalls&&now()-started<maxMillis){q=record.content_json;if(q.status!=='active'||q.pauseRequested)break;
   const dailyLeft=Math.max(0,100-Math.max(b.daySent||0,b.providerDaily||0)),monthlyLeft=b.monthlyWaiting?1:Math.max(0,3000-(b.providerMonthly||0));
   if(!q.inflight&&(!dailyLeft||!monthlyLeft)){const next=nextDay(now());if(monthlyLeft===0)b.monthlyWaiting=true;b.nextAttemptAt=next;record=await commitState(repo,record,{nextAttemptAt:next,lastResult:monthlyLeft===0?'Esperando cuota mensual':'Esperando cuota diaria'});break;}
   const retrying=!!q.inflight;let attempt=q.inflight;
   if(attempt&&now()-Date.parse(attempt.startedAt)>23*3600000){record=await commitState(repo,record,{status:'needs_review',lastError:'Un lote quedó sin confirmar por más de 23 horas. Se detuvo para evitar duplicar correos'});break;}
   if(!attempt){const count=Math.min(q.probe||b.monthlyWaiting?1:b.providerDaily===null||b.providerDaily===undefined?1:dailyLeft,monthlyLeft,100,stored.recipients_count-q.cursor);attempt={offset:q.cursor,count,key:'marketing/'+q.jobId+'/'+q.cursor,startedAt:stamp(now())};record=await commitState(repo,record,{inflight:attempt,lastError:''});}
   const prepared={recipients:content.recipients,sources:content.sources||{},warnings:[],jobId:content.jobId,hash:content.hash,queue:true,suppressed:content.exclude||[],expiresAt:now()+6*3600000};
   calls++;let response;
   try{response=await dispatch({...content.payload,action:'batch',deliveryOffset:attempt.offset,deliveryCount:attempt.count,deliveryToken:D.seal(prepared,process.env.SUPABASE_SERVICE_ROLE_KEY)});}catch(e){record=await commitState(repo,record,{nextAttemptAt:new Date(now()+3600000).toISOString(),lastError:'No se confirmó la respuesta del proveedor; se reintentará el mismo lote'});break;}
   if(!response.ok){const code=response.providerError||'',quota=response.quota||{};if(quota.daily!==null&&quota.daily!==undefined)b.providerDaily=quota.daily;if(quota.monthly!==null&&quota.monthly!==undefined)b.providerMonthly=quota.monthly;
    if(code==='daily_quota_exceeded'||code==='monthly_quota_exceeded'){if(retrying){record=await commitState(repo,record,{nextAttemptAt:new Date(now()+3600000).toISOString(),lastError:'Un intento anterior sigue sin confirmar; conservamos la misma referencia para evitar duplicados'});break;}if(attempt.count>1){record=await commitState(repo,record,{inflight:null,probe:true,lastResult:'Comprobando cupo restante con un solo destinatario'});continue;}const next=waitUntil(code,now());if(code==='monthly_quota_exceeded')b.monthlyWaiting=true;b.nextAttemptAt=next;record=await commitState(repo,record,{inflight:null,probe:false,nextAttemptAt:next,lastResult:code==='monthly_quota_exceeded'?'Esperando cuota mensual':'Esperando cuota diaria',lastError:''});break;}
    if(response.httpStatus>=400&&response.httpStatus<500&&response.httpStatus!==429){record=await commitState(repo,record,{status:'needs_review',lastError:response.error||'El proveedor rechazó la preparación'});break;}
    record=await commitState(repo,record,{nextAttemptAt:new Date(now()+3600000).toISOString(),lastError:response.error||'Respuesta pendiente; se reintentará el mismo lote'});break;
   }
   const accepted=response.accepted||0,skipped=response.skipped||0,quota=response.quota||{},current=await repo.get(record.id);q=current.content_json;
   if(q.inflight?.offset!==attempt.offset)throw Error('El lote cambió mientras se procesaba');
   const acceptedByDay={...q.acceptedByDay,[day(now())]:(q.acceptedByDay?.[day(now())]||0)+accepted};
   const nextCursor=response.nextOffset;if(nextCursor<=q.cursor)throw Error('El proveedor no confirmó avance');
   record=await commitState(repo,current,{cursor:nextCursor,accepted:(q.accepted||0)+accepted,skipped:(q.skipped||0)+skipped,acceptedByDay,inflight:null,probe:false,status:response.done?'completed':'active',lastError:'',lastResult:'Lote confirmado',nextAttemptAt:stamp(now()),lastProviderIds:response.providerIds||[]});
   b.daySent+=accepted;b.monthSent+=accepted;if(accepted)b.monthlyWaiting=false;if(quota.daily!==null&&quota.daily!==undefined)b.providerDaily=quota.daily;if(quota.monthly!==null&&quota.monthly!==undefined)b.providerMonthly=quota.monthly;
   budget=await repo.cas(budget,b)||budget;b={...budget.content_json};await repo.totals(q.payloadId,record.content_json.accepted,record.content_json.skipped);
   if(response.done)break;if(calls<maxCalls&&now()-started<maxMillis)await sleep(650);
  }
  budget=await repo.cas(budget,b)||budget;return {ok:true,status:record.content_json.status,calls,queue:summary(record)};
 }finally{const fresh=await repo.get(budgetId);if(fresh&&fresh.content_json.leaseUntil===lease.content_json.leaseUntil)await repo.cas(fresh,{...fresh.content_json,leaseUntil:0});}
}
module.exports={repository,create,change,run,summary,day,month,nextDay,nextMonth,quotaNumber,KIND,STATE,BUDGET,budgetId};
