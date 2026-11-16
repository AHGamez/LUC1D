CREATE TABLE public.bikelife_payouts (user_id uuid NOT NULL, day date NOT NULL, cents int NOT NULL DEFAULT 0, last_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, day));
GRANT SELECT ON public.bikelife_payouts TO authenticated;
GRANT ALL ON public.bikelife_payouts TO service_role;
ALTER TABLE public.bikelife_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payouts" ON public.bikelife_payouts FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bikelife_cash(_cents int) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid(); d date := (now() AT TIME ZONE 'America/Chicago')::date; r public.bikelife_payouts; pay int;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'sign in'; END IF;
  pay := LEAST(GREATEST(COALESCE(_cents,0),0), 200);
  INSERT INTO public.bikelife_payouts(user_id, day, cents, last_at) VALUES (u, d, 0, now() - interval '1 minute') ON CONFLICT DO NOTHING;
  SELECT * INTO r FROM public.bikelife_payouts WHERE user_id = u AND day = d FOR UPDATE;
  IF r.last_at > now() - interval '15 seconds' THEN RETURN 0; END IF;
  pay := LEAST(pay, 2500 - r.cents);
  IF pay <= 0 THEN RETURN 0; END IF;
  UPDATE public.bikelife_payouts SET cents = cents + pay, last_at = now() WHERE user_id = u AND day = d;
  INSERT INTO public.club_wallets(user_id, earned_cents) VALUES (u, pay) ON CONFLICT (user_id) DO UPDATE SET earned_cents = club_wallets.earned_cents + pay;
  RETURN pay;
END $$;
REVOKE ALL ON FUNCTION public.bikelife_cash(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bikelife_cash(int) TO authenticated;