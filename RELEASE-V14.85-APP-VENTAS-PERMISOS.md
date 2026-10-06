# ThinkStore V14.85 · App Ventas · Permisos internos recuperados

Base: V14.84.

- App Ventas reconoce Super Admin y Admin aunque provengan de perfiles bootstrap antiguos.
- Reconoce personal interno creado antes de `is_internal`, siempre que no exista un `is_internal=false` explícito.
- Si `is_internal=false`, solo se acepta cuando existe evidencia interna explícita (metadata de invitación, origen interno, rol personalizado o permiso `staff.access`/`platform.staff`); esto mantiene bloqueados a clientes normales.
- La misma validación se usa para App Ventas, cobros de Servicio Técnico, SSO y administración de usuarios.
- Ventas presenciales exige además permiso `ventas` o acceso completo.
- No requiere SQL nuevo.
