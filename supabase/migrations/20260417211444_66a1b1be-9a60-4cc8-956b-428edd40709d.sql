-- Category enum
CREATE TYPE public.holiday_category AS ENUM ('federal', 'retail', 'observance');

-- Table
CREATE TABLE public.marketing_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  emoji TEXT,
  category public.holiday_category NOT NULL DEFAULT 'observance',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, holiday_date)
);

CREATE INDEX idx_marketing_holidays_date ON public.marketing_holidays(holiday_date);

ALTER TABLE public.marketing_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read holidays"
  ON public.marketing_holidays
  FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage holidays"
  ON public.marketing_holidays
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_marketing_holidays_updated_at
  BEFORE UPDATE ON public.marketing_holidays
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed: 2025 + 2026 US federal + retail/marketing dates
INSERT INTO public.marketing_holidays (name, holiday_date, emoji, category) VALUES
  -- 2025
  ('New Year''s Day', '2025-01-01', '🎉', 'federal'),
  ('Martin Luther King Jr. Day', '2025-01-20', '✊', 'federal'),
  ('Valentine''s Day', '2025-02-14', '💝', 'retail'),
  ('Presidents'' Day', '2025-02-17', '🇺🇸', 'federal'),
  ('St. Patrick''s Day', '2025-03-17', '🍀', 'observance'),
  ('Easter', '2025-04-20', '🐰', 'observance'),
  ('Mother''s Day', '2025-05-11', '💐', 'retail'),
  ('Memorial Day', '2025-05-26', '🇺🇸', 'federal'),
  ('Father''s Day', '2025-06-15', '👔', 'retail'),
  ('Independence Day', '2025-07-04', '🎆', 'federal'),
  ('Labor Day', '2025-09-01', '🛠️', 'federal'),
  ('Halloween', '2025-10-31', '🎃', 'retail'),
  ('Veterans Day', '2025-11-11', '🎖️', 'federal'),
  ('Thanksgiving', '2025-11-27', '🦃', 'federal'),
  ('Black Friday', '2025-11-28', '🛍️', 'retail'),
  ('Small Business Saturday', '2025-11-29', '🏪', 'retail'),
  ('Cyber Monday', '2025-12-01', '💻', 'retail'),
  ('Christmas Eve', '2025-12-24', '🎄', 'retail'),
  ('Christmas Day', '2025-12-25', '🎁', 'federal'),
  ('New Year''s Eve', '2025-12-31', '🥂', 'retail'),
  -- 2026
  ('New Year''s Day', '2026-01-01', '🎉', 'federal'),
  ('Martin Luther King Jr. Day', '2026-01-19', '✊', 'federal'),
  ('Valentine''s Day', '2026-02-14', '💝', 'retail'),
  ('Presidents'' Day', '2026-02-16', '🇺🇸', 'federal'),
  ('St. Patrick''s Day', '2026-03-17', '🍀', 'observance'),
  ('Easter', '2026-04-05', '🐰', 'observance'),
  ('Mother''s Day', '2026-05-10', '💐', 'retail'),
  ('Memorial Day', '2026-05-25', '🇺🇸', 'federal'),
  ('Father''s Day', '2026-06-21', '👔', 'retail'),
  ('Independence Day', '2026-07-04', '🎆', 'federal'),
  ('Labor Day', '2026-09-07', '🛠️', 'federal'),
  ('Halloween', '2026-10-31', '🎃', 'retail'),
  ('Veterans Day', '2026-11-11', '🎖️', 'federal'),
  ('Thanksgiving', '2026-11-26', '🦃', 'federal'),
  ('Black Friday', '2026-11-27', '🛍️', 'retail'),
  ('Small Business Saturday', '2026-11-28', '🏪', 'retail'),
  ('Cyber Monday', '2026-11-30', '💻', 'retail'),
  ('Christmas Eve', '2026-12-24', '🎄', 'retail'),
  ('Christmas Day', '2026-12-25', '🎁', 'federal'),
  ('New Year''s Eve', '2026-12-31', '🥂', 'retail');