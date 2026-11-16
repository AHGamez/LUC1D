CREATE TABLE public.turkey_manual_events(event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, started_by uuid NOT NULL, started_at timestamptz NOT NULL DEFAULT clock_timestamp(), ends_at timestamptz NOT NULL);
GRANT SELECT ON public.turkey_manual_events TO authenticated;
GRANT ALL ON public.turkey_manual_events TO service_role;
ALTER TABLE public.turkey_manual_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY turkey_manual_read ON public.turkey_manual_events FOR SELECT TO authenticated USING(true);
CREATE FUNCTION public.turkey_can_activate() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid()='01622582-5968-4d13-8fcf-4d25e33a5cf8'::uuid AND public.discard_is_owner(auth.uid()) $$;
CREATE FUNCTION public.turkey_activate() RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ending timestamptz;
BEGIN
 IF NOT coalesce(public.turkey_can_activate(),false) THEN RAISE EXCEPTION 'Only @s2293409 can activate turkey hunts'; END IF;
 PERFORM pg_advisory_xact_lock(2293409);
 SELECT ends_at INTO ending FROM turkey_manual_events WHERE ends_at>clock_timestamp() ORDER BY ends_at DESC LIMIT 1;
 IF FOUND THEN RETURN ending; END IF;
 ending := clock_timestamp()+interval '10 minutes';
 INSERT INTO turkey_manual_events(started_by,ends_at) VALUES(auth.uid(),ending);
 RETURN ending;
END $$;
CREATE OR REPLACE FUNCTION public.turkey_status() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid := auth.uid(); t bigint := floor(extract(epoch from clock_timestamp()))::bigint; ev bigint := t / 7200; active boolean := mod(t,7200) < 600; balance integer; targets jsonb; manual_end timestamptz; manual_id bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 SELECT event_id, ends_at INTO manual_id, manual_end FROM public.turkey_manual_events WHERE ends_at > clock_timestamp() ORDER BY ends_at DESC LIMIT 1;
 IF FOUND THEN ev := -manual_id; END IF;
 INSERT INTO turkey_wallets(user_id) VALUES(u) ON CONFLICT DO NOTHING;
 active := active OR manual_end IS NOT NULL;
 IF active THEN
  INSERT INTO turkey_hunts(user_id,event_id) VALUES(u,ev) ON CONFLICT DO NOTHING;
  PERFORM 1 FROM turkey_hunts WHERE user_id=u AND event_id=ev FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM turkey_targets WHERE user_id=u AND event_id=ev) THEN
   INSERT INTO turkey_targets(user_id,event_id,x,y) SELECT u,ev,60+floor(random()*880)::integer,280+floor(random()*240)::integer FROM generate_series(1,12);
  END IF;
 END IF;
 SELECT earned_cents-spent_cents INTO balance FROM turkey_wallets WHERE user_id=u;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'x',x,'y',y)), '[]'::jsonb) INTO targets FROM turkey_targets WHERE user_id=u AND event_id=ev AND NOT claimed;
 RETURN jsonb_build_object('now',t*1000,'active',active,'end',CASE WHEN manual_end IS NOT NULL THEN floor(extract(epoch FROM manual_end)*1000)::bigint ELSE (ev*7200+600)*1000 END,'next',(t/7200+1)*7200*1000,'balance',balance,'targets',CASE WHEN active THEN targets ELSE '[]'::jsonb END);
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
 reward := 10+floor(random()*991)::integer;
 UPDATE turkey_hunts SET hits=hits+1,last_hit=clock_timestamp() WHERE user_id=u AND event_id=ev;
 UPDATE turkey_wallets SET earned_cents=earned_cents+reward WHERE user_id=u;
 IF h.hits < 88 THEN INSERT INTO turkey_targets(user_id,event_id,x,y) VALUES(u,ev,60+floor(random()*880)::integer,280+floor(random()*240)::integer); END IF;
 RETURN reward;
END $$;
REVOKE ALL ON FUNCTION public.turkey_can_activate(),public.turkey_activate() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.turkey_can_activate(),public.turkey_activate() TO authenticated;