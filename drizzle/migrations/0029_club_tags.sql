ALTER TABLE public.club_birds ADD COLUMN IF NOT EXISTS tag text NOT NULL DEFAULT 'none';

CREATE OR REPLACE FUNCTION public.club_price(_item text) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _item
    WHEN 'ring-nebula' THEN 500 WHEN 'ring-inferno' THEN 1000 WHEN 'ring-rainbow' THEN 2000 WHEN 'ring-royal' THEN 5000
    WHEN 'color-red' THEN 100 WHEN 'color-blue' THEN 100 WHEN 'color-pink' THEN 150 WHEN 'color-purple' THEN 150 WHEN 'color-gold' THEN 1000
    WHEN 'hat-cap' THEN 200 WHEN 'hat-tophat' THEN 500 WHEN 'hat-shades' THEN 300 WHEN 'hat-halo' THEN 800 WHEN 'hat-crown' THEN 2500
    WHEN 'house-cottage' THEN 2500 WHEN 'house-villa' THEN 7500 WHEN 'house-mansion' THEN 20000
    WHEN 'gif-pfp' THEN 5000 WHEN 'gif-banner' THEN 5000
    WHEN 'tag-chirpy' THEN 300 WHEN 'tag-gamer' THEN 500 WHEN 'tag-goat' THEN 1000 WHEN 'tag-rich' THEN 2500 WHEN 'tag-legend' THEN 5000 WHEN 'tag-whale' THEN 10000
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.club_equip(_slot text, _item text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := auth.uid();
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF _slot NOT IN ('color','hat','tag') THEN RAISE EXCEPTION 'Bad slot'; END IF;
  IF _item NOT IN ('none','default') THEN
    IF _item NOT LIKE _slot || '-%' THEN RAISE EXCEPTION 'Wrong item type'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.club_owned WHERE user_id = _u AND item_id = _item) THEN RAISE EXCEPTION 'Buy it first'; END IF;
  END IF;
  INSERT INTO public.club_birds (user_id) VALUES (_u) ON CONFLICT DO NOTHING;
  IF _slot = 'color' THEN UPDATE public.club_birds SET color = _item WHERE user_id = _u;
  ELSIF _slot = 'hat' THEN UPDATE public.club_birds SET hat = _item WHERE user_id = _u;
  ELSE UPDATE public.club_birds SET tag = _item WHERE user_id = _u; END IF;
END $$;

-- Unequip a traded-away tag
CREATE OR REPLACE FUNCTION public.club_unequip_lost_tag() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.item_id LIKE 'tag-%' THEN UPDATE public.club_birds SET tag = 'none' WHERE user_id = OLD.user_id AND tag = OLD.item_id; END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS club_unequip_lost_tag ON public.club_owned;
CREATE TRIGGER club_unequip_lost_tag AFTER DELETE OR UPDATE ON public.club_owned FOR EACH ROW EXECUTE FUNCTION public.club_unequip_lost_tag();