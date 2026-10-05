# ThinkStore V14.70 · Aislamiento Clientes / Personal interno

- Los clientes registrados desde la web se fuerzan a rol `cliente`.
- Ya no aparecen en Usuarios internos.
- Un rol histórico `vendedor` sin marca interna deja de otorgar acceso.
- SSO exige una marca interna real, invitación interna o Admin bootstrap válido.
- El login público nunca cachea roles internos.
- Incluye `MIGRACION-V14.70-AISLAMIENTO-CLIENTES.sql` para limpiar perfiles existentes y proteger registros nuevos.
