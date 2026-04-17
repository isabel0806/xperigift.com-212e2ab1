import { createFileRoute } from '@tanstack/react-router';
import { Sparkles, Scissors, UtensilsCrossed, Flag, ShoppingBag, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SiteShell } from '@/components/site-shell';
import { CTALink } from '@/components/cta-link';
import { Eyebrow } from '@/components/eyebrow';

export const Route = createFileRoute('/industries')({
  head: () => ({
    meta: [
      { title: 'Industries — Xperigift' },
      { name: 'description', content: 'How Xperigift drives gift card revenue for spas, salons, restaurants, golf clubs, specialty retail, and gun shops.' },
      { property: 'og:title', content: 'Industries we serve — Xperigift' },
      { property: 'og:description', content: 'Vertical-specific gift card revenue strategies for service-led, repeat-purchase US businesses.' },
    ],
  }),
  component: IndustriesPage,
});

type Industry = {
  id: string;
  icon: LucideIcon;
  name: string;
  intro: string;
  behavior: string;
  missed: string;
  solution: string;
};

const industries: Industry[] = [
  {
    id: 'spas',
    icon: Sparkles,
    name: 'Spas',
    intro: 'Gift card revenue is one of the highest-leverage channels in the spa world — and one of the most underused outside of December.',
    behavior: 'Buyers purchase for self-care, occasions, and as gifts year-round. Most spas only push gift cards in November and December.',
    missed: 'No reactivation campaigns to lapsed clients. No bundling with high-margin services. No structured referral or "thank-you" gifting.',
    solution: 'A year-round campaign calendar with seasonal offers (Mother\'s Day, summer wellness, end-of-year). Reactivation flows for clients who haven\'t booked in 90+ days. Gift card bundles attached to your highest-margin services.',
  },
  {
    id: 'salons',
    icon: Scissors,
    name: 'Salons',
    intro: 'Salons sit on warm client relationships and high repeat frequency — perfect conditions for gift cards as a customer reactivation engine.',
    behavior: 'Clients gift services to friends, family, and partners. Stylists often act as informal sellers without a system behind them.',
    missed: 'No incentive structure for stylists to sell. No add-on cards at checkout. No data on who\'s buying for whom.',
    solution: 'A simple stylist-led gifting program with built-in incentives. Checkout add-ons for top-up cards. Customer data tracking so we can re-engage gift recipients into recurring clients.',
  },
  {
    id: 'restaurants',
    icon: UtensilsCrossed,
    name: 'Restaurants',
    intro: 'Restaurants live and die by cash flow. Gift cards are pre-paid revenue — and one of the most reliable smoothing tools available.',
    behavior: 'Big spikes in November–December, then near-silence. "Buy $100 get $20" promos run once a year, if at all.',
    missed: 'No mid-year promotions. No bounce-back offers. No corporate or holiday-gifting outreach to local businesses.',
    solution: 'A year-round revenue calendar including bounce-back cards, summer slow-season promos, and a corporate gifting program targeting local businesses for staff appreciation and client gifts.',
  },
  {
    id: 'golf-clubs',
    icon: Flag,
    name: 'Golf clubs',
    intro: 'Gift cards are an under-utilized lever in clubs that already have a strong member base and a steady gift-giving demographic.',
    behavior: 'Members and guests buy rounds, lessons, and pro-shop credit as gifts — usually only when prompted in person.',
    missed: 'No structured email program. No member referral mechanic. No tied-in lessons or experience packages.',
    solution: 'Email campaigns to members for occasions (Father\'s Day, holidays, member-guest events). Experience bundles (round + lesson + lunch). A referral mechanic that rewards members for bringing new players.',
  },
  {
    id: 'specialty-retail',
    icon: ShoppingBag,
    name: 'Specialty retail',
    intro: 'Specialty retailers have loyal niche audiences. Gift cards extend that loyalty into the people their customers buy for.',
    behavior: 'Repeat customers buy for themselves and as gifts in spurts — usually around launches, holidays, and life events.',
    missed: 'No segmented campaigns by purchase history. No "gift the experience" angle. No re-engagement of one-time buyers.',
    solution: 'Segmented campaigns based on category and frequency. Storytelling around the brand and the gifting moment. Reactivation flows targeting one-time buyers with curated gift card offers.',
  },
  {
    id: 'gun-shops',
    icon: Target,
    name: 'Gun shops',
    intro: 'Gun shops have strong, brand-loyal customer bases — and an audience where gift cards remove friction around buying for someone else.',
    behavior: 'Customers want to gift firearms-related goods but hesitate due to selection, sizing, or compliance. Gift cards solve that.',
    missed: 'No outreach around hunting season, holidays, or birthdays. No range-time bundles. No structured customer database for repeat outreach.',
    solution: 'Calendar built around hunting seasons, holidays, and family events. Range-time and accessory bundles. A clean customer list with consent-based ongoing outreach.',
  },
];

function IndustriesPage() {
  return (
    <SiteShell>
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 pt-20 sm:pt-28 pb-16 sm:pb-20">
          <div className="max-w-[820px]">
            <Eyebrow>Industries</Eyebrow>
            <h1 className="mt-6 font-display text-[44px] sm:text-[60px] lg:text-[72px] leading-[1] text-ink">
              Vertical-specific. Operator-led.
            </h1>
            <p className="mt-7 max-w-[640px] text-[17px] sm:text-[19px] text-ink-soft leading-relaxed">
              We work exclusively with service-led, repeat-purchase US SMBs — businesses where gift cards aren't just a feature, they're a real revenue channel waiting to be activated.
            </p>
          </div>

          <nav aria-label="Industry quick nav" className="mt-12 flex flex-wrap gap-2">
            {industries.map((i) => (
              <a
                key={i.id}
                href={`#${i.id}`}
                className="inline-flex items-center gap-2 rounded-sm border border-hairline bg-paper px-4 py-2 text-[13px] text-ink-soft hover:border-ink hover:text-ink transition-colors"
              >
                <i.icon className="h-3.5 w-3.5" />
                {i.name}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {industries.map((i, idx) => (
        <section
          key={i.id}
          id={i.id}
          className={`border-b border-hairline ${idx % 2 === 1 ? 'bg-paper-soft' : ''} scroll-mt-24`}
        >
          <div className="mx-auto max-w-[1100px] px-5 sm:px-8 py-20 sm:py-28">
            <div className="grid gap-12 md:grid-cols-12">
              <div className="md:col-span-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-sm bg-emerald-soft">
                  <i.icon className="h-6 w-6 text-emerald-deep" />
                </div>
                <h2 className="mt-6 font-display text-[34px] sm:text-[44px] leading-[1.05] text-ink">
                  {i.name}
                </h2>
                <p className="mt-4 text-[16px] text-ink-soft leading-relaxed">{i.intro}</p>
              </div>

              <div className="md:col-span-8 grid gap-px bg-hairline border border-hairline">
                <Block label="Buyer behavior" body={i.behavior} />
                <Block label="What's missed" body={i.missed} />
                <Block label="Our approach" body={i.solution} accent />
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8 py-20 sm:py-28 text-center">
          <h2 className="font-display text-[34px] sm:text-[48px] leading-[1.05] max-w-[700px] mx-auto">
            Don't see your vertical? Talk to us.
          </h2>
          <p className="mt-6 max-w-lg mx-auto text-[15px] text-paper/70">
            If you're a service-led SMB doing $150k–$2M in revenue, the same playbook usually applies. The audit will tell us quickly.
          </p>
          <div className="mt-9 flex justify-center">
            <CTALink to="/book-audit" size="lg" className="bg-emerald hover:bg-emerald-deep text-paper">
              Book your free audit
            </CTALink>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function Block({ label, body, accent = false }: { label: string; body: string; accent?: boolean }) {
  return (
    <div className="bg-paper p-7">
      <p className={`text-[12px] uppercase tracking-[0.16em] ${accent ? 'text-emerald-deep' : 'text-ink-muted'}`}>
        {label}
      </p>
      <p className="mt-3 text-[15px] text-ink leading-relaxed">{body}</p>
    </div>
  );
}
