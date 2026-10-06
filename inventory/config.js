window.TS_CONFIG = {
  APP_NAME: 'ThinkStore Inventory',
  APP_VERSION: '3.2.32',
  APP_URL: location.origin + '/inventory/',
  WORKSPACE: 'main',

  // Mismo proyecto Supabase que usa ThinkStore.
  SUPABASE_URL: 'https://clhnndxsgzqnihhtrout.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_Q7ynhCPp8nMFQywia1LqCQ_6UEAGqRZ',

  // Las credenciales de Cloudflare R2 NUNCA van aquí.
  // Backend compatible con Cloudflare Pages y Netlify.
  MEDIA_PROVIDER: 'cloudflare-r2',
  ADMIN_USERS_ENDPOINT: '/.netlify/functions/inventory-admin-users',
  R2_UPLOAD_ENDPOINT: '/.netlify/functions/inventory-r2-upload'
};
