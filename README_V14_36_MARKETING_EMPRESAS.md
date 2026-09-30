# ThinkStore V14.36 · Marketing Empresas

Base: ThinkStore-main-V14.35-Resenas-Google-Servicio-Tecnico.zip.
La nueva versión conserva las mejoras de reseñas y servicio técnico de V14.35.

## Publicación

1. Ejecutar `supabase_v14_36_marketing_empresas.sql` en el SQL Editor del proyecto Supabase existente. Crea la tabla de bajas empresariales con acceso exclusivo del servidor.
2. Publicar el contenido completo de este proyecto con el flujo Netlify habitual, incluyendo las funciones. Si se utiliza Git, incorporar los archivos al repositorio conectado a Netlify. No basta con subir solo el HTML del correo.
3. Se reutilizan RESEND_API_KEY (o el alias existente), SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. El dominio thinkstore.com.ve debe estar verificado en Resend para el remitente ventas@thinkstore.com.ve.
4. Opcional: establecer MARKETING_UNSUBSCRIBE_SECRET como secreto estable. Sin esa variable se usa la clave de servicio de Supabase para firmar los enlaces. Cambiar la clave de firma invalida los enlaces anteriores, por lo que debe conservarse estable.
5. Abrir Panel → Marketing → Plantilla → «Empresas · Soporte técnico Apple». Seleccionar la audiencia existente o «Solo correos manuales». Completar el correo de prueba y usar «Enviar prueba» antes de enviar una campaña.

No se publicó el proyecto ni se ejecutó SQL sobre la base real. No se enviaron correos reales durante la preparación.

## Plantilla y envío

- HTML original proporcionado: thinkstore_publicidad_empresas_email.html; conserva diseño y logo oficial desde https://thinkstore.com.ve/assets/logo-thinkstore-email-transparent.png.
- Asunto predeterminado: Soporte técnico Apple para tu empresa | ThinkStore.
- Preheader predeterminado: Soporte técnico Apple para empresas: atención prioritaria, recepción coordinada y diagnóstico por lote.
- Contacto y botón de solicitud: info@thinkstore.com.ve.
- Solo esta plantilla utiliza From: ThinkStore <ventas@thinkstore.com.ve> y Reply-To: info@thinkstore.com.ve. La integración existente usa la API HTTP de Resend, donde `reply_to` equivale a `replyTo` del SDK.
- La vista previa y el servidor comparten el mismo HTML y el mismo renderizador. Asunto y preheader son editables; el diseño empresarial es fijo.
- Se conservan las audiencias, el envío de prueba y el historial. Duplicar una campaña empresarial recupera la selección de plantilla y los valores de personalización guardados.
- Los nombres se obtienen de los datos del contacto cuando existen. Los campos «Contacto» y «Empresa» del editor sirven como valores de ejemplo y respaldo. No deben usarse con un nombre de empresa común para una lista de empresas distintas. Sin nombre de empresa se usa «tu empresa».
- Los placeholders {{nombre_contacto}}, {{nombre_empresa}}, {{unsubscribe_url}} y {{preheader}} se sustituyen con valores escapados antes del envío.
- Cada destinatario recibe un enlace de baja firmado. Abrir el enlace muestra una confirmación; la baja se registra al confirmar. Se excluye esa dirección de futuras campañas empresariales, incluso cuando se añade manualmente. No se alteran los otros flujos de correo.
- Si la tabla de bajas no está disponible, el envío empresarial se detiene con un mensaje explicativo. Las campañas anteriores siguen usando su flujo existente.

## Mantenimiento

Después de editar el HTML fuente ejecutar:

    node scripts/build-enterprise-template.cjs

Esto actualiza enterprise-template-data.js, que se distribuye a navegador y funciones Netlify. Publicar siempre ambos archivos junto con enterprise-template.js.

Pruebas sin conexiones externas ni correos reales:

    node --test tests/marketing-enterprise.test.cjs tests/panel-enterprise.test.cjs

Validado: remitentes, personalización y escape HTML, deduplicación, exclusión por baja, pruebas, errores de Resend, autenticación, firma y confirmación de bajas, sincronización de plantilla, selector y recuperación del borrador anterior. Se compararon los mensajes salientes de las siete audiencias anteriores con V14.35: son iguales. Los archivos de pedidos, soporte, registro y recuperación permanecen intactos.

Limitación de validación: el acceso del navegador a la vista previa local fue rechazado; la presentación visual en navegadores y clientes de correo no se verificó. Realizar el envío de prueba tras publicar para revisar el resultado final en Gmail/Outlook/Apple Mail.
