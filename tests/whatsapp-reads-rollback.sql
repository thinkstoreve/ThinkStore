-- Solo validación transaccional: no envía mensajes y revierte todos los datos.
begin;
do $$ declare u uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); other uuid:=gen_random_uuid(); outbound uuid:=gen_random_uuid(); p text:='58424'||lpad(floor(random()*100000000)::bigint::text,8,'0'); p2 text:='58426'||lpad(floor(random()*100000000)::bigint::text,8,'0'); n integer; j jsonb; begin
 insert into public.whatsapp_contacts(phone_e164,name) values(p,'Validación revertida'),(p2,'Validación de alcance revertida');
 insert into public.whatsapp_message_log(id,phone_e164,direction,source,body_preview) values(a,p,'inbound','validation','Primero'),(b,p,'inbound','validation','Segundo'),(other,p2,'inbound','validation','Otro chat'),(outbound,p,'outbound','validation','Salida');
 select (x->>'unread_count')::integer into n from jsonb_array_elements(public.ts_whatsapp_alerts(u)->'conversations') x where x->>'phone_e164'=p;
 if n<>2 then raise exception 'Conteo inicial incorrecto';end if;
 n:=public.ts_whatsapp_mark_read(u,p,array[a,other,outbound]);if n<>1 then raise exception 'La lectura afectó otro chat o una salida';end if;
 insert into public.whatsapp_message_log(id,phone_e164,direction,source,body_preview) values(c,p,'inbound','validation','Llegó después de consultar');
 perform public.ts_whatsapp_mark_read(u,p,array[a,b]);
 select (x->>'unread_count')::integer into n from jsonb_array_elements(public.ts_whatsapp_alerts(u)->'conversations') x where x->>'phone_e164'=p;
 if n<>1 then raise exception 'La lectura ocultó un mensaje nuevo';end if;
 select (x->>'unread_count')::integer into n from jsonb_array_elements(public.ts_whatsapp_alerts(v)->'conversations') x where x->>'phone_e164'=p;
 if n<>3 then raise exception 'La lectura se propagó a otro usuario';end if;
 select (x->>'unread_count')::integer into n from jsonb_array_elements(public.ts_whatsapp_inbox(u)) x where x->>'phone_e164'=p;
 if n<>1 then raise exception 'Bandeja y avisos no coinciden';end if;
 if has_function_privilege('anon','public.ts_whatsapp_alerts(uuid)','EXECUTE') or has_function_privilege('authenticated','public.ts_whatsapp_mark_read(uuid,text,uuid[])','EXECUTE') then raise exception 'RPC expuesta sin validación de Staff';end if;
end $$;
rollback;
