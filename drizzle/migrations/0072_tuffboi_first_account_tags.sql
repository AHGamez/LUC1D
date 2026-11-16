CREATE TABLE public.tuffboi_winner (only_one boolean PRIMARY KEY DEFAULT true CHECK (only_one), user_id uuid NOT NULL, won_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.tuffboi_winner TO authenticated;
GRANT ALL ON public.tuffboi_winner TO service_role;
ALTER TABLE public.tuffboi_winner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone signed in can see winner" ON public.tuffboi_winner FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.tuffboi_claim() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _u uuid := auth.uid(); _won boolean := false;
BEGIN
  IF _u IS NULL OR _u = '01622582-5968-4d13-8fcf-4d25e33a5cf8'::uuid THEN RETURN false; END IF;
  IF now() < timestamptz '2026-11-16 00:00:00 America/Chicago' OR now() >= timestamptz '2026-11-17 00:00:00 America/Chicago' THEN RETURN false; END IF;
  INSERT INTO public.tuffboi_winner(user_id) VALUES (_u) ON CONFLICT DO NOTHING RETURNING true INTO _won;
  IF _won THEN INSERT INTO public.club_owned(user_id,item_id) VALUES (_u,'tag-tuffboi') ON CONFLICT DO NOTHING; END IF;
  RETURN coalesce(_won,false);
END $$;
REVOKE ALL ON FUNCTION public.tuffboi_claim() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.tuffboi_claim() TO authenticated;