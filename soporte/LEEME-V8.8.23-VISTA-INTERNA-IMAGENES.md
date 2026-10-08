# ThinkStore Soporte V8.8.23

Corrige únicamente la visualización interna de fotografías en Centro de Servicio Técnico.

- R2 ya funcionaba y el cliente podía ver las fotos.
- El panel técnico estaba intentando cargar la imagen como data URL dentro de JSON.
- Ahora usa primero `support-media`, un proxy privado binario del mismo dominio.
- Si el proxy falla, mantiene el fallback seguro anterior.
- No requiere SQL ni nuevas variables.
