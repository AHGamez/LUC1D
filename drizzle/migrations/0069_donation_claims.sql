CREATE TABLE public.donation_claims (
  session_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  cents integer NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.donation_claims TO service_role;
ALTER TABLE public.donation_claims ENABLE ROW LEVEL SECURITY;