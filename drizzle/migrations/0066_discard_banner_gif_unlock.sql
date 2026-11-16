CREATE POLICY "Upload own Discard banner" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'discard-avatars' AND (storage.foldername(name))[1] = auth.uid()::text AND (storage.foldername(name))[2] = 'banners' AND (lower(storage.extension(name)) IN ('png','jpg','jpeg','webp') OR (lower(storage.extension(name)) = 'gif' AND public.club_owns(auth.uid(), 'gif-banner'))));
CREATE OR REPLACE FUNCTION public.club_check_gif() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(coalesce(NEW.avatar_path,'')) LIKE '%.gif' AND NOT public.club_owns(NEW.user_id, 'gif-pfp') THEN
    RAISE EXCEPTION 'Buy the GIF profile picture unlock ($50) first';
  END IF;
  IF lower(coalesce(to_jsonb(NEW)->>'banner_path','')) LIKE '%.gif' AND NOT public.club_owns(NEW.user_id, 'gif-banner') THEN
    RAISE EXCEPTION 'Buy the GIF banner unlock ($50) first';
  END IF;
  RETURN NEW;
END $$;