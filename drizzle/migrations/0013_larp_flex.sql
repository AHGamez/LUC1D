CREATE TABLE public.larp_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL,
  opponent_id uuid,
  topic text NOT NULL DEFAULT 'anything',
  challenger_flex text NOT NULL DEFAULT '',
  challenger_image text,
  opponent_flex text,
  opponent_image text,
  status text NOT NULL DEFAULT 'open',
  winner_id uuid,
  verdict text,
  challenger_score int,
  opponent_score int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.larp_battles TO authenticated;
GRANT ALL ON public.larp_battles TO service_role;
ALTER TABLE public.larp_battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read battles" ON public.larp_battles FOR SELECT TO authenticated USING (true);
CREATE POLICY "start battle" ON public.larp_battles FOR INSERT TO authenticated
  WITH CHECK (challenger_id = auth.uid() AND opponent_id IS NULL AND status = 'open' AND winner_id IS NULL AND verdict IS NULL AND opponent_flex IS NULL AND opponent_image IS NULL AND challenger_score IS NULL AND opponent_score IS NULL);
CREATE POLICY "cancel own open battle" ON public.larp_battles FOR DELETE TO authenticated USING (challenger_id = auth.uid() AND status = 'open');

CREATE OR REPLACE FUNCTION public.larp_join(_id uuid, _flex text, _image text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF _image IS NOT NULL AND split_part(_image, '/', 1) <> auth.uid()::text THEN RAISE EXCEPTION 'Bad picture'; END IF;
  UPDATE public.larp_battles SET opponent_id = auth.uid(), opponent_flex = left(coalesce(_flex,''), 500), opponent_image = _image, status = 'ready', updated_at = now()
  WHERE id = _id AND status = 'open' AND challenger_id <> auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'This battle is no longer open'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.larp_join(uuid, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.larp_join(uuid, text, text) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.larp_battles;