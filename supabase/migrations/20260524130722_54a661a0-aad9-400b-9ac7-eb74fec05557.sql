-- Guest inquiry chat history. The student's contact info already lives in public.leads.
CREATE TABLE IF NOT EXISTS public.inquiry_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  parts jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inquiry_messages_inquiry_id_idx ON public.inquiry_messages (inquiry_id);
CREATE INDEX IF NOT EXISTS inquiry_messages_email_idx ON public.inquiry_messages (email);
CREATE INDEX IF NOT EXISTS inquiry_messages_created_at_idx ON public.inquiry_messages (created_at DESC);

ALTER TABLE public.inquiry_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can append a message (guest students included). No update/delete from client.
CREATE POLICY "inquiry_messages_insert_anyone"
  ON public.inquiry_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No public SELECT — admins should read via server-side tooling using the service role.
-- (Intentionally no SELECT policy so guests cannot enumerate other students' chats.)