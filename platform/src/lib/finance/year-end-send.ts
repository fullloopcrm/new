/**
 * One shared path that generates AND delivers a tenant's year-end package —
 * used by both the manual "Send to accountant" button and the Dec-31 auto-send
 * cron, so they can never drift (the global rule: one code path, all callers).
 *
 * Generates the PDF package + CSV workbook + Yinez cover memo, emails the
 * accountant on file, and copies the tenant. Full Loop prepares; it does not
 * file.
 */
import { supabaseAdmin } from '../supabase'
import { sendEmail } from '../email'
import { gatherYearEnd } from './year-end'
import { generateCoverMemo } from './year-end-memo'
import { buildYearEndPdf } from './year-end-pdf'
import { buildYearEndWorkbook } from './year-end-workbook'

const usd = (c: number) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export class NoAccountantError extends Error {
  constructor() { super('No accountant email on file. Add your accountant under CPA Access first.') }
}

export interface SendYearEndResult { sentTo: string; tenantCopied: boolean; year: number }

/**
 * Build and email the year-end package. Throws NoAccountantError if there's no
 * accountant email (on file or passed). Never throws on the tenant-copy leg.
 */
export async function sendYearEndPackage(
  tenantId: string,
  year: number,
  opts: { toEmail?: string | null } = {},
): Promise<SendYearEndResult> {
  const data = await gatherYearEnd(tenantId, year)
  const accountantEmail = (opts.toEmail || null) || data.accountant?.email || null
  if (!accountantEmail) throw new NoAccountantError()

  const memo = await generateCoverMemo(data)
  const pdf = await buildYearEndPdf(data, memo)
  const workbook = await buildYearEndWorkbook(tenantId, data)
  const baseName = `${data.tenant.name.replace(/[^a-z0-9]+/gi, '-')}-${year}-year-end`
  const attachments = [
    { filename: `${baseName}.pdf`, content: Buffer.from(pdf) },
    { filename: `${baseName}-workbook.zip`, content: workbook },
  ]

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('email, email_from, resend_api_key')
    .eq('id', tenantId)
    .single()
  const from = tenant?.email_from || 'hello@fullloopcrm.com'
  const resendApiKey = tenant?.resend_api_key || null

  const summaryLine = `${data.tenant.name} — ${year}: revenue ${usd(data.pnl.revenue_cents)}, net ${usd(data.pnl.net_profit_cents)}, ${data.contractors.reportable_count} contractor(s) at the 1099 threshold.`

  await sendEmail({
    to: accountantEmail,
    from,
    resendApiKey,
    subject: `${data.tenant.name} — ${year} year-end books for filing`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;font-size:14px;line-height:1.6">
        <p>Hi${data.accountant?.name ? ` ${data.accountant.name}` : ''},</p>
        <p>Attached is <strong>${data.tenant.name}</strong>'s complete year-end books for <strong>${year}</strong> tax filing — prepared by Full Loop from the business's operating records. It includes the P&amp;L, balance sheet, cash-flow summary, trial balance, 1099-NEC contractor summary, and full general-ledger detail (PDF), plus a CSV workbook, with a cover memo summarizing the year and open questions.</p>
        <p style="color:#475569">${summaryLine}</p>
        <p>Full Loop prepares the books; it does not file. Please contact ${data.tenant.name}${data.tenant.email ? ` (${data.tenant.email})` : ''} directly with any questions.</p>
        <p style="color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:12px">Prepared by Full Loop CRM · not a tax filing</p>
      </div>`,
    attachments,
  })

  let tenantCopied = false
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
        attachments,
      })
      tenantCopied = true
    } catch (e) {
      console.error('[year-end] tenant copy failed', e)
    }
  }

  return { sentTo: accountantEmail, tenantCopied, year }
}
