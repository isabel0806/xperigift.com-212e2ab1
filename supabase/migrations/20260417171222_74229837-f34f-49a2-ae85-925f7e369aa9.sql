-- Drop AssetWise tables (this template is being repurposed for Xperigift)
DROP TABLE IF EXISTS public.asset_assignments CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.asset_categories CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TYPE IF EXISTS public.asset_condition CASCADE;

-- Keep user_roles + has_role + app_role enum (used for admin-only access to bookings)

-- =========================================================
-- Audit booking system
-- =========================================================

-- Configurable availability windows (weekly recurring)
-- day_of_week: 0=Sunday ... 6=Saturday
CREATE TABLE public.availability_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes integer NOT NULL DEFAULT 30 CHECK (slot_duration_minutes > 0),
  timezone text NOT NULL DEFAULT 'America/New_York',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

-- Dates explicitly blocked (holidays, time off)
CREATE TABLE public.blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_date date NOT NULL UNIQUE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit booking submissions
CREATE TYPE public.audit_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.revenue_band AS ENUM ('under_150k', '150k_500k', '500k_1m', '1m_2m', 'over_2m');
CREATE TYPE public.industry_vertical AS ENUM ('spa', 'salon', 'restaurant', 'golf_club', 'specialty_retail', 'gun_shop', 'other');
CREATE TYPE public.gift_card_status AS ENUM ('have_program', 'considering', 'none');

CREATE TABLE public.audit_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Scheduling
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  timezone text NOT NULL DEFAULT 'America/New_York',
  status public.audit_status NOT NULL DEFAULT 'pending',
  -- Contact
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  phone text CHECK (phone IS NULL OR char_length(phone) BETWEEN 7 AND 30),
  business_name text NOT NULL CHECK (char_length(business_name) BETWEEN 1 AND 200),
  website text CHECK (website IS NULL OR char_length(website) <= 300),
  -- Qualification
  industry public.industry_vertical NOT NULL,
  industry_other text CHECK (industry_other IS NULL OR char_length(industry_other) <= 100),
  revenue_band public.revenue_band NOT NULL,
  gift_card_status public.gift_card_status NOT NULL,
  biggest_challenge text NOT NULL CHECK (char_length(biggest_challenge) BETWEEN 10 AND 2000),
  -- Meta
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Prevent double-booking the same slot
  CONSTRAINT unique_active_slot UNIQUE (scheduled_at)
);

CREATE INDEX idx_audit_bookings_scheduled_at ON public.audit_bookings(scheduled_at);
CREATE INDEX idx_audit_bookings_status ON public.audit_bookings(status);
CREATE INDEX idx_audit_bookings_email ON public.audit_bookings(email);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_bookings_updated_at
BEFORE UPDATE ON public.audit_bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- RLS — public can submit & read availability; only admins read bookings
-- =========================================================

ALTER TABLE public.availability_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_bookings ENABLE ROW LEVEL SECURITY;

-- Availability windows: world-readable (active only), admin-managed
CREATE POLICY "Anyone can read active availability"
  ON public.availability_windows FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage availability"
  ON public.availability_windows FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Blocked dates: world-readable, admin-managed
CREATE POLICY "Anyone can read blocked dates"
  ON public.blocked_dates FOR SELECT
  USING (true);

CREATE POLICY "Admins manage blocked dates"
  ON public.blocked_dates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Audit bookings:
--  - Anyone can INSERT a booking (the public form)
--  - Only admins can SELECT/UPDATE/DELETE
--  - Public CANNOT read bookings — booked slots are exposed via a security-definer
--    function that only returns the scheduled_at timestamps (no PII)
CREATE POLICY "Anyone can submit a booking"
  ON public.audit_bookings FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND scheduled_at > now()
    AND scheduled_at < now() + interval '90 days'
  );

CREATE POLICY "Admins read all bookings"
  ON public.audit_bookings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update bookings"
  ON public.audit_bookings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete bookings"
  ON public.audit_bookings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Public function: list booked slot timestamps in a date range
-- (so the slot picker can hide taken times without leaking PII)
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_booked_slots(
  range_start timestamptz,
  range_end timestamptz
)
RETURNS TABLE(scheduled_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT scheduled_at
  FROM public.audit_bookings
  WHERE status IN ('pending', 'confirmed')
    AND scheduled_at >= range_start
    AND scheduled_at <  range_end;
$$;

GRANT EXECUTE ON FUNCTION public.get_booked_slots(timestamptz, timestamptz) TO anon, authenticated;

-- =========================================================
-- Seed default availability: Mon–Fri, 9am–5pm ET, 30-min slots
-- =========================================================
INSERT INTO public.availability_windows (day_of_week, start_time, end_time, slot_duration_minutes, timezone)
VALUES
  (1, '09:00', '17:00', 30, 'America/New_York'),
  (2, '09:00', '17:00', 30, 'America/New_York'),
  (3, '09:00', '17:00', 30, 'America/New_York'),
  (4, '09:00', '17:00', 30, 'America/New_York'),
  (5, '09:00', '17:00', 30, 'America/New_York');
