# ThinkStore Main V14.73 · Enterprise SSO directo

- Enterprise ya no depende de Supabase Redirect URLs ni del Site URL.
- El endpoint admin-sso genera un token hash de magic-link de un solo uso.
- El navegador entra directamente a enterprise.thinkstore.com.ve y Enterprise verifica el token.
- Evita la caída a instantfwding.com cuando el Site URL/redirect allowlist no coincide.
- Inventory y Soporte no se modifican en esta versión.
