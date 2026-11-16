CREATE TABLE public.turkey_wallets (user_id uuid PRIMARY KEY, earned_cents integer NOT NULL DEFAULT 0 CHECK (earned_cents >= 0), spent_cents integer NOT NULL DEFAULT 0 CHECK (spent_cents >= 0 AND spent_cents <= earned_cents));
GRANT SELECT ON public.turkey_wallets TO authenticated;
GRANT ALL ON public.turkey_wallets TO service_role;
ALTER TABLE public.turkey_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY turkey_wallet_owner ON public.turkey_wallets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TABLE public.turkey_hunts (user_id uuid NOT NULL, event_id bigint NOT NULL, hits integer NOT NULL DEFAULT 0, last_hit timestamptz, PRIMARY KEY (user_id,event_id));
GRANT SELECT ON public.turkey_hunts TO authenticated;
GRANT ALL ON public.turkey_hunts TO service_role;
ALTER TABLE public.turkey_hunts ENABLE ROW LEVEL SECURITY;
CREATE POLICY turkey_hunt_owner ON public.turkey_hunts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TABLE public.turkey_targets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, event_id bigint NOT NULL, x integer NOT NULL, y integer NOT NULL, claimed boolean NOT NULL DEFAULT false);
GRANT SELECT ON public.turkey_targets TO authenticated;
GRANT ALL ON public.turkey_targets TO service_role;
ALTER TABLE public.turkey_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY turkey_target_owner ON public.turkey_targets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX turkey_targets_owner_event ON public.turkey_targets(user_id,event_id);
CREATE FUNCTION public.turkey_price(_item text) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT CASE _item WHEN 'pet-turkey' THEN 2000 WHEN 'ring-leaves' THEN 1500 WHEN 'ring-gobbler' THEN 3000 ELSE NULL END $$;
CREATE FUNCTION public.turkey_status() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid := auth.uid(); t bigint := floor(extract(epoch from clock_timestamp()))::bigint; ev bigint := t / 7200; active boolean := mod(t,7200) < 600; balance integer; targets jsonb;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 INSERT INTO turkey_wallets(user_id) VALUES(u) ON CONFLICT DO NOTHING;
 IF active THEN
  INSERT INTO turkey_hunts(user_id,event_id) VALUES(u,ev) ON CONFLICT DO NOTHING;
  PERFORM 1 FROM turkey_hunts WHERE user_id=u AND event_id=ev FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM turkey_targets WHERE user_id=u AND event_id=ev) THEN
   INSERT INTO turkey_targets(user_id,event_id,x,y) SELECT u,ev,60+floor(random()*880)::integer,280+floor(random()*240)::integer FROM generate_series(1,12);
  END IF;
 END IF;
 SELECT earned_cents-spent_cents INTO balance FROM turkey_wallets WHERE user_id=u;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'x',x,'y',y)), '[]'::jsonb) INTO targets FROM turkey_targets WHERE user_id=u AND event_id=ev AND NOT claimed;
 RETURN jsonb_build_object('now',t*1000,'active',active,'end',(ev*7200+600)*1000,'next',(ev+1)*7200*1000,'balance',balance,'targets',CASE WHEN active THEN targets ELSE '[]'::jsonb END);
END $$;
CREATE FUNCTION public.turkey_hit(_target uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid := auth.uid(); t bigint := floor(extract(epoch from clock_timestamp()))::bigint; ev bigint := t/7200; h public.turkey_hunts; reward integer;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF mod(t,7200)>=600 THEN RAISE EXCEPTION 'The hunt has ended'; END IF;
 SELECT * INTO h FROM turkey_hunts WHERE user_id=u AND event_id=ev FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Join the hunt first'; END IF;
 IF h.hits>=100 THEN RAISE EXCEPTION 'You finished this hunt!'; END IF;
 IF h.last_hit IS NOT NULL AND clock_timestamp()-h.last_hit < interval '2 seconds' THEN RAISE EXCEPTION 'Reloading — wait a moment'; END IF;
 UPDATE turkey_targets SET claimed=true WHERE id=_target AND user_id=u AND event_id=ev AND NOT claimed;
 IF NOT FOUND THEN RAISE EXCEPTION 'This turkey is already gone'; END IF;
 reward := 10+floor(random()*991)::integer;
 UPDATE turkey_hunts SET hits=hits+1,last_hit=clock_timestamp() WHERE user_id=u AND event_id=ev;
 UPDATE turkey_wallets SET earned_cents=earned_cents+reward WHERE user_id=u;
 IF h.hits < 88 THEN INSERT INTO turkey_targets(user_id,event_id,x,y) VALUES(u,ev,60+floor(random()*880)::integer,280+floor(random()*240)::integer); END IF;
 RETURN reward;
END $$;
CREATE FUNCTION public.turkey_buy(_item text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid := auth.uid(); p integer := public.turkey_price(_item); bal integer;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF p IS NULL THEN RAISE EXCEPTION 'Unknown turkey reward'; END IF;
 INSERT INTO turkey_wallets(user_id) VALUES(u) ON CONFLICT DO NOTHING;
 SELECT earned_cents-spent_cents INTO bal FROM turkey_wallets WHERE user_id=u FOR UPDATE;
 IF EXISTS(SELECT 1 FROM club_owned WHERE user_id=u AND item_id=_item) THEN RAISE EXCEPTION 'Already owned'; END IF;
 IF bal<p THEN RAISE EXCEPTION 'Not enough Turkey Coins'; END IF;
 UPDATE turkey_wallets SET spent_cents=spent_cents+p WHERE user_id=u;
 INSERT INTO club_owned(user_id,item_id) VALUES(u,_item);
 RETURN bal-p;
END $$;
CREATE OR REPLACE FUNCTION public.club_buy(_item text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _u uuid := auth.uid(); _p integer := public.club_price(_item); _bal integer;
BEGIN
 IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF public.turkey_price(_item) IS NOT NULL THEN RAISE EXCEPTION 'Buy this in the Turkey Coins shop'; END IF;
 IF _p IS NULL THEN RAISE EXCEPTION 'Unknown item'; END IF;
 INSERT INTO public.club_wallets(user_id) VALUES(_u) ON CONFLICT DO NOTHING;
 SELECT earned_cents-spent_cents INTO _bal FROM public.club_wallets WHERE user_id=_u FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.club_owned WHERE user_id=_u AND item_id=_item) THEN RAISE EXCEPTION 'You already own this'; END IF;
 IF _bal<_p THEN RAISE EXCEPTION 'Not enough money — keep chatting!'; END IF;
 UPDATE public.club_wallets SET spent_cents=spent_cents+_p WHERE user_id=_u;
 INSERT INTO public.club_owned(user_id,item_id) VALUES(_u,_item);
 RETURN _bal-_p;
END $$;
REVOKE ALL ON FUNCTION public.turkey_status(), public.turkey_hit(uuid), public.turkey_buy(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.turkey_status(), public.turkey_hit(uuid), public.turkey_buy(text) TO authenticated;
