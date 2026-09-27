ThinkStore V13.97 · Login independiente del Panel

Cambios:
- Nuevo panel-login.html con diseño limpio alineado al login principal de clientes.
- panel.html ya no muestra el formulario de acceso integrado.
- Si no existe una sesión válida, panel.html redirige automáticamente a panel-login.html.
- El nuevo login valida Auth + profiles + estado activo antes de abrir el panel.
- Recuperación de contraseña separada para el panel.
- Al cerrar sesión desde el panel, el usuario vuelve a panel-login.html.
- Mantiene el módulo/fragmento solicitado cuando sea posible.
- No requiere cambios SQL.

Supabase:
Para recuperación de contraseña, confirma que esta URL esté permitida en Authentication > URL Configuration > Redirect URLs:
https://thinkstore.com.ve/panel-login.html?view=recovery

Si el dominio principal usa www o una URL adicional de producción, agrégala también según corresponda.
