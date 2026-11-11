-- ReCome · Fase 2
-- Buckets de Storage y políticas de acceso.
--
-- Lectura pública; escritura limitada al propietario según el prefijo de ruta.
-- Límite: 5 MB y solo JPEG, PNG o WebP.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatars',
    'avatars',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'business-logos',
    'business-logos',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'offer-images',
    'offer-images',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública de las imágenes.
create policy storage_public_read
on storage.objects for select
to anon, authenticated
using (bucket_id in ('avatars', 'business-logos', 'offer-images'));

-- Avatares: el primer segmento de la ruta es el id del usuario.
create policy storage_avatars_insert_own
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy storage_avatars_update_own
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy storage_avatars_delete_own
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Logos y fotos de ofertas: el primer segmento es el id del comercio.
create policy storage_business_assets_insert_owner
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1
    from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(name))[1]
  )
);

create policy storage_business_assets_update_owner
on storage.objects for update
to authenticated
using (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1
    from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1
    from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(name))[1]
  )
);

create policy storage_business_assets_delete_owner
on storage.objects for delete
to authenticated
using (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1
    from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(name))[1]
  )
);
