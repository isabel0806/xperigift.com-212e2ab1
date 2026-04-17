---
name: booking-system
description: Native Calendly-style scheduler with Zod-validated form and admin-only RLS
type: feature
---
# Booking system

A self-hosted (Calendly-style) scheduler at `/book-audit`. No third-party scheduler.

## Database (public schema)

- **`availability_windows`** — recurring weekly business hours. Fields: `day_of_week` (0–6), `start_time`, `end_time`, `slot_duration_minutes`, `timezone`, `is_active`. Seeded Mon–Fri 9am–5pm America/New_York, 30-min slots.
- **`blocked_dates`** — admin-managed date overrides (holidays, time off).
- **`audit_bookings`** — submissions. Unique constraint on `scheduled_at` prevents double-booking. Status enum: pending/confirmed/completed/cancelled/no_show.

## RLS

- `availability_windows`, `blocked_dates`: world-readable so the picker works.
- `audit_bookings`:
  - **INSERT:** anyone, but only with `status='pending'` and `scheduled_at` within `now() + 90 days`.
  - **SELECT/UPDATE/DELETE:** admins only (via `has_role(uid, 'admin')`).
- **`get_booked_slots(range_start, range_end)`** — security-definer function exposed to anon + authenticated. Returns ONLY `scheduled_at` timestamps for active bookings — never PII. Lets the picker hide taken slots without leaking submissions.

## Front-end flow (`/book-audit`)

1. Pick step — 14-day rolling date picker (split into two weeks). Slots built in browser via `src/lib/scheduling.ts` (date-fns + date-fns-tz). Hides past times, blocked dates, and booked timestamps.
2. Form step — react-hook-form + zod (`src/lib/booking-schema.ts`). Validates all inputs with length caps. Industry/revenue/gift-card-status are enums matching DB.
3. Confirmation — replaces page with success state showing the booked slot in long format.

## Conflict handling

If two users race the same slot, the second insert hits the unique constraint (Postgres error 23505). The form catches this and bounces them back to the picker with a toast.
