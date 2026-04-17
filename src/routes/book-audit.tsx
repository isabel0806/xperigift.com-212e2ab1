import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { ArrowRight, Calendar as CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SiteShell } from '@/components/site-shell';
import { Eyebrow } from '@/components/eyebrow';
import {
  bookingSchema,
  type BookingInput,
  INDUSTRIES,
  REVENUE_BANDS,
  GIFT_CARD_STATUSES,
} from '@/lib/booking-schema';
import {
  buildSlotsForDate,
  getDateRange,
  isDateBookable,
  formatSlotLong,
  DEFAULT_TZ,
  type AvailabilityWindow,
} from '@/lib/scheduling';

export const Route = createFileRoute('/book-audit')({
  head: () => ({
    meta: [
      { title: 'Book your free gift card revenue audit — Xperigift' },
      { name: 'description', content: 'Book a free 30-minute audit. We\'ll review your gift card program and walk away with two to three specific revenue opportunities.' },
      { property: 'og:title', content: 'Book your free Gift Card Revenue Audit — Xperigift' },
      { property: 'og:description', content: '30 minutes. No pitch. Walk away with 2–3 specific revenue opportunities.' },
    ],
  }),
  component: BookAuditPage,
});

const benefits = [
  'Diagnose where revenue is leaking in your current setup',
  'Identify 2–3 specific opportunities to act on right away',
  'Get a clear sense of what a 90-day plan would look like',
  'Walk away with insights — even if we never work together',
];

const qualifications = [
  'US-based small or medium business',
  'Roughly $150k – $2M in annual revenue',
  'Service-led or repeat-purchase model',
  'Already sell gift cards (or know you should)',
];

function BookAuditPage() {
  const [step, setStep] = useState<'pick' | 'form' | 'done'>('pick');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Load availability + blocked dates + booked slots
  useEffect(() => {
    (async () => {
      setLoadingSlots(true);
      const rangeStart = new Date().toISOString();
      const rangeEnd = addDays(new Date(), 30).toISOString();

      const [winRes, blkRes, bookedRes] = await Promise.all([
        supabase
          .from('availability_windows')
          .select('day_of_week,start_time,end_time,slot_duration_minutes,timezone')
          .eq('is_active', true),
        supabase.from('blocked_dates').select('blocked_date'),
        supabase.rpc('get_booked_slots', { range_start: rangeStart, range_end: rangeEnd }),
      ]);

      if (winRes.data) setWindows(winRes.data as AvailabilityWindow[]);
      if (blkRes.data) setBlockedDates(blkRes.data.map((b) => b.blocked_date));
      if (bookedRes.data) setBookedSlots(bookedRes.data.map((b: { scheduled_at: string }) => b.scheduled_at));
      setLoadingSlots(false);
    })();
  }, []);

  const dateRange = useMemo(() => getDateRange(14), []);
  const visibleDays = useMemo(
    () => dateRange.slice(weekOffset * 7, weekOffset * 7 + 7),
    [dateRange, weekOffset],
  );

  const slotsForSelected = useMemo(() => {
    if (!selectedDate || windows.length === 0) return [];
    return buildSlotsForDate({
      date: selectedDate,
      windows,
      bookedISO: bookedSlots,
      blockedDates,
    });
  }, [selectedDate, windows, bookedSlots, blockedDates]);

  // Auto-select first day with availability
  useEffect(() => {
    if (!selectedDate && windows.length > 0) {
      const first = dateRange.find((d) => isDateBookable({ date: d, windows, blockedDates }));
      if (first) setSelectedDate(first);
    }
  }, [windows, blockedDates, dateRange, selectedDate]);

  if (step === 'done' && submittedAt) {
    return (
      <SiteShell>
        <section className="border-b border-hairline">
          <div className="mx-auto max-w-[760px] px-5 sm:px-8 py-24 sm:py-32 text-center">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-soft">
              <CheckCircle2 className="h-7 w-7 text-emerald-deep" />
            </div>
            <h1 className="mt-8 font-display text-[40px] sm:text-[52px] leading-[1.05] text-ink">
              Your audit is booked.
            </h1>
            <p className="mt-5 text-[17px] text-ink-soft leading-relaxed">
              You'll receive a confirmation email shortly. We've blocked this time:
            </p>
            <p className="mt-3 font-display text-[22px] text-ink">
              {formatSlotLong(submittedAt)}
            </p>
            <p className="mt-8 text-[14px] text-ink-muted max-w-md mx-auto">
              Expect a calendar invite within one business day. If anything changes on your end, reply to that email and we'll reschedule.
            </p>
          </div>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 pt-20 sm:pt-28 pb-12">
          <div className="grid gap-10 md:grid-cols-12 items-end">
            <div className="md:col-span-7">
              <Eyebrow>Free 30-min audit</Eyebrow>
              <h1 className="mt-6 font-display text-[40px] sm:text-[56px] lg:text-[64px] leading-[1] text-ink">
                Book your gift card <span className="italic text-emerald-deep">revenue audit</span>.
              </h1>
              <p className="mt-7 max-w-[560px] text-[17px] text-ink-soft leading-relaxed">
                A working session — not a pitch. We'll review your business and leave you with two to three specific revenue opportunities.
              </p>
            </div>
            <div className="md:col-span-5">
              <ul className="space-y-3">
                {benefits.map((b) => (
                  <li key={b} className="flex gap-3 text-[14px] text-ink-soft">
                    <CheckCircle2 className="h-4 w-4 text-emerald shrink-0 mt-1" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-hairline">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-12">
            {/* Picker / form */}
            <div className="lg:col-span-8">
              <div className="border border-hairline bg-paper">
                {/* Stepper */}
                <div className="flex border-b border-hairline">
                  <StepBadge n={1} label="Pick a time" active={step === 'pick'} done={step !== 'pick'} />
                  <StepBadge n={2} label="Your details" active={step === 'form'} done={false} />
                </div>

                {step === 'pick' && (
                  <div className="p-6 sm:p-8">
                    {/* Week navigation */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 text-ink">
                        <CalendarIcon className="h-4 w-4 text-emerald" />
                        <p className="text-[14px] font-medium">Pick a date</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                          disabled={weekOffset === 0}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-sm border border-hairline text-ink disabled:opacity-30 hover:bg-paper-soft"
                          aria-label="Previous week"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setWeekOffset((w) => Math.min(1, w + 1))}
                          disabled={weekOffset === 1}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-sm border border-hairline text-ink disabled:opacity-30 hover:bg-paper-soft"
                          aria-label="Next week"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {visibleDays.map((d) => {
                        const bookable = isDateBookable({ date: d, windows, blockedDates });
                        const isSelected = selectedDate && isSameDay(d, selectedDate);
                        const isToday = isSameDay(d, startOfDay(new Date()));
                        return (
                          <button
                            key={d.toISOString()}
                            type="button"
                            disabled={!bookable}
                            onClick={() => {
                              setSelectedDate(d);
                              setSelectedSlot(null);
                            }}
                            className={`flex flex-col items-center justify-center rounded-sm border px-2 py-3 text-center transition-colors ${
                              isSelected
                                ? 'border-ink bg-ink text-paper'
                                : bookable
                                ? 'border-hairline bg-paper text-ink hover:border-ink'
                                : 'border-hairline bg-paper-soft text-ink-muted/50 cursor-not-allowed'
                            }`}
                          >
                            <span className="text-[10px] uppercase tracking-[0.12em] opacity-70">{format(d, 'EEE')}</span>
                            <span className="font-display text-[20px] mt-1 leading-none">{format(d, 'd')}</span>
                            {isToday && <span className="text-[9px] uppercase tracking-[0.1em] opacity-60 mt-1">Today</span>}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-8">
                      <div className="flex items-center gap-2 text-ink mb-4">
                        <Clock className="h-4 w-4 text-emerald" />
                        <p className="text-[14px] font-medium">
                          {selectedDate ? `Times for ${format(selectedDate, 'EEEE, MMM d')}` : 'Pick a date first'}
                        </p>
                      </div>

                      {loadingSlots ? (
                        <div className="flex items-center gap-2 text-[14px] text-ink-muted py-8">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading availability…
                        </div>
                      ) : slotsForSelected.length === 0 ? (
                        <p className="text-[14px] text-ink-muted py-8">
                          No times available on this date. Try another day.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {slotsForSelected.map((s) => (
                            <button
                              key={s.iso}
                              type="button"
                              onClick={() => setSelectedSlot(s.iso)}
                              className={`h-11 rounded-sm border text-[14px] font-medium transition-colors ${
                                selectedSlot === s.iso
                                  ? 'border-emerald bg-emerald text-paper'
                                  : 'border-hairline bg-paper text-ink hover:border-ink'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex items-center justify-between gap-4 border-t border-hairline pt-6">
                      <p className="text-[12px] text-ink-muted">
                        Times shown in Eastern Time ({DEFAULT_TZ}).
                      </p>
                      <button
                        type="button"
                        disabled={!selectedSlot}
                        onClick={() => setStep('form')}
                        className="inline-flex h-11 items-center gap-2 rounded-sm bg-ink px-5 text-[14px] font-medium text-paper hover:bg-ink-soft disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Continue <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 'form' && selectedSlot && (
                  <BookingForm
                    scheduledAt={selectedSlot}
                    onBack={() => setStep('pick')}
                    onSuccess={(iso) => {
                      setSubmittedAt(iso);
                      setStep('done');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                )}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4 space-y-5">
              <div className="border border-hairline bg-paper p-6">
                <div className="flex items-center gap-2 text-emerald-deep">
                  <ShieldCheck className="h-4 w-4" />
                  <p className="text-[12px] uppercase tracking-[0.16em] font-medium">No pitch promise</p>
                </div>
                <p className="mt-4 text-[15px] text-ink-soft leading-relaxed">
                  This is a working session. We're not running a sales pitch — if there's no fit, we'll tell you and you'll still leave with usable insights.
                </p>
              </div>

              <div className="border border-hairline bg-paper p-6">
                <p className="text-[12px] uppercase tracking-[0.16em] text-ink-muted">Best fit if you are</p>
                <ul className="mt-4 space-y-3">
                  {qualifications.map((q) => (
                    <li key={q} className="flex gap-3 text-[14px] text-ink-soft">
                      <CheckCircle2 className="h-4 w-4 text-emerald mt-0.5 shrink-0" />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedSlot && (
                <div className="border border-emerald bg-emerald-soft/40 p-6">
                  <p className="text-[12px] uppercase tracking-[0.16em] text-emerald-deep font-medium">Selected slot</p>
                  <p className="mt-3 font-display text-[18px] text-ink leading-snug">
                    {formatSlotLong(selectedSlot)}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function StepBadge({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex-1 px-6 py-4 flex items-center gap-3 ${active ? 'bg-paper' : 'bg-paper-soft'}`}>
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-medium ${
          active ? 'bg-ink text-paper' : done ? 'bg-emerald text-paper' : 'bg-hairline text-ink-muted'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <span className={`text-[13px] font-medium ${active ? 'text-ink' : 'text-ink-muted'}`}>{label}</span>
    </div>
  );
}

function BookingForm({
  scheduledAt,
  onBack,
  onSuccess,
}: {
  scheduledAt: string;
  onBack: () => void;
  onSuccess: (iso: string) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { scheduledAt },
    mode: 'onBlur',
  });

  const industry = watch('industry');

  const onSubmit = async (data: BookingInput) => {
    try {
      const { error } = await supabase.from('audit_bookings').insert({
        scheduled_at: data.scheduledAt,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone ?? null,
        business_name: data.businessName,
        website: data.website ?? null,
        industry: data.industry as never,
        industry_other: data.industryOther ?? null,
        revenue_band: data.revenueBand as never,
        gift_card_status: data.giftCardStatus as never,
        biggest_challenge: data.biggestChallenge,
        source: 'website',
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('That slot was just taken. Please pick another time.');
          onBack();
          return;
        }
        throw error;
      }

      toast.success('Audit booked.');
      onSuccess(data.scheduledAt);
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-6">
      <input type="hidden" {...register('scheduledAt')} />

      <div className="border border-hairline bg-paper-soft px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[12px] uppercase tracking-[0.14em] text-ink-muted">Your time</p>
          <p className="text-[14px] text-ink font-medium">{formatSlotLong(scheduledAt)}</p>
        </div>
        <button type="button" onClick={onBack} className="text-[13px] text-ink-soft underline underline-offset-4 hover:text-ink">
          Change
        </button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" error={errors.fullName?.message}>
          <input
            {...register('fullName')}
            placeholder="Jane Smith"
            className={inputCls}
            autoComplete="name"
          />
        </Field>
        <Field label="Work email" error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            placeholder="jane@yourbusiness.com"
            className={inputCls}
            autoComplete="email"
          />
        </Field>
        <Field label="Business name" error={errors.businessName?.message}>
          <input {...register('businessName')} placeholder="Bloom Day Spa" className={inputCls} />
        </Field>
        <Field label="Phone (optional)" error={errors.phone?.message}>
          <input {...register('phone')} type="tel" placeholder="(555) 123-4567" className={inputCls} autoComplete="tel" />
        </Field>
        <Field label="Website (optional)" error={errors.website?.message} className="sm:col-span-2">
          <input {...register('website')} placeholder="bloomspa.com" className={inputCls} autoComplete="url" />
        </Field>
      </div>

      <div className="border-t border-hairline pt-6">
        <p className="text-[12px] uppercase tracking-[0.14em] text-ink-muted mb-5">A bit about you</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Industry" error={errors.industry?.message}>
            <select {...register('industry')} className={inputCls} defaultValue="">
              <option value="" disabled>Select one…</option>
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Annual revenue" error={errors.revenueBand?.message}>
            <select {...register('revenueBand')} className={inputCls} defaultValue="">
              <option value="" disabled>Select one…</option>
              {REVENUE_BANDS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </Field>
          {industry === 'other' && (
            <Field label="Tell us your industry" error={errors.industryOther?.message} className="sm:col-span-2">
              <input {...register('industryOther')} placeholder="e.g. boutique gym" className={inputCls} />
            </Field>
          )}
          <Field label="Current gift card status" error={errors.giftCardStatus?.message} className="sm:col-span-2">
            <select {...register('giftCardStatus')} className={inputCls} defaultValue="">
              <option value="" disabled>Select one…</option>
              {GIFT_CARD_STATUSES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </Field>
          <Field
            label="What's your biggest gift card challenge right now?"
            error={errors.biggestChallenge?.message}
            className="sm:col-span-2"
          >
            <textarea
              {...register('biggestChallenge')}
              rows={4}
              placeholder="A few sentences is plenty. The more specific, the better the audit."
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-hairline pt-6">
        <p className="text-[12px] text-ink-muted">
          We use your details only to prepare for the audit. No marketing lists.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 items-center px-5 text-[14px] text-ink-soft hover:text-ink"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 items-center gap-2 rounded-sm bg-emerald px-6 text-[14px] font-medium text-paper hover:bg-emerald-deep disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Booking…
              </>
            ) : (
              <>
                Confirm audit <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

const inputCls =
  'h-11 w-full rounded-sm border border-hairline bg-paper px-3 text-[14px] text-ink placeholder:text-ink-muted/60 focus:border-ink focus:outline-none focus:ring-2 focus:ring-emerald/20';

function Field({
  label,
  error,
  children,
  className = '',
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[13px] font-medium text-ink mb-1.5">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[12px] text-destructive">{error}</span>}
    </label>
  );
}
