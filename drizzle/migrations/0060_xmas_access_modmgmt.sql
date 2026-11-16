CREATE OR REPLACE FUNCTION public.xmas_access(_u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.discard_rank(_u) >= 2 OR EXISTS (SELECT 1 FROM public.discard_chat_tags WHERE user_id = _u AND tag = 'modmgmt')
$$;
REVOKE EXECUTE ON FUNCTION public.xmas_access(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.xmas_access(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.club_buy(_item text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _u uuid := auth.uid(); _p integer := public.club_price(_item); _bal integer;
BEGIN
 IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF _item IN ('bg-xmas','pet-santa') AND NOT public.xmas_access(_u) THEN RAISE EXCEPTION 'The Christmas update is only for owners and co-owners'; END IF;
 IF public.turkey_price(_item) IS NOT NULL THEN RAISE EXCEPTION 'Buy this in the Turkey Coins shop'; END IF;
 IF _p IS NULL THEN RAISE EXCEPTION 'Unknown item'; END IF;
 INSERT INTO public.club_wallets(user_id) VALUES(_u) ON CONFLICT DO NOTHING;
 SELECT earned_cents-spent_cents INTO _bal FROM public.club_wallets WHERE user_id=_u FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.club_owned WHERE user_id=_u AND item_id=_item) THEN RAISE EXCEPTION 'You already own this'; END IF;
 IF _bal<_p THEN RAISE EXCEPTION 'Not enough money — keep chatting!'; END IF;
 UPDATE public.club_wallets SET spent_cents=spent_cents+_p WHERE user_id=_u;
 INSERT INTO public.club_owned(user_id,item_id) VALUES(_u,_item);
 RETURN _bal-_p;
END $$;

CREATE OR REPLACE FUNCTION public.club_pass_claim(_level integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _u uuid := auth.uid(); p club_pass; _r text := public.club_pass_reward(_level);
BEGIN
  SELECT * INTO p FROM club_pass WHERE user_id = _u FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Buy the battle pass first'; END IF;
  IF _r IS NULL THEN RAISE EXCEPTION 'Unknown level'; END IF;
  IF least(10, p.xp / 100) < _level THEN RAISE EXCEPTION 'Level not reached yet'; END IF;
  IF _level = ANY(p.claimed) THEN RAISE EXCEPTION 'Already claimed'; END IF;
  IF _r = 'ring-snowfall' AND NOT public.xmas_access(_u) THEN _r := '1500'; END IF;
  IF _r = 'ring-candycane' AND NOT public.xmas_access(_u) THEN _r := '2500'; END IF;
  IF _r LIKE 'ring-%' THEN
    INSERT INTO club_owned (user_id, item_id) VALUES (_u, _r) ON CONFLICT DO NOTHING;
  ELSE
    UPDATE club_wallets SET earned_cents = earned_cents + _r::integer WHERE user_id = _u;
  END IF;
  UPDATE club_pass SET claimed = array_append(claimed, _level) WHERE user_id = _u;
  RETURN _r;
END $$;