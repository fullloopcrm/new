/**
 * Year-End auto-send cron — the "books done, filed, forgotten" engine.
 *
 * Phase A (open window): at fiscal-year close (early January, or forced), for
 *   each active tenant with an accountant on file and ledger activity for the
 *   year, create a pending_review run, notify the tenant, and start a 48-hour
 *   review window.
 * Phase B (send due): for any pending_review run past its review window, send
 *   the package to the accountant via the shared sendYearEndPackage() path and
 *   mark it sent. Held runs wait; failures are recorded, not fatal.
 *
 * CRON_SECRET Bearer auth. Vercel triggers via GET; POST allowed for manual runs.
 * Query: ?year=YYYY (target), ?force=1 (open windows regardless of month).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { ledgerTotals } from '@/lib/finance/ledger-list'
import { sendYearEndPackage, NoAccountantError } from '@/lib/finance/year-end-send'

const REVIEW_WINDOW_MS = 48 * 3600 * 1000

async function run(request: Request): Promise<NextResponse> {
  const auth = request.headers.get('authorization') || ''
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const now = new Date()
  const targetYear = Number(url.searchParams.get('year')) || now.getUTCFullYear() - 1
  const force = url.searchParams.get('force') === '1'
  // Only open new windows in the fiscal-close window (early January) unless forced.
  const inCloseWindow = force || (now.getUTCMonth() === 0 && now.getUTCDate() <= 7)

  const result = { opened: 0, notified: 0, sent: 0, failed: 0, skipped_no_data: 0, skipped_no_accountant: 0 }

  // ── Phase A: open review windows ──
  if (inCloseWindow) {
    const { data: tenants } = await supabaseAdmin.from('tenants').select('id, name, email').eq('status', 'active')
    for (const t of tenants || []) {
      const tenantId = t.id as string
      // Skip if a run already exists for this tenant+year.
      const { data: existing } = await supabaseAdmin
        .from('year_end_runs').select('id').eq('tenant_id', tenantId).eq('year', targetYear).maybeSingle()
      if (existing) continue

      // Needs an accountant on file.
      const { data: cpa } = await supabaseAdmin
        .from('cpa_access_tokens').select('cpa_email, cpa_name').eq('tenant_id', tenantId)
        .is('revoked_at', null).not('cpa_email', 'is', null)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!cpa?.cpa_email) { result.skipped_no_accountant++; continue }

      // Needs real books for the year.
      const totals = await ledgerTotals(tenantId, { from: `${targetYear}-01-01`, to: `${targetYear}-12-31` })
      if (totals.entries_count === 0) { result.skipped_no_data++; continue }

      const deadline = new Date(now.getTime() + REVIEW_WINDOW_MS)
      const { error: insErr } = await supabaseAdmin.from('year_end_runs').insert({
        tenant_id: tenantId, year: targetYear, status: 'pending_review',
        accountant_email: cpa.cpa_email, review_deadline: deadline.toISOString(),
      })
      if (insErr) { result.failed++; continue }
      result.opened++

      // Notify the tenant that it auto-sends in 48h.
      if (t.email) {
        try {
          await sendEmail({
            to: t.email as string,
            subject: `Your ${targetYear} books are ready — auto-sending to your accountant`,
            html: `
              <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;font-size:14px;line-height:1.6">
                <p>Your <strong>${targetYear}</strong> year-end books are done. Unless you make changes, we'll send the complete package to your accountant${cpa.cpa_name ? ` (${cpa.cpa_name})` : ''} at <strong>${cpa.cpa_email}</strong> on <strong>${deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</strong>.</p>
                <p>Nothing you need to do — this is the "no January panic" part. To review first or hold it, open Finance → CPA Access in your dashboard.</p>
                <p style="color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:12px">Full Loop CRM</p>
              </div>`,
          })
          result.notified++
        } catch (e) { console.error('[cron/year-end] notify failed', tenantId, e) }
      }
    }
  }

  // ── Phase B: send runs whose review window has elapsed ──
  const { data: due } = await supabaseAdmin
    .from('year_end_runs')
    .select('id, tenant_id, year')
    .eq('status', 'pending_review')
    .lte('review_deadline', now.toISOString())
  for (const r of due || []) {
    try {
      const sent = await sendYearEndPackage(r.tenant_id as string, r.year as number)
      await supabaseAdmin.from('year_end_runs')
        .update({ status: 'sent', accountant_email: sent.sentTo, sent_at: now.toISOString(), updated_at: now.toISOString() })
        .eq('id', r.id)
      result.sent++
    } catch (e) {
      const msg = e instanceof NoAccountantError ? 'no_accountant' : (e instanceof Error ? e.message : 'send_failed')
      await supabaseAdmin.from('year_end_runs')
        .update({ status: 'failed', last_error: msg, updated_at: now.toISOString() })
        .eq('id', r.id)
      result.failed++
      console.error('[cron/year-end] send failed', r.tenant_id, e)
    }
  }

  return NextResponse.json({ ok: true, target_year: targetYear, in_close_window: inCloseWindow, ...result })
}

export async function GET(request: Request) { return run(request) }
export async function POST(request: Request) { return run(request) }
