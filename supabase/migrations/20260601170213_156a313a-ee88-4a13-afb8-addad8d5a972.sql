
-- Enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- has_role security-definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Auto-grant admin role on signup for the configured admin email
CREATE OR REPLACE FUNCTION public.grant_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'piyushchadokar06@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_admin_on_signup();

-- Backfill: if the admin user already exists, grant admin now
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'piyushchadokar06@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ===== Admin policies on existing tables =====

-- leads: admins can view all
DROP POLICY IF EXISTS "leads_admin_select_all" ON public.leads;
CREATE POLICY "leads_admin_select_all"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "leads_admin_update" ON public.leads;
CREATE POLICY "leads_admin_update"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "leads_admin_delete" ON public.leads;
CREATE POLICY "leads_admin_delete"
  ON public.leads FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- inquiry_messages: admins can view all
DROP POLICY IF EXISTS "inquiry_messages_admin_select" ON public.inquiry_messages;
CREATE POLICY "inquiry_messages_admin_select"
  ON public.inquiry_messages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- chats: admins can view all
DROP POLICY IF EXISTS "chats_admin_select" ON public.chats;
CREATE POLICY "chats_admin_select"
  ON public.chats FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- messages: admins can view all
DROP POLICY IF EXISTS "messages_admin_select" ON public.messages;
CREATE POLICY "messages_admin_select"
  ON public.messages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- notices: admins can manage
DROP POLICY IF EXISTS "notices_admin_all" ON public.notices;
CREATE POLICY "notices_admin_all"
  ON public.notices FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, UPDATE, DELETE ON public.notices TO authenticated;

-- courses: admins can manage
DROP POLICY IF EXISTS "courses_admin_all" ON public.courses;
CREATE POLICY "courses_admin_all"
  ON public.courses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, UPDATE, DELETE ON public.courses TO authenticated;

-- pdf_documents: admins can manage
DROP POLICY IF EXISTS "pdfs_admin_all" ON public.pdf_documents;
CREATE POLICY "pdfs_admin_all"
  ON public.pdf_documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, UPDATE, DELETE ON public.pdf_documents TO authenticated;

-- pdfs storage bucket: allow admins to upload/manage
DROP POLICY IF EXISTS "pdfs_admin_write" ON storage.objects;
CREATE POLICY "pdfs_admin_write"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'));
