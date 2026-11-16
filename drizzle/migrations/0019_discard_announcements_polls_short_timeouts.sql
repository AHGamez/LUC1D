CREATE TABLE public.discard_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.discard_announcements TO authenticated;
GRANT ALL ON public.discard_announcements TO service_role;
ALTER TABLE public.discard_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read announcements" ON public.discard_announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "mods post announcements" ON public.discard_announcements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.discard_is_mod(auth.uid()));
CREATE POLICY "mods remove announcements" ON public.discard_announcements FOR DELETE TO authenticated USING (public.discard_is_mod(auth.uid()));

CREATE TABLE public.discard_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.discard_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 120),
  options text[] NOT NULL CHECK (array_length(options, 1) BETWEEN 2 AND 4),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.discard_polls TO authenticated;
GRANT ALL ON public.discard_polls TO service_role;
ALTER TABLE public.discard_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read visible polls" ON public.discard_polls FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM discard_channels c WHERE c.id = channel_id AND discard_can_see_server(c.server_id, auth.uid())));
CREATE POLICY "mods create polls" ON public.discard_polls FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.discard_is_mod(auth.uid()) AND EXISTS (SELECT 1 FROM discard_channels c WHERE c.id = channel_id AND discard_can_see_server(c.server_id, auth.uid())));
CREATE POLICY "mods delete polls" ON public.discard_polls FOR DELETE TO authenticated USING (public.discard_is_mod(auth.uid()));

CREATE TABLE public.discard_poll_votes (
  poll_id uuid NOT NULL REFERENCES public.discard_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  option int NOT NULL CHECK (option BETWEEN 0 AND 3),
  PRIMARY KEY (poll_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discard_poll_votes TO authenticated;
GRANT ALL ON public.discard_poll_votes TO service_role;
ALTER TABLE public.discard_poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read votes" ON public.discard_poll_votes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM discard_polls p WHERE p.id = poll_id));
CREATE POLICY "vote" ON public.discard_poll_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM discard_polls p WHERE p.id = poll_id));
CREATE POLICY "change vote" ON public.discard_poll_votes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "unvote" ON public.discard_poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.discard_announcements, public.discard_polls, public.discard_poll_votes;

CREATE OR REPLACE FUNCTION public.discard_timeout_minutes(_target uuid, _minutes int) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t timestamptz;
BEGIN
  IF _minutes NOT IN (5, 20, 60) THEN RAISE EXCEPTION 'Pick 5, 20 or 60 minutes'; END IF;
  IF NOT discard_is_mod(auth.uid()) THEN RAISE EXCEPTION 'Moderators only'; END IF;
  IF discard_is_owner(_target) OR _target = auth.uid() THEN RAISE EXCEPTION 'You can''t do that to this user'; END IF;
  IF discard_is_mod(_target) AND NOT discard_is_owner(auth.uid()) THEN RAISE EXCEPTION 'Moderators can''t time out moderators'; END IF;
  IF EXISTS (SELECT 1 FROM discard_sanctions WHERE user_id = _target AND kind = 'ban' AND until > now()) THEN RAISE EXCEPTION 'This user is banned'; END IF;
  t := now() + make_interval(mins => _minutes);
  INSERT INTO discard_sanctions (user_id, kind, until, by_user) VALUES (_target, 'timeout', t, auth.uid())
    ON CONFLICT (user_id) DO UPDATE SET kind = 'timeout', until = EXCLUDED.until, by_user = EXCLUDED.by_user, created_at = now();
  RETURN t;
END $$;
REVOKE ALL ON FUNCTION public.discard_timeout_minutes(uuid, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.discard_timeout_minutes(uuid, int) TO authenticated;