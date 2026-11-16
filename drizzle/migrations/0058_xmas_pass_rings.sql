CREATE OR REPLACE FUNCTION public.club_pass_reward(_level integer)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE _level WHEN 1 THEN '500' WHEN 2 THEN 'ring-frost' WHEN 3 THEN '1000' WHEN 4 THEN 'ring-snowfall'
    WHEN 5 THEN 'ring-toxic' WHEN 6 THEN '2000' WHEN 7 THEN 'ring-candycane' WHEN 8 THEN '3000' WHEN 9 THEN '4000'
    WHEN 10 THEN 'ring-legend' ELSE NULL END
$$;