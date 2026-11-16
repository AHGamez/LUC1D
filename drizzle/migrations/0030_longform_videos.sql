CREATE TABLE public.longform_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  app text NOT NULL CHECK (app IN ('grime','tube')),
  category text NOT NULL DEFAULT 'video' CHECK (category IN ('movie','show','video')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.longform_videos TO authenticated;
GRANT ALL ON public.longform_videos TO service_role;
ALTER TABLE public.longform_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed in can watch" ON public.longform_videos FOR SELECT TO authenticated USING (true);
CREATE POLICY "post own; grime owner only" ON public.longform_videos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND ((app = 'tube' AND category = 'video') OR (app = 'grime' AND category IN ('movie','show') AND public.discard_is_owner(auth.uid()))));
CREATE POLICY "delete own" ON public.longform_videos FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.discard_is_owner(auth.uid()));

CREATE POLICY "longform read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'longform');
CREATE POLICY "longform upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'longform' AND (storage.foldername(name))[2] = auth.uid()::text
    AND ((storage.foldername(name))[1] = 'tube' OR ((storage.foldername(name))[1] = 'grime' AND public.discard_is_owner(auth.uid()))));
CREATE POLICY "longform delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'longform' AND ((storage.foldername(name))[2] = auth.uid()::text OR public.discard_is_owner(auth.uid())));