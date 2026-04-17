-- 1. Tabla de redenciones
CREATE TABLE public.gift_card_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_card_sale_id uuid NOT NULL REFERENCES public.gift_card_sales(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  redeemed_by uuid,
  card_code_snapshot text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_redemptions_sale ON public.gift_card_redemptions(gift_card_sale_id);
CREATE INDEX idx_redemptions_client_date ON public.gift_card_redemptions(client_id, redeemed_at DESC);

ALTER TABLE public.gift_card_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage redemptions"
  ON public.gift_card_redemptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members read own client redemptions"
  ON public.gift_card_redemptions
  FOR SELECT TO authenticated
  USING (user_belongs_to_client(auth.uid(), client_id));

CREATE POLICY "Members insert own client redemptions"
  ON public.gift_card_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_client(auth.uid(), client_id));

-- 2. Trigger: al insertar redención, actualizar la sale
CREATE OR REPLACE FUNCTION public.apply_redemption_to_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount integer;
  v_redeemed integer;
  v_new_redeemed integer;
  v_new_status gift_card_sale_status;
BEGIN
  SELECT amount_cents, redeemed_cents
  INTO v_amount, v_redeemed
  FROM public.gift_card_sales
  WHERE id = NEW.gift_card_sale_id
  FOR UPDATE;

  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'Gift card sale not found';
  END IF;

  v_new_redeemed := v_redeemed + NEW.amount_cents;

  IF v_new_redeemed > v_amount THEN
    RAISE EXCEPTION 'Redemption amount exceeds remaining balance';
  END IF;

  IF v_new_redeemed >= v_amount THEN
    v_new_status := 'redeemed';
  ELSE
    v_new_status := 'partially_redeemed';
  END IF;

  UPDATE public.gift_card_sales
  SET redeemed_cents = v_new_redeemed,
      status = v_new_status,
      updated_at = now()
  WHERE id = NEW.gift_card_sale_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_redemption
  AFTER INSERT ON public.gift_card_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_redemption_to_sale();