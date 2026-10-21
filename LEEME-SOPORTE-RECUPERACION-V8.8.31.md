# ThinkStore · Recuperación de contraseña de Soporte (V8.8.31)

## Qué se cambió
- **Soporte > Panel > Ingresar**: se añadió «¿Olvidaste tu contraseña?» para cuentas locales de Servicio Técnico, incluidos técnicos y recepcionistas.
- **Formulario de recuperación**: permite solicitar el enlace al correo registrado en `service_users`. Se muestra una respuesta genérica sin exponer si la cuenta existe o está activa.
- **Correo corporativo**: plantilla profesional con el logo oficial aportado para ThinkStore, remitente `ThinkStore Servicio Técnico <soporte@thinkstore.com.ve>` (configurable con `FROM_SOPORTE_EMAIL`), botón y enlace de recuperación de un solo uso.
- **Nueva contraseña**: verifica el token de recuperación con el Supabase de Soporte, exige mínimo 8 caracteres con confirmación, actualiza la contraseña y pide iniciar sesión de nuevo.
- **Acceso unificado**: se ofrece un enlace separado para recuperar la cuenta principal ThinkStore; nunca se mezclan los dos proyectos de autenticación.
- No se alteraron permisos de usuario, registros, reparaciones ni datos financieros. No se requiere migración SQL.

## Despliegue (son dos proyectos Netlify)
1. **Main ThinkStore**: despliega este proyecto en el sitio Netlify que sirve `thinkstore.com.ve`. Esto publica el endpoint `/.netlify/functions/support-password-recovery` (archivo `netlify/functions/support-password-recovery.js`). Verifica que el entorno de Main disponga de las variables EXISTENTES:
   - `SUPPORT_SUPABASE_URL=https://tnezvnziqnjxhcwjtcuy.supabase.co`
   - `SUPPORT_SUPABASE_SERVICE_ROLE_KEY` o `SUPPORT_SUPABASE_SECRET_KEY`
   - `RESEND_API_KEY` (o su variante histórica `RESEND_APY_KEY`).
   - Opcionales: `FROM_SOPORTE_EMAIL` y `REPLY_TO_SOPORTE`, si necesitas cambiar el remitente o el correo de respuesta. El dominio de correo debe estar validado en Resend.
2. **Soporte ThinkStore**: despliega el contenido de la carpeta `/soporte` en el Netlify que sirve `soporte.thinkstore.com.ve` (puedes usar el ZIP de Soporte incluido por separado).
3. Las URLs de producción y de Supabase están fijadas en los componentes de este despliegue para evitar confundir Soporte con el Supabase principal. No se añaden claves privadas al navegador.
4. **Protección antispam**: hay un límite de repetición por correo y por instancia del servidor. Para protección distribuida completa es importante aplicar límites adicionales de solicitudes al endpoint en Netlify/WAF; la memoria de las funciones por sí sola no constituye un control global.

## Pruebas después de desplegar
- En una ventana privada entra en `https://soporte.thinkstore.com.ve/panel.html`. Pulsa «¿Olvidaste tu contraseña?»; prueba un usuario activo del rol `technician` y otro `reception`.
- Revisa en el correo de prueba que aparezca el logo oficial y el remitente de Soporte; abre el botón, escribe y confirma contraseña, vuelve a entrar. El enlace debe quedar usado.
- Intenta repetir el mismo enlace: debe mostrarse inválido/vencido y NO cambiar la contraseña.
- Confirma que un correo inexistente, una cuenta desactivada y un cliente sin rol autorizado NO obtienen información ni accesos.
- Comprueba también «Ingresar con mi cuenta ThinkStore» y el vínculo de recuperación de cuenta unificada: siguen utilizando el Supabase principal.

## Limitación del paquete
Los archivos fueron modificados y probados en local con simulaciones de la API. No se desplegaron en Netlify, ni se utilizaron credenciales reales para enviar correos; el envío final deberá verificarse después de los dos despliegues.
