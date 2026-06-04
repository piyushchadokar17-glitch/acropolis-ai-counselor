
-- 1. user_roles: add admin-only INSERT/UPDATE/DELETE policies
CREATE POLICY "user_roles_admin_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_admin_update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_admin_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_admin_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Revoke direct EXECUTE on has_role. RLS policies still invoke it because
--    it's SECURITY DEFINER owned by postgres.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;

-- 3. Fix mutable search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 4. Realtime authorization: only allow users to subscribe to their own chat topics
--    Topic convention: 'chat:<chat_id>' or 'user:<user_id>'
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realtime_authenticated_own_topics" ON realtime.messages;
CREATE POLICY "realtime_authenticated_own_topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow subscription if topic is the user's own user-id, or a chat they own
  (realtime.topic() = ('user:' || auth.uid()::text))
  OR EXISTS (
    SELECT 1 FROM public.chats
    WHERE chats.user_id = auth.uid()
      AND realtime.topic() = ('chat:' || chats.id::text)
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 5. Remove duplicate PDF upload policy (admin-only policy already covers uploads)
DROP POLICY IF EXISTS "pdfs_auth_upload" ON storage.objects;
