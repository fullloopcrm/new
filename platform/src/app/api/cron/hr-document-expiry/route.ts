/**
 * HR document expiry nudges — runs daily.
 *
 * Continues the surface (150) opened: hr_documents.status='expired' is now
 * actually written (lazily, on an operator opening that employee's HR page —
 * see dashboard/hr/[id]/route.ts), but an operator who never happens to open
 * that specific page never sees a lapsing license/ID coming. The fix for
 * that was already scaffolded and never built: lib/hr.ts's own
 * HR_REMINDER_MILESTONES ("for the (future) auto-nudge engine") and the
 * hr_document_reminders table (UNIQUE(document_id, milestone), "making the
 * auto-nudge engine idempotent by construction") have existed since the HR
 * foundation migration with zero code ever reading or writing either.
 *
 * This cron is that engine, for the four day-based milestones the schema can
 * actually support (each requires an existing hr_documents row — the
 * 'missing' milestone in HR_REMINDER_MILESTONES needs one for a document
 * that was never submitted, which hr_document_reminders.document_id being
 * NOT NULL can't represent without a schema change; left out of scope here).
 *
 * For each document still open to renewal ('pending' | 'submitted' |
 * 'approved' — mirrors (150)'s own scoping) with expires_on inside a
 * milestone window, fires the tightest unsent milestone via
 * notify()+ownerAlert(), matching document_expired's (149) admin-alert
 * shape, and logs it to hr_document_reminders so a later run — or another
 * concurrent one racing the UNIQUE constraint — never double-sends the same
 * milestone for the same document.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { ownerAlert } from '@/lib/messaging/owner-alerts'
import { verifyCronSecret } from '@/lib/cron-auth'
import { escapeHtml } from '@/lib/escape-html'
import { HR_REMINDER_MILESTONES, type HrReminderMilestone } from '@/lib/hr'

export const maxDuration = 300

const MILESTONE_DAYS: Record<Exclude<HrReminderMilestone, 'missing'>, number> = {
  expiry_30d: 30,
  expiry_14d: 14,
  expiry_7d: 7,
  expiry_1d: 1,
}
// Tightest-first so a document first seen 10 days out (never having crossed
// 30d/14d while its expiry cron wasn't built) fires the 7d nudge, not 30d.
const ORDERED_MILESTONES = [...HR_REMINDER_MILESTONES]
  .filter((m): m is Exclude<HrReminderMilestone, 'missing'> => m !== 'missing')
  .reverse()

// Docs still open to renewal — matches (150)'s own scoping so an already-
// 'rejected' or already-'expired' document doesn't also get an expiry nudge.
const AWAITING_RENEWAL = new Set(['pending', 'submitted', 'approved'])

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const now = new Date()
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('status', 'active')
    .limit(1000)

  let sent = 0
  const errors: string[] = []

  for (const tenant of tenants || []) {
    try {
      const { data: docs } = await supabaseAdmin
        .from('hr_documents')
        .select('id, tenant_id, team_member_id, doc_type, label, status, expires_on, team_members(name)')
        .eq('tenant_id', tenant.id)
        .not('expires_on', 'is', null)
        .limit(500)

      for (const doc of docs || []) {
        if (!AWAITING_RENEWAL.has(doc.status as string)) continue

        const daysUntil = Math.ceil(
          (new Date(doc.expires_on as string).getTime() - now.getTime()) / DAY_MS,
        )
        // Already past due — (150)'s lazy on-visit check owns the actual
        // status='expired' transition; this cron only nudges upcoming ones.
        if (daysUntil < 0) continue

        const milestone = ORDERED_MILESTONES.find((m) => daysUntil <= MILESTONE_DAYS[m])
        if (!milestone) continue

        const { data: already } = await supabaseAdmin
          .from('hr_document_reminders')
          .select('id')
          .eq('document_id', doc.id)
          .eq('milestone', milestone)
          .maybeSingle()
        if (already) continue

        // Claim this (document, milestone) pair before sending — the UNIQUE
        // constraint means a concurrent run losing the insert race just
        // skips the send instead of double-notifying.
        const { error: claimErr } = await supabaseAdmin
          .from('hr_document_reminders')
          .insert({ tenant_id: tenant.id, document_id: doc.id, milestone, channel: 'email' })
        if (claimErr) continue

        const memberName = (doc.team_members as unknown as { name: string } | null)?.name || 'A team member'
        const label = (doc.label as string) || (doc.doc_type as string)
        const when = daysUntil <= 0 ? 'today' : `in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`

        await notify({
          tenantId: tenant.id,
          type: 'hr_document_expiring',
          title: `${memberName}'s ${label} expires ${when}`,
          message: `${memberName}'s ${label} expires ${when} (${doc.expires_on}). Renew it before it lapses.`,
          channel: 'email',
          recipientType: 'admin',
          metadata: { document_id: doc.id, team_member_id: doc.team_member_id, milestone },
        }).catch(() => {})

        await ownerAlert({
          tenantId: tenant.id,
          subject: `${label} expiring — ${memberName}`,
          kicker: 'HR document expiring',
          heading: `${memberName}'s ${label} expires ${when}`,
          bodyHtml: `<p style="margin:0">${escapeHtml(label)} for ${escapeHtml(memberName)} expires on ${escapeHtml(String(doc.expires_on))} — renew it before it lapses.</p>`,
          sms: `${memberName}'s ${label} expires ${when}.`,
        })

        sent++
      }
    } catch (tenantErr) {
      errors.push(`tenant ${tenant.id}: ${tenantErr instanceof Error ? tenantErr.message : String(tenantErr)}`)
    }
  }

  return NextResponse.json({ success: true, sent, errors: errors.slice(0, 20) })
}
