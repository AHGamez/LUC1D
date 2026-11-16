CREATE TABLE public.lublox_plots (
  plot integer PRIMARY KEY CHECK (plot BETWEEN 1 AND 10),
  user_id uuid NOT NULL UNIQUE,
  house text NOT NULL CHECK (house IN ('house-cottage','house-villa','house-mansion')),
  bought_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lublox_plots TO authenticated;
GRANT ALL ON public.lublox_plots TO service_role;
ALTER TABLE public.lublox_plots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read plots" ON public.lublox_plots FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.lublox_plot_price() RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT 2500 $$;

CREATE OR REPLACE FUNCTION public.lublox_buy_plot(_plot integer, _house text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := auth.uid(); _bal integer; _p integer := public.lublox_plot_price();
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF _plot < 1 OR _plot > 10 THEN RAISE EXCEPTION 'No such plot'; END IF;
  IF _house NOT IN ('house-cottage','house-villa','house-mansion') THEN RAISE EXCEPTION 'Not a house'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.club_owned WHERE user_id = _u AND item_id = _house) THEN RAISE EXCEPTION 'Buy that house in Club Bird first'; END IF;
  IF EXISTS (SELECT 1 FROM public.lublox_plots WHERE user_id = _u) THEN RAISE EXCEPTION 'You already own a plot'; END IF;
  PERFORM 1 FROM public.lublox_plots WHERE plot = _plot FOR UPDATE;
  IF FOUND THEN RAISE EXCEPTION 'That plot is taken'; END IF;
  INSERT INTO public.club_wallets(user_id) VALUES (_u) ON CONFLICT DO NOTHING;
  SELECT earned_cents - spent_cents INTO _bal FROM public.club_wallets WHERE user_id = _u FOR UPDATE;
  IF _bal < _p THEN RAISE EXCEPTION 'Not enough money — keep chatting!'; END IF;
  UPDATE public.club_wallets SET spent_cents = spent_cents + _p WHERE user_id = _u;
  INSERT INTO public.lublox_plots(plot, user_id, house) VALUES (_plot, _u, _house);
END $$;

CREATE OR REPLACE FUNCTION public.lublox_set_plot_house(_house text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := auth.uid();
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.club_owned WHERE user_id = _u AND item_id = _house) THEN RAISE EXCEPTION 'Buy that house in Club Bird first'; END IF;
  UPDATE public.lublox_plots SET house = _house WHERE user_id = _u;
  IF NOT FOUND THEN RAISE EXCEPTION 'You don''t own a plot'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.lublox_buy_plot(integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lublox_set_plot_house(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lublox_buy_plot(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lublox_set_plot_house(text) TO authenticated;