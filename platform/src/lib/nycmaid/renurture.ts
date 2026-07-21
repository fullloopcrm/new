// Renurture win-back automation — shared segment + copy definitions used by
// both the admin marketing preview and the autofire cron
// (src/app/api/cron/renurture/route.ts). Ported verbatim from nycmaid —
// pure logic, no DB/tenant dependency.
//
// Two segments, three escalating touches each. Offer ladder is fixed by
// Jeff: 10% -> 15% -> 20% off, conditioned on booking a recurring cleaning
// once every 30 days (monthly cadence). The discount itself isn't a
// self-serve promo code — admin/Yinez applies discount_type/discount_value
// on the recurring_schedules row when the client actually books, same as
// every other manual discount today.

export type RenurtureSegment = 'onetime' | 'lapsed'

export interface RenurtureTouch {
  key: string
  segment: RenurtureSegment
  touchNum: 0 | 1 | 2 | 3
  days: number
  discountPct: number
  label: string
}

// Event-triggered, not part of the weekly cron ladder — sent immediately
// when a recurring schedule is paused/cancelled, separate from
// RENURTURE_TOUCHES on purpose so it can never be picked up by
// pickNextTouch() and double up with the day-14 touch.
export const IMMEDIATE_SAVE_TOUCH: RenurtureTouch = {
  key: 'renurture_lapsed_t0',
  segment: 'lapsed',
  touchNum: 0,
  days: 0,
  discountPct: 10,
  label: 'Lapsed · Immediate (cancellation, 10% off)',
}

export const RENURTURE_TOUCHES: RenurtureTouch[] = [
  { key: 'renurture_onetime_t1', segment: 'onetime', touchNum: 1, days: 21, discountPct: 10, label: 'One-Time · 21d+ (10% off)' },
  { key: 'renurture_onetime_t2', segment: 'onetime', touchNum: 2, days: 45, discountPct: 15, label: 'One-Time · 45d+ (15% off)' },
  { key: 'renurture_onetime_t3', segment: 'onetime', touchNum: 3, days: 75, discountPct: 20, label: 'One-Time · 75d+ (20% off)' },
  { key: 'renurture_lapsed_t1', segment: 'lapsed', touchNum: 1, days: 14, discountPct: 10, label: 'Lapsed Recurring · 14d+ (10% off)' },
  { key: 'renurture_lapsed_t2', segment: 'lapsed', touchNum: 2, days: 35, discountPct: 15, label: 'Lapsed Recurring · 35d+ (15% off)' },
  { key: 'renurture_lapsed_t3', segment: 'lapsed', touchNum: 3, days: 60, discountPct: 20, label: 'Lapsed Recurring · 60d+ (20% off)' },
]

export const RENURTURE_FILTERS = new Set(RENURTURE_TOUCHES.map(t => t.key))

export function touchesForSegment(segment: RenurtureSegment): RenurtureTouch[] {
  return RENURTURE_TOUCHES.filter(t => t.segment === segment).sort((a, b) => a.touchNum - b.touchNum)
}

interface ClientBookingFacts {
  completedCount: number
  lastServiceDate: number | null // epoch ms
  hasUpcoming: boolean
  scheduleCount: number
  hasActiveSchedule: boolean
}

// Base eligibility for a segment, ignoring day threshold — shared by the
// preview route (day-threshold snapshot) and the cron (sequential picker).
export function matchesSegmentBase(segment: RenurtureSegment, facts: ClientBookingFacts): boolean {
  if (facts.hasUpcoming) return false
  if (facts.lastServiceDate === null) return false
  if (segment === 'onetime') return facts.completedCount === 1 && facts.scheduleCount === 0
  return facts.scheduleCount > 0 && !facts.hasActiveSchedule
}

const DAY_MS = 1000 * 60 * 60 * 24

// Used by the cron: given a client's facts + which touch keys they've
// already been sent (from renurture_log), return the single next touch to
// send, or null if none is due yet / they've exhausted the ladder / they no
// longer qualify (e.g. they rebooked). Never returns a touch out of order
// and never returns one already logged — that's the whole dedup story.
export function pickNextTouch(facts: ClientBookingFacts, alreadySentKeys: Set<string>): RenurtureTouch | null {
  const now = Date.now()
  for (const segment of ['onetime', 'lapsed'] as RenurtureSegment[]) {
    if (!matchesSegmentBase(segment, facts)) continue
    const daysSince = (now - (facts.lastServiceDate as number)) / DAY_MS
    for (const touch of touchesForSegment(segment)) {
      if (alreadySentKeys.has(touch.key)) continue
      if (daysSince >= touch.days) return touch
      break // touches are ordered — don't skip ahead to a later one
    }
  }
  return null
}

export interface RenurtureCopy {
  subject: string
  smsBody: string
  emailBody: string
}

const CTA_BUTTON = (label: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;"><tr><td align="center"><a href="https://www.thenycmaid.com/book" style="display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">${label}</a></td></tr></table>`

const FEEDBACK_SMS = '\n\nFeedback | Suggestions? Save $10 next service  https://www.thenycmaid.com/feedback'
const FEEDBACK_EMAIL = '<p style="color: #333; font-size: 13px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;"><a href="https://www.thenycmaid.com/feedback" style="color: #2563eb; text-decoration: underline;">Feedback | Suggestions? Save $10 next service</a></p>'

const REFERRAL_SMS = '\n\nKnow someone who needs a cleaner? Refer them at thenycmaid.com/referral and earn 10% on every booking they make.'
const REFERRAL_EMAIL = '<p style="color: #333; font-size: 13px; line-height: 1.6; margin: 8px 0 0 0; text-align: center;"><a href="https://www.thenycmaid.com/referral" style="color: #2563eb; text-decoration: underline;">Know someone who needs a cleaner? Refer them and earn 10% on every booking they make</a></p>'

// Short, human-typeable redemption code — not cryptographically sensitive
// (worst case someone guesses another client's win-back code and gets a
// discount meant for someone else, low stakes), so a 6-char random suffix
// is plenty. Uniqueness enforced by the DB unique constraint on renurture_log.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no O/0/I/1 — avoids misreads
export function generateRenurtureCode(touch: RenurtureTouch): string {
  let suffix = ''
  for (let i = 0; i < 6; i++) suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return `SAVE${touch.discountPct}-${suffix}`
}

function codeBlock(code: string): { sms: string; email: string } {
  return {
    sms: `\n\nYour code: ${code} (mention it when you book, or enter it in your dashboard)`,
    email: `<div style="background: #eff6ff; border: 1px dashed #2563eb; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;"><p style="color: #666; font-size: 12px; margin: 0 0 4px 0;">Your code</p><p style="color: #1E2A4A; font-size: 20px; font-weight: 700; letter-spacing: 1px; margin: 0; font-family: monospace;">${code}</p></div>`,
  }
}

export function getRenurtureCopy(touch: RenurtureTouch, clientName: string, code: string): RenurtureCopy {
  const firstName = clientName?.split(' ')[0] || 'there'
  const isOnetime = touch.segment === 'onetime'
  const isLastTouch = touch.touchNum === 3
  const codeText = codeBlock(code)

  if (touch.touchNum === 0) {
    const subject = 'Sorry to see you pause — here\'s 10% to come back'
    const smsBody = `Hi ${firstName}, sorry to see your cleanings paused. If you come back on a monthly schedule, we'll give you 10% off every visit. thenycmaid.com/book${codeText.sms}${REFERRAL_SMS}${FEEDBACK_SMS}`
    const emailBody = `<h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Sorry to see you pause</h1><p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">We hope everything's okay. If and when you're ready to come back, resume on a monthly schedule (once every 30 days) and we'll give you <strong>10% off</strong> every visit.</p>${codeText.email}${CTA_BUTTON('Book Now')}<p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">Or just text us back at (212) 202-8400.</p>${REFERRAL_EMAIL}${FEEDBACK_EMAIL}`
    return { subject, smsBody, emailBody }
  }

  if (touch.touchNum === 1) {
    const subject = isOnetime ? 'Ready for round two?' : 'We miss having you on the schedule'
    const smsBody = isOnetime
      ? `Hi ${firstName}, it's The NYC Maid 😊 Hope your place is still sparkling! Set up a cleaning once a month and save ${touch.discountPct}% every visit. Book: thenycmaid.com/book or text us back.`
      : `Hi ${firstName}, we noticed your cleanings paused. Come back on a monthly schedule (once every 30 days) and save ${touch.discountPct}% every visit. thenycmaid.com/book`
    const intro = isOnetime
      ? `<p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hope your place is still as spotless as we left it. When you're ready for another visit, know that a lot of our clients set up a monthly cleaning so they never have to think about it again — and it comes with a standing discount.</p>`
      : `<p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">We noticed your recurring cleanings paused, and we wanted to check in. Your spot on the schedule is easy to pick back up whenever you're ready.</p>`
    const emailBody = `<h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">${isOnetime ? 'Ready for round two?' : 'We miss having you on the schedule'}</h1>${intro}<div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0;"><p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">Book a cleaning once every 30 days and save <strong>${touch.discountPct}%</strong> on every visit.</p></div>${CTA_BUTTON('Book Now')}<p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">Or just text us back at (212) 202-8400 and we'll get you set up.</p>`
    return { subject, smsBody: smsBody + codeText.sms + REFERRAL_SMS + FEEDBACK_SMS, emailBody: emailBody + codeText.email + REFERRAL_EMAIL + FEEDBACK_EMAIL }
  }

  if (!isLastTouch) {
    const subject = `${touch.discountPct}% off — still time to grab this`
    const smsBody = `Hi ${firstName}, The NYC Maid here. Still thinking about it? Book a cleaning once every 30 days and lock in ${touch.discountPct}% off every visit. thenycmaid.com/book`
    const emailBody = `<h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">${touch.discountPct}% off, just for you</h1><p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">${isOnetime ? "Still thinking about your next cleaning?" : "Your spot is still open."} Set up a monthly cleaning (once every 30 days) and we'll lock in <strong>${touch.discountPct}% off</strong> every visit.</p>${CTA_BUTTON('Book Now & Save')}<p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">Questions? Text us at (212) 202-8400.</p>`
    return { subject, smsBody: smsBody + codeText.sms + REFERRAL_SMS + FEEDBACK_SMS, emailBody: emailBody + codeText.email + REFERRAL_EMAIL + FEEDBACK_EMAIL }
  }

  const subject = `Last call: ${touch.discountPct}% off, just for you`
  const smsBody = `Hi ${firstName}, last call from The NYC Maid — set up a cleaning once every 30 days and save ${touch.discountPct}% every visit, guaranteed. Book: thenycmaid.com/book`
  const emailBody = `<h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Last call — ${touch.discountPct}% off</h1><p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">We haven't heard back, so this is our last check-in. Set up a monthly cleaning (once every 30 days) and we'll guarantee <strong>${touch.discountPct}% off</strong> every visit going forward.</p>${CTA_BUTTON('Book Now & Save')}<p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">No hard feelings if now's not the time — text STOP anytime to stop hearing from us.</p>`
  return { subject, smsBody: smsBody + FEEDBACK_SMS, emailBody: emailBody + FEEDBACK_EMAIL }
}
