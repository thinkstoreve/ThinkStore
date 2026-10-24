const C=require('./_whatsapp-core');
const Intake=require('./_whatsapp-intake');
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
      for(const echo of value.message_echoes||[]){if(!echo.id||await C.seenMessage(echo.id))continue;const phone=C.normalizePhone(echo.to);if(!phone)continue;await C.logMessage({wa_message_id:echo.id,phone_e164:phone,direction:'outbound',message_type:echo.type||'unknown',status:'sent',source:'whatsapp_business_app',body_preview:C.clean(echo.text?.body||'['+(echo.type||'Archivo')+']',1500),payload:echo});const c=await C.getContact(phone);await C.upsertContact(phone,{last_outbound_at:new Date().toISOString(),needs_human:true,metadata:{...(c?.metadata||{}),care_assistant:{...(c?.metadata?.care_assistant||{}),active:false}}});}
      for(const st of value.statuses||[])await C.updateStatus(st.id,st.status,st);
      for(const m of value.messages||[]){if(!m?.id||await C.seenMessage(m.id))continue;const phone=C.normalizePhone(m.from),text=C.clean(m.text?.body||m.button?.text||m.interactive?.button_reply?.title||m.interactive?.list_reply?.title||'',1500);if(!phone)continue;
        await C.logMessage({wa_message_id:m.id,phone_e164:phone,direction:'inbound',message_type:m.type||'unknown',status:'received',source:'webhook',body_preview:text,payload:m});
        const current=await C.getContact(phone),n=C.norm(text),now=new Date().toISOString();
        if(/^(stop|salir|baja|cancelar notificaciones)$/.test(n)){
          await C.upsertContact(phone,{opt_in:false,opt_out_at:now,last_inbound_at:now,last_message_preview:text,needs_human:true,metadata:{...(current?.metadata||{}),care_assistant:{...(current?.metadata?.care_assistant||{}),active:false}}});
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
        const metadata={...(current?.metadata||{})}, intake=metadata.care_assistant;
        const human=/\b(asesor|humano|persona|agente)\b/.test(n)||/^(cancelar|salir|baja|stop)$/.test(n);
        if(human||current?.needs_human||!intake?.active||Date.parse(intake.expires_at||'')<Date.now()){
          if(intake?.active)metadata.care_assistant={...intake,active:false};
          await C.upsertContact(phone,{needs_human:true,metadata,last_intent:'human_first'});
          continue;
        }
        const requestType=Intake.TYPES.includes(intake.request_type)?intake.request_type:'think_care';const questions=Intake.questions(requestType);
        const fields=['name','device','location','problem'];
        let reply='';
        if(intake.step==='type'){const type=Intake.choose(text);if(type){metadata.care_assistant={...intake,request_type:type,step:'name'};await C.upsertContact(phone,{metadata});reply=Intake.labels[type]+'. '+Intake.questions(type).name;}else reply=Intake.menu;}
        else if(!text){reply='Para completar la solicitud necesito una respuesta escrita. Puedes escribir ASESOR para volver a atención personal.';}
        else if(intake.step==='confirm'){
          if(n==='si'||n==='confirmar'){
            const data=intake.data||{};
            await C.sb(C.mainCfg(),'think_care_requests?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({id:intake.request_id,name:data.name,phone,device:data.device,service:intake.service||'Essential',location:data.location,problem:data.problem,request_type:requestType,source:'thinkstore-whatsapp',status:'new'})});
            metadata.service_notifications_opt_in=true;metadata.service_notifications_opt_in_at=now;metadata.care_assistant={...intake,active:false,completed_at:now};
            await C.upsertContact(phone,{metadata,needs_human:true,last_intent:'care_request_created'});
            reply='Solicitud de '+Intake.labels[requestType]+' registrada. Referencia: '+intake.request_id.slice(0,8).toUpperCase()+'. Un asesor validará disponibilidad, condiciones y presupuesto. Esto no confirma una cita ni crea una orden o un cobro.';
          }else if(n==='no'||n==='corregir'){
            metadata.care_assistant={...intake,step:'name',data:{}};
            await C.upsertContact(phone,{metadata});reply='Vamos a corregir los datos. '+questions.name;
          }else{reply='Responde SÍ para autorizar el uso de estos datos y registrar la solicitud, NO para corregirlos o ASESOR para atención personal.';}
        }else{
          const limits={name:100,device:100,location:150,problem:1500};
          if(!fields.includes(intake.step)){await C.upsertContact(phone,{needs_human:true,metadata:{...metadata,care_assistant:{...intake,active:false}}});continue;}
          if(text.length>limits[intake.step]){reply='Tu respuesta es demasiado larga. Usa un máximo de '+limits[intake.step]+' caracteres. '+questions[intake.step];}
          else{
            const data={...(intake.data||{}),[intake.step]:text},next=fields[fields.indexOf(intake.step)+1]||'confirm';
            metadata.care_assistant={...intake,data,step:next};await C.upsertContact(phone,{metadata});
            reply=next==='confirm'?'Revisa tu solicitud de '+Intake.labels[requestType]+':\nNombre: '+data.name+'\nTeléfono: '+phone+'\nEquipo: '+data.device+'\nModalidad: '+(intake.service||'Essential')+'\nDirección: '+data.location+'\nProblema: '+data.problem+'\n\n¿Autorizas a ThinkStore a usar estos datos para gestionar esta solicitud y enviarte por WhatsApp sus actualizaciones? Responde SÍ para registrarla, NO para corregir o ASESOR para atención personal. La visita queda pendiente de coordinación.':questions[next];
          }
        }
        const sent=await C.sendText(phone,reply);await C.logMessage({wa_message_id:sent?.messages?.[0]?.id||null,phone_e164:phone,direction:'outbound',message_type:'text',status:'sent',source:'care_assistant',body_preview:reply,payload:sent});
      }
    }
    return out(200,{ok:true});
  }catch(e){console.error('whatsapp-webhook',e);return out(200,{ok:false,error:e.message});}
};
