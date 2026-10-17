-- Supabase MAIN/PRINCIPAL. SOLO LECTURA.
-- Ejecutar DESPUÉS de que Soporte confirme 60 USD abonados, 60 USD pendientes.
SELECT 'Caja chica' AS modulo, m.id::text AS id, m.amount AS importe,
       m.currency::text AS moneda, m.direction::text AS tipo, m.status::text AS estado,
       left(m.description,150) AS detalle
FROM public.enterprise_petty_cash_bank_movements m
WHERE m.description ILIKE '%TS-DA53AC91%'
UNION ALL
SELECT 'Liquidación', s.id::text, s.collected_usd, 'USD', 'liquidado',
       NULL::text,'Reparación TS-DA53AC91'
FROM public.enterprise_service_settlements s WHERE s.order_code='TS-DA53AC91'
UNION ALL
SELECT 'Comisión',e.id::text,e.amount_usd,'USD',e.entry_type::text,
       e.status::text,'Reparación TS-DA53AC91'
FROM public.enterprise_finance_entries e WHERE e.source_code='TS-DA53AC91'
ORDER BY modulo, tipo, id;
