CREATE TABLE public.club_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  give_items text[] NOT NULL DEFAULT '{}',
  give_cents integer NOT NULL DEFAULT 0 CHECK (give_cents >= 0),
  want_items text[] NOT NULL DEFAULT '{}',
  want_cents integer NOT NULL DEFAULT 0 CHECK (want_cents >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','canceled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.club_trades TO authenticated;
GRANT ALL ON public.club_trades TO service_role;
ALTER TABLE public.club_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trades visible to people involved" ON public.club_trades FOR SELECT TO authenticated USING (from_user = auth.uid() OR to_user = auth.uid());

CREATE OR REPLACE FUNCTION public.club_trade_offer(_to uuid, _give_items text[], _give_cents integer, _want_items text[], _want_cents integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := auth.uid(); _id uuid;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF _to = _u THEN RAISE EXCEPTION 'You cannot trade with yourself'; END IF;
  IF coalesce(_give_cents,0) < 0 OR coalesce(_want_cents,0) < 0 THEN RAISE EXCEPTION 'Bad amount'; END IF;
  IF coalesce(cardinality(_give_items),0) + coalesce(cardinality(_want_items),0) = 0 AND coalesce(_give_cents,0) + coalesce(_want_cents,0) = 0 THEN RAISE EXCEPTION 'Add something to the trade'; END IF;
  IF (SELECT count(*) FROM public.club_trades WHERE from_user = _u AND status = 'pending') >= 10 THEN RAISE EXCEPTION 'You have too many open offers'; END IF;
  INSERT INTO public.club_trades (from_user, to_user, give_items, give_cents, want_items, want_cents)
  VALUES (_u, _to, coalesce(_give_items,'{}'), coalesce(_give_cents,0), coalesce(_want_items,'{}'), coalesce(_want_cents,0)) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.club_trade_respond(_id uuid, _action text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := auth.uid(); t public.club_trades; _i text; _bal integer;
BEGIN
  SELECT * INTO t FROM public.club_trades WHERE id = _id FOR UPDATE;
  IF t.id IS NULL OR t.status <> 'pending' THEN RAISE EXCEPTION 'This trade is no longer open'; END IF;
  IF _action = 'cancel' THEN
    IF t.from_user <> _u THEN RAISE EXCEPTION 'Not your offer'; END IF;
    UPDATE public.club_trades SET status = 'canceled' WHERE id = _id; RETURN 'canceled';
  END IF;
  IF t.to_user <> _u THEN RAISE EXCEPTION 'Not your trade'; END IF;
  IF _action = 'decline' THEN UPDATE public.club_trades SET status = 'declined' WHERE id = _id; RETURN 'declined'; END IF;
  IF _action <> 'accept' THEN RAISE EXCEPTION 'Unknown action'; END IF;

  PERFORM 1 FROM public.club_wallets WHERE user_id IN (t.from_user, t.to_user) FOR UPDATE;
  FOREACH _i IN ARRAY t.give_items LOOP
    IF NOT EXISTS (SELECT 1 FROM public.club_owned WHERE user_id = t.from_user AND item_id = _i) THEN RAISE EXCEPTION 'They no longer own %', _i; END IF;
    IF EXISTS (SELECT 1 FROM public.club_owned WHERE user_id = t.to_user AND item_id = _i) THEN RAISE EXCEPTION 'You already own %', _i; END IF;
  END LOOP;
  FOREACH _i IN ARRAY t.want_items LOOP
    IF NOT EXISTS (SELECT 1 FROM public.club_owned WHERE user_id = t.to_user AND item_id = _i) THEN RAISE EXCEPTION 'You no longer own %', _i; END IF;
    IF EXISTS (SELECT 1 FROM public.club_owned WHERE user_id = t.from_user AND item_id = _i) THEN RAISE EXCEPTION 'They already own %', _i; END IF;
  END LOOP;
  SELECT coalesce(earned_cents - spent_cents, 0) INTO _bal FROM public.club_wallets WHERE user_id = t.from_user;
  IF coalesce(_bal,0) < t.give_cents THEN RAISE EXCEPTION 'They do not have enough money'; END IF;
  SELECT coalesce(earned_cents - spent_cents, 0) INTO _bal FROM public.club_wallets WHERE user_id = t.to_user;
  IF coalesce(_bal,0) < t.want_cents THEN RAISE EXCEPTION 'You do not have enough money'; END IF;

  UPDATE public.club_owned SET user_id = t.to_user WHERE user_id = t.from_user AND item_id = ANY(t.give_items);
  UPDATE public.club_owned SET user_id = t.from_user WHERE user_id = t.to_user AND item_id = ANY(t.want_items);
  INSERT INTO public.club_wallets (user_id) VALUES (t.from_user), (t.to_user) ON CONFLICT DO NOTHING;
  UPDATE public.club_wallets SET spent_cents = spent_cents + t.give_cents - t.want_cents WHERE user_id = t.from_user;
  UPDATE public.club_wallets SET spent_cents = spent_cents + t.want_cents - t.give_cents WHERE user_id = t.to_user;

  -- take off anything that was traded away
  UPDATE public.club_birds SET color = 'default' WHERE (user_id = t.from_user AND color = ANY(t.give_items)) OR (user_id = t.to_user AND color = ANY(t.want_items));
  UPDATE public.club_birds SET hat = 'none' WHERE (user_id = t.from_user AND hat = ANY(t.give_items)) OR (user_id = t.to_user AND hat = ANY(t.want_items));
  UPDATE public.discard_profiles SET avatar_decoration = DEFAULT WHERE (user_id = t.from_user AND avatar_decoration = ANY(t.give_items)) OR (user_id = t.to_user AND avatar_decoration = ANY(t.want_items));

  UPDATE public.club_trades SET status = 'accepted' WHERE id = _id;
  RETURN 'accepted';
END $$;
REVOKE ALL ON FUNCTION public.club_trade_offer(uuid, text[], integer, text[], integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_trade_respond(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_trade_offer(uuid, text[], integer, text[], integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_trade_respond(uuid, text) TO authenticated;