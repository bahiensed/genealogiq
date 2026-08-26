import { z } from 'zod'
import type { Translator } from './i18n'

/**
 * A partner plan and its price book, edited together.
 *
 * The commercial knobs are all here rather than in code, which is the founder's
 * one non-negotiable about this model: percentages, deadlines, allowances and
 * trial length must change without a deploy.
 *
 * Prices are per currency, and every currency is optional — a plan is sellable
 * where it is priced and invisible everywhere else. Zero means "not priced",
 * the same convention the old Package form used, because a currency input
 * cannot hold null.
 *
 * The instalment amount is deliberately NOT derived from the cash amount. The
 * spec puts a 20% surcharge on paying in twelve, so deriving it would erase a
 * commercial decision. It IS refused when the currency has no cash price,
 * because an instalment plan for a price that does not exist is not a product.
 */
export function getPartnerPlanSchema(t: Translator) {
  const money = z.number().min(0, t('mustBeZeroOrGreater'))

  return z.object({
    name: z.string().min(3, t('minChars', { count: 3 })).max(32, t('maxChars', { count: 32 })),
    code: z.string()
      .min(3, t('minChars', { count: 3 }))
      .max(24, t('maxChars', { count: 24 }))
      .regex(/^[A-Z0-9_]+$/, t('upperSnakeOnly')),
    description: z.string().max(256, t('maxChars', { count: 256 })),

    annualAllowance: z.number().int(t('wholeNumber')).positive(t('greaterThanZero')),

    // 0..1, stored as a Decimal(4,3). Expressed as a fraction rather than a
    // percentage so nothing has to remember to divide by a hundred.
    rolloverRate:               z.number().min(0, t('mustBeZeroOrGreater')).max(1, t('atMostOne')),
    rolloverValidityMonths:     z.number().int(t('wholeNumber')).min(0, t('mustBeZeroOrGreater')),
    graceDays:                  z.number().int(t('wholeNumber')).min(0, t('mustBeZeroOrGreater')),
    committedReservationMonths: z.number().int(t('wholeNumber')).min(0, t('mustBeZeroOrGreater')),
    activationTrialMonths:      z.number().int(t('wholeNumber')).min(0, t('mustBeZeroOrGreater')),
    activationTrialPlanCode:    z.string().max(24, t('maxChars', { count: 24 })),

    cashUsd: money, installmentUsd: money, unitRefUsd: money,
    cashBrl: money, installmentBrl: money, unitRefBrl: money,
    cashMxn: money, installmentMxn: money, unitRefMxn: money,
    installmentCount: z.number().int(t('wholeNumber')).min(0, t('mustBeZeroOrGreater')),

    isActive: z.boolean(),
  }).superRefine((v, ctx) => {
    if (v.cashUsd <= 0 && v.cashBrl <= 0 && v.cashMxn <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cashBrl'], message: t('atLeastOnePrice') })
    }
    for (const [cash, instalment, path] of [
      [v.cashUsd, v.installmentUsd, 'installmentUsd'],
      [v.cashBrl, v.installmentBrl, 'installmentBrl'],
      [v.cashMxn, v.installmentMxn, 'installmentMxn'],
    ] as const) {
      if (instalment > 0 && cash <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: t('monthlyNeedsAnnual') })
      }
    }
    // A trial length with no plan to grant is a setting that silently does
    // nothing — the kind of half-configuration that looks live and is not.
    if (v.activationTrialMonths > 0 && !v.activationTrialPlanCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['activationTrialPlanCode'],
        message: t('trialNeedsPlanCode'),
      })
    }
  })
}

export type PartnerPlanFormValues = z.infer<ReturnType<typeof getPartnerPlanSchema>>

export const partnerPlanDefaultValues: PartnerPlanFormValues = {
  name: '', code: '', description: '',
  annualAllowance: 100,
  rolloverRate: 0.3,
  rolloverValidityMonths: 6,
  graceDays: 30,
  committedReservationMonths: 12,
  activationTrialMonths: 12,
  activationTrialPlanCode: 'PREMIUM',
  cashUsd: 0, installmentUsd: 0, unitRefUsd: 0,
  cashBrl: 0, installmentBrl: 0, unitRefBrl: 0,
  cashMxn: 0, installmentMxn: 0, unitRefMxn: 0,
  installmentCount: 12,
  isActive: true,
}
