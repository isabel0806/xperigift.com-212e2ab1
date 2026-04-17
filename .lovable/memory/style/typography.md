---
name: typography
description: Fraunces display + Inter body, sentence case across UI
type: design
---
# Typography

## Fonts

- **Display:** Fraunces (variable, opsz 9..144). Used for h1–h4, large stat numbers, and brand wordmark. `font-family: 'Fraunces', Georgia, serif;` via `--font-display`.
- **Body / UI:** Inter. `font-family: 'Inter', system-ui, sans-serif;` via `--font-sans`.

Loaded via Google Fonts in `__root.tsx` with preconnect.

## Rules

- Strict sentence case for all UI text — headings, labels, buttons. Never Title Case Like This.
- Eyebrows (small uppercase labels) use `tracking-[0.16em]` and `text-[12px]` — these are the only uppercase strings allowed.
- Italic + `text-emerald-deep` for emphasis words inside display headlines (e.g. "*revenue engine*").
- Body copy: `text-[15px]` to `text-[17px]`, `leading-relaxed`, color `text-ink-soft`.
