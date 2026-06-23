async function requireEnterpriseAdmin() {
  const client = window.supabaseClient;
  if (!client) throw new Error('Supabase no está inicializado');

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    window.location.href = 'index.html';
    return null;
  }

  const email = String(user.email || '').trim();
  let profile = null;

  // Fuente principal actual de ThinkStore.
  const rolesRes = await client
    .from('roles_usuarios')
    .select('id,email,nombre,rol,activo')
    .ilike('email', email)
    .maybeSingle();

  if (!rolesRes.error && rolesRes.data) {
    profile = {
      id: rolesRes.data.id,
      email: rolesRes.data.email,
      full_name: rolesRes.data.nombre,
      role: rolesRes.data.rol,
      active: rolesRes.data.activo,
      source: 'roles_usuarios'
    };
  }

  // Respaldo opcional. Si profiles tiene RLS recursivo, se ignora el error.
  if (!profile) {
    const profilesRes = await client
      .from('profiles')
      .select('id,email,full_name,role,active')
      .eq('id', user.id)
      .maybeSingle();

    if (!profilesRes.error && profilesRes.data) {
      profile = {
        ...profilesRes.data,
        source: 'profiles'
      };
    }
  }

  if (!profile || profile.active === false || !['admin','administrator','super_admin'].includes(String(profile.role || '').toLowerCase())) {
    await client.auth.signOut();
    window.location.href = 'index.html';
    return null;
  }

  return { user, profile };
}

async function safeCount(tableNames) {
  const names = Array.isArray(tableNames) ? tableNames : [tableNames];

  for (const tableName of names) {
    try {
      const { count, error } = await window.supabaseClient
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.warn(`No se pudo leer ${tableName}:`, error.message);
    }
  }

  return 0;
}

async function loadEnterpriseStats() {
  await requireEnterpriseAdmin();

  const stats = {
    orders: await safeCount(['orders', 'pedidos']),
    customers: await safeCount(['customers', 'clientes']),
    products: await safeCount(['products', 'productos'])
  };

  console.log('Enterprise Stats:', stats);
  return stats;
}

document.addEventListener('DOMContentLoaded', loadEnterpriseStats);
