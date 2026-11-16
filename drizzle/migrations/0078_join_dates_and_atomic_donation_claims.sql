-- 1) Join dates come from the account. Backfill existing profiles first (the trigger below
--    would otherwise undo this update), then make created_at impossible to change afterwards.
UPDATE public.discard_profiles p
SET created_at = u.created_at
FROM auth.users u
WHERE u.id = p.user_id AND p.created_at > u.created_at;

CREATE OR REPLACE FUNCTION public.discard_keep_join_date()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS discard_keep_join_date ON public.discard_profiles;
CREATE TRIGGER discard_keep_join_date
  BEFORE UPDATE OF created_at ON public.discard_profiles
  FOR EACH ROW WHEN (NEW.created_at IS DISTINCT FROM OLD.created_at)
  EXECUTE FUNCTION public.discard_keep_join_date();

-- 2) A donation reward is claimed in one transaction: the claim row, the donor tag and the wallet credit
--    either all happen or none do. Returns false when this Checkout session was already claimed.
--    Only the server (service role) may call it.
CREATE OR REPLACE FUNCTION public.donation_claim_reward(
  _session_id text, _user_id uuid, _cents integer, _reward_cents integer, _tag text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inserted integer;
BEGIN
  INSERT INTO public.donation_claims (session_id, user_id, cents)
  VALUES (_session_id, _user_id, _cents)
  ON CONFLICT (session_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.club_owned (user_id, item_id) VALUES (_user_id, _tag)
  ON CONFLICT (user_id, item_id) DO NOTHING;

  INSERT INTO public.club_wallets (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.club_wallets SET earned_cents = earned_cents + _reward_cents WHERE user_id = _user_id;

  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.donation_claim_reward(text, uuid, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.donation_claim_reward(text, uuid, integer, integer, text) TO service_role;
