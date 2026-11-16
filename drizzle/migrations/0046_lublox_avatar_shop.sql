CREATE OR REPLACE FUNCTION public.club_price(_item text) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _item
    WHEN 'ring-nebula' THEN 500 WHEN 'ring-inferno' THEN 1000 WHEN 'ring-rainbow' THEN 2000 WHEN 'ring-royal' THEN 5000
    WHEN 'color-red' THEN 100 WHEN 'color-blue' THEN 100 WHEN 'color-pink' THEN 150 WHEN 'color-purple' THEN 150 WHEN 'color-gold' THEN 1000
    WHEN 'hat-cap' THEN 200 WHEN 'hat-tophat' THEN 500 WHEN 'hat-shades' THEN 300 WHEN 'hat-halo' THEN 800 WHEN 'hat-crown' THEN 2500
    WHEN 'house-cottage' THEN 2500 WHEN 'house-villa' THEN 7500 WHEN 'house-mansion' THEN 20000
    WHEN 'gif-pfp' THEN 5000 WHEN 'gif-banner' THEN 5000
    WHEN 'tag-chirpy' THEN 300 WHEN 'tag-gamer' THEN 500 WHEN 'tag-goat' THEN 1000 WHEN 'tag-rich' THEN 2500 WHEN 'tag-legend' THEN 5000 WHEN 'tag-whale' THEN 10000
    WHEN 'pet-stickman' THEN 1500 WHEN 'pet-turkey' THEN 2000
    WHEN 'pet-pompom' THEN 2500 WHEN 'pet-flaps' THEN 2500 WHEN 'pet-chunk' THEN 2500 WHEN 'pet-parka' THEN 2500
    WHEN 'pet-miner' THEN 3000
    WHEN 'lbxhat-cap' THEN 200 WHEN 'lbxhat-tophat' THEN 500 WHEN 'lbxhat-crown' THEN 2000 WHEN 'lbxhat-cone' THEN 300
    WHEN 'lbxshirt-red' THEN 150 WHEN 'lbxshirt-green' THEN 150 WHEN 'lbxshirt-black' THEN 300 WHEN 'lbxshirt-gold' THEN 1500
    ELSE NULL END
$$;

CREATE TABLE public.lublox_avatars (user_id uuid PRIMARY KEY, hat text NOT NULL DEFAULT 'none', shirt text NOT NULL DEFAULT 'none', updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.lublox_avatars TO authenticated;
GRANT ALL ON public.lublox_avatars TO service_role;
ALTER TABLE public.lublox_avatars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read lublox avatars" ON public.lublox_avatars FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.lublox_equip(_slot text, _item text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := auth.uid();
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF _slot NOT IN ('hat','shirt') THEN RAISE EXCEPTION 'Bad slot'; END IF;
  IF _item <> 'none' THEN
    IF _item NOT LIKE 'lbx' || _slot || '-%' THEN RAISE EXCEPTION 'Wrong item type'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.club_owned WHERE user_id = _u AND item_id = _item) THEN RAISE EXCEPTION 'Buy it first'; END IF;
  END IF;
  INSERT INTO public.lublox_avatars (user_id) VALUES (_u) ON CONFLICT DO NOTHING;
  IF _slot = 'hat' THEN UPDATE public.lublox_avatars SET hat = _item, updated_at = now() WHERE user_id = _u;
  ELSE UPDATE public.lublox_avatars SET shirt = _item, updated_at = now() WHERE user_id = _u; END IF;
END $$;
REVOKE ALL ON FUNCTION public.lublox_equip(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lublox_equip(text, text) TO authenticated;