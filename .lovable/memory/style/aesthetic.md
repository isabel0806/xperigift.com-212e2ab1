---
name: visual-aesthetic
description: Premium B2B service firm design system — paper, ink, emerald
type: design
---
# Visual aesthetic

Premium B2B service consultancy. Editorial, executive, restrained — closer to McKinsey/Stripe-for-services than a SaaS landing page.

## Palette (oklch tokens in `src/styles.css`)

- `--paper` `oklch(0.985 0.005 85)` — warm off-white background
- `--paper-soft` `oklch(0.97 0.006 85)` — alternating section background
- `--ink` `oklch(0.18 0.01 270)` — primary text & dark surfaces
- `--ink-soft` `oklch(0.32 0.01 270)` — body text
- `--ink-muted` `oklch(0.5 0.008 270)` — captions, eyebrows
- `--emerald` `oklch(0.42 0.09 165)` — single brand accent (revenue/growth)
- `--emerald-deep` `oklch(0.32 0.075 165)` — hover/active emerald
- `--emerald-soft` `oklch(0.95 0.025 165)` — accent backgrounds
- `--hairline` / `--hairline-strong` — 1px neutral borders

Accent color is RESTRAINED — used only on CTAs, key italics, dots, focus rings. Bulk of UI is ink-on-paper.

## Typography

- **Display:** Fraunces (variable weight, opsz axis active) — headlines, h1–h4, stat numbers
- **Body:** Inter — UI, paragraphs, labels
- Tight letter-spacing on display (-0.02em). Italic emerald for emphasis words in headlines.

## Components

- 1px hairline borders, no shadows, no glass effects
- Border-radius: 4px (`--radius: 0.25rem`) — square-ish, not pill-shaped
- Section padding: 80–128px vertical
- Max width: 1200px
- Section dividers: full-width hairline borders, alternating paper/paper-soft backgrounds
- Buttons: solid ink primary, ghost/outline secondary, emerald reserved for the primary conversion CTA
