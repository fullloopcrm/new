/**
 * HR document reminders cron — daily. Sends expiry nudges (30/14/7/1 days out)
 * for hr_documents with expires_on set, idempotent via hr_document_reminders'
 * UNIQUE(document_id, milestone) constraint so a given milestone only fires
 * once per document, by construction (per the migration 053 docstring).
 *
 * Batched across all tenants in one query (indexed on the partial
 * idx_hr_docs_expiry(tenant_id, expires_on) index) rather than a per-tenant
 * loop — same cost pattern as email-monitor's cheap precheck.
 *
 * Scope: expiry milestones only. HR_REMINDER_MILESTONES also lists 'missing'
 * (a required doc never submitted), but hr_document_reminders.document_id is
 * NOT NULL (FK to hr_documents) — there's no document row to attach a
 * 'missing' reminder to until one exists. Needs a design call (e.g.
 * auto-creating a 'pending' hr_documents row per required doc_type during
 * seedHrDefaults) before it can be made idempotent the same way. Not
 * implemented here — flagged for Jeff.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyTeamMember } from '@/lib/notify-team'
import { safeEqual } from '@/lib/secret-compare'

export const maxDuration = 60

const EXPIRY_MILESTONE_DAYS: Record<string, number> = {
  expiry_30d: 30,
  expiry_14d: 14,
  expiry_7d: 7,
  expiry_1d: 1,
}

function isoDateDaysFromNow(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || !safeEqual(auth, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const targetDates = Object.entries(EXPIRY_MILESTONE_DAYS).map(([milestone, days]) => ({
    milestone,
    date: isoDateDaysFromNow(days),
  }))
  const dateToMilestone = new Map(targetDates.map((t) => [t.date, t.milestone]))

  // Single batched query across ALL tenants — no per-tenant loop.
  const { data: docs, error: docsErr } = await supabaseAdmin
    .from('hr_documents')
    .select('id, tenant_id, team_member_id, doc_type, label, expires_on, status')
    .in('expires_on', targetDates.map((t) => t.date))
    .not('status', 'in', '(expired,rejected)')
    .limit(2000)

  if (docsErr) {
    return NextResponse.json({ error: docsErr.message }, { status: 500 })
  }
  if (!docs || docs.length === 0) {
    return NextResponse.json({ ok: true, reminded: 0, skipped: 'no documents at any milestone' })
  }

  // Skip terminated/inactive team members — no point nudging about a former
  // employee's expiring license. Use `status`, not `active`. Correction:
  // team_members.active does exist (added by 010_nycmaid_parity_columns_2.sql,
  // a one-time NYC Maid legacy-data import column) -- verified live against
  // production. But nothing in the app writes it, so it silently drifts from
  // reality (confirmed live: ~12% of rows disagree with `status`, including
  // status='inactive' rows still showing active=true). `status` is the field
  // the termination flow actually keeps current.
  const memberIds = [...new Set(docs.map((d) => d.team_member_id as string))]
  const { data: members } = await supabaseAdmin
    .from('team_members')
    .select('id, status')
    .in('id', memberIds)
  const activeMembers = new Set((members || []).filter((m) => m.status !== 'inactive').map((m) => m.id as string))
  const candidates = docs.filter((d) => activeMembers.has(d.team_member_id as string))

  let reminded = 0
  const errors: string[] = []

  for (const doc of candidates) {
    const milestone = dateToMilestone.get(doc.expires_on as string)
    if (!milestone) continue

    // Claim first: the UNIQUE(document_id, milestone) constraint is the sole
    // idempotency guard (per migration 053's docstring) — a losing concurrent
    // invocation gets a unique-violation error here and skips the send.
    const { error: claimErr } = await supabaseAdmin
      .from('hr_document_reminders')
      .insert({ tenant_id: doc.tenant_id, document_id: doc.id, milestone, channel: 'in_app' })
    if (claimErr) continue

    try {
      const label = doc.label || doc.doc_type
      await notifyTeamMember({
        tenantId: doc.tenant_id as string,
        teamMemberId: doc.team_member_id as string,
        type: 'hr_document_expiry',
        title: 'Document expiring soon',
        message: `Your ${label} expires on ${doc.expires_on}. Please upload a renewal.`,
        smsMessage: `Reminder: your ${label} expires ${doc.expires_on}. Please upload a renewal in your team portal.`,
        emailSubject: `Document expiring: ${label}`,
        emailHtml: `<p>Your <strong>${label}</strong> expires on ${doc.expires_on}. Please upload a renewal as soon as possible.</p>`,
      })
      reminded++
    } catch (e) {
      errors.push(`doc ${doc.id}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  // Health-monitor marker.
  await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    type: 'hr_document_reminders_fired',
    title: 'cron:hr-document-reminders',
    message: `reminded=${reminded}`,
    channel: 'system',
    recipient_type: 'admin',
  }).then(() => {}, () => {})

  return NextResponse.json({ ok: true, reminded, errors: errors.length ? errors : undefined })
}
