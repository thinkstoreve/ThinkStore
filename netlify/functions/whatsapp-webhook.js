const C=require('./_whatsapp-core');
const H={'Content-Type':'application/json'};
const out=(s,b)=>({statusCode:s,headers:H,body:JSON.stringify(b)});
exports.handler=async(event)=>{
  if(event.httpMethod==='GET'){
    const q=event.queryStringParameters||{},c=C.waCfg();
    if(q['hub.mode']==='subscribe'&&q['hub.verify_token']&&q['hub.verify_token']===c.verifyToken)return{statusCode:200,headers:{'Content-Type':'text/plain'},body:String(q['hub.challenge']||'')};
    return out(403,{ok:false,error:'verify_token_invalid'});
  }
  if(event.httpMethod!=='POST')return out(405,{ok:false});
  const raw=event.body||'';if(!C.verifySignature(raw,event.headers['x-hub-signature-256']||event.headers['X-Hub-Signature-256']))return out(401,{ok:false,error:'invalid_signature'});
  let body={};try{body=JSON.parse(raw||'{}')}catch{return out(400,{ok:false,error:'invalid_json'})}
  try{
    for(const entry of body.entry||[])for(const change of entry.changes||[]){const value=change.value||{};
      for(const st of value.statuses||[])await C.updateStatus(st.id,st.status,st);
      for(const m of value.messages||[]){if(!m?.id||await C.seenMessage(m.id))continue;const phone=C.normalizePhone(m.from),text=C.clean(m.text?.body||m.button?.text||m.interactive?.button_reply?.title||m.interactive?.list_reply?.title||'',1500);if(!phone)continue;
        await C.logMessage({wa_message_id:m.id,phone_e164:phone,direction:'inbound',message_type:m.type||'unknown',status:'received',source:'webhook',body_preview:text,payload:m});
        const current=await C.getContact(phone),n=C.norm(text),now=new Date().toISOString();
        if(/^(stop|salir|baja|cancelar notificaciones)$/.test(n)){
          await C.upsertContact(phone,{opt_in:false,opt_out_at:now,last_inbound_at:now,last_message_preview:text,needs_human:false});
          const sent=await C.sendText(phone,'Listo. Pausamos las notificaciones automáticas de ThinkStore. Puedes escribir ACTIVAR cuando quieras volver a recibirlas.');
          await C.logMessage({wa_message_id:sent?.messages?.[0]?.id||null,phone_e164:phone,direction:'outbound',message_type:'text',status:'sent',source:'auto_reply',body_preview:'Opt-out confirmado',payload:sent});continue;
        }
        if(/^activar$/.test(n)){
          await C.upsertContact(phone,{opt_in:true,opt_in_source:'customer_reactivation',opt_in_at:now,opt_out_at:null,last_inbound_at:now,last_message_preview:text});
          const sent=await C.sendText(phone,'Perfecto. Activamos tus avisos de ThinkStore, incluidos recordatorios de saldo. Escribe BAJA para desactivarlos. ✅ ¿En qué te puedo ayudar?');
          await C.logMessage({wa_message_id:sent?.messages?.[0]?.id||null,phone_e164:phone,direction:'outbound',message_type:'text',status:'sent',source:'auto_reply',body_preview:'Opt-in reactivado',payload:sent});continue;
        }
        const optedOut=current&&current.opt_in===false&&current.opt_out_at;
        await C.upsertContact(phone,{name:C.clean(value.contacts?.find(x=>x.wa_id===m.from)?.profile?.name||current?.name||'',160),opt_in:optedOut?false:(current?.opt_in===true),opt_in_source:current?.opt_in_source||'customer_inbound',opt_in_at:current?.opt_in_at||null,last_inbound_at:now,last_message_preview:text});
        if(/\b(asesor|humano|persona|agente)\b/.test(n)){
          await C.upsertContact(phone,{needs_human:true,last_intent:'human_handoff'});const sent=await C.sendText(phone,'Claro. Marqué tu conversación para atención humana. Un asesor de ThinkStore continuará por este mismo WhatsApp.');
          await C.logMessage({wa_message_id:sent?.messages?.[0]?.id||null,phone_e164:phone,direction:'outbound',message_type:'text',status:'sent',source:'human_handoff',body_preview:'Solicitud de asesor',payload:sent});continue;
        }
        if(!text){const sent=await C.sendText(phone,'Recibí tu mensaje. Por ahora puedo responder texto automáticamente. Si necesitas un asesor, escribe “asesor”.');await C.logMessage({wa_message_id:sent?.messages?.[0]?.id||null,phone_e164:phone,direction:'outbound',message_type:'text',status:'sent',source:'auto_reply',body_preview:'Tipo no soportado',payload:sent});continue;}
        const reply=await C.smartReply(text);const sent=await C.sendText(phone,reply);await C.upsertContact(phone,{last_outbound_at:new Date().toISOString(),last_intent:C.norm(text).slice(0,120)});await C.logMessage({wa_message_id:sent?.messages?.[0]?.id||null,phone_e164:phone,direction:'outbound',message_type:'text',status:'sent',source:'thinky_whatsapp',body_preview:reply,payload:sent});
      }
    }
    return out(200,{ok:true});
  }catch(e){console.error('whatsapp-webhook',e);return out(200,{ok:false,error:e.message});}
};
