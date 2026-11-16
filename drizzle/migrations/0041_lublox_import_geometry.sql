CREATE OR REPLACE FUNCTION public.lublox_valid_world(_w jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE b jsonb; k text; i integer; v numeric;
BEGIN
 IF jsonb_typeof(_w) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(_w)>200 THEN RETURN false; END IF;
 FOR b IN SELECT value FROM jsonb_array_elements(_w) LOOP
  IF jsonb_typeof(b) IS DISTINCT FROM 'object' OR (b->>'kind') NOT IN ('platform','hazard','goal') OR b->>'kind' IS NULL THEN RETURN false; END IF;
  IF jsonb_typeof(b->'x') IS DISTINCT FROM 'number' OR jsonb_typeof(b->'y') IS DISTINCT FROM 'number' OR jsonb_typeof(b->'z') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
  IF abs((b->>'x')::numeric)>40 OR abs((b->>'z')::numeric)>40 OR (b->>'y')::numeric<0 OR (b->>'y')::numeric>30 THEN RETURN false; END IF;
  FOR k IN SELECT unnest(ARRAY['size','rotation']) LOOP
   IF b ? k THEN
    IF jsonb_typeof(b->k) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
    IF jsonb_array_length(b->k)<>3 THEN RETURN false; END IF;
    FOR i IN 0..2 LOOP
     IF jsonb_typeof(b->k->i) IS DISTINCT FROM 'number' THEN RETURN false; END IF;
     v := (b->k->>i)::numeric;
     IF k='size' AND (v<0.05 OR v>CASE WHEN i=1 THEN 60 ELSE 80 END) THEN RETURN false; END IF;
     IF k='rotation' AND abs(v)>pi() THEN RETURN false; END IF;
    END LOOP;
   END IF;
  END LOOP;
 END LOOP;
 RETURN true;
END $$;