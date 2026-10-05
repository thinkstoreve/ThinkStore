ThinkStore V13.56 · MASTER PRE-DEPLOY
Base acumulativa: V13.55

REVISIÓN REALIZADA
- Integridad del ZIP base: OK.
- 73+ archivos JavaScript revisados con node --check: OK.
- Scripts JavaScript inline de HTML revisados: OK.
- Rutas href/src locales estáticas: 0 archivos faltantes.
- Functions usadas por la aplicación principal: todas presentes.
- Revisión de secretos incrustados: no se detectaron JWT/service-role pegados en el código.
- package.json actualizado a 13.56.0.
- netlify.toml añadido para declarar publish raíz y netlify/functions.
- Fallback de logo roto corregido.
- privacy.js restaurado para Nosotros y Trade-In.
- Segmentación CRM endurecida para etiquetas con espacios/acentos.
- Compatibilidad con autenticación administrativa heredada conservada.

FUNCIONES V13.55 CONSERVADAS
- Cierre de caja diario + histórico + reporte imprimible/PDF.
- CRM con etiquetas y notas internas.
- Campañas por segmento CRM.
- Historial de inventario.
- Auditoría administrativa persistente.

SQL PENDIENTE / REQUERIDO
Ejecutar una sola vez en Supabase principal:
supabase_v13_55_operaciones_auditoria.sql

VARIABLES
La versión utiliza las variables existentes de Netlify. No se añadió ninguna clave secreta al ZIP.

DEPLOY
Este ZIP está preparado para ser cargado desde la raíz del sitio principal ThinkStore.
No se realizó el deploy desde ChatGPT.
