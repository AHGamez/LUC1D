DROP POLICY IF EXISTS "View live ad images or own uploads" ON storage.objects;
CREATE POLICY "View own ad uploads" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'site-ads' AND (storage.foldername(name))[1] = (auth.uid())::text);