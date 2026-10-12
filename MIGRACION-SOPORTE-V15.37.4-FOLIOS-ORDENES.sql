-- ThinkStore V15.37.4: folios secuenciales de Servicio Técnico.
-- Ejecutar en SQL Editor de SUPABASE SOPORTE (SUPPORT_SUPABASE_URL), una vez.
-- No modifica códigos de órdenes existentes ni datos de cobros/bitácoras.
-- Folios por año de Caracas: TS-SVC-2026-0008, TS-SVC-2026-0009, ...
-- La reserva del folio es atómica, aunque dos recepcionistas creen órdenes a la vez.
-- Como en cualquier secuencia, un intento de inserción fallido puede dejar un salto.
BEGIN;

CREATE TABLE IF NOT EXISTS public.service_order_code_sequences (
  year integer PRIMARY KEY,
  last_number bigint NOT NULL CHECK (last_number >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_order_code_sequences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_order_code_sequences FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.next_service_order_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM (now() AT TIME ZONE 'America/Caracas'))::integer;
  v_max_existing bigint;
  v_next bigint;
BEGIN
  -- Incluye folios antiguos aun si el contador todavía no existía.
  SELECT COALESCE(MAX(SUBSTRING(s.code FROM
    ('^TS-SVC-' || v_year::text || '-([0-9]+)$'))::bigint), 0)
  INTO v_max_existing
  FROM public.service_orders AS s
  WHERE s.code ~ ('^TS-SVC-' || v_year::text || '-[0-9]+$');

  -- ON CONFLICT bloquea la misma fila: asignación concurrente sin duplicados.
  INSERT INTO public.service_order_code_sequences AS seq (year, last_number)
  VALUES (v_year, v_max_existing + 1)
  ON CONFLICT (year) DO UPDATE SET
    last_number = GREATEST(seq.last_number, EXCLUDED.last_number - 1) + 1,
    updated_at = now()
  RETURNING last_number INTO v_next;

  RETURN 'TS-SVC-' || v_year::text || '-' ||
    CASE WHEN LENGTH(v_next::text) >= 4 THEN v_next::text
         ELSE LPAD(v_next::text, 4, '0') END;
END;
$$;

-- Solo la función Netlify con service_role puede solicitar un folio.
REVOKE ALL ON FUNCTION public.next_service_order_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_service_order_code() TO service_role;

-- Actualiza el esquema expuesto por PostgREST/Supabase.
NOTIFY pgrst, 'reload schema';
COMMIT;
