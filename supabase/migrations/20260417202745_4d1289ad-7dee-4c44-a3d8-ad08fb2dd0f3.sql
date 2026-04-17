-- Sales: product/bundle name
ALTER TABLE public.gift_card_sales
  ADD COLUMN IF NOT EXISTS product_name text;

CREATE INDEX IF NOT EXISTS idx_gift_card_sales_product_name
  ON public.gift_card_sales (client_id, product_name);

-- Customers: split name + last contact
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz;

-- Backfill first/last from full_name
UPDATE public.customers
SET
  first_name = COALESCE(first_name, NULLIF(split_part(full_name, ' ', 1), '')),
  last_name = COALESCE(
    last_name,
    NULLIF(NULLIF(regexp_replace(full_name, '^\S+\s*', ''), ''), full_name)
  )
WHERE full_name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);

-- Keep full_name and first/last in sync
CREATE OR REPLACE FUNCTION public.sync_customer_name_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If first/last changed, rebuild full_name
    IF (NEW.first_name IS DISTINCT FROM COALESCE(OLD.first_name, NULL))
       OR (NEW.last_name IS DISTINCT FROM COALESCE(OLD.last_name, NULL)) THEN
      NEW.full_name := NULLIF(trim(coalesce(NEW.first_name, '') || ' ' || coalesce(NEW.last_name, '')), '');
    -- Else if full_name changed, rebuild first/last
    ELSIF NEW.full_name IS DISTINCT FROM COALESCE(OLD.full_name, NULL) AND NEW.full_name IS NOT NULL THEN
      NEW.first_name := NULLIF(split_part(NEW.full_name, ' ', 1), '');
      NEW.last_name := NULLIF(NULLIF(regexp_replace(NEW.full_name, '^\S+\s*', ''), ''), NEW.full_name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_customer_name_fields ON public.customers;
CREATE TRIGGER trg_sync_customer_name_fields
  BEFORE INSERT OR UPDATE OF first_name, last_name, full_name ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.sync_customer_name_fields();

-- Email drafts: scheduling + approval workflow
DO $$ BEGIN
  CREATE TYPE public.email_approval_status AS ENUM ('pending_approval','approved','rejected','sent','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.email_drafts
  ADD COLUMN IF NOT EXISTS send_at timestamptz,
  ADD COLUMN IF NOT EXISTS recipient_customer_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS send_to_all boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status public.email_approval_status NOT NULL DEFAULT 'pending_approval',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

CREATE INDEX IF NOT EXISTS idx_email_drafts_approval_status
  ON public.email_drafts (client_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_email_drafts_send_at
  ON public.email_drafts (client_id, send_at);