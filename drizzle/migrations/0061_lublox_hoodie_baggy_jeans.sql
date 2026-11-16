ALTER TABLE public.lublox_avatars ADD COLUMN IF NOT EXISTS pants text NOT NULL DEFAULT 'none';
CREATE OR REPLACE FUNCTION public.club_price(_item text)
 RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  SELECT CASE _item
    WHEN 'ring-nebula' THEN 500 WHEN 'ring-inferno' THEN 1000 WHEN 'ring-rainbow' THEN 2000 WHEN 'ring-royal' THEN 5000
    WHEN 'color-red' THEN 100 WHEN 'color-blue' THEN 100 WHEN 'color-pink' THEN 150 WHEN 'color-purple' THEN 150 WHEN 'color-gold' THEN 1000
    WHEN 'hat-cap' THEN 200 WHEN 'hat-tophat' THEN 500 WHEN 'hat-shades' THEN 300 WHEN 'hat-halo' THEN 800 WHEN 'hat-crown' THEN 2500
    WHEN 'house-cottage' THEN 2500 WHEN 'house-villa' THEN 7500 WHEN 'house-mansion' THEN 20000
    WHEN 'gif-pfp' THEN 5000 WHEN 'gif-banner' THEN 5000
    WHEN 'tag-chirpy' THEN 300 WHEN 'tag-gamer' THEN 500 WHEN 'tag-goat' THEN 1000 WHEN 'tag-rich' THEN 2500 WHEN 'tag-legend' THEN 5000 WHEN 'tag-whale' THEN 10000
    WHEN 'pet-stickman' THEN 1500 WHEN 'pet-turkey' THEN 2000
    WHEN 'pet-pompom' THEN 2500 WHEN 'pet-flaps' THEN 2500 WHEN 'pet-chunk' THEN 2500 WHEN 'pet-parka' THEN 2500
    WHEN 'pet-miner' THEN 3000 WHEN 'pet-santa' THEN 2500
    WHEN 'bg-xmas' THEN 2026
    WHEN 'lbxhat-cap' THEN 200 WHEN 'lbxhat-tophat' THEN 500 WHEN 'lbxhat-crown' THEN 2000 WHEN 'lbxhat-cone' THEN 300
    WHEN 'lbxhat-headphones' THEN 600 WHEN 'lbxhat-viking' THEN 900 WHEN 'lbxhat-halo' THEN 1200 WHEN 'lbxhat-wizard' THEN 800
    WHEN 'lbxhat-horns' THEN 1800 WHEN 'lbxhat-dominus' THEN 5000
    WHEN 'lbxshirt-red' THEN 150 WHEN 'lbxshirt-green' THEN 150 WHEN 'lbxshirt-black' THEN 300 WHEN 'lbxshirt-gold' THEN 1500
    WHEN 'lbxshirt-hoodie' THEN 400 WHEN 'lbxpants-baggy' THEN 350
    WHEN 'lbxcar-ebike' THEN 1500 WHEN 'lbxcar-car' THEN 3000 WHEN 'lbxcar-lambo' THEN 10000
    ELSE NULL END
$function$;
CREATE OR REPLACE FUNCTION public.lublox_equip(_slot text, _item text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _u uuid := auth.uid();
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF _slot NOT IN ('hat','shirt','pants') THEN RAISE EXCEPTION 'Bad slot'; END IF;
  IF _item <> 'none' THEN
    IF _item NOT LIKE 'lbx' || _slot || '-%' THEN RAISE EXCEPTION 'Wrong item type'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.club_owned WHERE user_id = _u AND item_id = _item) THEN RAISE EXCEPTION 'Buy it first'; END IF;
  END IF;
  INSERT INTO public.lublox_avatars (user_id) VALUES (_u) ON CONFLICT DO NOTHING;
  IF _slot = 'hat' THEN UPDATE public.lublox_avatars SET hat = _item, updated_at = now() WHERE user_id = _u;
  ELSIF _slot = 'shirt' THEN UPDATE public.lublox_avatars SET shirt = _item, updated_at = now() WHERE user_id = _u;
  ELSE UPDATE public.lublox_avatars SET pants = _item, updated_at = now() WHERE user_id = _u; END IF;
END $function$;