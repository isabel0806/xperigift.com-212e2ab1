-- 1. client_email_settings
CREATE TABLE public.client_email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE,
  from_email text NOT NULL,
  from_name text NOT NULL,
  reply_to_email text,
  domain text,
  is_verified boolean NOT NULL DEFAULT false,
  daily_limit integer NOT NULL DEFAULT 5000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client_email_settings"
  ON public.client_email_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members read own client email settings"
  ON public.client_email_settings FOR SELECT TO authenticated
  USING (user_belongs_to_client(auth.uid(), client_id));

CREATE POLICY "Members upsert own client email settings"
  ON public.client_email_settings FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_client(auth.uid(), client_id));

CREATE POLICY "Members update own client email settings"
  ON public.client_email_settings FOR UPDATE TO authenticated
  USING (user_belongs_to_client(auth.uid(), client_id))
  WITH CHECK (user_belongs_to_client(auth.uid(), client_id));

CREATE TRIGGER set_updated_at_client_email_settings
  BEFORE UPDATE ON public.client_email_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. email_send_log
CREATE TYPE public.email_send_status AS ENUM (
  'pending', 'sent', 'failed', 'bounced', 'complained', 'skipped_unsubscribed', 'skipped_invalid'
);

CREATE TABLE public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  email_draft_id uuid,
  customer_id uuid,
  recipient_email text NOT NULL,
  status public.email_send_status NOT NULL DEFAULT 'pending',
  provider_message_id text,
  error_message text,
  metadata jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_send_log_draft ON public.email_send_log(email_draft_id);
CREATE INDEX idx_email_send_log_client_created ON public.email_send_log(client_id, created_at DESC);
CREATE INDEX idx_email_send_log_status ON public.email_send_log(status);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email_send_log"
  ON public.email_send_log FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members read own client send logs"
  ON public.email_send_log FOR SELECT TO authenticated
  USING (user_belongs_to_client(auth.uid(), client_id));

-- 3. email_unsubscribe_tokens
CREATE TABLE public.email_unsubscribe_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  customer_id uuid,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

CREATE INDEX idx_email_unsub_tokens_client_email ON public.email_unsubscribe_tokens(client_id, lower(email));

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage unsubscribe_tokens"
  ON public.email_unsubscribe_tokens FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members read own client unsub tokens"
  ON public.email_unsubscribe_tokens FOR SELECT TO authenticated
  USING (user_belongs_to_client(auth.uid(), client_id));

-- Public can read by token (anonymous unsubscribe page resolves token -> email)
CREATE POLICY "Anyone can read a token by exact match"
  ON public.email_unsubscribe_tokens FOR SELECT TO anon
  USING (true);

-- 4. customers.unsubscribed_at
ALTER TABLE public.customers ADD COLUMN unsubscribed_at timestamptz;
ALTER TABLE public.customers ADD COLUMN unsubscribe_reason text;

-- 5. email_drafts: tracking columns
ALTER TABLE public.email_drafts
  ADD COLUMN sent_at timestamptz,
  ADD COLUMN send_started_at timestamptz,
  ADD COLUMN total_recipients integer,
  ADD COLUMN total_sent integer NOT NULL DEFAULT 0,
  ADD COLUMN total_failed integer NOT NULL DEFAULT 0;

-- 6. RPC for anonymous unsubscribe: takes a token, marks customer + token used.
CREATE OR REPLACE FUNCTION public.process_unsubscribe(_token text, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token public.email_unsubscribe_tokens%ROWTYPE;
BEGIN
  SELECT * INTO v_token FROM public.email_unsubscribe_tokens WHERE token = _token;
  IF v_token.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  UPDATE public.customers
    SET unsubscribed_at = COALESCE(unsubscribed_at, now()),
        unsubscribe_reason = COALESCE(unsubscribe_reason, _reason),
        updated_at = now()
    WHERE client_id = v_token.client_id
      AND lower(email) = lower(v_token.email);

  UPDATE public.email_unsubscribe_tokens
    SET used_at = COALESCE(used_at, now())
    WHERE id = v_token.id;

  RETURN jsonb_build_object('ok', true, 'email', v_token.email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_unsubscribe(text, text) TO anon, authenticated;