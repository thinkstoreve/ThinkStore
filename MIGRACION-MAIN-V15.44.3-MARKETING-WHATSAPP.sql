-- ThinkStore: campañas y evidencia de autorización. Solo Supabase PRINCIPAL.
BEGIN;
CREATE TABLE IF NOT EXISTS public.whatsapp_marketing_campaigns (
 id uuid PRIMARY KEY, name text NOT NULL, template_name text NOT NULL,
 language text NOT NULL, body text NOT NULL, variables jsonb NOT NULL DEFAULT '[]',
 recipients jsonb NOT NULL CHECK (jsonb_typeof(recipients)='array' AND jsonb_array_length(recipients) BETWEEN 1 AND 250),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.whatsapp_marketing_consents (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 phone_e164 text NOT NULL, granted boolean NOT NULL,
 source text NOT NULL CHECK (source IN ('in_person','form','whatsapp','document')),
 evidence text NOT NULL, obtained_at timestamptz NOT NULL,
 recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_marketing_consent_phone_idx ON public.whatsapp_marketing_consents(phone_e164,recorded_at DESC);
ALTER TABLE public.whatsapp_marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_marketing_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_marketing_campaigns,public.whatsapp_marketing_consents FROM anon,authenticated;
GRANT ALL ON public.whatsapp_marketing_campaigns,public.whatsapp_marketing_consents TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.whatsapp_marketing_consents_id_seq TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
