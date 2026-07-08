/**
 * Communications registry — the canonical list of every automated communication
 * the platform can send, GLOBAL to all tenants (data differs per tenant, code
 * does not). This is the single source of truth the Communications settings tab
 * renders from and the gate helper (lib/comms-prefs.ts) reads.
 *
 * Adding a new automated comm = add an entry here + wire the send path to check
 * `isCommEnabled(tenantId, key, channel)`. Tenants cannot author net-new triggers
 * themselves (that needs code to fire the event) — they request one, we add it
 * here, and it appears in their tab.
 *
 * `locked: true` = transactional (verification codes, onboarding). Always on;
 * the UI shows it but doesn't let the tenant disable it.
 */

export type CommChannel = 'email' | 'sms' | 'in_app'
export type CommAudience = 'client' | 'team' | 'owner'

export type CommTimingKey =
  | 'reminder_days'
  | 'reminder_hours_before'
  | 'review_delay_hours'
  | 'daily_summary_hour'
  | 'payment_reminder_hours'

export interface CommTimingDef {
  key: CommTimingKey
  label: string
  desc: string
  /** 'list' = number[] (chips), 'number' = single number. */
  kind: 'list' | 'number'
  unit: 'days' | 'hours'
  default: number[] | number
}

export interface CommDef {
  key: string
  label: string
  desc: string
  audience: CommAudience
  /** Channels this comm can physically use. */
  channels: CommChannel[]
  /** Default on/off per channel when a tenant has no stored preference. */
  defaults: Partial<Record<CommChannel, boolean>>
  /** Timing knobs relevant to this comm (rendered inline). */
  timing?: CommTimingKey[]
  /** Whether the tenant may override subject/body copy. */
  editableCopy?: boolean
  /** Transactional — always sent, cannot be disabled. */
  locked?: boolean
  /** Human note: which cron/event fires it (documentation only). */
  firedBy: string
}

// ─── Timing definitions ───────────────────────────────────────────────────
export const COMM_TIMING: Record<CommTimingKey, CommTimingDef> = {
  reminder_days: {
    key: 'reminder_days',
    label: 'Reminder days before',
    desc: 'Send an appointment reminder this many days ahead (e.g. 3, 1).',
    kind: 'list',
    unit: 'days',
    default: [3, 1],
  },
  reminder_hours_before: {
    key: 'reminder_hours_before',
    label: 'Reminder hours before',
    desc: 'Send a same-day reminder this many hours ahead (e.g. 2).',
    kind: 'list',
    unit: 'hours',
    default: [2],
  },
  review_delay_hours: {
    key: 'review_delay_hours',
    label: 'Review request delay',
    desc: 'Hours after a completed job before asking for a review.',
    kind: 'number',
    unit: 'hours',
    default: 2,
  },
  daily_summary_hour: {
    key: 'daily_summary_hour',
    label: 'Daily summary hour',
    desc: 'Hour of day (0–23, ET) the daily summary is sent.',
    kind: 'number',
    unit: 'hours',
    default: 0,
  },
  payment_reminder_hours: {
    key: 'payment_reminder_hours',
    label: 'Payment reminder delay',
    desc: 'Hours after service before reminding an unpaid client.',
    kind: 'number',
    unit: 'hours',
    default: 24,
  },
}

// ─── The registry ─────────────────────────────────────────────────────────
export const COMMS: CommDef[] = [
  // ── Client-facing ──────────────────────────────────────────────────────
  {
    key: 'booking_received',
    label: 'Booking received',
    desc: 'Acknowledges a new booking request as soon as it comes in.',
    audience: 'client',
    channels: ['email', 'sms'],
    defaults: { email: true, sms: true },
    editableCopy: true,
    firedBy: 'event: /api/client/book',
  },
  {
    key: 'booking_confirmed',
    label: 'Booking confirmed',
    desc: 'Sent when the booking is confirmed and scheduled.',
    audience: 'client',
    channels: ['email', 'sms'],
    defaults: { email: true, sms: true },
    editableCopy: true,
    firedBy: 'event: booking status → confirmed',
  },
  {
    key: 'confirmation_reminder',
    label: 'Confirmation reminder',
    desc: 'Nudges the client to confirm an unconfirmed upcoming booking.',
    audience: 'client',
    channels: ['sms'],
    defaults: { sms: true },
    editableCopy: true,
    firedBy: 'cron: confirmation-reminder',
  },
  {
    key: 'booking_reminder',
    label: 'Appointment reminder',
    desc: 'Reminds the client ahead of their appointment.',
    audience: 'client',
    channels: ['email', 'sms'],
    defaults: { email: true, sms: true },
    timing: ['reminder_days', 'reminder_hours_before'],
    editableCopy: true,
    firedBy: 'cron: reminders',
  },
  {
    key: 'reschedule',
    label: 'Reschedule notice',
    desc: 'Tells the client their appointment moved.',
    audience: 'client',
    channels: ['email', 'sms'],
    defaults: { email: true, sms: true },
    editableCopy: true,
    firedBy: 'event: booking rescheduled',
  },
  {
    key: 'cancellation',
    label: 'Cancellation notice',
    desc: 'Confirms to the client that a booking was cancelled.',
    audience: 'client',
    channels: ['email', 'sms'],
    defaults: { email: true, sms: true },
    editableCopy: true,
    firedBy: 'event: booking cancelled',
  },
  {
    key: 'payment_receipt',
    label: 'Payment receipt',
    desc: 'Receipt sent once a payment is confirmed.',
    audience: 'client',
    channels: ['email', 'sms'],
    defaults: { email: true, sms: false },
    editableCopy: true,
    firedBy: 'event: Stripe webhook / mark paid',
  },
  {
    key: 'payment_reminder',
    label: 'Payment reminder',
    desc: 'Reminds a client with an outstanding balance.',
    audience: 'client',
    channels: ['email', 'sms'],
    defaults: { email: false, sms: true },
    timing: ['payment_reminder_hours'],
    editableCopy: true,
    firedBy: 'cron: payment-reminder / payment-followup-daily',
  },
  {
    key: 'rating_prompt',
    label: 'Rating prompt',
    desc: 'Post-service quick rating question flow.',
    audience: 'client',
    channels: ['sms'],
    defaults: { sms: true },
    editableCopy: true,
    firedBy: 'cron: rating-prompt',
  },
  {
    key: 'review_request',
    label: 'Review request',
    desc: 'Asks a happy client for a public review.',
    audience: 'client',
    channels: ['email', 'sms'],
    defaults: { email: true, sms: false },
    timing: ['review_delay_hours'],
    editableCopy: true,
    firedBy: 'cron: post-job-followup / rating-prompt',
  },
  {
    key: 'thank_you',
    label: 'Post-service thank you',
    desc: 'Thank-you message after a completed job.',
    audience: 'client',
    channels: ['email', 'sms'],
    defaults: { email: true, sms: false },
    editableCopy: true,
    firedBy: 'cron: post-job-followup',
  },
  {
    key: 'retention',
    label: 'Win-back / retention',
    desc: 'Re-engages clients who have not booked in a while.',
    audience: 'client',
    channels: ['sms', 'email'],
    defaults: { sms: false, email: false },
    editableCopy: true,
    firedBy: 'cron: retention / outreach',
  },
  {
    key: 'verification_code',
    label: 'Verification code',
    desc: 'One-time login / portal verification code.',
    audience: 'client',
    channels: ['email', 'sms'],
    defaults: { email: true, sms: true },
    locked: true,
    firedBy: 'event: portal auth',
  },

  // ── Team-facing ────────────────────────────────────────────────────────
  {
    key: 'team_assignment',
    label: 'Job assignment',
    desc: 'Notifies a team member of a new assigned job.',
    audience: 'team',
    channels: ['email', 'sms'],
    defaults: { email: true, sms: true },
    editableCopy: true,
    firedBy: 'event: booking assigned',
  },
  {
    key: 'team_daily_summary',
    label: 'Daily schedule',
    desc: "A team member's jobs for the day.",
    audience: 'team',
    channels: ['email', 'sms'],
    defaults: { email: true, sms: true },
    timing: ['daily_summary_hour'],
    editableCopy: true,
    firedBy: 'cron: daily-summary',
  },
  {
    key: 'team_schedule_change',
    label: 'Schedule change',
    desc: 'Tells a team member a job was moved or cancelled.',
    audience: 'team',
    channels: ['email', 'sms'],
    defaults: { email: true, sms: true },
    editableCopy: true,
    firedBy: 'event: booking rescheduled / cancelled',
  },
  {
    key: 'team_late_alert',
    label: 'Late check-in/out alert',
    desc: 'Alerts a team member they are late to check in or out.',
    audience: 'team',
    channels: ['sms'],
    defaults: { sms: true },
    editableCopy: true,
    firedBy: 'cron: late-check-in',
  },
  {
    key: 'team_welcome',
    label: 'Team welcome / PIN',
    desc: 'Onboarding message with portal PIN for a new hire.',
    audience: 'team',
    channels: ['email', 'sms'],
    defaults: { email: true, sms: true },
    locked: true,
    firedBy: 'event: team member provisioned',
  },

  // ── Owner / admin alerts ───────────────────────────────────────────────
  {
    key: 'owner_new_lead',
    label: 'New lead',
    desc: 'A new lead came in from a form or chat.',
    audience: 'owner',
    channels: ['email', 'sms', 'in_app'],
    defaults: { email: true, sms: false, in_app: true },
    firedBy: 'event: /api/lead, /api/contact',
  },
  {
    key: 'owner_new_booking',
    label: 'New booking',
    desc: 'A customer created a booking.',
    audience: 'owner',
    channels: ['email', 'sms', 'in_app'],
    defaults: { email: true, sms: false, in_app: true },
    firedBy: 'event: /api/client/book',
  },
  {
    key: 'owner_new_application',
    label: 'New team application',
    desc: 'Someone applied to join the team.',
    audience: 'owner',
    channels: ['email', 'sms', 'in_app'],
    defaults: { email: true, sms: false, in_app: true },
    firedBy: 'event: /api/contact (job-application)',
  },
  {
    key: 'owner_new_referrer',
    label: 'New referrer',
    desc: 'A new referral partner signed up.',
    audience: 'owner',
    channels: ['email', 'in_app'],
    defaults: { email: true, in_app: true },
    firedBy: 'event: referrer signup',
  },
  {
    key: 'owner_payment_received',
    label: 'Payment received',
    desc: 'A client payment cleared.',
    audience: 'owner',
    channels: ['email', 'in_app'],
    defaults: { email: false, in_app: true },
    firedBy: 'event: Stripe webhook',
  },
  {
    key: 'owner_low_rating',
    label: 'Low rating alert',
    desc: 'A client left a low rating that may need attention.',
    audience: 'owner',
    channels: ['sms', 'in_app'],
    defaults: { sms: true, in_app: true },
    firedBy: 'cron: rating-prompt',
  },
  {
    key: 'owner_late_alert',
    label: 'Late team alert',
    desc: 'A team member is late to a job.',
    audience: 'owner',
    channels: ['sms', 'in_app'],
    defaults: { sms: true, in_app: true },
    firedBy: 'cron: late-check-in',
  },
  {
    key: 'owner_schedule_gap',
    label: 'Schedule gap / coverage',
    desc: 'An upcoming job has no one assigned.',
    audience: 'owner',
    channels: ['in_app'],
    defaults: { in_app: true },
    firedBy: 'cron: schedule-monitor',
  },
  {
    key: 'owner_daily_summary',
    label: 'Owner daily summary',
    desc: "Morning recap of the day's schedule and revenue.",
    audience: 'owner',
    channels: ['email', 'in_app'],
    defaults: { email: true, in_app: false },
    timing: ['daily_summary_hour'],
    firedBy: 'cron: daily-summary',
  },
  {
    key: 'owner_backup',
    label: 'Data backup',
    desc: 'Daily backup snapshot email.',
    audience: 'owner',
    channels: ['email'],
    defaults: { email: true },
    firedBy: 'cron: backup',
  },
]

export const COMMS_BY_KEY: Record<string, CommDef> = Object.fromEntries(
  COMMS.map((c) => [c.key, c]),
)

export const AUDIENCE_LABEL: Record<CommAudience, string> = {
  client: 'Client communications',
  team: 'Team communications',
  owner: 'Owner alerts',
}

export const AUDIENCE_ORDER: CommAudience[] = ['client', 'team', 'owner']

/**
 * Maps notify() dispatches → registry keys so notify() can gate email/SMS on the
 * tenant's preferences. Keyed `"<type>:<recipientType>"` (falls back to `<type>`).
 *
 * SAFETY: only entries whose registry default is TRUE on the channel notify()
 * actually uses appear here — so gating is behavior-preserving (a comm that
 * sends today keeps sending until a tenant explicitly turns it off). Comms whose
 * default is OFF on a channel notify() currently sends unconditionally (e.g.
 * owner_payment_received email) are intentionally OMITTED = fail-open, so wiring
 * never silently disables a live message. Add them here only once their default
 * is confirmed to match current behavior.
 */
export const NOTIFY_COMM_MAP: Record<string, string> = {
  'booking_reminder:client': 'booking_reminder',
  'booking_confirmed:client': 'booking_confirmed',
  'booking_received:client': 'booking_received',
  'follow_up:client': 'thank_you',
  'review_request:client': 'review_request',
  'new_client:admin': 'owner_new_lead',
  'new_lead:admin': 'owner_new_lead',
  'new_booking:admin': 'owner_new_booking',
  'cleaner_application:admin': 'owner_new_application',
  'daily_ops_recap:admin': 'owner_daily_summary',
  'daily_summary:admin': 'owner_daily_summary',
}
