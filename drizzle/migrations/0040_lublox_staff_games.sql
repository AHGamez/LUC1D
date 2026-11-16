CREATE FUNCTION public.lublox_can_create() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND public.discard_is_mod(auth.uid()) $$;
REVOKE ALL ON FUNCTION public.lublox_can_create() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lublox_can_create() TO authenticated;
CREATE FUNCTION public.lublox_valid_world(_w jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE b jsonb;
BEGIN
 IF jsonb_typeof(_w) IS DISTINCT FROM 'array' OR jsonb_array_length(_w)>200 THEN RETURN false; END IF;
 FOR b IN SELECT value FROM jsonb_array_elements(_w) LOOP
  IF jsonb_typeof(b) IS DISTINCT FROM 'object' OR (b->>'kind') NOT IN ('platform','hazard','goal') OR b->>'kind' IS NULL THEN RETURN false; END IF;
  IF jsonb_typeof(b->'x') IS DISTINCT FROM 'number' OR jsonb_typeof(b->'y') IS DISTINCT FROM 'number' OR jsonb_typeof(b->'z') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
  IF abs((b->>'x')::numeric)>40 OR abs((b->>'z')::numeric)>40 OR (b->>'y')::numeric<0 OR (b->>'y')::numeric>30 THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END $$;
CREATE TABLE public.lublox_games (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 creator_id uuid NOT NULL DEFAULT auth.uid(),
 title text NOT NULL DEFAULT 'Untitled world' CHECK (length(trim(title)) BETWEEN 1 AND 60),
 description text NOT NULL DEFAULT '' CHECK (length(description)<=300),
 blocks jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (public.lublox_valid_world(blocks)),
 published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lublox_games TO authenticated;
GRANT ALL ON public.lublox_games TO service_role;
ALTER TABLE public.lublox_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "play published and read own drafts" ON public.lublox_games FOR SELECT TO authenticated USING (published OR creator_id=auth.uid());
CREATE POLICY "staff create own games" ON public.lublox_games FOR INSERT TO authenticated WITH CHECK (creator_id=auth.uid() AND public.lublox_can_create());
CREATE POLICY "staff edit own games" ON public.lublox_games FOR UPDATE TO authenticated USING (creator_id=auth.uid() AND public.lublox_can_create()) WITH CHECK (creator_id=auth.uid() AND public.lublox_can_create());
CREATE POLICY "staff delete own games" ON public.lublox_games FOR DELETE TO authenticated USING (creator_id=auth.uid() AND public.lublox_can_create());