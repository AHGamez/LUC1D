CREATE OR REPLACE FUNCTION public.discard_rank(_u uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT CASE WHEN discard_is_owner(_u) THEN 3 WHEN discard_is_coowner(_u) THEN 2 WHEN discard_is_mod(_u) THEN 1 ELSE 0 END $$;

CREATE OR REPLACE FUNCTION public.discard_sanction(_target uuid, _kind text, _days integer) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE t timestamptz; me integer := discard_rank(auth.uid());
BEGIN
  IF _days < 1 OR _days > 5 THEN RAISE EXCEPTION 'Pick 1 to 5 days'; END IF;
  IF _kind NOT IN ('timeout','ban') THEN RAISE EXCEPTION 'Bad action'; END IF;
  IF me < 1 THEN RAISE EXCEPTION 'Moderators only'; END IF;
  IF _kind = 'ban' AND me < 2 THEN RAISE EXCEPTION 'Only co-owners and the owner can ban'; END IF;
  IF _target = auth.uid() OR discard_rank(_target) >= me THEN RAISE EXCEPTION 'You can only do that to people ranked below you'; END IF;
  t := now() + make_interval(days => _days);
  INSERT INTO discard_sanctions (user_id, kind, until, by_user) VALUES (_target, _kind, t, auth.uid())
    ON CONFLICT (user_id) DO UPDATE SET kind = EXCLUDED.kind, until = EXCLUDED.until, by_user = EXCLUDED.by_user, created_at = now();
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION public.discard_timeout_minutes(_target uuid, _minutes integer) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE t timestamptz; me integer := discard_rank(auth.uid());
BEGIN
  IF _minutes NOT IN (5, 20, 60) THEN RAISE EXCEPTION 'Pick 5, 20 or 60 minutes'; END IF;
  IF me < 1 THEN RAISE EXCEPTION 'Moderators only'; END IF;
  IF _target = auth.uid() OR discard_rank(_target) >= me THEN RAISE EXCEPTION 'You can only do that to people ranked below you'; END IF;
  IF EXISTS (SELECT 1 FROM discard_sanctions WHERE user_id = _target AND kind = 'ban' AND until > now()) THEN RAISE EXCEPTION 'This user is banned'; END IF;
  t := now() + make_interval(mins => _minutes);
  INSERT INTO discard_sanctions (user_id, kind, until, by_user) VALUES (_target, 'timeout', t, auth.uid())
    ON CONFLICT (user_id) DO UPDATE SET kind = 'timeout', until = EXCLUDED.until, by_user = EXCLUDED.by_user, created_at = now();
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION public.discard_lift(_target uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE me integer := discard_rank(auth.uid());
BEGIN
  IF me < 1 THEN RAISE EXCEPTION 'Moderators only'; END IF;
  IF me < 2 AND EXISTS (SELECT 1 FROM discard_sanctions WHERE user_id = _target AND kind = 'ban') THEN RAISE EXCEPTION 'Only co-owners and the owner can lift bans'; END IF;
  IF discard_rank(_target) >= me THEN RAISE EXCEPTION 'You can only do that to people ranked below you'; END IF;
  DELETE FROM discard_sanctions WHERE user_id = _target;
END $$;