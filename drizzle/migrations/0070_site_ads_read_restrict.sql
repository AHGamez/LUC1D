DROP POLICY IF EXISTS "Signed in view ad images" ON storage.objects;
CREATE POLICY "View live ad images or own uploads" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='site-ads' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM public.ad_slots a WHERE a.image_path = storage.objects.name)));