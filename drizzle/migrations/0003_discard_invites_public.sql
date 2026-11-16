ALTER TABLE public.discard_servers ADD COLUMN is_public boolean NOT NULL DEFAULT false;
ALTER TABLE public.discard_servers ADD COLUMN invite_code text NOT NULL DEFAULT upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
CREATE UNIQUE INDEX discard_servers_invite_code_key ON public.discard_servers(invite_code);
UPDATE public.discard_servers SET is_public = true WHERE owner_id IS NULL;

CREATE TABLE public.discard_members (
  server_id uuid NOT NULL REFERENCES public.discard_servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (server_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.discard_members TO authenticated;
GRANT ALL ON public.discard_members TO service_role;
ALTER TABLE public.discard_members ENABLE ROW LEVEL SECURITY;
INSERT INTO public.discard_members (server_id, user_id) SELECT id, owner_id FROM public.discard_servers WHERE owner_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.discard_can_see_server(_server uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM discard_servers s WHERE s.id = _server AND (s.is_public OR s.owner_id IS NULL OR s.owner_id = _user))
      OR EXISTS (SELECT 1 FROM discard_members m WHERE m.server_id = _server AND m.user_id = _user)
$$;

CREATE OR REPLACE FUNCTION public.discard_join_by_code(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT id INTO sid FROM discard_servers WHERE invite_code = upper(trim(_code));
  IF sid IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  INSERT INTO discard_members (server_id, user_id) VALUES (sid, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.discard_join_by_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.discard_join_by_code(text) TO authenticated;

CREATE POLICY "see own memberships" ON public.discard_members FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "join public or own servers" ON public.discard_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.discard_servers s WHERE s.id = server_id AND (s.is_public OR s.owner_id = auth.uid())));
CREATE POLICY "leave servers" ON public.discard_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY "read servers" ON public.discard_servers;
CREATE POLICY "read visible servers" ON public.discard_servers FOR SELECT TO authenticated
  USING (is_public OR owner_id IS NULL OR owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.discard_members m WHERE m.server_id = id AND m.user_id = auth.uid()));
DROP POLICY "read channels" ON public.discard_channels;
CREATE POLICY "read visible channels" ON public.discard_channels FOR SELECT TO authenticated USING (public.discard_can_see_server(server_id, auth.uid()));
DROP POLICY "read messages" ON public.discard_messages;
CREATE POLICY "read visible messages" ON public.discard_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.discard_channels c WHERE c.id = channel_id AND public.discard_can_see_server(c.server_id, auth.uid())));
DROP POLICY "send own messages" ON public.discard_messages;
CREATE POLICY "send visible messages" ON public.discard_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.discard_channels c WHERE c.id = channel_id AND public.discard_can_see_server(c.server_id, auth.uid())));