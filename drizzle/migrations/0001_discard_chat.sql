CREATE TABLE public.discard_profiles (user_id uuid PRIMARY KEY, display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 32), avatar_color text NOT NULL DEFAULT '#5865f2', status text NOT NULL DEFAULT '' CHECK (char_length(status) <= 80), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.discard_profiles TO authenticated;
GRANT ALL ON public.discard_profiles TO service_role;
ALTER TABLE public.discard_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read profiles" ON public.discard_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own profile" ON public.discard_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own profile" ON public.discard_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.discard_servers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40), icon text NOT NULL DEFAULT '💬', owner_id uuid, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discard_servers TO authenticated;
GRANT ALL ON public.discard_servers TO service_role;
ALTER TABLE public.discard_servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read servers" ON public.discard_servers FOR SELECT TO authenticated USING (true);
CREATE POLICY "create servers" ON public.discard_servers FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner updates servers" ON public.discard_servers FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "owner deletes servers" ON public.discard_servers FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.discard_channels (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), server_id uuid NOT NULL REFERENCES public.discard_servers(id) ON DELETE CASCADE, name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 32), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, DELETE ON public.discard_channels TO authenticated;
GRANT ALL ON public.discard_channels TO service_role;
ALTER TABLE public.discard_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read channels" ON public.discard_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner adds channels" ON public.discard_channels FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.discard_servers s WHERE s.id = server_id AND s.owner_id = auth.uid()));
CREATE POLICY "owner deletes channels" ON public.discard_channels FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.discard_servers s WHERE s.id = server_id AND s.owner_id = auth.uid()));

CREATE TABLE public.discard_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), channel_id uuid NOT NULL REFERENCES public.discard_channels(id) ON DELETE CASCADE, user_id uuid NOT NULL, content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, DELETE ON public.discard_messages TO authenticated;
GRANT ALL ON public.discard_messages TO service_role;
ALTER TABLE public.discard_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read messages" ON public.discard_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "send own messages" ON public.discard_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own messages" ON public.discard_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX discard_messages_channel_idx ON public.discard_messages(channel_id, created_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.discard_messages;

INSERT INTO public.discard_servers (id, name, icon) VALUES ('00000000-0000-0000-0000-00000000d15c', 'LUC1D Lounge', '☁️');
INSERT INTO public.discard_channels (server_id, name) VALUES ('00000000-0000-0000-0000-00000000d15c', 'general'), ('00000000-0000-0000-0000-00000000d15c', 'games'), ('00000000-0000-0000-0000-00000000d15c', 'off-topic');