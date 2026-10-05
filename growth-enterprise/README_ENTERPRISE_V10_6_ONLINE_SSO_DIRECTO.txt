ThinkStore Enterprise V10.6

1. PWA y modo offline deshabilitados para evitar que un Service Worker antiguo atrape la navegación.
2. recovery-v106.html elimina registros SW/cachés anteriores y vuelve a /.
3. Enterprise acepta sso_token_hash de un solo uso generado por ThinkStore Main V14.73 y lo verifica con Supabase verifyOtp.
4. El acceso Enterprise ya no depende del redirect_to/Site URL de Supabase.
5. No modifica módulos, datos, Supabase ni funciones Enterprise existentes.
