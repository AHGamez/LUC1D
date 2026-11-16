CREATE OR REPLACE FUNCTION public.club_price(_item text) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _item
    WHEN 'ring-nebula' THEN 500 WHEN 'ring-inferno' THEN 1000 WHEN 'ring-rainbow' THEN 2000 WHEN 'ring-royal' THEN 5000
    WHEN 'color-red' THEN 100 WHEN 'color-blue' THEN 100 WHEN 'color-pink' THEN 150 WHEN 'color-purple' THEN 150 WHEN 'color-gold' THEN 1000
    WHEN 'hat-cap' THEN 200 WHEN 'hat-tophat' THEN 500 WHEN 'hat-shades' THEN 300 WHEN 'hat-halo' THEN 800 WHEN 'hat-crown' THEN 2500
    WHEN 'house-cottage' THEN 2500 WHEN 'house-villa' THEN 7500 WHEN 'house-mansion' THEN 20000
    WHEN 'gif-pfp' THEN 5000 WHEN 'gif-banner' THEN 5000
    WHEN 'tag-chirpy' THEN 300 WHEN 'tag-gamer' THEN 500 WHEN 'tag-goat' THEN 1000 WHEN 'tag-rich' THEN 2500 WHEN 'tag-legend' THEN 5000 WHEN 'tag-whale' THEN 10000
    WHEN 'pet-stickman' THEN 1500 WHEN 'pet-turkey' THEN 2000
    ELSE NULL END
$$;