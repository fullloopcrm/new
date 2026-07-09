/**
 * Year-End Package — the clean accountant handoff.
 *
 * GET  /api/finance/year-end?year=YYYY[&ai=1]  → the package PDF inline (preview).
 *        Uses the fast templated cover memo unless ai=1.
 * POST /api/finance/year-end  { year, to_email? }         → generate + email now.
 *      /api/finance/year-end  { action:'hold'|'release', year } → pause/resume auto-send.
 *
 * Both send and manual use the shared sendYearEndPackage() path. Read requires
 * finance.view; writes require finance.expenses. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { gatherYearEnd } from '@/lib/finance/year-end'
import { generateCoverMemo, templatedMemo } from '@/lib/finance/year-end-memo'
import { buildYearEndPdf } from '@/lib/finance/year-end-pdf'
import { sendYearEndPackage, NoAccountantError } from '@/lib/finance/year-end-send'

const REVIEW_WINDOW_MS = 48 * 3600 * 1000

function parseYear(v: string | null): number {
  const n = Number(v)
  if (Number.isInteger(n) && n >= 2000 && n <= 2100) return n
  return new Date().getUTCFullYear()
}

export async function GET(request: Request) {
  try {
    const { tenant: _t, error: _e } = await requirePermission('finance.view')
    if (_e) return _e
    const { tenantId } = _t
    const url = new URL(request.url)
    const year = parseYear(url.searchParams.get('year'))

    const data = await gatherYearEnd(tenantId, year)
    const memo = url.searchParams.get('ai') ? await generateCoverMemo(data) : templatedMemo(data)
    const pdf = await buildYearEndPdf(data, memo)

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="year-end-${year}.pdf"`,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/finance/year-end', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to build package' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenant: _t, error: _e } = await requirePermission('finance.expenses')
    if (_e) return _e
    const { tenantId } = _t
    const body = await request.json().catch(() => ({}))

    // Pause / resume a pending auto-send run (the 48-hour review window control).
    if (body.action === 'hold' || body.action === 'release') {
      const yr = parseYear(String(body.year ?? ''))
      const patch: Record<string, unknown> = { status: body.action === 'hold' ? 'held' : 'pending_review' }
      if (body.action === 'release') patch.review_deadline = new Date(Date.now() + REVIEW_WINDOW_MS).toISOString()
      await supabaseAdmin
        .from('year_end_runs')
        .update(patch)
        .eq('tenant_id', tenantId)
        .eq('year', yr)
        .in('status', ['pending_review', 'held'])
      return NextResponse.json({ ok: true, action: body.action, year: yr })
    }

    // Generate + send now (manual "Send to accountant").
    const year = parseYear(String(body.year ?? ''))
    const result = await sendYearEndPackage(tenantId, year, { toEmail: body.to_email })

    // Record the run so the auto-send cron never double-sends this year.
    await supabaseAdmin
      .from('year_end_runs')
      .upsert(
        { tenant_id: tenantId, year, status: 'sent', accountant_email: result.sentTo, sent_at: new Date().toISOString() },
        { onConflict: 'tenant_id,year' },
      )

    return NextResponse.json({ ok: true, sent_to: result.sentTo, tenant_copied: result.tenantCopied, year })
  } catch (err) {
    if (err instanceof NoAccountantError) return NextResponse.json({ error: err.message }, { status: 400 })
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/year-end', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send package' }, { status: 500 })
  }
}
