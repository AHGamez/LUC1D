CREATE FUNCTION public.turkey_reward_cents(_tier double precision, _amount double precision) RETURNS integer LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
BEGIN
 IF _tier IS NULL OR _amount IS NULL OR NOT (_tier >= 0 AND _tier < 1 AND _amount >= 0 AND _amount < 1) THEN RAISE EXCEPTION 'Invalid reward roll'; END IF;
 IF _tier < 0.80 THEN RETURN 10+floor(_amount*41)::integer;
 ELSIF _tier < 0.95 THEN RETURN 51+floor(_amount*150)::integer;
 ELSIF _tier < 0.99 THEN RETURN 201+floor(_amount*300)::integer;
 ELSE RETURN 501+floor(_amount*500)::integer;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.turkey_hit(_target uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid := auth.uid(); t bigint := floor(extract(epoch from clock_timestamp()))::bigint; ev bigint := t/7200; h public.turkey_hunts; reward integer; manual_end timestamptz; manual_id bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 SELECT event_id, ends_at INTO manual_id, manual_end FROM public.turkey_manual_events WHERE ends_at > clock_timestamp() ORDER BY ends_at DESC LIMIT 1;
 IF FOUND THEN ev := -manual_id; END IF;
 IF mod(t,7200)>=600 AND manual_end IS NULL THEN RAISE EXCEPTION 'The hunt has ended'; END IF;
 SELECT * INTO h FROM turkey_hunts WHERE user_id=u AND event_id=ev FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Join the hunt first'; END IF;
 IF h.hits>=100 THEN RAISE EXCEPTION 'You finished this hunt!'; END IF;
 IF h.last_hit IS NOT NULL AND clock_timestamp()-h.last_hit < interval '2 seconds' THEN RAISE EXCEPTION 'Reloading — wait a moment'; END IF;
 UPDATE turkey_targets SET claimed=true WHERE id=_target AND user_id=u AND event_id=ev AND NOT claimed;
 IF NOT FOUND THEN RAISE EXCEPTION 'This turkey is already gone'; END IF;
 reward := public.turkey_reward_cents(random(),random());
 UPDATE turkey_hunts SET hits=hits+1,last_hit=clock_timestamp() WHERE user_id=u AND event_id=ev;
 UPDATE turkey_wallets SET earned_cents=earned_cents+reward WHERE user_id=u;
 IF h.hits < 88 THEN INSERT INTO turkey_targets(user_id,event_id,x,y) VALUES(u,ev,60+floor(random()*880)::integer,280+floor(random()*240)::integer); END IF;
 RETURN reward;
END $$;