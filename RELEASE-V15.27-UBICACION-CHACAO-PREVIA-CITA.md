# ThinkStore · Ajuste de ubicación pública y atención por previa cita

Base: ThinkStore-main V15.27 (Destinos bancarios Ventas).

## Cambios realizados
- Se retiraron las referencias a Altamira en web, Trade-IN, agenda de Soporte, chatbot, mensajes, correos automáticos, nota de entrega y texto del módulo Enterprise.
- La zona de atención pública queda identificada como **Chacao, Caracas**.
- La visita presencial debe coordinarse y confirmarse **por previa cita**.
- El mapa de contacto conserva la ubicación de **Centro Perú** solo como referencia de zona, sin piso ni número de local publicado.
- La lógica de pedidos, Ventas, Soporte, Inventory, Enterprise, cobros, WhatsApp y Supabase queda sin cambios.

## Importante después del despliegue
1. Desplegar la carpeta completa ThinkStore-main por el método de deploy habitual de Netlify, no solo los archivos HTML.
2. Revisar Inicio, Contacto, Agenda de Servicio Técnico, Trade-IN y chatbot en móvil y escritorio.
3. Probar un correo transaccional nuevo y revisar que el pie de página diga Chacao, Caracas.
4. Solicitar reindexación en Google Search Console de las páginas corregidas; por separado, corregir los datos de la ficha de Perfil de Empresa. Google puede conservar resultados anteriores mientras reindexa.
5. En las operaciones reales y documentos que legalmente exijan domicilio u otros datos fiscales, utilizar la información verdadera y completa que corresponda.

No requiere migraciones SQL adicionales.
