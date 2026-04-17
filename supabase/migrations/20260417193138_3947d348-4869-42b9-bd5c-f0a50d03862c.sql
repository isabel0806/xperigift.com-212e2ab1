-- 1. Add points config to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS points_per_giftcard integer NOT NULL DEFAULT 10;

-- 2. Add loyalty points balance to customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0;

-- 3. Loyalty transactions ledger
CREATE TYPE public.loyalty_txn_type AS ENUM ('earned', 'redeemed', 'adjustment', 'expired');

CREATE TABLE public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  gift_card_sale_id uuid REFERENCES public.gift_card_sales(id) ON DELETE SET NULL,
  type public.loyalty_txn_type NOT NULL,
  points integer NOT NULL,
  balance_after integer NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_txn_customer ON public.loyalty_transactions(customer_id, created_at DESC);
CREATE INDEX idx_loyalty_txn_client ON public.loyalty_transactions(client_id, created_at DESC);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage loyalty_transactions"
  ON public.loyalty_transactions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members read own client loyalty txns"
  ON public.loyalty_transactions FOR SELECT
  TO authenticated
  USING (user_belongs_to_client(auth.uid(), client_id));

-- 4. Trigger function: on gift card sale insert, upsert customer and award points
CREATE OR REPLACE FUNCTION public.award_loyalty_points_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points_per_card integer;
  v_customer_id uuid;
  v_new_balance integer;
BEGIN
  -- Need a buyer email to attribute points
  IF NEW.buyer_email IS NULL OR NEW.buyer_email = '' THEN
    RETURN NEW;
  END IF;

  -- Get the client's points config
  SELECT points_per_giftcard INTO v_points_per_card
  FROM public.clients
  WHERE id = NEW.client_id;

  IF v_points_per_card IS NULL OR v_points_per_card <= 0 THEN
    RETURN NEW;
  END IF;

  -- Upsert customer by (client_id, lower(email))
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE client_id = NEW.client_id
    AND lower(email) = lower(NEW.buyer_email)
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (
      client_id, email, full_name, phone,
      total_spent_cents, purchase_count, last_purchase_at, loyalty_points,
      source
    ) VALUES (
      NEW.client_id, NEW.buyer_email, NEW.buyer_name, NULL,
      NEW.amount_cents, 1, NEW.sold_at, v_points_per_card,
      'gift_card_sale'
    )
    RETURNING id, loyalty_points INTO v_customer_id, v_new_balance;
  ELSE
    UPDATE public.customers
    SET total_spent_cents = total_spent_cents + NEW.amount_cents,
        purchase_count = purchase_count + 1,
        last_purchase_at = GREATEST(COALESCE(last_purchase_at, NEW.sold_at), NEW.sold_at),
        loyalty_points = loyalty_points + v_points_per_card,
        full_name = COALESCE(full_name, NEW.buyer_name),
        updated_at = now()
    WHERE id = v_customer_id
    RETURNING loyalty_points INTO v_new_balance;
  END IF;

  INSERT INTO public.loyalty_transactions (
    client_id, customer_id, gift_card_sale_id, type, points, balance_after, note
  ) VALUES (
    NEW.client_id, v_customer_id, NEW.id, 'earned', v_points_per_card, v_new_balance,
    'Gift card purchase'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_loyalty_points
  AFTER INSERT ON public.gift_card_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.award_loyalty_points_on_sale();