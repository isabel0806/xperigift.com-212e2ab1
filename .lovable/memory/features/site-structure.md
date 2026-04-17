---
name: site-structure
description: Five public marketing routes, no auth, sticky mobile CTA
type: feature
---
# Site structure

All public marketing routes. No auth in v1. Sidebar/dashboard layer dormant.

## Routes

- `/` — Homepage: hero, problem, solution pillars, how-it-works (preview), outcomes, industries grid, why-Xperigift (DIY vs done-with-you), visibility/dashboard preview, social proof, FAQ, final CTA
- `/how-it-works` — 5-step process (audit → plan → execution → tracking → infrastructure)
- `/industries` — Six full vertical breakdowns (spa, salon, restaurant, golf club, specialty retail, gun shop). Each has: intro, buyer behavior, what's missed, our approach.
- `/about` — Why we exist, four operating principles, infrastructure note (TheGiftCardCafe)
- `/book-audit` — Native scheduler + qualification form. THE conversion endpoint.

## Shared chrome

- `src/components/site-shell.tsx` — wraps all routes (header + main + footer + mobile sticky CTA)
- `src/components/site-header.tsx` — sticky, backdrop-blur, mobile hamburger
- `src/components/site-footer.tsx` — 3-column with TheGiftCardCafe attribution
- `src/components/sticky-mobile-cta.tsx` — appears after 500px scroll, hidden on /book-audit
- `src/components/cta-link.tsx` — primary/outline/ghost variants, md/lg sizes, optional arrow
- `src/components/eyebrow.tsx` — small uppercase section label with hairline rule

## SEO

Every route has its own `head()` with title + description + og:title + og:description. Root has only generic site-name fallback (no og:image — would override per-route values).

## Mobile

- Mobile breakpoint: md (768px). Header collapses to hamburger.
- Sticky bottom CTA on mobile after hero scroll.
- Main has `pb-20 md:pb-0` to clear sticky CTA on mobile.
