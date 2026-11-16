CREATE OR REPLACE FUNCTION public.club_pass_claim(_level integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _u uuid := auth.uid(); p club_pass; _r text := public.club_pass_reward(_level);
BEGIN
  SELECT * INTO p FROM club_pass WHERE user_id = _u FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Buy the battle pass first'; END IF;
  IF _r IS NULL THEN RAISE EXCEPTION 'Unknown level'; END IF;
  IF least(10, p.xp / 100) < _level THEN RAISE EXCEPTION 'Level not reached yet'; END IF;
  IF _level = ANY(p.claimed) THEN RAISE EXCEPTION 'Already claimed'; END IF;
  -- Christmas rings are for owners and co-owners; everyone else gets the original money reward.
  IF _r = 'ring-snowfall' AND public.discard_rank(_u) < 2 THEN _r := '1500'; END IF;
  IF _r = 'ring-candycane' AND public.discard_rank(_u) < 2 THEN _r := '2500'; END IF;
  IF _r LIKE 'ring-%' THEN
    INSERT INTO club_owned (user_id, item_id) VALUES (_u, _r) ON CONFLICT DO NOTHING;
  ELSE
    UPDATE club_wallets SET earned_cents = earned_cents + _r::integer WHERE user_id = _u;
  END IF;
  UPDATE club_pass SET claimed = array_append(claimed, _level) WHERE user_id = _u;
  RETURN _r;
END $$;
REVOKE EXECUTE ON FUNCTION public.club_pass_claim(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.club_pass_claim(integer) TO authenticated;