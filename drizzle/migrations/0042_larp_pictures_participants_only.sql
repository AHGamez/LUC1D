DROP POLICY IF EXISTS "larp read battle pictures" ON storage.objects;
CREATE POLICY "larp read battle pictures" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'larp-flex' AND (
  (storage.foldername(name))[1] = (select auth.uid())::text
  OR EXISTS (SELECT 1 FROM public.larp_battles b
    WHERE (b.challenger_image = objects.name OR b.opponent_image = objects.name)
      AND (b.challenger_id = (select auth.uid()) OR b.opponent_id = (select auth.uid())))
));