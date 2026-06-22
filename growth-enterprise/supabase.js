const SUPABASE_URL = "https://clhnndxsgzqnihhtrout.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_Q7ynhCPp8nMFQywia1LqCQ_6UEAGqRZ";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
