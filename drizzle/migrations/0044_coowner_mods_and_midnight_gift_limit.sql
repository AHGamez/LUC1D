CREATE OR REPLACE FUNCTION public.discard_is_coowner(_u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM discard_moderators WHERE user_id = _u AND coowner) $$;

CREATE OR REPLACE FUNCTION public.discard_set_mod(_target uuid, _on boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF discard_is_owner(auth.uid()) THEN NULL;
  ELSIF discard_is_coowner(auth.uid()) THEN
    IF _target = auth.uid() OR discard_is_owner(_target) OR discard_is_coowner(_target) THEN RAISE EXCEPTION 'Co-owners can only change regular members and mods'; END IF;
  ELSE RAISE EXCEPTION 'Only the owner and co-owners can change moderators'; END IF;
  IF _on THEN INSERT INTO discard_moderators (user_id) VALUES (_target) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM discard_moderators WHERE user_id = _target; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.club_grant(_target uuid, _cents integer, _tz text DEFAULT 'America/Chicago') RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _u uuid := auth.uid(); _bal integer; _today integer; _zone text; _start timestamptz;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF NOT public.discard_is_mod(_u) THEN RAISE EXCEPTION 'Only moderators can give money'; END IF;
  IF _cents IS NULL OR _cents < 1 OR _cents > 100000 THEN RAISE EXCEPTION 'Amount must be between $0.01 and $1,000.00'; END IF;
  _zone := CASE WHEN EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = _tz) THEN _tz ELSE 'America/Chicago' END;
  _start := date_trunc('day', now() AT TIME ZONE _zone) AT TIME ZONE _zone;
  SELECT COALESCE(SUM(cents), 0) INTO _today FROM public.club_grants WHERE from_user = _u AND created_at >= _start;
  IF _today + _cents > 1000000 THEN RAISE EXCEPTION 'You have hit today''s $10,000.00 limit — it resets at midnight'; END IF;
  INSERT INTO public.club_wallets (user_id) VALUES (_target) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.club_wallets SET earned_cents = earned_cents + _cents WHERE user_id = _target;
  INSERT INTO public.club_grants (from_user, to_user, cents) VALUES (_u, _target, _cents);
  SELECT earned_cents - spent_cents INTO _bal FROM public.club_wallets WHERE user_id = _target;
  RETURN _bal;
END $$;
DROP FUNCTION IF EXISTS public.club_grant(uuid, integer);