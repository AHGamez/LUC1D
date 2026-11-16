CREATE OR REPLACE FUNCTION public.club_buy(_item text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _u uuid := auth.uid(); _p integer := public.club_price(_item); _bal integer;
BEGIN
 IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF _item IN ('bg-xmas','pet-santa') AND public.discard_rank(_u) < 2 THEN RAISE EXCEPTION 'The Christmas update is only for owners and co-owners'; END IF;
 IF public.turkey_price(_item) IS NOT NULL THEN RAISE EXCEPTION 'Buy this in the Turkey Coins shop'; END IF;
 IF _p IS NULL THEN RAISE EXCEPTION 'Unknown item'; END IF;
 INSERT INTO public.club_wallets(user_id) VALUES(_u) ON CONFLICT DO NOTHING;
 SELECT earned_cents-spent_cents INTO _bal FROM public.club_wallets WHERE user_id=_u FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.club_owned WHERE user_id=_u AND item_id=_item) THEN RAISE EXCEPTION 'You already own this'; END IF;
 IF _bal<_p THEN RAISE EXCEPTION 'Not enough money — keep chatting!'; END IF;
 UPDATE public.club_wallets SET spent_cents=spent_cents+_p WHERE user_id=_u;
 INSERT INTO public.club_owned(user_id,item_id) VALUES(_u,_item);
 RETURN _bal-_p;
END $$;