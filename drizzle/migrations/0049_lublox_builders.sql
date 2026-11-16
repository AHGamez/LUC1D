CREATE TABLE public.lublox_builders (user_id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.lublox_builders TO authenticated;
GRANT ALL ON public.lublox_builders TO service_role;
ALTER TABLE public.lublox_builders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own builder row" ON public.lublox_builders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.lublox_can_create() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT auth.uid() IS NOT NULL AND (public.discard_is_mod(auth.uid()) OR EXISTS (SELECT 1 FROM public.lublox_builders WHERE user_id = auth.uid())) $$;
INSERT INTO public.lublox_builders (user_id) VALUES ('0e6aec97-8c66-414e-89f7-e1f9d3711d2d') ON CONFLICT DO NOTHING;