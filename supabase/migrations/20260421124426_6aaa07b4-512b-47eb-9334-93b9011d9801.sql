-- Email templates gallery
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  subject TEXT,
  preheader TEXT,
  html_content TEXT NOT NULL,
  thumbnail_url TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_templates_client ON public.email_templates(client_id) WHERE is_archived = false;
CREATE INDEX idx_email_templates_category ON public.email_templates(client_id, category) WHERE is_archived = false;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email_templates"
  ON public.email_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members read own client templates"
  ON public.email_templates FOR SELECT
  TO authenticated
  USING (user_belongs_to_client(auth.uid(), client_id));

CREATE POLICY "Members insert own client templates"
  ON public.email_templates FOR INSERT
  TO authenticated
  WITH CHECK (user_belongs_to_client(auth.uid(), client_id) AND created_by = auth.uid());

CREATE POLICY "Members update own client templates"
  ON public.email_templates FOR UPDATE
  TO authenticated
  USING (user_belongs_to_client(auth.uid(), client_id))
  WITH CHECK (user_belongs_to_client(auth.uid(), client_id));

CREATE POLICY "Members delete own client templates"
  ON public.email_templates FOR DELETE
  TO authenticated
  USING (user_belongs_to_client(auth.uid(), client_id));

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();