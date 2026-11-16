-- Transactional authorization checks; rolls back all test event changes.
BEGIN;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
DO $$ BEGIN
 IF public.turkey_can_activate() THEN RAISE EXCEPTION 'A different account was allowed'; END IF;
 BEGIN
  PERFORM public.turkey_activate();
  RAISE EXCEPTION 'Unauthorized activation succeeded';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'Only @s2293409 can activate turkey hunts' THEN RAISE; END IF;
 END;
END $$;
SELECT set_config('request.jwt.claim.sub','01622582-5968-4d13-8fcf-4d25e33a5cf8',true);
DO $$ DECLARE ending timestamptz; s jsonb; BEGIN
 IF NOT public.turkey_can_activate() THEN RAISE EXCEPTION 'Verified owner denied'; END IF;
 ending := public.turkey_activate();
 IF ending <= clock_timestamp() OR ending > clock_timestamp()+interval '10 minutes' THEN RAISE EXCEPTION 'Invalid hunt duration'; END IF;
 s := public.turkey_status();
 IF NOT (s->>'active')::boolean OR jsonb_array_length(s->'targets') <> 12 THEN RAISE EXCEPTION 'Manual hunt not live'; END IF;
 IF public.turkey_activate() <> ending THEN RAISE EXCEPTION 'Repeat activation changed the active event'; END IF;
END $$;
ROLLBACK;