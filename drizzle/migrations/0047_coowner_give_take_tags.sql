CREATE OR REPLACE FUNCTION public.discard_set_tag(_target uuid, _tag text, _on boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _me integer := public.discard_rank(auth.uid());
BEGIN
  IF auth.uid() IS NULL OR _me < 2 THEN RAISE EXCEPTION 'Only the owner and co-owners can give or take tags'; END IF;
  IF _target = auth.uid() OR public.discard_rank(_target) >= _me THEN RAISE EXCEPTION 'You can only change tags for people ranked below you'; END IF;
  IF _tag = 'day-one' THEN
    IF _on THEN INSERT INTO public.discard_day_one_tags (user_id) VALUES (_target) ON CONFLICT DO NOTHING;
    ELSE DELETE FROM public.discard_day_one_tags WHERE user_id = _target; END IF;
  ELSIF _tag LIKE 'tag-%' AND public.club_price(_tag) IS NOT NULL THEN
    IF _on THEN INSERT INTO public.club_owned (user_id, item_id) VALUES (_target, _tag) ON CONFLICT DO NOTHING;
    ELSE DELETE FROM public.club_owned WHERE user_id = _target AND item_id = _tag; END IF;
  ELSE RAISE EXCEPTION 'Unknown tag'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.discard_set_tag(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.discard_set_tag(uuid, text, boolean) TO authenticated;