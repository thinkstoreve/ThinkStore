-- Prueba transaccional SOLO en Soporte. No contacta a Meta; todos los datos se revierten.
BEGIN;
DO $$
DECLARE n integer;
BEGIN
 INSERT INTO public.service_orders(id,code,client_name,client_phone,device_model,reported_issue,status)
 VALUES(-2026102401,'TS-REVIEW-TEST-1','Prueba transaccional','0000000000','Equipo de prueba','Prueba','Listo para entregar'),
       (-2026102402,'TS-REVIEW-TEST-2','Prueba transaccional','0000000000','Equipo de prueba','Prueba','No reparado');
 IF EXISTS(SELECT 1 FROM public.service_review_deliveries WHERE order_id IN (-2026102401,-2026102402)) THEN RAISE EXCEPTION 'Se creó un aviso antes de la entrega'; END IF;
 UPDATE public.service_orders SET status='Entregado',delivery_outcome='repaired',delivered_at=now() WHERE id=-2026102401;
 UPDATE public.service_orders SET status='Entregado',delivery_outcome='not_repaired',delivered_at=now() WHERE id=-2026102402;
 SELECT count(*) INTO n FROM public.service_review_deliveries WHERE order_id IN (-2026102401,-2026102402) AND state='pending';
 IF n<>2 THEN RAISE EXCEPTION 'No se registraron ambas entregas'; END IF;
 SELECT count(*) INTO n FROM public.ts_claim_review_delivery(-2026102401,false);
 IF n<>1 THEN RAISE EXCEPTION 'No se pudo reservar el evento'; END IF;
 SELECT count(*) INTO n FROM public.ts_claim_review_delivery(-2026102401,true);
 IF n<>0 THEN RAISE EXCEPTION 'Se permitió un envío duplicado'; END IF;
 UPDATE public.service_orders SET status='En reparación' WHERE id=-2026102401;
 UPDATE public.service_orders SET status='Entregado',delivery_outcome='not_repaired' WHERE id=-2026102401;
 IF (SELECT count(*) FROM public.service_review_deliveries WHERE order_id=-2026102401)<>1 THEN RAISE EXCEPTION 'Reabrir creó una segunda invitación'; END IF;
 IF has_table_privilege('anon','public.service_review_deliveries','SELECT') OR has_table_privilege('authenticated','public.service_review_deliveries','UPDATE') OR has_function_privilege('authenticated','public.ts_claim_review_delivery(bigint,boolean)','EXECUTE') THEN RAISE EXCEPTION 'Permisos inseguros'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS: ambas entregas, reserva única, reapertura y acceso privado; todo revertido' AS resultado;
