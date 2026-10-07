-- ThinkStore Main V14.77: fotos privadas de perfil Staff.
-- Ejecutar una vez en el proyecto de Supabase PRINCIPAL. No borra usuarios ni fotos existentes.
begin;

alter table public.profiles
  add column if not exists staff_avatar_path text;

comment on column public.profiles.staff_avatar_path is
  'Ruta privada del avatar en bucket staff-profile-photos. El acceso temporal se firma en Netlify; no almacena URLs públicas.';

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('staff-profile-photos','staff-profile-photos',false,409600,array['image/jpeg','image/webp'])
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- No se concede INSERT, UPDATE, SELECT o DELETE a anon/authenticated en storage.objects.
-- Escritura/lectura solo a través de las Netlify Functions autorizadas con service role.
commit;
