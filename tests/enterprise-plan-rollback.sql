begin;
do $$ declare aid uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); tid uuid:=gen_random_uuid(); r jsonb; payload jsonb; eid uuid; rev timestamptz; n integer; begin
 insert into public.enterprise_petty_cash_bank_accounts(id,code,institution_name,display_name,currency,opening_balance) values(aid,'validation-'||aid,'Validación','Solo transacción revertida','USD',100);
 insert into public.enterprise_payment_schedule(id,title,category,amount,currency,due_date,created_by_email) values(sid,'Validación revertida','service',25,'USD','2026-10-24','validation') returning updated_at into rev;
 payload:=jsonb_build_object('expected_updated_at',rev,'created_by_email','validation','amount_usd',25,'original_amount',25,'currency','USD','funded_by','company','bank_account_id',aid,'payment_method','Efectivo USD','occurred_at',now());
 r:=public.enterprise_pay_scheduled(sid,payload);eid:=(r->>'entry_id')::uuid;
 r:=public.enterprise_pay_scheduled(sid,payload);
 if r->>'entry_id'<>eid::text or (r->>'already_paid')::boolean<>true then raise exception 'Pago no idempotente';end if;
 select count(*) into n from public.enterprise_petty_cash_bank_movements where related_petty_movement_id='expense:'||eid and status='posted';
 if n<>1 then raise exception 'La salida bancaria no es única';end if;
 update public.enterprise_finance_entries set status='void' where id=eid;
 if exists(select 1 from public.enterprise_petty_cash_bank_movements where related_petty_movement_id='expense:'||eid and status='posted') then raise exception 'Anulación no sincronizada';end if;
 insert into public.enterprise_recurring_templates(id,title,category,amount,currency,due_day,active,actor_email) values(tid,'Validación mensual','service',10,'USD',31,true,'validation');
 perform public.enterprise_generate_month('2027-02-01','validation');perform public.enterprise_generate_month('2027-02-01','validation');
 select count(*) into n from public.enterprise_payment_schedule where recurring_template_id=tid and period_month='2027-02-01' and due_date='2027-02-28';
 if n<>1 then raise exception 'Recurrencia duplicada o fecha incorrecta';end if;
end $$;
rollback;
