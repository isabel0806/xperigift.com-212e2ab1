---
name: tech-stack
description: TanStack Start, Tailwind v4, Supabase via Lovable Cloud, react-hook-form + zod
type: reference
---
# Tech stack

- **Framework:** TanStack Start v1 (React 19, Vite 7, file-based routing in `src/routes/`)
- **Styling:** Tailwind CSS v4 via `src/styles.css` (no `tailwind.config.js`). All design tokens in oklch.
- **Backend:** Lovable Cloud (Supabase). Browser client at `src/integrations/supabase/client.ts`. Auth middleware + admin client exist but unused in v1.
- **Forms:** react-hook-form + @hookform/resolvers + zod
- **Date handling:** date-fns + date-fns-tz (timezone math for slot generation)
- **Toasts:** sonner (mounted in `__root.tsx`)
- **Icons:** lucide-react
- **UI primitives:** shadcn/ui in `src/components/ui/` — most unused; kept for future dashboard
- **Fonts:** Fraunces (display) + Inter (body) via Google Fonts
