# V8.8.29 — Identidad de bancos y métodos de pago

Base: ThinkStore V8.8.28 acumulado.

Reutiliza recursos existentes en `growth-enterprise/assets/banks/` y sus versiones oficiales previamente incluidas. No se han inventado cuentas, saldos ni movimientos.

- Conserva los logotipos que ya se mostraban en tarjetas de cuentas en Caja Chica.
- Añade logotipos a cobros semanales y métodos de conciliación cuando el nombre identifica Bank of America, Chase, Pichincha, Zelle, Binance, Banesco, BNC, Banco de Venezuela, Bancamiga o Venezolano de Crédito.
- Añade vista previa del logo de la cuenta elegida en el formulario de movimientos de Caja Chica.
- Métodos sin archivo reconocible usan iniciales; no se descarga contenido externo.
- No altera el cálculo de movimientos, backend, tablas ni Supabase. No se ejecutaron migraciones ni deploys.

Pendiente: verificación end-to-end con sesión y datos reales.
