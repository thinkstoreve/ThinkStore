// ThinkStore Growth Enterprise · Supabase client
// Nota: la anon public key es segura para frontend siempre que RLS esté activo en Supabase.
(function () {
  const SUPABASE_URL = "https://clhnndxsgzqnihhtrout.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_Q7ynhCPp8nMFQywia1LqCQ_6UEAGqRZ";

  if (!window.supabase) {
    console.error("Supabase SDK no está cargado. Revisa el script CDN en index.html.");
    return;
  }

  if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  console.log("Supabase conectado");
})();
