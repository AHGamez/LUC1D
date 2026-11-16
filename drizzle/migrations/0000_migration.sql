CREATE TABLE public.installed_games (
  user_id uuid NOT NULL,
  game_id text NOT NULL,
  installed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game_id)
);
GRANT SELECT, INSERT, DELETE ON public.installed_games TO authenticated;
GRANT ALL ON public.installed_games TO service_role;
ALTER TABLE public.installed_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own read" ON public.installed_games FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.installed_games FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.installed_games FOR DELETE TO authenticated USING (auth.uid() = user_id);