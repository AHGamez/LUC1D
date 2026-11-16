CREATE TABLE public.club_pass (
  user_id uuid PRIMARY KEY,
  xp integer NOT NULL DEFAULT 0,
  claimed integer[] NOT NULL DEFAULT '{}',
  streak_start timestamptz,
  last_ping timestamptz,
  bought_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.club_pass TO authenticated;
GRANT ALL ON public.club_pass TO service_role;
ALTER TABLE public.club_pass ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own pass" ON public.club_pass FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Level rewards: cents for money, or a ring item id.
CREATE OR REPLACE FUNCTION public.club_pass_reward(_level integer)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE _level WHEN 1 THEN '500' WHEN 2 THEN 'ring-frost' WHEN 3 THEN '1000' WHEN 4 THEN '1500'
    WHEN 5 THEN 'ring-toxic' WHEN 6 THEN '2000' WHEN 7 THEN '2500' WHEN 8 THEN '3000' WHEN 9 THEN '4000'
    WHEN 10 THEN 'ring-legend' ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.club_buy_pass()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _u uuid := auth.uid(); _bal integer;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF EXISTS (SELECT 1 FROM club_pass WHERE user_id = _u) THEN RAISE EXCEPTION 'You already have the pass'; END IF;
  INSERT INTO club_wallets (user_id) VALUES (_u) ON CONFLICT DO NOTHING;
  SELECT earned_cents - spent_cents INTO _bal FROM club_wallets WHERE user_id = _u FOR UPDATE;
  IF _bal < 2000 THEN RAISE EXCEPTION 'You need $20.00 — keep chatting!'; END IF;
  UPDATE club_wallets SET spent_cents = spent_cents + 2000 WHERE user_id = _u;
  INSERT INTO club_pass (user_id, streak_start, last_ping) VALUES (_u, now(), now());
END $$;

-- Called every minute while the site is open. Pays $10 + 100 XP per 10 unbroken minutes.
CREATE OR REPLACE FUNCTION public.club_pass_ping()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _u uuid := auth.uid(); p club_pass; _paid integer := 0;
BEGIN
  IF _u IS NULL THEN RETURN 0; END IF;
  SELECT * INTO p FROM club_pass WHERE user_id = _u FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF p.last_ping IS NULL OR p.streak_start IS NULL OR now() - p.last_ping > interval '3 minutes' THEN
    p.streak_start := now();
  ELSIF now() - p.last_ping < interval '30 seconds' THEN
    RETURN 0;
  END IF;
  IF now() - p.streak_start >= interval '10 minutes' THEN
    p.streak_start := p.streak_start + interval '10 minutes';
    _paid := 1000;
    UPDATE club_wallets SET earned_cents = earned_cents + 1000 WHERE user_id = _u;
  END IF;
  UPDATE club_pass SET last_ping = now(), streak_start = p.streak_start, xp = xp + CASE WHEN _paid > 0 THEN 100 ELSE 0 END WHERE user_id = _u;
  RETURN _paid;
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
  IF _r LIKE 'ring-%' THEN
    INSERT INTO club_owned (user_id, item_id) VALUES (_u, _r) ON CONFLICT DO NOTHING;
  ELSE
    UPDATE club_wallets SET earned_cents = earned_cents + _r::integer WHERE user_id = _u;
  END IF;
  UPDATE club_pass SET claimed = array_append(claimed, _level) WHERE user_id = _u;
  RETURN _r;
END $$;

-- $2 per TikiTaki post for everyone; pass holders also get 50 XP.
CREATE OR REPLACE FUNCTION public.club_count_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO club_wallets (user_id, earned_cents) VALUES (NEW.user_id, 200)
  ON CONFLICT (user_id) DO UPDATE SET earned_cents = club_wallets.earned_cents + 200;
  UPDATE club_pass SET xp = xp + 50 WHERE user_id = NEW.user_id;
  RETURN NEW;
END $$;
CREATE TRIGGER club_count_tiki_post AFTER INSERT ON public.tikitaki_posts FOR EACH ROW EXECUTE FUNCTION public.club_count_post();

REVOKE EXECUTE ON FUNCTION public.club_buy_pass(), public.club_pass_ping(), public.club_pass_claim(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.club_buy_pass(), public.club_pass_ping(), public.club_pass_claim(integer) TO authenticated;