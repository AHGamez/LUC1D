CREATE TABLE public.discard_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discard_friends TO authenticated;
GRANT ALL ON public.discard_friends TO service_role;
ALTER TABLE public.discard_friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own friendships" ON public.discard_friends FOR SELECT TO authenticated USING (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY "send requests" ON public.discard_friends FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id AND status = 'pending');
CREATE POLICY "accept requests" ON public.discard_friends FOR UPDATE TO authenticated USING (auth.uid() = addressee_id) WITH CHECK (auth.uid() = addressee_id AND status = 'accepted');
CREATE POLICY "remove friendships" ON public.discard_friends FOR DELETE TO authenticated USING (auth.uid() IN (requester_id, addressee_id));

CREATE OR REPLACE FUNCTION public.discard_are_friends(_a uuid, _b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.discard_friends WHERE status = 'accepted'
    AND ((requester_id = _a AND addressee_id = _b) OR (requester_id = _b AND addressee_id = _a)))
$$;

CREATE TABLE public.discard_dms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX discard_dms_pair_idx ON public.discard_dms (sender_id, recipient_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.discard_dms TO authenticated;
GRANT ALL ON public.discard_dms TO service_role;
ALTER TABLE public.discard_dms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own dms" ON public.discard_dms FOR SELECT TO authenticated USING (auth.uid() IN (sender_id, recipient_id));
CREATE POLICY "send dms to friends" ON public.discard_dms FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND public.discard_are_friends(sender_id, recipient_id));
CREATE POLICY "delete own dms" ON public.discard_dms FOR DELETE TO authenticated USING (auth.uid() = sender_id);

ALTER TABLE public.discard_dms REPLICA IDENTITY FULL;
ALTER TABLE public.discard_friends REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discard_dms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discard_friends;