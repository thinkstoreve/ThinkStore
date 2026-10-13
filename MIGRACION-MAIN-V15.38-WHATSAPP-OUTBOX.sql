-- ThinkStore V15.38 - Entrega idempotente de avisos WhatsApp.
-- Ejecútese SOLO en Supabase PRINCIPAL, después de un respaldo.
-- Aditiva: no edita órdenes, cobros, clientes ni tablas existentes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.whatsapp_notification_outbox (
  event_key text PRIMARY KEY,
  phone_e164 text NOT NULL,
  template_name text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  provider_message_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_outbox_entity_idx ON public.whatsapp_notification_outbox(entity_type,entity_id,created_at DESC);
ALTER TABLE public.whatsapp_notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_notification_outbox FROM anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
