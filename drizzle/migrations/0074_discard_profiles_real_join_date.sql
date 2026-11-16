CREATE OR REPLACE FUNCTION public.discard_profile_joined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT created_at INTO NEW.created_at FROM auth.users WHERE id = NEW.user_id;
  IF NEW.created_at IS NULL THEN NEW.created_at := now(); END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discard_profiles_joined ON public.discard_profiles;
CREATE TRIGGER discard_profiles_joined
BEFORE INSERT ON public.discard_profiles
FOR EACH ROW EXECUTE FUNCTION public.discard_profile_joined();