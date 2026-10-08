# ThinkStore V15.10 · Etiqueta + Pagado + Fotos de Soporte

Base: V15.09.

## Correcciones

1. **Nombre del cliente en etiquetas**
   - El nombre se resuelve desde `client_name`, metadatos de recepción y firma como respaldo.
   - Nuevas recepciones guardan también nombre/teléfono/correo dentro de `reception_checklist.__client`.
   - El nombre ahora aparece en un bloque destacado **CLIENTE** en ambas etiquetas 40×60 (vertical y horizontal) y en el PDF para HereLabel.

2. **Pagado sincronizado desde App Ventas**
   - Se corrigió la lectura del RPC de cobro tanto cuando PostgREST devuelve objeto como cuando devuelve arreglo.
   - Al cerrar el saldo, App Ventas normaliza `payment_status` a `Pagado`.
   - Soporte consulta los estados financieros mediante un endpoint autenticado con service role y mantiene fallback directo.
   - En Órdenes de servicio, la insignia financiera **Pagado / Abono parcial / Pendiente** aparece antes del selector de estado técnico.

3. **Fotografías en Gestionar**
   - Se dejó de usar `file_url='private'` como fallback visible.
   - Los archivos privados obtienen una URL firmada desde el backend autenticado de Soporte.
   - Si el firmado por servidor no está disponible, se conserva fallback al cliente Supabase.
   - Al pulsar una foto se abre un visor ampliado (lightbox), con fondo oscuro, descripción y cierre con `Esc`.

4. **Actualización de caché**
   - `app.js` / `styles.css` de Soporte pasan a `v=15.10.0`.
   - Service Worker de Soporte pasa a `r1510`.
   - App Ventas también fuerza los assets V15.10 para evitar que el navegador conserve el código de cobro anterior.

No requiere SQL nuevo.
