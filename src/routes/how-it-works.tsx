import { createFileRoute } from '@tanstack/react-router';
import { ClipboardList, FileText, Rocket, BarChart3, Server, ShieldCheck } from 'lucide-react';
import { SiteShell } from '@/components/site-shell';
import { CTALink } from '@/components/cta-link';
import { Eyebrow } from '@/components/eyebrow';

export const Route = createFileRoute('/how-it-works')({
  head: () => ({
    meta: [
      { title: 'How it works — Xperigift' },
      { name: 'description', content: 'Audit, plan, launch, and optimize. The four-step done-with-you process that turns your gift card program into measurable revenue.' },
      { property: 'og:title', content: 'How Xperigift works' },
      { property: 'og:description', content: 'Our four-step done-with-you process: audit, plan, launch, optimize. Strategy and execution handled, with full visibility for you.' },
    ],
  }),
  component: HowItWorksPage,
});

const steps = [
  {
    n: '01', icon: ClipboardList, title: 'Audit',
    summary: 'We start with a 30-minute working session to understand your business and surface revenue opportunities.',
    bullets: [
      'Review your current gift card setup, sales history, and customer flow',
      'Identify where revenue is leaking and what to fix first',
      'Walk away with two to three specific opportunities — yours to act on',
    ],
  },
  {
    n: '02', icon: FileText, title: 'Strategy',
    summary: 'A written 90-day plan with a campaign calendar, offers, and revenue targets you can hold us to.',
    bullets: [
      'Custom campaign calendar built around your business cycle',
      'Promotions, bundles, and reactivation offers designed for your verticals',
      'Clear targets — what we expect to generate and by when',
    ],
  },
  {
    n: '03', icon: Rocket, title: 'Execution',
    summary: 'We design, write, and ship the campaigns. You approve. We run them end-to-end so you stay focused on operations.',
    bullets: [
      'Email campaigns built and sent on your behalf',
      'On-site placements, in-store materials, and seasonal pushes',
      'Quick approval cycles — usually under 24 hours',
    ],
  },
  {
    n: '04', icon: BarChart3, title: 'Tracking & dashboard',
    summary: 'A simple dashboard gives you sales visibility, customer data, and optional control — without operational burden.',
    bullets: [
      'Revenue tracking and trend visibility, updated in real time',
      'Direct access to your customer base and purchase history',
      'Optional email composer for when you want to send something yourself',
    ],
  },
  {
    n: '05', icon: Server, title: 'Infrastructure handled',
    summary: 'The gift card platform itself — sales, fulfillment, transactions — is fully managed by TheGiftCardCafe.',
    bullets: [
      'Proven, reliable gift card sales infrastructure',
      'No new logins or systems for your staff to learn',
      'You own the customer relationship and the data',
    ],
  },
];

function HowItWorksPage() {
  return (
    <SiteShell>
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 pt-20 sm:pt-28 pb-16 sm:pb-20">
          <div className="max-w-[800px]">
            <Eyebrow>How it works</Eyebrow>
            <h1 className="mt-6 font-display text-[44px] sm:text-[60px] lg:text-[72px] leading-[1] text-ink">
              A clear path from program to <span className="italic text-emerald-deep">revenue</span>.
            </h1>
            <p className="mt-7 max-w-[640px] text-[17px] sm:text-[19px] text-ink-soft leading-relaxed">
              No long onboarding. No platform to learn. We diagnose, plan, and run a 90-day gift card revenue cycle alongside your team — then keep iterating.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-hairline">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8 py-20 sm:py-28">
          <ol className="space-y-px bg-hairline border border-hairline">
            {steps.map((s) => (
              <li key={s.n} className="bg-paper">
                <div className="grid gap-8 md:grid-cols-12 p-8 sm:p-12">
                  <div className="md:col-span-3">
                    <span className="font-display text-[60px] text-hairline-strong leading-none">{s.n}</span>
                    <div className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-sm bg-emerald-soft">
                      <s.icon className="h-5 w-5 text-emerald-deep" />
                    </div>
                  </div>
                  <div className="md:col-span-9">
                    <h2 className="font-display text-[28px] sm:text-[34px] text-ink leading-tight">{s.title}</h2>
                    <p className="mt-3 text-[16px] text-ink-soft leading-relaxed max-w-[640px]">{s.summary}</p>
                    <ul className="mt-6 space-y-3">
                      {s.bullets.map((b) => (
                        <li key={b} className="flex gap-3 text-[15px] text-ink-soft">
                          <span className="mt-2 h-1 w-1 rounded-full bg-emerald shrink-0" aria-hidden />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-14 flex items-center gap-3 text-[14px] text-ink-muted">
            <ShieldCheck className="h-4 w-4 text-emerald" />
            We work with a small number of clients at a time so every engagement gets full operator attention.
          </div>
        </div>
      </section>

      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8 py-20 sm:py-28 text-center">
          <h2 className="font-display text-[34px] sm:text-[48px] leading-[1.05] max-w-[760px] mx-auto">
            Ready to see what your program could do?
          </h2>
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
