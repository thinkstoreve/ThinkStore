import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: current } = await userClient.auth.getUser();
    if (!current?.user) throw new Error("Sesión no válida.");

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role,active")
      .eq("id", current.user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile?.active || !["admin", "super_admin"].includes(profile.role)) {
      throw new Error("Solo administradores pueden crear accesos.");
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const full_name = String(body.full_name || "").trim();
    const role = String(body.role || "vendedor");
    const password = body.temporary_password || crypto.randomUUID().slice(0, 12) + "Aa1!";

    if (!email || !full_name) throw new Error("Faltan nombre o correo.");

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });
    if (createError) throw createError;

    const user = created.user;
    await adminClient.from("profiles").upsert({
      id: user.id,
      email,
      full_name,
      role,
      active: true,
      updated_at: new Date().toISOString(),
    });

    await adminClient.from("staff_invitations").insert({
      email,
      full_name,
      role,
      status: "accepted",
      notes: body.notes || null,
      invited_by: current.user.id,
    });

    return new Response(JSON.stringify({ ok: true, message: "Acceso creado correctamente.", email, temporary_password: password }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, message: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
