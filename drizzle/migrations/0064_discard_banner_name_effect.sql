ALTER TABLE public.discard_profiles
  ADD COLUMN IF NOT EXISTS banner text NOT NULL DEFAULT 'blurple',
  ADD COLUMN IF NOT EXISTS name_effect text NOT NULL DEFAULT 'none';
ALTER TABLE public.discard_profiles ADD CONSTRAINT discard_profiles_banner_chk CHECK (banner IN ('blurple','sunset','aurora','ocean','rose','midnight','forest','gold','candy','xmas'));
ALTER TABLE public.discard_profiles ADD CONSTRAINT discard_profiles_name_effect_chk CHECK (name_effect IN ('none','snow','stars','hearts','sparkles'));