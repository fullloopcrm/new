/**
 * Stale sales-lead follow-up — pure threshold logic for the
 * cron/lead-followup-nudge route. Kept separate from I/O so the "which
 * leads are newly due, and which notified_*_at fields to stamp" logic is
 * unit-testable without a DB.
 */

export const FOLLOWUP_THRESHOLDS = [
  { days: 7, field: 'notified_7d_at' },
  { days: 14, field: 'notified_14d_at' },
  { days: 30, field: 'notified_30d_at' },
] as const

export type FollowupField = (typeof FOLLOWUP_THRESHOLDS)[number]['field']

export interface StaleLeadInput {
  id: string
  business_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  last_contacted_at: string
  notified_7d_at: string | null
  notified_14d_at: string | null
  notified_30d_at: string | null
}

export interface DueLead {
  lead: StaleLeadInput
  daysSince: number
  thresholdDays: number
  fieldsToStamp: FollowupField[]
}

/**
 * For each lead, find every threshold whose day-count has been crossed but
 * hasn't been notified yet. If more than one threshold is newly crossed in
 * the same run (e.g. cron was down and a lead is now 40 days stale), the
 * lead is only ever reported ONCE — at the highest crossed threshold — but
 * every crossed threshold's field is stamped so a later run doesn't re-fire
 * the lower ones. This is a single-digest-per-run design (never one
 * notification per lead) per the 2026-08-14 dedupe-guardrails incident.
 */
export function computeDueFollowups(leads: StaleLeadInput[], now: number): DueLead[] {
  const due: DueLead[] = []
  for (const lead of leads) {
    const lastContacted = new Date(lead.last_contacted_at).getTime()
    if (Number.isNaN(lastContacted)) continue
    const daysSince = Math.floor((now - lastContacted) / 86_400_000)

    const crossed = FOLLOWUP_THRESHOLDS.filter(
      (t) => daysSince >= t.days && !lead[t.field as keyof StaleLeadInput],
    )
    if (crossed.length === 0) continue

    const highest = crossed[crossed.length - 1]
    due.push({
      lead,
      daysSince,
      thresholdDays: highest.days,
      fieldsToStamp: crossed.map((t) => t.field),
    })
  }
  return due
}
