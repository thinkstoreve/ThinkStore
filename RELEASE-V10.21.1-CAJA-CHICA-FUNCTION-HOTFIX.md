# Enterprise V10.21.1 · Hotfix Caja Chica por cuentas

## Problema corregido
La interfaz V10.21 ya estaba publicada y la migración de cuentas existía en Supabase, pero el sitio principal seguía desplegando una copia anterior de `netlify/functions/enterprise-finance.js` desde la carpeta raíz.

Como `/enterprise` se sirve desde el proyecto principal, las llamadas a `/.netlify/functions/enterprise-finance` usan `netlify/functions/enterprise-finance.js` de la raíz, no la copia dentro de `growth-enterprise/`.

Esto hacía que `petty_cash.banking` no llegara al frontend y Enterprise mostrara incorrectamente el aviso de ejecutar otra vez la migración.

## Corrección
Se sincronizó la función raíz con la versión V10.21 de Enterprise, incluyendo:

- lectura de `enterprise_petty_cash_bank_accounts`;
- lectura de `enterprise_petty_cash_bank_movements`;
- cálculo de saldos por cuenta;
- cálculo de saldo USD/VES sin asignar;
- distribución y transferencias entre cuentas;
- configuración de alias y últimos 4 dígitos;
- vinculación de gastos/reposiciones/reintegros/ajustes con una cuenta;
- anulación del movimiento bancario asociado;
- liquidación de comisiones de vendedores que ya esperaba la interfaz.

## Datos
No se modifica ni reinicia ningún saldo existente. Los USD 122 y Bs 500 continúan como saldo general y permanecen sin asignar hasta que se distribuyan manualmente entre las cuentas.

## Archivo runtime actualizado
- `netlify/functions/enterprise-finance.js`
