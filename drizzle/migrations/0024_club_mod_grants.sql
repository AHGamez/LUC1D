CREATE TABLE public.club_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  cents integer NOT NULL CHECK (cents > 0 AND cents <= 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.club_grants TO authenticated;
GRANT ALL ON public.club_grants TO service_role;

ALTER TABLE public.club_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grants visible to people involved" ON public.club_grants
  FOR SELECT TO authenticated
  USING (from_user = auth.uid() OR to_user = auth.uid());

CREATE OR REPLACE FUNCTION public.club_grant(_target uuid, _cents integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _u uuid := auth.uid(); _bal integer; _today integer;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF NOT public.discard_is_mod(_u) THEN RAISE EXCEPTION 'Only moderators can give money'; END IF;
  IF _target = _u THEN RAISE EXCEPTION 'You cannot give money to yourself'; END IF;
  IF _cents IS NULL OR _cents < 1 OR _cents > 5000 THEN RAISE EXCEPTION 'Amount must be between $0.01 and $50.00'; END IF;
  SELECT COALESCE(SUM(cents), 0) INTO _today FROM public.club_grants
    WHERE from_user = _u AND created_at > now() - interval '1 day';
  IF _today + _cents > 10000 THEN RAISE EXCEPTION 'You have given too much money today (limit $100.00)'; END IF;
  INSERT INTO public.club_wallets (user_id) VALUES (_target) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.club_wallets SET earned_cents = earned_cents + _cents WHERE user_id = _target;
  INSERT INTO public.club_grants (from_user, to_user, cents) VALUES (_u, _target, _cents);
  SELECT earned_cents - spent_cents INTO _bal FROM public.club_wallets WHERE user_id = _target;
  RETURN _bal;
END $function$;

REVOKE ALL ON FUNCTION public.club_grant(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_grant(uuid, integer) TO authenticated;

COMMENT ON TABLE public.club_grants IS 'Audit log of Discard-coin gifts given by moderators through public.club_grant().';