DROP POLICY IF EXISTS "read sanctions" ON public.discard_sanctions;
CREATE POLICY "read own or as mod" ON public.discard_sanctions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.discard_is_mod(auth.uid()));

DROP POLICY IF EXISTS "turkey_manual_read" ON public.turkey_manual_events;
CREATE POLICY "turkey_manual_read_owner" ON public.turkey_manual_events FOR SELECT TO authenticated
  USING (started_by = auth.uid());

DROP POLICY IF EXISTS "Read music" ON storage.objects;
CREATE POLICY "Read visible music" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'music' AND ((storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.music_tracks t JOIN public.music_playlists p ON p.id = t.playlist_id
               WHERE t.path = objects.name AND (p.is_public OR p.user_id = auth.uid()))));

DROP POLICY IF EXISTS "larp read" ON storage.objects;
CREATE POLICY "larp read battle pictures" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'larp-flex' AND ((storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.larp_battles b WHERE b.challenger_image = objects.name OR b.opponent_image = objects.name)));

DROP POLICY IF EXISTS "Read visible chat images" ON storage.objects;
CREATE POLICY "Read visible chat images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'discard-chat-images' AND ((storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.discard_messages m JOIN public.discard_channels c ON c.id = m.channel_id
               WHERE m.image_path = objects.name AND public.discard_can_see_server(c.server_id, auth.uid()))
    OR EXISTS (SELECT 1 FROM public.discard_dms d WHERE d.image_path = objects.name AND (d.sender_id = auth.uid() OR d.recipient_id = auth.uid()))));