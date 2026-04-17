-- =========================================================
-- 1. CLIENTS TABLE
-- =========================================================
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry public.industry_vertical,
  website TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 2. CLIENT_USERS (membership join)
-- =========================================================
CREATE TABLE public.client_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id)
);

CREATE INDEX idx_client_users_user ON public.client_users(user_id);
CREATE INDEX idx_client_users_client ON public.client_users(client_id);

ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 3. SECURITY DEFINER: avoids recursive RLS on client_users
-- =========================================================
CREATE OR REPLACE FUNCTION public.user_belongs_to_client(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_users
    WHERE user_id = _user_id AND client_id = _client_id
  );
$$;

-- Helper: list of client_ids the user belongs to
CREATE OR REPLACE FUNCTION public.client_ids_for_user(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.client_users WHERE user_id = _user_id;
$$;

-- =========================================================
-- 4. GIFT_CARD_SALES
-- =========================================================
CREATE TYPE public.gift_card_sale_status AS ENUM ('sold', 'partially_redeemed', 'redeemed', 'refunded', 'expired');

CREATE TABLE public.gift_card_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sold_at TIMESTAMPTZ NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  redeemed_cents INTEGER NOT NULL DEFAULT 0 CHECK (redeemed_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.gift_card_sale_status NOT NULL DEFAULT 'sold',
  buyer_name TEXT,
  buyer_email TEXT,
  recipient_name TEXT,
  recipient_email TEXT,
  card_code TEXT,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gift_card_sales_client_date ON public.gift_card_sales(client_id, sold_at DESC);
CREATE INDEX idx_gift_card_sales_status ON public.gift_card_sales(client_id, status);

ALTER TABLE public.gift_card_sales ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_gift_card_sales_updated_at
BEFORE UPDATE ON public.gift_card_sales
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 5. CUSTOMERS
-- =========================================================
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  total_spent_cents INTEGER NOT NULL DEFAULT 0,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  source TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, email)
);

CREATE INDEX idx_customers_client ON public.customers(client_id);
CREATE INDEX idx_customers_last_purchase ON public.customers(client_id, last_purchase_at DESC);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 6. EMAIL_DRAFTS
-- =========================================================
CREATE TYPE public.email_draft_status AS ENUM ('draft', 'submitted', 'scheduled', 'sent', 'archived');

CREATE TABLE public.email_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  subject TEXT NOT NULL,
  preheader TEXT,
  html_sanitized TEXT NOT NULL,
  status public.email_draft_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_drafts_client ON public.email_drafts(client_id, created_at DESC);

ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_email_drafts_updated_at
BEFORE UPDATE ON public.email_drafts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 7. RLS POLICIES
-- =========================================================

-- ---- clients ----
CREATE POLICY "Admins manage clients"
ON public.clients
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members read their clients"
ON public.clients
FOR SELECT
TO authenticated
USING (public.user_belongs_to_client(auth.uid(), id));

-- ---- client_users ----
CREATE POLICY "Admins manage client_users"
ON public.client_users
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own memberships"
ON public.client_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ---- gift_card_sales ----
CREATE POLICY "Admins manage gift_card_sales"
ON public.gift_card_sales
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members read own client sales"
ON public.gift_card_sales
FOR SELECT
TO authenticated
USING (public.user_belongs_to_client(auth.uid(), client_id));

CREATE POLICY "Members insert own client sales"
ON public.gift_card_sales
FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_client(auth.uid(), client_id));

CREATE POLICY "Members update own client sales"
ON public.gift_card_sales
FOR UPDATE
TO authenticated
USING (public.user_belongs_to_client(auth.uid(), client_id))
WITH CHECK (public.user_belongs_to_client(auth.uid(), client_id));

-- ---- customers ----
CREATE POLICY "Admins manage customers"
ON public.customers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members read own client customers"
ON public.customers
FOR SELECT
TO authenticated
USING (public.user_belongs_to_client(auth.uid(), client_id));

CREATE POLICY "Members insert own client customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_client(auth.uid(), client_id));

CREATE POLICY "Members update own client customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (public.user_belongs_to_client(auth.uid(), client_id))
WITH CHECK (public.user_belongs_to_client(auth.uid(), client_id));

-- ---- email_drafts ----
CREATE POLICY "Admins manage email_drafts"
ON public.email_drafts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members read own client drafts"
ON public.email_drafts
FOR SELECT
TO authenticated
USING (public.user_belongs_to_client(auth.uid(), client_id));

CREATE POLICY "Members insert own client drafts"
ON public.email_drafts
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_belongs_to_client(auth.uid(), client_id)
  AND created_by = auth.uid()
);

CREATE POLICY "Members update own client drafts"
ON public.email_drafts
FOR UPDATE
TO authenticated
USING (public.user_belongs_to_client(auth.uid(), client_id))
WITH CHECK (public.user_belongs_to_client(auth.uid(), client_id));

CREATE POLICY "Members delete own client drafts"
ON public.email_drafts
FOR DELETE
TO authenticated
USING (public.user_belongs_to_client(auth.uid(), client_id));