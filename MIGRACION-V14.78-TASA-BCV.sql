-- ThinkStore V14.78 · Tasa oficial BCV vigente por transacción (Supabase principal)
-- Migración aditiva: NO modifica pedidos pasados ni recalcula cobros históricos.
BEGIN;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS bcv_rate numeric(18,6);
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS bcv_effective_date date;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS bcv_source text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS bcv_checked_at timestamptz;
COMMENT ON COLUMN public.pedidos.bcv_rate IS 'Tasa USD/VES BCV vigente aplicada al confirmar o guardar la venta, historizada por operación';
COMMENT ON COLUMN public.pedidos.bcv_effective_date IS 'Fecha valor de la cotización BCV, zona horaria Caracas';
COMMIT;
NOTIFY pgrst, 'reload schema';
