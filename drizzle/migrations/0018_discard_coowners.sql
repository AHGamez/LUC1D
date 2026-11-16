ALTER TABLE public.discard_moderators ADD COLUMN IF NOT EXISTS coowner boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.discard_set_coowner(_target uuid, _on boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT discard_is_owner(auth.uid()) THEN RAISE EXCEPTION 'Only the owner can change co-owners'; END IF;
  IF _on THEN INSERT INTO discard_moderators (user_id, coowner) VALUES (_target, true) ON CONFLICT (user_id) DO UPDATE SET coowner = true;
  ELSE UPDATE discard_moderators SET coowner = false WHERE user_id = _target; END IF;
END $$;
REVOKE ALL ON FUNCTION public.discard_set_coowner(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.discard_set_coowner(uuid, boolean) TO authenticated;