/**
 * Sales portal knowledge base — pricing, services, scheduling policy, and
 * payout info a Commission Sales Partner needs while pitching.
 *
 * nycmaid (804e7d04) hand-wrote this content once for one tenant's live
 * site copy. This codebase is multi-tenant with ONE shared portal (see
 * platform/CLAUDE.md's GLOBAL RULE) — content here is built from each
 * tenant's own `TenantSettings` row instead, so every tenant gets accurate,
 * live-synced answers with zero per-tenant forking.
 */
import type { TenantSettings } from './settings'
import type { TierProgressInfo } from './sales-partner-tier'

export interface KBEntry {
  q: string
  a: string
}

export interface KBCategory {
  category: string
  entries: KBEntry[]
}

function formatHour(h: number | undefined | null): string {
  if (h == null) return 'business hours'
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}${period}`
}

export function buildSalesKnowledgeBase(
  settings: TenantSettings,
  tierProgress: TierProgressInfo,
): KBCategory[] {
  const currency = settings.currency_symbol || '$'
  const businessName = settings.business_name || 'the business'
  const activeServices = (settings.service_types || []).filter((s) => s.active !== false)

  const pricingEntries: KBEntry[] = [
    {
      q: 'What does a standard job cost?',
      a: settings.standard_rate
        ? `The standard rate is ${currency}${settings.standard_rate}/hr. Exact pricing depends on which service is booked — see Services below for what each one typically includes.`
        : 'Standard rate is not set yet in Business Settings — check with your admin before quoting.',
    },
    {
      q: 'How can clients pay?',
      a: settings.payment_methods && settings.payment_methods.length > 0
        ? `Accepted payment methods: ${settings.payment_methods.join(', ')}.`
        : 'Payment method options are not configured yet — check with your admin.',
    },
    {
      q: 'Is there a deposit required?',
      a: settings.proposal_deposit_type && settings.proposal_deposit_type !== 'none'
        ? `Yes — a ${settings.proposal_deposit_type === 'percent' ? `${settings.proposal_deposit_value}%` : `${currency}${settings.proposal_deposit_value}`} deposit is collected up front.`
        : 'No deposit is required by default.',
    },
  ]

  const serviceEntries: KBEntry[] = activeServices.length > 0
    ? activeServices.map((s) => ({
        q: s.name,
        a: `Typically runs about ${s.default_hours} hour${s.default_hours === 1 ? '' : 's'} at the standard rate.`,
      }))
    : [{ q: 'Services offered', a: 'No service types are configured yet — check with your admin.' }]

  const policyEntries: KBEntry[] = [
    {
      q: 'What are the booking hours?',
      a: `Bookings run ${formatHour(settings.business_hours_start)}–${formatHour(settings.business_hours_end)}${
        settings.allow_same_day
          ? ', including same-day when a slot is available'
          : settings.min_days_ahead
            ? `, booked at least ${settings.min_days_ahead} day${settings.min_days_ahead === 1 ? '' : 's'} out`
            : ''
      }.`,
    },
    {
      q: 'What is the cancellation / reschedule policy?',
      a: settings.reschedule_notice_hours
        ? `Clients need to give at least ${settings.reschedule_notice_hours} hours' notice to reschedule or cancel without a fee.`
        : 'Ask your admin for the current cancellation policy.',
    },
  ]

  const payoutEntries: KBEntry[] = [
    {
      q: 'How much commission do I earn?',
      a: `You're currently at ${tierProgress.current.label} (${Math.round(tierProgress.current.rate * 100)}%) on every direct client, stacked with an override on any referrer you recruit.` +
        (tierProgress.next
          ? ` ${tierProgress.remainingToNext} more direct client${tierProgress.remainingToNext === 1 ? '' : 's'} unlocks ${tierProgress.next.label} (${Math.round(tierProgress.next.rate * 100)}%).`
          : " You're at the top tier."),
    },
    {
      q: 'When and how do I get paid?',
      a: 'Payouts go out manually via your preferred method (Zelle or Apple Cash) — set your payout info from your profile.',
    },
  ]

  const pitchEntries: KBEntry[] = [
    {
      q: `Why ${businessName}?`,
      a: 'Lead with reliability and accountability: background-checked, vetted professionals and consistent quality on every job.',
    },
    {
      q: 'What if a client asks about insurance or guarantees?',
      a: `${businessName} stands behind its work — confirm current insurance coverage and any satisfaction-guarantee terms with your admin before quoting specifics to a client.`,
    },
  ]

  return [
    { category: 'Pricing & Payment', entries: pricingEntries },
    { category: 'Services', entries: serviceEntries },
    { category: 'Scheduling & Policy', entries: policyEntries },
    { category: 'Your Payout', entries: payoutEntries },
    { category: 'Pitching', entries: pitchEntries },
  ]
}
