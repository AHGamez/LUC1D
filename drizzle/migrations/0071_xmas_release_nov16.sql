CREATE OR REPLACE FUNCTION public.xmas_access(_u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT now() >= timestamptz '2026-11-15 10:00:00+00' OR public.xmas_staff(_u)
$$;