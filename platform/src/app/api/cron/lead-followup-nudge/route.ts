/**
 * Stale sales-lead follow-up nudge — daily.
 *
 * Scans partner_requests (the platform's own tenant-acquisition pipeline —
 * see src/app/admin/sales) for leads sitting in an engaged, unclosed stage
 * (contacted/qualified/proposed) whose last_contacted_at has crossed a
 * 7/14/30-day threshold with no follow-up. Sends ONE digest per run to the
 * platform admin via email AND Telegram — never one notification per lead,
 * per the 2026-08-14 dedupe-guardrails incident (see client-dedupe.ts /
 * cron/dedupe-clients).
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { notifyOwnerOnTelegram } from '@/lib/telegram'
import { trackError } from '@/lib/error-tracking'
import { computeDueFollowups, type StaleLeadInput } from '@/lib/lead-followup'

export const maxDuration = 60

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  try {
    const { data, error } = await supabaseAdmin
      .from('partner_requests')
      .select('id, business_name, contact_name, email, phone, last_contacted_at, notified_7d_at, notified_14d_at, notified_30d_at')
      .in('status', ['contacted', 'qualified', 'proposed'])
      .not('last_contacted_at', 'is', null)

    if (error) throw error

    const due = computeDueFollowups((data || []) as StaleLeadInput[], Date.now())
    if (due.length === 0) {
      return NextResponse.json({ success: true, notified: 0 })
    }

    // Sort most-stale first so the digest leads with the most urgent leads.
    due.sort((a, b) => b.daysSince - a.daysSince)

    const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL
    const rows = due.map((d) => ({
      business_name: d.lead.business_name,
      contact_name: d.lead.contact_name || '—',
      email: d.lead.email || '—',
      phone: d.lead.phone || '—',
      daysSince: d.daysSince,
      message: `Has not been contacted in ${d.daysSince} day${d.daysSince === 1 ? '' : 's'} — not signed up yet`,
    }))

    if (adminTo) {
      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333;">
  <div style="max-width: 640px; margin: 0 auto; padding: 20px;">
    <h1 style="font-size: 20px;">${due.length} lead${due.length === 1 ? '' : 's'} contacted, not sold — need follow-up</h1>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr style="text-align: left; border-bottom: 2px solid #e5e7eb;">
          <th style="padding: 8px;">Business</th>
          <th style="padding: 8px;">Contact</th>
          <th style="padding: 8px;">Email</th>
          <th style="padding: 8px;">Phone</th>
          <th style="padding: 8px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r) => `
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 8px;">${escapeHtml(r.business_name)}</td>
          <td style="padding: 8px;">${escapeHtml(r.contact_name)}</td>
          <td style="padding: 8px;">${escapeHtml(r.email)}</td>
          <td style="padding: 8px;">${escapeHtml(r.phone)}</td>
          <td style="padding: 8px; color: #b45309; font-weight: 600;">${escapeHtml(r.message)}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table>
    <p style="margin-top: 20px;">
      <a href="https://homeservicesbusinesscrm.com/admin/sales" style="color: #667eea;">Open Sales pipeline →</a>
    </p>
  </div>
</body>
</html>`.trim()

      await sendEmail({
        to: adminTo,
        subject: `${due.length} lead${due.length === 1 ? '' : 's'} contacted, not sold — need follow-up`,
        html,
      }).catch((err) => console.error('[lead-followup-nudge] email failed:', err))
    } else {
      console.warn('[lead-followup-nudge] No ADMIN_NOTIFICATION_EMAIL or ADMIN_EMAIL set — skipping email notify')
    }

    const telegramLines = rows.map((r) => `• ${r.business_name} (${r.contact_name}) — ${r.message}`)
    await notifyOwnerOnTelegram(
      `📋 ${due.length} lead${due.length === 1 ? '' : 's'} contacted, not sold:\n\n${telegramLines.join('\n')}\n\nhttps://homeservicesbusinesscrm.com/admin/sales`,
    ).catch((err) => console.error('[lead-followup-nudge] telegram failed:', err))

    // Stamp every crossed threshold so a later run doesn't re-fire it.
    for (const d of due) {
      const stamp: Record<string, string> = {}
      for (const field of d.fieldsToStamp) stamp[field] = new Date().toISOString()
      const { error: stampErr } = await supabaseAdmin.from('partner_requests').update(stamp).eq('id', d.lead.id)
      if (stampErr) console.error(`[lead-followup-nudge] failed to stamp lead ${d.lead.id}:`, stampErr.message)
    }

    return NextResponse.json({ success: true, notified: due.length })
  } catch (err) {
    await trackError(err, { source: 'cron/lead-followup-nudge', severity: 'medium' })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
