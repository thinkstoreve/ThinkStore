-- V14.43: compatible con órdenes bigint, integer y UUID. No cambia los IDs existentes.
-- Ejecutar completo en Supabase de Soporte antes del catálogo.
begin;
do $compat$
declare order_type text;
begin
 select format_type(a.atttypid,a.atttypmod) into order_type
 from pg_attribute a where a.attrelid='public.service_orders'::regclass
 and a.attname='id' and not a.attisdropped;
 if order_type not in ('uuid','bigint','integer','smallint') or order_type is null then
  raise exception 'Tipo de service_orders.id no compatible: %',order_type;
 end if;
 execute replace($migration$
-- V14.42: ejecutar SOLO en Supabase de Soporte, después del esquema de producción y V14.38.
alter table public.service_parts add column if not exists catalog_details jsonb not null default '{}'::jsonb;
alter table public.service_parts add column if not exists published boolean not null default false;
create table if not exists public.service_workshop_quotes (
 id uuid primary key, order_id __ORDER_ID_TYPE__ references public.service_orders(id), client_name text not null,
 quoted_at timestamptz not null default now(), created_by text not null,
 state text not null default 'quoted' check(state in ('quoted','posted','cancelled')),
 total numeric(14,2) not null check(total>0), currency text not null default 'USD' check(currency='USD')
);
create table if not exists public.service_workshop_lines (
 id uuid primary key default gen_random_uuid(), quote_id uuid not null references public.service_workshop_quotes(id),
 kind text not null check(kind in ('labor','part','service')), description text not null,
 part_id uuid references public.service_parts(id), quantity integer not null check(quantity>0),
 unit_price numeric(14,2) not null check(unit_price>=0), unit_cost numeric(14,2) not null check(unit_cost>=0),
 total numeric(14,2) generated always as (quantity*unit_price) stored,
 check((kind='part' and part_id is not null) or (kind<>'part' and part_id is null))
);
create table if not exists public.service_workshop_payments (
 id uuid primary key, quote_id uuid not null references public.service_workshop_quotes(id),
 amount numeric(14,2) not null check(amount>0), paid_at timestamptz not null,
 method text not null, reference text not null default '', created_by text not null,
 original_currency text not null default 'USD' check(original_currency in ('USD','VES')),
 original_amount numeric(14,2) not null check(original_amount>0), exchange_rate numeric(18,6) not null check(exchange_rate>0),
 created_at timestamptz not null default now()
);
create index if not exists workshop_payments_date_idx on public.service_workshop_payments(paid_at);
create index if not exists workshop_quotes_order_idx on public.service_workshop_quotes(order_id);
create index if not exists workshop_lines_quote_idx on public.service_workshop_lines(quote_id);
alter table public.service_workshop_quotes enable row level security;
alter table public.service_workshop_lines enable row level security;
alter table public.service_workshop_payments enable row level security;
-- Access through authenticated server endpoints; no browser can fabricate a payment directly.
revoke all on public.service_workshop_quotes,public.service_workshop_lines,public.service_workshop_payments from anon,authenticated;
grant all on public.service_workshop_quotes,public.service_workshop_lines,public.service_workshop_payments to service_role;

create or replace function public.workshop_create_quote(p_id uuid,p_order_id __ORDER_ID_TYPE__,p_client text,p_lines jsonb,p_actor text)
returns uuid language plpgsql security definer set search_path=public as $$
declare item jsonb; sum_total numeric(14,2):=0; q integer; price numeric; cost numeric; part public.service_parts;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 if exists(select 1 from service_workshop_quotes where id=p_id) then return p_id; end if;
 if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)<1 or jsonb_array_length(p_lines)>100 then raise exception 'Añade de 1 a 100 conceptos'; end if;
 if coalesce(trim(p_client),'')='' then raise exception 'Indica el cliente'; end if;
 for item in select * from jsonb_array_elements(p_lines) loop
  q:=(item->>'quantity')::integer;price:=(item->>'unit_price')::numeric;cost:=(item->>'unit_cost')::numeric;
  if q is null or q<=0 or q>10000 or price is null or price<0 or price<>round(price,2) or cost is null or cost<0 or cost<>round(cost,2) then raise exception 'Cantidad, precio o costo inválido';end if;
  if item->>'kind' not in ('labor','part','service') or coalesce(trim(item->>'description'),'')='' then raise exception 'Concepto inválido'; end if;
  if item->>'kind'='part' then
   select * into part from service_parts where id=(item->>'part_id')::uuid and active=true;
   if not found or part.unit_cost is null then raise exception 'Repuesto no disponible o sin costo registrado';end if;
   cost:=part.unit_cost;
  end if;
  if item->>'kind'='labor' then cost:=0;end if;
  sum_total:=sum_total+q*price;
 end loop;
 if sum_total<=0 then raise exception 'La cotización debe ser mayor que cero';end if;
 insert into service_workshop_quotes(id,order_id,client_name,created_by,total) values(p_id,p_order_id,trim(p_client),p_actor,sum_total);
 for item in select * from jsonb_array_elements(p_lines) loop
  cost:=(item->>'unit_cost')::numeric;
  if item->>'kind'='part' then select unit_cost into cost from service_parts where id=(item->>'part_id')::uuid; end if;
  if item->>'kind'='labor' then cost:=0;end if;
  insert into service_workshop_lines(quote_id,kind,description,part_id,quantity,unit_price,unit_cost)
  values(p_id,item->>'kind',trim(item->>'description'),case when item->>'kind'='part' then (item->>'part_id')::uuid else null end,(item->>'quantity')::integer,(item->>'unit_price')::numeric,cost);
 end loop;
 if p_order_id is not null then
  update service_orders set quote_amount=sum_total,quote_currency='USD',quote_status='Pendiente' where id=p_order_id;
  insert into service_order_notes(order_id,note,visibility,author_name,note_type) values(p_order_id,'Cotización desglosada registrada por USD '||sum_total,'internal',p_actor,'Cotización');
 end if;
 insert into service_audit_log(actor_email,action,entity_type,entity_id,after_data) values(p_actor,'workshop_quote','service_workshop_quote',p_id::text,jsonb_build_object('total',sum_total));
 return p_id;
end $$;

create or replace function public.workshop_payment(p_id uuid,p_quote_id uuid,p_amount numeric,p_paid_at timestamptz,p_method text,p_reference text,p_currency text,p_original numeric,p_rate numeric,p_actor text)
returns uuid language plpgsql security definer set search_path=public as $$
declare invoice service_workshop_quotes; prior numeric; item record; stock integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,1));
 if exists(select 1 from service_workshop_payments where id=p_id) then return p_id;end if;
 select * into invoice from service_workshop_quotes where id=p_quote_id for update;
 if not found or invoice.state='cancelled' then raise exception 'Cotización no disponible';end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or p_paid_at is null or p_paid_at>now()+interval '5 minutes' then raise exception 'Importe o fecha de cobro inválidos';end if;
 if p_currency not in ('USD','VES') or p_original is null or p_original<=0 or p_rate is null or p_rate<=0 or p_amount<>round(p_original/p_rate,2) or (p_currency='USD' and p_rate<>1) then raise exception 'Moneda, tasa o conversión inválidas';end if;
 if coalesce(trim(p_method),'')='' then raise exception 'Indica el método de pago';end if;
 select coalesce(sum(amount),0) into prior from service_workshop_payments where quote_id=p_quote_id;
 if prior+p_amount>invoice.total then raise exception 'El pago supera el saldo pendiente';end if;
 if invoice.state='quoted' then
  -- Deduct the full physical quantity once, at the first payment. Stable lock order avoids deadlocks.
  for item in select part_id,sum(quantity)::integer qty from service_workshop_lines where quote_id=p_quote_id and kind='part' group by part_id order by part_id loop
   select quantity into stock from service_parts where id=item.part_id and active=true for update;
   if not found or stock<item.qty then raise exception 'Stock insuficiente; no se registró el cobro';end if;
   update service_parts set quantity=quantity-item.qty where id=item.part_id returning quantity into stock;
   insert into service_part_movements(part_id,order_id,movement_type,quantity,balance_after,note,actor_email) values(item.part_id,invoice.order_id::text,'venta_tecnica',-item.qty,stock,'Cotización '||p_quote_id,p_actor);
  end loop;
  update service_workshop_quotes set state='posted' where id=p_quote_id;
 end if;
 insert into service_workshop_payments(id,quote_id,amount,paid_at,method,reference,created_by,original_currency,original_amount,exchange_rate)
 values(p_id,p_quote_id,p_amount,p_paid_at,trim(p_method),coalesce(p_reference,''),p_actor,p_currency,p_original,p_rate);
 if invoice.order_id is not null then insert into service_order_notes(order_id,note,visibility,author_name,note_type) values(invoice.order_id,'Cobro registrado: USD '||p_amount||'. Saldo: USD '||(invoice.total-prior-p_amount),'internal',p_actor,'Cobro');end if;
 insert into service_audit_log(actor_email,action,entity_type,entity_id,after_data) values(p_actor,'workshop_payment','service_workshop_payment',p_id::text,jsonb_build_object('quote_id',p_quote_id,'amount',p_amount,'paid_at',p_paid_at));
 return p_id;
end $$;

create or replace function public.workshop_cancel_quote(p_id uuid,p_actor text)
returns void language plpgsql security definer set search_path=public as $$
declare invoice service_workshop_quotes;
begin
 select * into invoice from service_workshop_quotes where id=p_id for update;
 if not found then raise exception 'Cotización no encontrada';end if;
 if invoice.state='posted' or exists(select 1 from service_workshop_payments where quote_id=p_id) then raise exception 'No se puede anular una cotización con cobros';end if;
 update service_workshop_quotes set state='cancelled' where id=p_id;
 insert into service_audit_log(actor_email,action,entity_type,entity_id) values(p_actor,'workshop_cancel_quote','service_workshop_quote',p_id::text);
end $$;
revoke all on function public.workshop_create_quote(uuid,__ORDER_ID_TYPE__,text,jsonb,text) from public,anon,authenticated;
revoke all on function public.workshop_payment(uuid,uuid,numeric,timestamptz,text,text,text,numeric,numeric,text) from public,anon,authenticated;
revoke all on function public.workshop_cancel_quote(uuid,text) from public,anon,authenticated;
grant execute on function public.workshop_create_quote(uuid,__ORDER_ID_TYPE__,text,jsonb,text),public.workshop_payment(uuid,uuid,numeric,timestamptz,text,text,text,numeric,numeric,text),public.workshop_cancel_quote(uuid,text) to service_role;


-- Idempotent stock entry/adjustment for all three authenticated interfaces.
create table if not exists public.service_workshop_stock_requests(id uuid primary key,part_id uuid not null references public.service_parts(id),delta integer not null,balance integer not null,actor text not null,created_at timestamptz not null default now());
alter table public.service_workshop_stock_requests enable row level security;
revoke all on public.service_workshop_stock_requests from anon,authenticated;
grant all on public.service_workshop_stock_requests to service_role;
create or replace function public.workshop_adjust_stock(p_request_id uuid,p_id uuid,p_delta integer,p_note text,p_actor text)
returns integer language plpgsql security definer set search_path=public as $$
declare balance integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,2));
 select r.balance into balance from service_workshop_stock_requests r where r.id=p_request_id;
 if found then return balance;end if;
 if p_delta is null or p_delta=0 or coalesce(trim(p_note),'')='' then raise exception 'Indica cantidad y motivo';end if;
 select quantity into balance from service_parts where id=p_id and active=true for update;
 if not found or balance+p_delta<0 then raise exception 'Repuesto no disponible o saldo insuficiente';end if;
 update service_parts set quantity=quantity+p_delta where id=p_id returning quantity into balance;
 insert into service_part_movements(part_id,movement_type,quantity,balance_after,note,actor_email) values(p_id,case when p_delta>0 then 'entrada_tecnica' else 'ajuste_tecnico' end,p_delta,balance,p_note,p_actor);
 insert into service_workshop_stock_requests(id,part_id,delta,balance,actor) values(p_request_id,p_id,p_delta,balance,p_actor);
 return balance;
end $$;
revoke all on function public.workshop_adjust_stock(uuid,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.workshop_adjust_stock(uuid,uuid,integer,text,text) to service_role;

notify pgrst,'reload schema';

$migration$, '__ORDER_ID_TYPE__', order_type);
end $compat$;
commit;
