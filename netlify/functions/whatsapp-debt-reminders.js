const C=require('./_whatsapp-core');
exports.handler=async()=>{
 const enabled=String(process.env.WHATSAPP_DEBT_AUTOMATION_ENABLED||'').toLowerCase()==='true';
 if(!enabled)return{statusCode:200,body:JSON.stringify({ok:true,enabled:false,message:'Recordatorios WhatsApp desactivados'})};
 const template=C.clean(process.env.WHATSAPP_DEBT_TEMPLATE_NAME),lang=C.clean(process.env.WHATSAPP_TEMPLATE_LANG||'es_VE');
 if(!template)return{statusCode:500,body:JSON.stringify({ok:false,error:'Falta WHATSAPP_DEBT_TEMPLATE_NAME'})};
 const minAge=Number(process.env.WHATSAPP_DEBT_MIN_AGE_HOURS||24),gap=Number(process.env.WHATSAPP_DEBT_INTERVAL_HOURS||72),max=Number(process.env.WHATSAPP_DEBT_MAX_REMINDERS||3),limit=Number(process.env.WHATSAPP_DEBT_DAILY_LIMIT||25);
 const now=Date.now(),candidates=await C.debtCandidates();let sent=0,skipped=0,errors=[];
 for(const c of candidates){if(sent>=limit)break;try{
   if(c.due_date){const dueAt=new Date(`${c.due_date}T00:00:00-04:00`).getTime()+86400000;if(Number.isFinite(dueAt)&&now<dueAt){skipped++;continue}}const updated=new Date(c.updated_at||0).getTime();if(updated&&now-updated<minAge*3600000){skipped++;continue}
   const contact=await C.getContact(c.phone);if(!contact?.opt_in||contact?.opt_out_at||contact?.opt_in_source!=='customer_reactivation'){skipped++;continue}
   const st=await C.reminderState(c);let count=Number(st?.sent_count||0);if(st&&Number(st.last_balance_usd||0)>c.balance+0.009)count=0;
   if(count>=max){skipped++;continue}if(st?.last_sent_at&&now-new Date(st.last_sent_at).getTime()<gap*3600000){skipped++;continue}
   const first=C.clean(c.name).split(/\s+/)[0]||'cliente';const response=await C.sendTemplate(c.phone,template,lang,[first,c.code,C.money(c.balance),c.description]);const mid=response?.messages?.[0]?.id||null;
   await C.logMessage({wa_message_id:mid,phone_e164:c.phone,direction:'outbound',message_type:'template',template_name:template,status:'sent',source:'debt_reminder',entity_type:c.entity_type,entity_id:c.entity_id,body_preview:`Saldo ${C.money(c.balance)}`,payload:response});
   await C.saveReminderState(c,{last_sent_at:new Date().toISOString(),sent_count:count+1,last_message_id:mid});sent++;
  }catch(e){errors.push({entity_id:c.entity_id,error:e.message});}}
 return{statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify({ok:errors.length===0,enabled:true,candidates:candidates.length,sent,skipped,errors:errors.slice(0,10)})};
};
