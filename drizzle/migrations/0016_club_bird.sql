CREATE OR REPLACE FUNCTION public.club_price(_item text) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _item
    WHEN 'ring-nebula' THEN 500 WHEN 'ring-inferno' THEN 1000 WHEN 'ring-rainbow' THEN 2000 WHEN 'ring-royal' THEN 5000
    WHEN 'color-red' THEN 100 WHEN 'color-blue' THEN 100 WHEN 'color-pink' THEN 150 WHEN 'color-purple' THEN 150 WHEN 'color-gold' THEN 1000
    WHEN 'hat-cap' THEN 200 WHEN 'hat-tophat' THEN 500 WHEN 'hat-shades' THEN 300 WHEN 'hat-halo' THEN 800 WHEN 'hat-crown' THEN 2500
    WHEN 'house-cottage' THEN 2500 WHEN 'house-villa' THEN 7500 WHEN 'house-mansion' THEN 20000
    ELSE NULL END
$$;

CREATE TABLE public.club_wallets (user_id uuid PRIMARY KEY, earned_cents integer NOT NULL DEFAULT 0, spent_cents integer NOT NULL DEFAULT 0, messages integer NOT NULL DEFAULT 0);
GRANT SELECT ON public.club_wallets TO authenticated;
GRANT ALL ON public.club_wallets TO service_role;
ALTER TABLE public.club_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read wallets" ON public.club_wallets FOR SELECT TO authenticated USING (true);

CREATE TABLE public.club_owned (user_id uuid NOT NULL, item_id text NOT NULL, bought_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, item_id));
GRANT SELECT ON public.club_owned TO authenticated;
GRANT ALL ON public.club_owned TO service_role;
ALTER TABLE public.club_owned ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read owned" ON public.club_owned FOR SELECT TO authenticated USING (true);

CREATE TABLE public.club_birds (user_id uuid PRIMARY KEY, color text NOT NULL DEFAULT 'default', hat text NOT NULL DEFAULT 'none');
GRANT SELECT ON public.club_birds TO authenticated;
GRANT ALL ON public.club_birds TO service_role;
ALTER TABLE public.club_birds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read birds" ON public.club_birds FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.club_count_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid;
BEGIN
  _u := CASE WHEN TG_TABLE_NAME = 'discard_dms' THEN NEW.sender_id ELSE NEW.user_id END;
  INSERT INTO public.club_wallets (user_id, earned_cents, messages) VALUES (_u, 10, 1)
  ON CONFLICT (user_id) DO UPDATE SET earned_cents = club_wallets.earned_cents + 10, messages = club_wallets.messages + 1;
  RETURN NEW;
END $$;
CREATE TRIGGER club_count_channel_message AFTER INSERT ON public.discard_messages FOR EACH ROW EXECUTE FUNCTION public.club_count_message();
CREATE TRIGGER club_count_dm AFTER INSERT ON public.discard_dms FOR EACH ROW EXECUTE FUNCTION public.club_count_message();

INSERT INTO public.club_wallets (user_id, earned_cents, messages)
SELECT u, count(*)::int * 10, count(*)::int FROM (
  SELECT user_id AS u FROM public.discard_messages UNION ALL SELECT sender_id FROM public.discard_dms
) x GROUP BY u
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.club_buy(_item text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := auth.uid(); _p integer := public.club_price(_item); _bal integer;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF _p IS NULL THEN RAISE EXCEPTION 'Unknown item'; END IF;
  IF EXISTS (SELECT 1 FROM public.club_owned WHERE user_id = _u AND item_id = _item) THEN RAISE EXCEPTION 'You already own this'; END IF;
  INSERT INTO public.club_wallets (user_id) VALUES (_u) ON CONFLICT DO NOTHING;
  SELECT earned_cents - spent_cents INTO _bal FROM public.club_wallets WHERE user_id = _u FOR UPDATE;
  IF _bal < _p THEN RAISE EXCEPTION 'Not enough money — keep chatting!'; END IF;
  UPDATE public.club_wallets SET spent_cents = spent_cents + _p WHERE user_id = _u;
  INSERT INTO public.club_owned (user_id, item_id) VALUES (_u, _item);
  RETURN _bal - _p;
END $$;

CREATE OR REPLACE FUNCTION public.club_equip(_slot text, _item text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := auth.uid();
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF _slot NOT IN ('color','hat') THEN RAISE EXCEPTION 'Bad slot'; END IF;
  IF _item NOT IN ('none','default') THEN
    IF _item NOT LIKE _slot || '-%' THEN RAISE EXCEPTION 'Wrong item type'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.club_owned WHERE user_id = _u AND item_id = _item) THEN RAISE EXCEPTION 'Buy it first'; END IF;
  END IF;
  INSERT INTO public.club_birds (user_id) VALUES (_u) ON CONFLICT DO NOTHING;
  IF _slot = 'color' THEN UPDATE public.club_birds SET color = _item WHERE user_id = _u;
  ELSE UPDATE public.club_birds SET hat = _item WHERE user_id = _u; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.club_check_ring() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.avatar_decoration LIKE 'ring-%' AND NOT EXISTS (SELECT 1 FROM public.club_owned WHERE user_id = NEW.user_id AND item_id = NEW.avatar_decoration) THEN
    RAISE EXCEPTION 'Buy this ring in the Club Bird shop first';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER club_check_ring BEFORE INSERT OR UPDATE OF avatar_decoration ON public.discard_profiles FOR EACH ROW EXECUTE FUNCTION public.club_check_ring();

REVOKE EXECUTE ON FUNCTION public.club_buy(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.club_equip(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.club_buy(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_equip(text, text) TO authenticated;