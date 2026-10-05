-- ThinkStore V13.36 · Campos editables de la cuenta cliente
-- Ejecutar UNA VEZ en el proyecto Supabase PRINCIPAL de ThinkStore.
-- Es idempotente: no elimina datos ni duplica columnas existentes.

alter table if exists public.clientes
  add column if not exists cedula_rif text,
  add column if not exists direccion text,
  add column if not exists ciudad text,
  add column if not exists estado text,
  add column if not exists metodo_envio_preferido text,
  add column if not exists agencia_destino text;

-- Pedir a PostgREST/Supabase que refresque el cache del esquema.
notify pgrst, 'reload schema';
