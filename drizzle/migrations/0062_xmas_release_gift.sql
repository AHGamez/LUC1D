CREATE OR REPLACE FUNCTION public.xmas_staff(_u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.discard_rank(_u) >= 2 OR EXISTS (SELECT 1 FROM public.discard_chat_tags WHERE user_id = _u AND tag = 'modmgmt')
$$;
REVOKE EXECUTE ON FUNCTION public.xmas_staff(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.xmas_staff(uuid) TO authenticated;

-- Released to everyone from the first midnight Nov 15 anywhere in the world (UTC+14).
CREATE OR REPLACE FUNCTION public.xmas_access(_u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT now() >= timestamptz '2026-11-14 10:00:00+00' OR public.xmas_staff(_u)
$$;

CREATE TABLE public.xmas_gifts (
  user_id uuid PRIMARY KEY,
  reward text NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.xmas_gifts TO authenticated;
GRANT ALL ON public.xmas_gifts TO service_role;
ALTER TABLE public.xmas_gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own gift readable" ON public.xmas_gifts FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.xmas_gift_open() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _u uuid := auth.uid(); _r text; _pool text[];
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF NOT public.xmas_access(_u) THEN RAISE EXCEPTION 'Not Christmas yet'; END IF;
  SELECT reward INTO _r FROM public.xmas_gifts WHERE user_id = _u;
  IF FOUND THEN RETURN _r; END IF;
  SELECT array_agg(x) INTO _pool FROM unnest(ARRAY['lbxhat-santa','bg-xmas','tag-xmas26']) x
    WHERE NOT EXISTS (SELECT 1 FROM public.club_owned WHERE user_id = _u AND item_id = x);
  IF _pool IS NULL THEN _pool := ARRAY['lbxhat-santa','bg-xmas','tag-xmas26']; END IF;
  _r := _pool[1 + floor(random() * array_length(_pool, 1))::int];
  INSERT INTO public.club_owned (user_id, item_id) VALUES (_u, _r) ON CONFLICT DO NOTHING;
  INSERT INTO public.xmas_gifts (user_id, reward) VALUES (_u, _r);
  RETURN _r;
END $$;
REVOKE EXECUTE ON FUNCTION public.xmas_gift_open() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.xmas_gift_open() TO authenticated;

INSERT INTO public.club_owned (user_id, item_id)
  SELECT id, 'tag-xmas26' FROM auth.users WHERE public.discard_rank(id) >= 2
  ON CONFLICT DO NOTHING;