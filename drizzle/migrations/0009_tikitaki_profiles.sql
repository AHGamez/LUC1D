CREATE TABLE public.tikitaki_profiles (
  user_id uuid PRIMARY KEY,
  handle text NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9_.]{3,20}$'),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 200),
  links text[] NOT NULL DEFAULT '{}' CHECK (coalesce(array_length(links, 1), 0) <= 3),
  banner_color text NOT NULL DEFAULT '#7c3aed' CHECK (banner_color ~ '^#[0-9a-fA-F]{6}$'),
  banner_path text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tikitaki_profiles TO authenticated;
GRANT ALL ON public.tikitaki_profiles TO service_role;
ALTER TABLE public.tikitaki_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read tikitaki profiles" ON public.tikitaki_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own tikitaki profile" ON public.tikitaki_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND (banner_path IS NULL OR banner_path LIKE (auth.uid()::text || '/%')));
CREATE POLICY "update own tikitaki profile" ON public.tikitaki_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND (banner_path IS NULL OR banner_path LIKE (auth.uid()::text || '/%')));