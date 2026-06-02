
-- Knowledge base entries managed by admin and injected into chatbot context
CREATE TABLE public.knowledge_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.knowledge_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_entries TO authenticated;
GRANT ALL ON public.knowledge_entries TO service_role;

ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_public_read ON public.knowledge_entries
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY knowledge_admin_all ON public.knowledge_entries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_knowledge_entries_updated_at
  BEFORE UPDATE ON public.knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_knowledge_entries_section ON public.knowledge_entries(section);

-- Optional scheduling + urgency + attachment for notices (additive, all nullable)
ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS urgent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attachment_path TEXT;
