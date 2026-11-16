CREATE OR REPLACE FUNCTION public.club_check_gif() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(coalesce(NEW.avatar_path,'')) LIKE '%.gif' AND NOT public.club_owns(NEW.user_id, 'gif-pfp') THEN
    RAISE EXCEPTION 'Buy the GIF profile picture unlock ($50) first';
  END IF;
  IF TG_TABLE_NAME = 'tikitaki_profiles' THEN
    IF lower(coalesce(to_jsonb(NEW)->>'banner_path','')) LIKE '%.gif' AND NOT public.club_owns(NEW.user_id, 'gif-banner') THEN
      RAISE EXCEPTION 'Buy the GIF banner unlock ($50) first';
    END IF;
  END IF;
  RETURN NEW;
END $$;