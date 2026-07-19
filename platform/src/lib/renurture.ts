// Renurture win-back automation — shared segment + copy definitions used by
// the autofire cron (src/app/api/cron/renurture/route.ts) and the redemption
// path (src/app/api/client/recurring/route.ts).
//
// Tenant-aware port of nycmaid's src/lib/renurture.ts (commits a089465e +
// 9f55c77e). Two segments, three escalating touches each (10% -> 15% -> 20%
// off), conditioned on booking a recurring service once every 30 days
// (fullloopcrm's 'monthly' recurring frequency). The discount is redeemed
// via a self-serve code (generateRenurtureCode() below) applied at
// /api/client/recurring booking time, not a standing promo code.
//
// Callers own all date-math: bookings.start_time/end_time are naive-ET
// TIMESTAMP columns (see toNaiveET() usages elsewhere), so "now" and
// "lastServiceDate" must both be computed the same naive-ET way before being
// passed in here as epoch ms. This module stays date-library-agnostic.

import { escapeHtml } from './escape-html'

export type RenurtureSegment = 'onetime' | 'lapsed'

export interface RenurtureTouch {
  key: string
  segment: RenurtureSegment
  touchNum: 0 | 1 | 2 | 3 // 0 = immediate pause/cancel save trigger
  days: number
  discountPct: number
  label: string
}

export const RENURTURE_TOUCHES: RenurtureTouch[] = [
  { key: 'renurture_onetime_t1', segment: 'onetime', touchNum: 1, days: 21, discountPct: 10, label: 'One-Time · 21d+ (10% off)' },
  { key: 'renurture_onetime_t2', segment: 'onetime', touchNum: 2, days: 45, discountPct: 15, label: 'One-Time · 45d+ (15% off)' },
  { key: 'renurture_onetime_t3', segment: 'onetime', touchNum: 3, days: 75, discountPct: 20, label: 'One-Time · 75d+ (20% off)' },
  { key: 'renurture_lapsed_t1', segment: 'lapsed', touchNum: 1, days: 14, discountPct: 10, label: 'Lapsed Recurring · 14d+ (10% off)' },
  { key: 'renurture_lapsed_t2', segment: 'lapsed', touchNum: 2, days: 35, discountPct: 15, label: 'Lapsed Recurring · 35d+ (15% off)' },
  { key: 'renurture_lapsed_t3', segment: 'lapsed', touchNum: 3, days: 60, discountPct: 20, label: 'Lapsed Recurring · 60d+ (20% off)' },
]

// Fired once, immediately, when an admin pauses/cancels a client's last
// active schedule — see the immediate-save-trigger caveat in the cron route
// header before wiring this into an admin-facing action.
export const RENURTURE_IMMEDIATE_TOUCH: RenurtureTouch = {
  key: 'renurture_lapsed_t0', segment: 'lapsed', touchNum: 0, days: 0, discountPct: 10, label: 'Lapsed Recurring · immediate save (10% off)',
}

export const RENURTURE_FILTERS = new Set(RENURTURE_TOUCHES.map(t => t.key))

export function touchesForSegment(segment: RenurtureSegment): RenurtureTouch[] {
  return RENURTURE_TOUCHES.filter(t => t.segment === segment).sort((a, b) => a.touchNum - b.touchNum)
}

export interface ClientBookingFacts {
  completedCount: number
  lastServiceDateMs: number | null
  hasUpcoming: boolean
  scheduleCount: number
  hasActiveSchedule: boolean
}

// Base eligibility for a segment, ignoring day threshold — shared by preview
// segmentation and the cron's sequential picker.
export function matchesSegmentBase(segment: RenurtureSegment, facts: ClientBookingFacts): boolean {
  if (facts.hasUpcoming) return false
  if (facts.lastServiceDateMs === null) return false
  if (segment === 'onetime') return facts.completedCount === 1 && facts.scheduleCount === 0
  return facts.scheduleCount > 0 && !facts.hasActiveSchedule
}

const DAY_MS = 1000 * 60 * 60 * 24

// Given a client's facts + which touch keys they've already been sent (from
// renurture_log) and the current time (caller-supplied, naive-ET-consistent
// with lastServiceDateMs), return the single next touch to send, or null if
// none is due / the ladder is exhausted / they no longer qualify (rebooked).
// Never returns a touch out of order and never returns one already logged.
export function pickNextTouch(facts: ClientBookingFacts, alreadySentKeys: Set<string>, nowMs: number): RenurtureTouch | null {
  for (const segment of ['onetime', 'lapsed'] as RenurtureSegment[]) {
    if (!matchesSegmentBase(segment, facts)) continue
    const daysSince = (nowMs - (facts.lastServiceDateMs as number)) / DAY_MS
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

const ctaButton = (label: string, url: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;"><tr><td align="center"><a href="${url}" style="display: inline-block; background-color: #1C1C1C; color: #ffffff !important; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">${label}</a></td></tr></table>`

interface RenurtureCopyContext {
  clientName: string
  businessName: string
  bookingUrl: string
  code: string | null
  referralUrl: string | null
}

function referralLine(ctx: RenurtureCopyContext, forSms: boolean): string {
  if (!ctx.referralUrl) return ''
  return forSms
    ? `\n\nKnow someone who'd love ${ctx.businessName}? Refer them: ${ctx.referralUrl}`
    : `<p style="color: #333; font-size: 13px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;"><a href="${escapeHtml(ctx.referralUrl)}" style="color: #2563eb; text-decoration: underline;">Know someone who'd love ${escapeHtml(ctx.businessName)}? Refer them</a></p>`
}

function codeLine(ctx: RenurtureCopyContext, forSms: boolean): string {
  if (!ctx.code) return ''
  return forSms
    ? ` Code: ${ctx.code}.`
    : `<p style="color: #333; font-size: 13px; margin: 8px 0 0 0;">Code: <strong>${ctx.code}</strong></p>`
}

export function getRenurtureCopy(touch: RenurtureTouch, ctx: RenurtureCopyContext): RenurtureCopy {
  const firstName = ctx.clientName?.split(' ')[0] || 'there'
  const isOnetime = touch.segment === 'onetime'
  const isLastTouch = touch.touchNum === 3
  const biz = ctx.businessName

  if (touch.touchNum === 0) {
    const subject = 'A little something to come back to'
    const smsBody = `Hi ${firstName}, it's ${biz}. Sorry to see your recurring service go — if you set it back up once every 30 days, we'll take ${touch.discountPct}% off every visit.${codeLine(ctx, true)} ${ctx.bookingUrl}`
    const emailBody = `<h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">A little something to come back to</h1><p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Sorry to see your recurring service go. Whenever you're ready, set it back up once every 30 days and we'll take <strong>${touch.discountPct}% off</strong> every visit.</p>${codeLine(ctx, false)}${ctaButton('Book Now', ctx.bookingUrl)}`
    return { subject, smsBody, emailBody: emailBody + referralLine(ctx, false) }
  }

  if (touch.touchNum === 1) {
    const subject = isOnetime ? 'Ready for round two?' : `We miss having you on the schedule`
    const smsBody = isOnetime
      ? `Hi ${firstName}, it's ${biz}. Set up a recurring visit once a month and save ${touch.discountPct}% every time.${codeLine(ctx, true)} ${ctx.bookingUrl}`
      : `Hi ${firstName}, we noticed your recurring visits paused. Come back on a monthly cadence and save ${touch.discountPct}% every visit.${codeLine(ctx, true)} ${ctx.bookingUrl}`
    const intro = isOnetime
      ? `<p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hope everything's still holding up. A lot of our clients set up a recurring visit so they never have to think about it again — and it comes with a standing discount.</p>`
      : `<p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">We noticed your recurring visits paused, and we wanted to check in. Your spot is easy to pick back up whenever you're ready.</p>`
    const emailBody = `<h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">${isOnetime ? 'Ready for round two?' : 'We miss having you on the schedule'}</h1>${intro}<div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0;"><p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">Book a recurring visit once every 30 days and save <strong>${touch.discountPct}%</strong> on every visit.</p>${codeLine(ctx, false)}</div>${ctaButton('Book Now', ctx.bookingUrl)}`
    return { subject, smsBody, emailBody: emailBody + referralLine(ctx, false) }
  }

  if (!isLastTouch) {
    const subject = `${touch.discountPct}% off — still time to grab this`
    const smsBody = `Hi ${firstName}, ${biz} here. Still thinking about it? Set up a recurring visit once a month and lock in ${touch.discountPct}% off.${codeLine(ctx, true)} ${ctx.bookingUrl}`
    const emailBody = `<h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">${touch.discountPct}% off, just for you</h1><p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">${isOnetime ? 'Still thinking about your next visit?' : 'Your spot is still open.'} Set up a recurring visit once every 30 days and we'll lock in <strong>${touch.discountPct}% off</strong> every time.</p>${codeLine(ctx, false)}${ctaButton('Book Now & Save', ctx.bookingUrl)}`
    return { subject, smsBody, emailBody: emailBody + referralLine(ctx, false) }
  }

  const subject = `Last call: ${touch.discountPct}% off, just for you`
  const smsBody = `Hi ${firstName}, last call from ${biz} — set up a recurring visit once a month and save ${touch.discountPct}% every time, guaranteed.${codeLine(ctx, true)} ${ctx.bookingUrl}`
  const emailBody = `<h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Last call — ${touch.discountPct}% off</h1><p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">We haven't heard back, so this is our last check-in. Set up a recurring visit once every 30 days and we'll guarantee <strong>${touch.discountPct}% off</strong> every visit going forward.</p>${codeLine(ctx, false)}${ctaButton('Book Now & Save', ctx.bookingUrl)}`
  return { subject, smsBody, emailBody: emailBody + referralLine(ctx, false) }
}

// Short self-serve redemption code, e.g. SAVE10-A1B2C3. Not cryptographically
// unguessable — good enough for a marketing discount code, not an auth token.
export function generateRenurtureCode(discountPct: number): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `SAVE${discountPct}-${rand}`
}
