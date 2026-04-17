# Project Memory
Updated: now

## Core
Xperigift = done-with-you gift card revenue service for US SMBs ($150k–$2M). Primary site goal: book free 30-min audit at `/book-audit`.
Hierarchy (never reverse): Revenue engine → Done-with-you service → Infrastructure (TheGiftCardCafe, handled) → Dashboard (supporting only).
Visual: warm paper bg, near-black ink, deep emerald accent (restrained). Fraunces display + Inter body. 1px hairlines, no shadows, 4px radius.
Strict sentence case across UI. Italic emerald for emphasis words in display headlines.
NOT a SaaS. Never compare to platforms (GoHighLevel etc), never use feature grids or "all-in-one".
Booking: native scheduler. Slots from `availability_windows` minus `blocked_dates` minus `get_booked_slots()` RPC. Submissions inserted via public RLS, admin-only read.

## Memories
- [Project Summary](mem://project/summary) — Xperigift's core offer, verticals, and the strict messaging hierarchy
- [Visual Aesthetic](mem://style/aesthetic) — Paper/ink/emerald palette, oklch tokens, editorial layout rules
- [Typography](mem://style/typography) — Fraunces + Inter pairing, sentence case rules
- [Site Structure](mem://features/site-structure) — Five public routes, shared chrome, SEO, mobile sticky CTA
- [Booking System](mem://features/booking-system) — Native scheduler, RLS, conflict handling, validation
- [Tech Stack](mem://tech/stack) — TanStack Start + Tailwind v4 + Lovable Cloud + react-hook-form/zod
- [Supabase Initialization](mem://tech/initialization-pattern) — Proxy pattern for lazy initialization to fix SSR errors
