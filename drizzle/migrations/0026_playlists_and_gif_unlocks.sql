CREATE OR REPLACE FUNCTION public.club_price(_item text) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _item
    WHEN 'ring-nebula' THEN 500 WHEN 'ring-inferno' THEN 1000 WHEN 'ring-rainbow' THEN 2000 WHEN 'ring-royal' THEN 5000
    WHEN 'color-red' THEN 100 WHEN 'color-blue' THEN 100 WHEN 'color-pink' THEN 150 WHEN 'color-purple' THEN 150 WHEN 'color-gold' THEN 1000
    WHEN 'hat-cap' THEN 200 WHEN 'hat-tophat' THEN 500 WHEN 'hat-shades' THEN 300 WHEN 'hat-halo' THEN 800 WHEN 'hat-crown' THEN 2500
    WHEN 'house-cottage' THEN 2500 WHEN 'house-villa' THEN 7500 WHEN 'house-mansion' THEN 20000
    WHEN 'gif-pfp' THEN 5000 WHEN 'gif-banner' THEN 5000
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.club_owns(_u uuid, _item text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.club_owned WHERE user_id = _u AND item_id = _item)
$$;

CREATE OR REPLACE FUNCTION public.club_check_gif() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(coalesce(NEW.avatar_path,'')) LIKE '%.gif' AND NOT public.club_owns(NEW.user_id, 'gif-pfp') THEN
    RAISE EXCEPTION 'Buy the GIF profile picture unlock ($50) first';
  END IF;
  IF TG_TABLE_NAME = 'tikitaki_profiles' AND lower(coalesce(NEW.banner_path,'')) LIKE '%.gif' AND NOT public.club_owns(NEW.user_id, 'gif-banner') THEN
    RAISE EXCEPTION 'Buy the GIF banner unlock ($50) first';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS club_check_gif ON public.discard_profiles;
CREATE TRIGGER club_check_gif BEFORE INSERT OR UPDATE ON public.discard_profiles FOR EACH ROW EXECUTE FUNCTION public.club_check_gif();
DROP TRIGGER IF EXISTS club_check_gif ON public.tikitaki_profiles;
CREATE TRIGGER club_check_gif BEFORE INSERT OR UPDATE ON public.tikitaki_profiles FOR EACH ROW EXECUTE FUNCTION public.club_check_gif();

DROP POLICY IF EXISTS "Upload own Discard avatar" ON storage.objects;
CREATE POLICY "Upload own Discard avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'discard-avatars' AND (storage.foldername(name))[1] = auth.uid()::text AND (lower(storage.extension(name)) IN ('png','jpg','jpeg','webp') OR (lower(storage.extension(name)) = 'gif' AND public.club_owns(auth.uid(), 'gif-pfp'))));

CREATE TABLE public.music_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_playlists TO authenticated;
GRANT ALL ON public.music_playlists TO service_role;
ALTER TABLE public.music_playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see public or own playlists" ON public.music_playlists FOR SELECT TO authenticated USING (is_public OR user_id = auth.uid());
CREATE POLICY "create own playlists" ON public.music_playlists FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "edit own playlists" ON public.music_playlists FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete own playlists" ON public.music_playlists FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.music_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.music_playlists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  path text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.music_tracks TO authenticated;
GRANT ALL ON public.music_tracks TO service_role;
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see tracks of visible playlists" ON public.music_tracks FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.music_playlists p WHERE p.id = playlist_id AND (p.is_public OR p.user_id = auth.uid())));
CREATE POLICY "add tracks to own playlists" ON public.music_tracks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.music_playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()));
CREATE POLICY "delete own tracks" ON public.music_tracks FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Read music" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'music');
CREATE POLICY "Upload own music" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'music' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Delete own music" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'music' AND (storage.foldername(name))[1] = auth.uid()::text);