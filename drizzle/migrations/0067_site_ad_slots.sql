CREATE TABLE public.ad_slots (
  slot integer PRIMARY KEY CHECK (slot BETWEEN 1 AND 100),
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 100),
  image_path text NOT NULL,
  paid_with text NOT NULL CHECK (paid_with IN ('coins','card')),
  stripe_session text UNIQUE,
  bought_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_slots TO authenticated;
GRANT ALL ON public.ad_slots TO service_role;
ALTER TABLE public.ad_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in can view ads" ON public.ad_slots FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.ad_buy_coins(_slot integer, _body text, _image text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _u uuid := auth.uid(); _p integer := 500000; _bal integer;
BEGIN
 IF _u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF _slot < 1 OR _slot > 100 THEN RAISE EXCEPTION 'Pick a slot from 1 to 100'; END IF;
 IF char_length(coalesce(_body,'')) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Text must be 1-100 characters'; END IF;
 IF _image IS NULL OR split_part(_image,'/',1) <> _u::text THEN RAISE EXCEPTION 'Upload a picture first'; END IF;
 IF EXISTS(SELECT 1 FROM public.ad_slots WHERE slot=_slot) THEN RAISE EXCEPTION 'That slot is taken'; END IF;
 INSERT INTO public.club_wallets(user_id) VALUES(_u) ON CONFLICT DO NOTHING;
 SELECT earned_cents-spent_cents INTO _bal FROM public.club_wallets WHERE user_id=_u FOR UPDATE;
 IF _bal < _p THEN RAISE EXCEPTION 'You need $5,000 in Discard money'; END IF;
 UPDATE public.club_wallets SET spent_cents=spent_cents+_p WHERE user_id=_u;
 INSERT INTO public.ad_slots(slot,user_id,body,image_path,paid_with) VALUES(_slot,_u,_body,_image,'coins');
 RETURN _bal-_p;
END $$;
REVOKE ALL ON FUNCTION public.ad_buy_coins(integer,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ad_buy_coins(integer,text,text) TO authenticated;

CREATE POLICY "Upload own ad images" ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id='site-ads' AND (storage.foldername(name))[1] = auth.uid()::text);