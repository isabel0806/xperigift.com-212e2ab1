import { z } from 'zod';

export const INDUSTRIES = [
  { value: 'spa', label: 'Spa' },
  { value: 'salon', label: 'Salon' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'golf_club', label: 'Golf club' },
  { value: 'specialty_retail', label: 'Specialty retail' },
  { value: 'gun_shop', label: 'Gun shop' },
  { value: 'other', label: 'Other' },
] as const;

export const REVENUE_BANDS = [
  { value: 'under_150k', label: 'Under $150k' },
  { value: '150k_500k', label: '$150k – $500k' },
  { value: '500k_1m', label: '$500k – $1M' },
  { value: '1m_2m', label: '$1M – $2M' },
  { value: 'over_2m', label: 'Over $2M' },
] as const;

export const GIFT_CARD_STATUSES = [
  { value: 'have_program', label: 'We have a gift card program' },
  { value: 'considering', label: 'We\'re considering one' },
  { value: 'none', label: 'We don\'t have one yet' },
] as const;

const industryValues = INDUSTRIES.map((i) => i.value) as [string, ...string[]];
const revenueValues = REVENUE_BANDS.map((r) => r.value) as [string, ...string[]];
const giftCardValues = GIFT_CARD_STATUSES.map((g) => g.value) as [string, ...string[]];

/** Validation rules:
 *  - String trims + length-bounded to prevent DoS / abuse.
 *  - Optional fields normalized to undefined when blank.
 *  - Email regex via zod's built-in (RFC-aligned).
 *  - Website kept lenient (some clients enter "mybiz.com" without scheme); cap length.
 */
export const bookingSchema = z.object({
  scheduledAt: z
    .string()
    .min(1, 'Please pick a time slot')
    .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date'),
  fullName: z.string().trim().min(1, 'Required').max(120, 'Too long'),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  businessName: z.string().trim().min(1, 'Required').max(200, 'Too long'),
  website: z
    .string()
    .trim()
    .max(300)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  industry: z.enum(industryValues),
  industryOther: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  revenueBand: z.enum(revenueValues),
  giftCardStatus: z.enum(giftCardValues),
  biggestChallenge: z.string().trim().min(10, 'A few sentences, please').max(2000, 'Too long'),
});

export type BookingInput = z.infer<typeof bookingSchema>;
