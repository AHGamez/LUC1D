ALTER TABLE public.discard_messages ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.discard_dms ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.discard_toggle_pin(_kind text, _id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF _kind = 'dm' THEN
    UPDATE discard_dms SET pinned = NOT pinned WHERE id = _id AND (sender_id = auth.uid() OR recipient_id = auth.uid()) RETURNING pinned INTO v;
  ELSE
    UPDATE discard_messages m SET pinned = NOT m.pinned FROM discard_channels c
      WHERE m.id = _id AND c.id = m.channel_id AND discard_can_see_server(c.server_id, auth.uid())
      RETURNING m.pinned INTO v;
  END IF;
  IF v IS NULL THEN RAISE EXCEPTION 'Message not found'; END IF;
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.discard_toggle_pin(text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.discard_toggle_pin(text, uuid) TO authenticated;