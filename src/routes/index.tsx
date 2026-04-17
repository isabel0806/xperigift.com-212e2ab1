import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, Check, ClipboardList, LineChart, Rocket, Settings2, BarChart3, Users, Wallet, ShieldCheck, Eye, Mail } from 'lucide-react';
import { SiteShell } from '@/components/site-shell';
import { CTALink } from '@/components/cta-link';
import { Eyebrow } from '@/components/eyebrow';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Xperigift — Turn your gift card program into a revenue engine' },
      { name: 'description', content: 'A done-with-you system for US-based SMBs to drive year-round gift card revenue. Strategy, execution, and infrastructure — handled.' },
      { property: 'og:title', content: 'Xperigift — Turn your gift card program into a revenue engine' },
      { property: 'og:description', content: 'A done-with-you system for US-based SMBs to drive year-round gift card revenue. Strategy, execution, and infrastructure — handled.' },
      { name: 'twitter:title', content: 'Xperigift — Turn your gift card program into a revenue engine' },
      { name: 'twitter:description', content: 'A done-with-you system for US-based SMBs to drive year-round gift card revenue.' },
    ],
  }),
  component: HomePage,
});

const problems = [
  { title: 'Cards only sell in December', body: 'Your gift card program goes silent for 11 months. The other 11 are leaving cash on the table.' },
  { title: 'No campaign system', body: 'You react to holidays instead of running a planned, repeatable revenue calendar.' },
  { title: 'Zero visibility', body: 'You can\'t see what\'s working — sales data lives in three places, none of them useful.' },
];

const pillars = [
  { icon: ClipboardList, title: 'Strategy', body: 'A clear, written gift card revenue plan tailored to your business and your calendar.' },
  { icon: Rocket, title: 'Execution', body: 'We design and run the campaigns. Email, on-site, in-store. You approve, we ship.' },
  { icon: Settings2, title: 'Infrastructure', body: 'Sales, fulfillment, and reporting handled by TheGiftCardCafe — fully managed.' },
  { icon: Eye, title: 'Visibility', body: 'A simple dashboard so you always know what\'s selling, when, and to whom.' },
];

const steps = [
  { n: '01', title: 'Audit', body: 'A 30-minute working session. We diagnose where revenue is leaking and identify two to three high-impact opportunities.' },
  { n: '02', title: 'Plan', body: 'A written 90-day revenue plan with campaign calendar, offers, and targets you can hold us to.' },
  { n: '03', title: 'Launch', body: 'We build, send, and run the campaigns end-to-end. You stay focused on operations.' },
  { n: '04', title: 'Optimize', body: 'Monthly review of what worked, what didn\'t, and what we ship next. Iterate with data, not guesses.' },
];

const outcomes = [
  { icon: Wallet, title: 'More revenue', body: 'Year-round gift card sales — not just a December spike.' },
  { icon: LineChart, title: 'Better cash flow', body: 'Pre-paid revenue smooths slow months and funds operations.' },
  { icon: Users, title: 'Repeat customers', body: 'Gift cards bring new buyers who come back and spend more.' },
];

const industries = [
  'Spas', 'Salons', 'Restaurants', 'Golf clubs', 'Specialty retail', 'Gun shops',
];

const visibilityFeatures = [
  { icon: BarChart3, title: 'Sales tracking', body: 'See revenue, trends, and campaign performance at a glance.' },
  { icon: Mail, title: 'Email composer', body: 'Send approved campaigns directly when you want extra control.' },
  { icon: Users, title: 'Customer data', body: 'Access your buyer list, segments, and purchase history.' },
];

const faqs = [
  { q: 'Is this software I have to learn?', a: 'No. Xperigift is a service. We do the strategy and the execution. The dashboard is there if you want visibility — not because you need to operate it.' },
  { q: 'How is this different from a marketing agency?', a: 'We focus on one revenue channel: gift cards. We bring infrastructure (TheGiftCardCafe), strategy, and execution as a single package — measured against revenue outcomes, not impressions.' },
  { q: 'What kind of business is this for?', a: 'US-based SMBs roughly $150k–$2M in revenue who already sell or could sell gift cards. Spas, salons, restaurants, golf clubs, specialty retail, and gun shops are our core verticals.' },
  { q: 'How long until we see results?', a: 'Most clients see meaningful gift card revenue within the first 30–60 days of launch. The audit itself usually surfaces opportunities you can act on the same week.' },
  { q: 'Do I keep my customer data?', a: 'Yes. It\'s your business and your data. The dashboard gives you ongoing access to your customer base and sales history.' },
  { q: 'What does the audit cost?', a: 'The audit is free. Thirty minutes, no pitch deck. You leave with two to three specific revenue opportunities even if we never work together.' },
];

function HomePage() {
  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-hairline">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 pt-20 sm:pt-28 pb-20 sm:pb-32">
          <div className="max-w-[820px]">
            <Eyebrow>Done-with-you gift card revenue</Eyebrow>
            <h1 className="mt-6 font-display text-[44px] sm:text-[64px] lg:text-[78px] leading-[0.98] font-normal text-ink">
              Turn your gift card program into a <span className="italic text-emerald-deep">revenue engine</span>.
            </h1>
            <p className="mt-7 max-w-[640px] text-[17px] sm:text-[19px] leading-relaxed text-ink-soft">
              We design the strategy, run the campaigns, and handle the infrastructure — so your gift cards drive real revenue year-round, not just in December.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <CTALink to="/book-audit" size="lg">Book your free audit</CTALink>
              <CTALink to="/how-it-works" size="lg" variant="ghost" withArrow={false}>
                See how it works <ArrowUpRight className="h-4 w-4" />
              </CTALink>
            </div>
            <p className="mt-6 text-[13px] text-ink-muted">
              30 minutes. No pitch. You leave with 2–3 specific revenue opportunities.
            </p>
          </div>
        </div>

        {/* Marquee strip */}
        <div className="border-t border-hairline bg-paper-soft">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-x-10 gap-y-3 text-[12px] uppercase tracking-[0.18em] text-ink-muted">
            <span>Built for operators</span>
            <span className="hidden sm:inline">Powered by TheGiftCardCafe</span>
            <span>US-based SMBs · $150k–$2M</span>
            <span className="hidden md:inline">Strategy + execution + infrastructure</span>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <Eyebrow>The problem</Eyebrow>
              <h2 className="mt-5 font-display text-[34px] sm:text-[44px] leading-[1.05] text-ink">
                Your gift cards are leaking revenue right now.
              </h2>
              <p className="mt-5 text-[16px] text-ink-soft leading-relaxed max-w-md">
                Most SMBs treat gift cards as a checkout afterthought. The result is predictable: passive sales, missed cash flow, and customers you never re-engage.
              </p>
            </div>
            <div className="md:col-span-7 grid gap-px bg-hairline">
              {problems.map((p) => (
                <div key={p.title} className="bg-paper p-7">
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
                    <div>
                      <h3 className="font-display text-[20px] text-ink">{p.title}</h3>
                      <p className="mt-2 text-[15px] text-ink-soft leading-relaxed">{p.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTION / PILLARS */}
      <section className="border-b border-hairline bg-paper-soft">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
          <div className="max-w-[700px]">
            <Eyebrow>The solution</Eyebrow>
            <h2 className="mt-5 font-display text-[34px] sm:text-[44px] leading-[1.05] text-ink">
              One channel. Four moving parts. We run them all.
            </h2>
            <p className="mt-5 text-[16px] text-ink-soft leading-relaxed max-w-[560px]">
              You don't need another tool. You need a system that drives revenue — and someone accountable for the outcome.
            </p>
          </div>
          <div className="mt-14 grid gap-px bg-hairline border border-hairline sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p) => (
              <div key={p.title} className="bg-paper p-7">
                <p.icon className="h-5 w-5 text-emerald" />
                <h3 className="mt-5 font-display text-[22px] text-ink">{p.title}</h3>
                <p className="mt-2 text-[15px] text-ink-soft leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <Eyebrow>How it works</Eyebrow>
              <h2 className="mt-5 font-display text-[34px] sm:text-[44px] leading-[1.05] text-ink max-w-[600px]">
                A 90-day path from passive program to revenue engine.
              </h2>
            </div>
            <CTALink to="/how-it-works" variant="outline">See full process</CTALink>
          </div>
          <div className="grid gap-px bg-hairline border border-hairline sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="bg-paper p-7">
                <span className="font-display text-[44px] text-hairline-strong leading-none">{s.n}</span>
                <h3 className="mt-4 font-display text-[22px] text-ink">{s.title}</h3>
                <p className="mt-2 text-[15px] text-ink-soft leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OUTCOMES */}
      <section className="border-b border-hairline bg-ink text-paper">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
          <div className="max-w-[700px]">
            <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.16em] text-paper/60">
              <span className="h-px w-6 bg-paper/30" aria-hidden />
              The outcome
            </div>
            <h2 className="mt-5 font-display text-[34px] sm:text-[44px] leading-[1.05]">
              Revenue you can see, plan around, and bank on.
            </h2>
          </div>
          <div className="mt-14 grid gap-12 sm:grid-cols-3">
            {outcomes.map((o) => (
              <div key={o.title}>
                <o.icon className="h-6 w-6 text-emerald" />
                <h3 className="mt-5 font-display text-[24px] text-paper">{o.title}</h3>
                <p className="mt-3 text-[15px] text-paper/70 leading-relaxed">{o.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
          <div className="grid gap-12 md:grid-cols-12 items-end">
            <div className="md:col-span-7">
              <Eyebrow>Industries we serve</Eyebrow>
              <h2 className="mt-5 font-display text-[34px] sm:text-[44px] leading-[1.05] text-ink">
                Built for service-led, repeat-purchase businesses.
              </h2>
            </div>
            <div className="md:col-span-5 md:text-right">
              <CTALink to="/industries" variant="outline">Industry breakdowns</CTALink>
            </div>
          </div>
          <ul className="mt-12 grid gap-px bg-hairline border border-hairline sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((i) => (
              <li key={i} className="bg-paper p-6 flex items-center justify-between">
                <span className="font-display text-[22px] text-ink">{i}</span>
                <ArrowRight className="h-4 w-4 text-ink-muted" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* WHY XPERIGIFT — service vs DIY */}
      <section className="border-b border-hairline bg-paper-soft">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
          <div className="max-w-[700px]">
            <Eyebrow>Why Xperigift</Eyebrow>
            <h2 className="mt-5 font-display text-[34px] sm:text-[44px] leading-[1.05] text-ink">
              You don't need another tool. You need a system that drives revenue.
            </h2>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <div className="border border-hairline bg-paper p-8">
              <p className="text-[12px] uppercase tracking-[0.16em] text-ink-muted">DIY platforms</p>
              <ul className="mt-5 space-y-3 text-[15px] text-ink-soft">
                <li className="flex gap-3"><span className="text-ink-muted">—</span> You learn the software</li>
                <li className="flex gap-3"><span className="text-ink-muted">—</span> You build the campaigns</li>
                <li className="flex gap-3"><span className="text-ink-muted">—</span> You manage the platform</li>
                <li className="flex gap-3"><span className="text-ink-muted">—</span> Outcomes depend on your time</li>
              </ul>
            </div>
            <div className="border border-emerald bg-paper p-8 relative">
              <div className="absolute -top-3 left-8 bg-paper px-3 text-[11px] uppercase tracking-[0.16em] text-emerald-deep font-medium">
                Xperigift
              </div>
              <p className="text-[12px] uppercase tracking-[0.16em] text-emerald-deep">Done with you</p>
              <ul className="mt-5 space-y-3 text-[15px] text-ink">
                <li className="flex gap-3"><Check className="h-4 w-4 mt-1 text-emerald shrink-0" /> We bring the strategy</li>
                <li className="flex gap-3"><Check className="h-4 w-4 mt-1 text-emerald shrink-0" /> We run the campaigns</li>
                <li className="flex gap-3"><Check className="h-4 w-4 mt-1 text-emerald shrink-0" /> Infrastructure is fully managed</li>
                <li className="flex gap-3"><Check className="h-4 w-4 mt-1 text-emerald shrink-0" /> Outcomes are measured in revenue</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* VISIBILITY */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <Eyebrow>Visibility, not complexity</Eyebrow>
              <h2 className="mt-5 font-display text-[34px] sm:text-[44px] leading-[1.05] text-ink">
                You don't lose control — you gain clarity.
              </h2>
              <p className="mt-5 text-[16px] text-ink-soft leading-relaxed max-w-md">
                A lightweight dashboard sits behind every engagement. It's there for sales visibility, customer data access, and optional control — never as something you have to operate.
              </p>
              <div className="mt-7 flex items-center gap-2 text-[13px] text-ink-muted">
                <ShieldCheck className="h-4 w-4" />
                Your data stays yours. Always exportable.
              </div>
            </div>
            <div className="md:col-span-7">
              <div className="border border-hairline bg-paper">
                <div className="border-b border-hairline px-5 py-3 flex items-center gap-2 bg-paper-soft">
                  <span className="h-2.5 w-2.5 rounded-full bg-hairline-strong" />
                  <span className="h-2.5 w-2.5 rounded-full bg-hairline-strong" />
                  <span className="h-2.5 w-2.5 rounded-full bg-hairline-strong" />
                  <span className="ml-3 text-[12px] text-ink-muted">xperigift.app / dashboard</span>
                </div>
                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-3 gap-4">
                    <Stat label="This month" value="$24,180" trend="+38%" />
                    <Stat label="Active cards" value="412" trend="+11%" />
                    <Stat label="Repeat buyers" value="64%" trend="+9%" />
                  </div>
                  <div className="mt-6 h-32 border border-hairline bg-paper-soft relative overflow-hidden">
                    <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
                      <polyline
                        points="0,90 50,82 100,75 150,60 200,55 250,40 300,35 350,22 400,18"
                        fill="none"
                        stroke="oklch(0.42 0.09 165)"
                        strokeWidth="2"
                      />
                      <polyline
                        points="0,90 50,82 100,75 150,60 200,55 250,40 300,35 350,22 400,18 400,120 0,120"
                        fill="oklch(0.42 0.09 165 / 0.08)"
                      />
                    </svg>
                  </div>
                  <div className="mt-6 grid sm:grid-cols-3 gap-4">
                    {visibilityFeatures.map((vf) => (
                      <div key={vf.title} className="border border-hairline p-4">
                        <vf.icon className="h-4 w-4 text-emerald" />
                        <p className="mt-2 text-[13px] font-medium text-ink">{vf.title}</p>
                        <p className="mt-1 text-[12px] text-ink-muted leading-relaxed">{vf.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="border-b border-hairline bg-paper-soft">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
          <Eyebrow>Trusted by operators</Eyebrow>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { quote: 'They turned a sleepy line item into a real revenue channel for us. The team runs it — we just see the results.', name: 'Owner', role: 'Day spa, Florida' },
              { quote: 'I stopped thinking about gift cards. They show up in the dashboard, and the sales just keep coming.', name: 'GM', role: 'Restaurant group, Texas' },
              { quote: 'The audit alone was worth it. We acted on two ideas the same week and saw revenue lift inside 30 days.', name: 'Operator', role: 'Specialty retail, NC' },
            ].map((t) => (
              <figure key={t.name} className="border border-hairline bg-paper p-7">
                <blockquote className="text-[16px] text-ink leading-relaxed">"{t.quote}"</blockquote>
                <figcaption className="mt-5 text-[13px] text-ink-muted">
                  <span className="text-ink font-medium">{t.name}</span> · {t.role}
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-8 text-[12px] text-ink-muted">Representative client profiles. Names withheld for privacy.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-[900px] px-5 sm:px-8 py-24 sm:py-32">
          <Eyebrow>Common questions</Eyebrow>
          <h2 className="mt-5 font-display text-[34px] sm:text-[44px] leading-[1.05] text-ink">
            Straightforward answers.
          </h2>
          <div className="mt-12 divide-y divide-hairline border-y border-hairline">
            {faqs.map((f) => (
              <details key={f.q} className="group py-6">
                <summary className="cursor-pointer list-none flex items-start justify-between gap-6">
                  <span className="font-display text-[20px] text-ink">{f.q}</span>
                  <span className="mt-1 h-5 w-5 rounded-full border border-hairline-strong flex items-center justify-center text-ink-muted text-[14px] leading-none group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-4 text-[15px] text-ink-soft leading-relaxed max-w-[680px]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32 text-center">
          <p className="text-[12px] uppercase tracking-[0.16em] text-paper/60">Get started</p>
          <h2 className="mt-5 font-display text-[36px] sm:text-[56px] leading-[1.02] max-w-[820px] mx-auto">
            See how much gift card revenue you're leaving on the table.
          </h2>
          <p className="mt-6 max-w-xl mx-auto text-[16px] text-paper/70 leading-relaxed">
            Book a free 30-minute audit. We'll review your business, your current setup, and walk away with two to three specific opportunities — yours to keep.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/book-audit"
              className="inline-flex h-12 items-center gap-2 rounded-sm bg-emerald px-7 text-[15px] font-medium text-paper hover:bg-emerald-deep transition-colors"
            >
              Book your free audit <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function Stat({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="border border-hairline p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-[24px] text-ink leading-tight">{value}</p>
      <p className="mt-1 text-[12px] text-emerald-deep">{trend}</p>
    </div>
  );
}
