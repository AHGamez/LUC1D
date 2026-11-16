CREATE TABLE public.lublox_ai_usage (user_id uuid NOT NULL, day date NOT NULL, used int NOT NULL DEFAULT 0, PRIMARY KEY (user_id, day));
GRANT SELECT ON public.lublox_ai_usage TO authenticated;
GRANT ALL ON public.lublox_ai_usage TO service_role;
ALTER TABLE public.lublox_ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own ai usage" ON public.lublox_ai_usage FOR SELECT TO authenticated USING (user_id = auth.uid());
-- Daily AI helper allowance (UTC day). Change the limit here; it is the only source of truth.
CREATE OR REPLACE FUNCTION public.lublox_ai_limit() RETURNS int LANGUAGE sql IMMUTABLE AS $$ SELECT 20 $$;
CREATE OR REPLACE FUNCTION public.lublox_ai_take() RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  INSERT INTO lublox_ai_usage(user_id, day, used) VALUES (auth.uid(), (now() AT TIME ZONE 'utc')::date, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET used = lublox_ai_usage.used + 1
  WHERE lublox_ai_usage.used < public.lublox_ai_limit()
  RETURNING used INTO n;
  IF n IS NULL THEN RETURN -1; END IF;
  RETURN public.lublox_ai_limit() - n;
END $$;
REVOKE EXECUTE ON FUNCTION public.lublox_ai_take() FROM anon;