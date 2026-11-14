-- En el EXISTS sobre businesses, `name` sin calificar se resuelve como
-- businesses.name, no como storage.objects.name. Usar la ruta del objeto.
alter policy storage_business_assets_insert_owner on storage.objects
with check (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1 from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

alter policy storage_business_assets_update_owner on storage.objects
using (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1 from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(storage.objects.name))[1]
  )
)
with check (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1 from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

alter policy storage_business_assets_delete_owner on storage.objects
using (
  bucket_id in ('business-logos', 'offer-images')
  and exists (
    select 1 from public.businesses b
    where b.owner_id = (select auth.uid())
      and b.id::text = (storage.foldername(storage.objects.name))[1]
  )
);
