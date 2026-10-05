ThinkStore V14.4 — Registro de cliente con verificación guiada

Cambios:
- Después de crear una cuenta, el formulario de registro se cierra y aparece una vista limpia "Revisa tu correo".
- Botón "Ya verifiqué mi correo" comprueba la cuenta en Supabase.
- Si el correo ya fue confirmado, ThinkStore inicia sesión automáticamente y deja al cliente listo para comprar.
- Si aún no está confirmado, se informa sin perder el registro.
- Botón para reenviar el correo de verificación.
- El flujo se aplica tanto a login.html como al registro rápido/modal de la tienda.
- La contraseña solo se conserva temporalmente en memoria durante el flujo; nunca se escribe en localStorage.
- Si el cliente vuelve desde el enlace de Supabase con una sesión válida, ThinkStore entra automáticamente.

No requiere SQL nuevo.
Mantiene todo V14.3: panel limpio, sincronización Inventory y lector de códigos de barras.
