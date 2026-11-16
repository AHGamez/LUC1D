CREATE TABLE public.tikitaki_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  caption text NOT NULL DEFAULT '',
  video_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.tikitaki_posts TO authenticated;
GRANT ALL ON public.tikitaki_posts TO service_role;
ALTER TABLE public.tikitaki_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read posts" ON public.tikitaki_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "create own posts" ON public.tikitaki_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND video_path LIKE (auth.uid()::text || '/%'));
CREATE POLICY "delete own posts" ON public.tikitaki_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "tikitaki read videos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'tikitaki-videos');
CREATE POLICY "tikitaki upload own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tikitaki-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "tikitaki delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tikitaki-videos' AND (storage.foldername(name))[1] = auth.uid()::text);