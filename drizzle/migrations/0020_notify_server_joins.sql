CREATE POLICY "owners see their server members" ON public.discard_members FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.discard_servers s WHERE s.id = server_id AND s.owner_id = auth.uid()));
ALTER PUBLICATION supabase_realtime ADD TABLE public.discard_members;