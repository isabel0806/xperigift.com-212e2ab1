-- Enum for product type
CREATE TYPE public.gift_card_product_type AS ENUM ('one_time', 'bundle', 'open_amount');

-- Products table
CREATE TABLE public.gift_card_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer,
  product_type public.gift_card_product_type NOT NULL DEFAULT 'one_time',
  image_url text,
  valid_from date,
  valid_until date,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gcp_client ON public.gift_card_products(client_id);
CREATE INDEX idx_gcp_active ON public.gift_card_products(client_id, is_active);

ALTER TABLE public.gift_card_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage gift_card_products"
  ON public.gift_card_products FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members read own client products"
  ON public.gift_card_products FOR SELECT TO authenticated
  USING (user_belongs_to_client(auth.uid(), client_id));

CREATE POLICY "Members insert own client products"
  ON public.gift_card_products FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_client(auth.uid(), client_id));

CREATE POLICY "Members update own client products"
  ON public.gift_card_products FOR UPDATE TO authenticated
  USING (user_belongs_to_client(auth.uid(), client_id))
  WITH CHECK (user_belongs_to_client(auth.uid(), client_id));

CREATE POLICY "Members delete own client products"
  ON public.gift_card_products FOR DELETE TO authenticated
  USING (user_belongs_to_client(auth.uid(), client_id));

CREATE TRIGGER set_gift_card_products_updated_at
  BEFORE UPDATE ON public.gift_card_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Items table (for bundles)
CREATE TABLE public.gift_card_product_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.gift_card_products(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gcpi_product ON public.gift_card_product_items(product_id);

ALTER TABLE public.gift_card_product_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage gift_card_product_items"
  ON public.gift_card_product_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members read own client product items"
  ON public.gift_card_product_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gift_card_products p
    WHERE p.id = product_id AND user_belongs_to_client(auth.uid(), p.client_id)
  ));

CREATE POLICY "Members insert own client product items"
  ON public.gift_card_product_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.gift_card_products p
    WHERE p.id = product_id AND user_belongs_to_client(auth.uid(), p.client_id)
  ));

CREATE POLICY "Members update own client product items"
  ON public.gift_card_product_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gift_card_products p
    WHERE p.id = product_id AND user_belongs_to_client(auth.uid(), p.client_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.gift_card_products p
    WHERE p.id = product_id AND user_belongs_to_client(auth.uid(), p.client_id)
  ));

CREATE POLICY "Members delete own client product items"
  ON public.gift_card_product_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gift_card_products p
    WHERE p.id = product_id AND user_belongs_to_client(auth.uid(), p.client_id)
  ));