const SUPABASE_URL = "AQUI_TU_SUPABASE_URL";
const SUPABASE_ANON_KEY = "AQUI_TU_SUPABASE_ANON_KEY";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
