CREATE OR REPLACE FUNCTION public.club_count_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _u uuid;
BEGIN
  -- to_jsonb(NEW) avoids plpgsql plan caching of NEW.<field> across the two
  -- trigger tables (discard_dms has sender_id, discard_messages has user_id),
  -- which previously made channel inserts fail with "record new has no field sender_id".
  _u := (to_jsonb(NEW) ->> CASE WHEN TG_TABLE_NAME = 'discard_dms' THEN 'sender_id' ELSE 'user_id' END)::uuid;
  INSERT INTO public.club_wallets (user_id, earned_cents, messages) VALUES (_u, 10, 1)
  ON CONFLICT (user_id) DO UPDATE SET earned_cents = club_wallets.earned_cents + 10, messages = club_wallets.messages + 1;
  RETURN NEW;
END;
$$;