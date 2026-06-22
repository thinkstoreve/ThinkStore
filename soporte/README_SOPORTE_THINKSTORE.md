# Soporte ThinkStore — Service Center

Extensión independiente para publicar en:

https://soporte.thinkstore.com.ve

## Qué incluye

- Dashboard privado tipo Asistech.
- Recepción de equipos.
- Órdenes de servicio.
- Estados de reparación.
- Bitácora técnica.
- Presupuestos / cotizaciones.
- Archivos y fotos.
- Consulta de orden por código/QR.
- Roles: superadmin, admin, recepción, técnico, ventas, logística y cliente.
- Esquema Supabase preparado.

## Accesos demo

- admin / thinkstore2026
- recepcion / recepcion2026
- tecnico / tecnico2026
- ventas / ventas2026
- logistica / logistica2026

## Cómo publicarlo en Netlify como subdominio

1. Crear un sitio nuevo en Netlify para esta carpeta.
2. Subir el contenido de este ZIP.
3. En Netlify > Domain settings, agregar:
   soporte.thinkstore.com.ve
4. En NIC.VE o en el DNS donde esté apuntando ThinkStore, crear:
   Tipo: CNAME
   Nombre/Host: soporte
   Valor/Destino: el dominio asignado por Netlify, por ejemplo:
   nombre-del-sitio.netlify.app
5. Activar HTTPS en Netlify.

## Producción con Supabase

1. Ejecutar `supabase_service_center_schema.sql` en Supabase SQL Editor.
2. Crear usuarios reales en Supabase Auth.
3. Asignar roles desde la tabla `profiles`.
4. Cambiar los usuarios demo del archivo `app.js` por autenticación real de Supabase.

## Nota

Esta versión funciona como demo local con `localStorage` para que puedas probar flujo, diseño y roles antes de conectarlo a la base de datos real.
