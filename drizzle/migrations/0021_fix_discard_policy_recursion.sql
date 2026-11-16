-- The server list was failing with "infinite recursion detected in policy for relation discard_servers":
-- discard_servers SELECT policy read discard_members, and discard_members SELECT policy read discard_servers.
-- Route every cross-table check through SECURITY DEFINER helpers so policies stop evaluating each other.

CREATE OR REPLACE FUNCTION public.discard_is_server_owner(_server uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM discard_servers s WHERE s.id = _server AND s.owner_id = auth.uid())
$function$;

CREATE OR REPLACE FUNCTION public.discard_can_join(_server uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM discard_servers s WHERE s.id = _server AND (s.is_public OR s.owner_id = auth.uid()))
$function$;

GRANT EXECUTE ON FUNCTION public.discard_is_server_owner(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.discard_can_join(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "read visible servers" ON public.discard_servers;
CREATE POLICY "read visible servers" ON public.discard_servers FOR SELECT
  USING (public.discard_can_see_server(id, auth.uid()));

DROP POLICY IF EXISTS "owners see their server members" ON public.discard_members;
CREATE POLICY "owners see their server members" ON public.discard_members FOR SELECT
  USING (public.discard_is_server_owner(server_id));

DROP POLICY IF EXISTS "join public or own servers" ON public.discard_members;
CREATE POLICY "join public or own servers" ON public.discard_members FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.discard_can_join(server_id));

DROP POLICY IF EXISTS "owner adds channels" ON public.discard_channels;
CREATE POLICY "owner adds channels" ON public.discard_channels FOR INSERT
  WITH CHECK (public.discard_is_server_owner(server_id));

DROP POLICY IF EXISTS "owner deletes channels" ON public.discard_channels;
CREATE POLICY "owner deletes channels" ON public.discard_channels FOR DELETE
  USING (public.discard_is_server_owner(server_id));