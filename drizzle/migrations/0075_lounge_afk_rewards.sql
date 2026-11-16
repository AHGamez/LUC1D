CREATE TABLE public.lounge_afk_sessions (
 user_id uuid PRIMARY KEY,
 session_id uuid NOT NULL,
 last_ping timestamptz NOT NULL DEFAULT now(),
 seconds bigint NOT NULL DEFAULT 0 CHECK (seconds >= 0),
 earned_cents integer NOT NULL DEFAULT 0,
 active boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.lounge_afk_sessions TO authenticated;
GRANT ALL ON public.lounge_afk_sessions TO service_role;
ALTER TABLE public.lounge_afk_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own AFK progress" ON public.lounge_afk_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE FUNCTION public.lounge_afk_reward(_seconds bigint) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT (greatest(0, _seconds) / 3600 * 1000)::integer $$;
CREATE FUNCTION public.lounge_afk_tick(_session uuid, _action text DEFAULT 'ping') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := auth.uid(); s public.lounge_afk_sessions; _now timestamptz := clock_timestamp(); _elapsed bigint := 0; _paid integer := 0;
BEGIN
 IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF _action NOT IN ('start','ping','stop') THEN RAISE EXCEPTION 'Unknown AFK action'; END IF;
 INSERT INTO public.lounge_afk_sessions(user_id,session_id) VALUES (_u,_session) ON CONFLICT DO NOTHING;
 SELECT * INTO s FROM public.lounge_afk_sessions WHERE user_id = _u FOR UPDATE;
 IF _action <> 'start' AND (s.session_id <> _session OR NOT s.active) THEN RAISE EXCEPTION 'AFK session ended or started in another tab'; END IF;
 IF s.active AND s.session_id = _session AND _now - s.last_ping <= interval '150 seconds' THEN
  _elapsed := greatest(0, floor(extract(epoch FROM _now - s.last_ping)))::bigint;
 END IF;
 s.seconds := s.seconds + _elapsed;
 _paid := public.lounge_afk_reward(s.seconds);
 IF _paid > 0 THEN
  INSERT INTO public.club_wallets(user_id,earned_cents) VALUES (_u,_paid) ON CONFLICT(user_id) DO UPDATE SET earned_cents = public.club_wallets.earned_cents + excluded.earned_cents;
  s.seconds := s.seconds % 3600;
 END IF;
 UPDATE public.lounge_afk_sessions SET session_id = _session, last_ping = _now, seconds = s.seconds, earned_cents = earned_cents + _paid, active = (_action <> 'stop') WHERE user_id = _u;
 RETURN jsonb_build_object('seconds',s.seconds,'earned_cents',s.earned_cents + _paid,'paid_cents',_paid,'active',_action <> 'stop');
END $$;
REVOKE EXECUTE ON FUNCTION public.lounge_afk_tick(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lounge_afk_tick(uuid,text) TO authenticated;