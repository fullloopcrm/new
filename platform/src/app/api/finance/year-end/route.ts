/**
 * Year-End Package — the clean accountant handoff.
 *
 * GET  /api/finance/year-end?year=YYYY[&ai=1]  → the package PDF inline (preview).
 *        Uses the fast templated cover memo unless ai=1.
 * POST /api/finance/year-end  { year, to_email? }  → emails the package to the
 *        accountant on file (CPA access email) with an AI cover memo, and sends
 *        the tenant a copy. Full Loop prepares — it does not file.
 *
 * Read requires finance.view; send requires finance.expenses. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { gatherYearEnd } from '@/lib/finance/year-end'
import { generateCoverMemo, templatedMemo } from '@/lib/finance/year-end-memo'
import { buildYearEndPdf } from '@/lib/finance/year-end-pdf'

const usd = (c: number) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

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
    const year = parseYear(String(body.year ?? ''))

    const data = await gatherYearEnd(tenantId, year)

    const accountantEmail: string | null = (body.to_email ? String(body.to_email) : null) || data.accountant?.email || null
    if (!accountantEmail) {
      return NextResponse.json({ error: 'No accountant email on file. Add your accountant under CPA Access first, or pass to_email.' }, { status: 400 })
    }

    const memo = await generateCoverMemo(data)
    const pdf = await buildYearEndPdf(data, memo)
    const pdfBuf = Buffer.from(pdf)
    const filename = `${data.tenant.name.replace(/[^a-z0-9]+/gi, '-')}-${year}-year-end.pdf`

    // Tenant sender creds (their branding/domain if configured, else platform).
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('email, email_from, resend_api_key')
      .eq('id', tenantId)
      .single()
    const from = tenant?.email_from || `hello@fullloopcrm.com`
    const resendApiKey = tenant?.resend_api_key || null

    const summaryLine = `${data.tenant.name} — ${year}: revenue ${usd(data.pnl.revenue_cents)}, net ${usd(data.pnl.net_profit_cents)}, ${data.contractors.reportable_count} contractor(s) at the 1099 threshold.`

    // 1) To the accountant, with the package attached.
    await sendEmail({
      to: accountantEmail,
      from,
      resendApiKey,
      subject: `${data.tenant.name} — ${year} year-end books for filing`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;font-size:14px;line-height:1.6">
          <p>Hi${data.accountant?.name ? ` ${data.accountant.name}` : ''},</p>
          <p>Attached is <strong>${data.tenant.name}</strong>'s complete year-end books for <strong>${year}</strong> tax filing — prepared by Full Loop from the business's operating records. It includes the P&amp;L, balance sheet, trial balance, 1099-NEC contractor summary, and full general-ledger detail, with a cover memo summarizing the year and open questions.</p>
          <p style="color:#475569">${summaryLine}</p>
          <p>Full Loop prepares the books; it does not file. Please contact ${data.tenant.name}${data.tenant.email ? ` (${data.tenant.email})` : ''} directly with any questions.</p>
          <p style="color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:12px">Prepared by Full Loop CRM · not a tax filing</p>
        </div>`,
      attachments: [{ filename, content: pdfBuf }],
    })

    // 2) Copy to the tenant so they see it went out.
    let tenantCopy = false
    if (tenant?.email) {
      try {
        await sendEmail({
          to: tenant.email,
          from,
          resendApiKey,
          subject: `Your ${year} books were sent to your accountant`,
          html: `
            <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;font-size:14px;line-height:1.6">
              <p>Your <strong>${year}</strong> year-end package was just sent to your accountant${data.accountant?.name ? ` (${data.accountant.name})` : ''} at ${accountantEmail}.</p>
              <p style="color:#475569">${summaryLine}</p>
              <p>Nothing more you need to do — your books are done for the year. A copy is attached for your records.</p>
              <p style="color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:12px">Full Loop CRM</p>
            </div>`,
          attachments: [{ filename, content: pdfBuf }],
        })
        tenantCopy = true
      } catch (e) {
        console.error('[year-end] tenant copy failed', e)
      }
    }

    return NextResponse.json({ ok: true, sent_to: accountantEmail, tenant_copied: tenantCopy, year })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/year-end', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send package' }, { status: 500 })
  }
}
