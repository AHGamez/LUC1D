CREATE TABLE public.discard_moderators (user_id uuid PRIMARY KEY, granted_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.discard_moderators TO authenticated;
GRANT ALL ON public.discard_moderators TO service_role;
ALTER TABLE public.discard_moderators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read moderators" ON public.discard_moderators FOR SELECT TO authenticated USING (true);

CREATE TABLE public.discard_sanctions (
  user_id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('timeout','ban')),
  until timestamptz NOT NULL,
  by_user uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discard_sanctions TO authenticated;
GRANT ALL ON public.discard_sanctions TO service_role;
ALTER TABLE public.discard_sanctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read sanctions" ON public.discard_sanctions FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.discard_is_owner(_u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM discard_chat_tags WHERE user_id = _u AND tag = 'owner') $$;
CREATE OR REPLACE FUNCTION public.discard_is_mod(_u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT discard_is_owner(_u) OR EXISTS (SELECT 1 FROM discard_moderators WHERE user_id = _u) $$;
CREATE OR REPLACE FUNCTION public.discard_is_muted(_u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM discard_sanctions WHERE user_id = _u AND until > now()) $$;

CREATE OR REPLACE FUNCTION public.discard_sanction(_target uuid, _kind text, _days int) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t timestamptz;
BEGIN
  IF _days < 1 OR _days > 5 THEN RAISE EXCEPTION 'Pick 1 to 5 days'; END IF;
  IF _kind = 'ban' AND NOT discard_is_owner(auth.uid()) THEN RAISE EXCEPTION 'Only the owner can ban'; END IF;
  IF _kind = 'timeout' AND NOT discard_is_mod(auth.uid()) THEN RAISE EXCEPTION 'Moderators only'; END IF;
  IF _kind NOT IN ('timeout','ban') THEN RAISE EXCEPTION 'Bad action'; END IF;
  IF discard_is_owner(_target) OR _target = auth.uid() THEN RAISE EXCEPTION 'You can''t do that to this user'; END IF;
  IF discard_is_mod(_target) AND NOT discard_is_owner(auth.uid()) THEN RAISE EXCEPTION 'Moderators can''t time out moderators'; END IF;
  t := now() + make_interval(days => _days);
  INSERT INTO discard_sanctions (user_id, kind, until, by_user) VALUES (_target, _kind, t, auth.uid())
    ON CONFLICT (user_id) DO UPDATE SET kind = EXCLUDED.kind, until = EXCLUDED.until, by_user = EXCLUDED.by_user, created_at = now();
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION public.discard_lift(_target uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT discard_is_mod(auth.uid()) THEN RAISE EXCEPTION 'Moderators only'; END IF;
  IF NOT discard_is_owner(auth.uid()) AND EXISTS (SELECT 1 FROM discard_sanctions WHERE user_id = _target AND kind = 'ban') THEN RAISE EXCEPTION 'Only the owner can lift bans'; END IF;
  DELETE FROM discard_sanctions WHERE user_id = _target;
END $$;

CREATE OR REPLACE FUNCTION public.discard_set_mod(_target uuid, _on boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT discard_is_owner(auth.uid()) THEN RAISE EXCEPTION 'Only the owner can change moderators'; END IF;
  IF _on THEN INSERT INTO discard_moderators (user_id) VALUES (_target) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM discard_moderators WHERE user_id = _target; END IF;
END $$;

REVOKE ALL ON FUNCTION public.discard_sanction(uuid, text, int), public.discard_lift(uuid), public.discard_set_mod(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.discard_sanction(uuid, text, int), public.discard_lift(uuid), public.discard_set_mod(uuid, boolean) TO authenticated;

DROP POLICY "send visible messages" ON public.discard_messages;
CREATE POLICY "send visible messages" ON public.discard_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND NOT public.discard_is_muted(auth.uid()) AND EXISTS (SELECT 1 FROM discard_channels c WHERE c.id = discard_messages.channel_id AND discard_can_see_server(c.server_id, auth.uid())));
DROP POLICY "send dms to friends" ON public.discard_dms;
CREATE POLICY "send dms to friends" ON public.discard_dms FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND NOT public.discard_is_muted(auth.uid()) AND discard_are_friends(sender_id, recipient_id));