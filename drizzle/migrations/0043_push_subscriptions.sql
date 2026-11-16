CREATE TABLE public.push_subscriptions (
  endpoint text PRIMARY KEY,
  user_id uuid NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subs read" ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "own subs add" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "own subs edit" ON public.push_subscriptions FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "own subs remove" ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = (select auth.uid()));
CREATE TABLE public.push_everyone_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.push_everyone_log TO service_role;
ALTER TABLE public.push_everyone_log ENABLE ROW LEVEL SECURITY;