# ThinkStore Main V14.84

Hotfix acumulativo sobre V14.83.

- Staff valida la sesión contra el Supabase principal canónico con la clave pública del mismo proyecto.
- Compatibilidad reforzada con profiles, roles_usuarios y metadata Auth interna.
- Un rol interno histórico puede prevalecer sobre un profile cliente del mismo correo.
- Caja Staff, fotos, ventas y actualizaciones usan la misma identidad canónica.
- Enterprise SSO valida que el destino tenga un build Enterprise actual; si los dominios externos están caídos o sirven una versión antigua, abre la copia integrada /growth-enterprise/.
- Main raíz incluye las funciones Enterprise faltantes para que el fallback integrado funcione.
- No requiere SQL nuevo.
