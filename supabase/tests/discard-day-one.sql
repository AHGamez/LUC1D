-- Every result must be true. Tests the database's actual eligibility function.
SELECT
  NOT public.discard_is_day_one('2026-10-28 04:59:59+00') AS rejects_previous_day,
  public.discard_is_day_one('2026-10-28 05:00:00+00') AS includes_midnight_chicago,
  public.discard_is_day_one('2026-10-29 04:59:59+00') AS includes_end_of_day_chicago,
  NOT public.discard_is_day_one('2026-10-29 05:00:00+00') AS rejects_next_day,
  NOT EXISTS (
    SELECT 1 FROM public.discard_day_one_tags t JOIN auth.users u ON u.id = t.user_id
    WHERE NOT public.discard_is_day_one(u.created_at)
  ) AS no_ineligible_badges,
  NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE public.discard_is_day_one(u.created_at)
    AND NOT EXISTS (SELECT 1 FROM public.discard_day_one_tags t WHERE t.user_id = u.id)
  ) AS all_eligible_accounts_awarded;