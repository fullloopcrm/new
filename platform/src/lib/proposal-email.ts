/**
 * Proposal email — sent to a lead at the Proposed stage. A real proposal:
 * value / what's included, territory exclusivity, the fee breakdown, ACH note,
 * trust + terms, and a single pay CTA. Previewed in admin before send.
 */
import { PRICING } from './billing-pricing'
import { escapeHtml, safeUrl } from './escape-html'

export interface ProposalEmailOpts {
  businessName: string
  contactName?: string | null
  admins: number
  teamMembers: number
  monthly: number
  payUrl?: string | null
  territoryName?: string | null
}

const INCLUDED: { title: string; body: string }[] = [
  { title: 'The full operating platform', body: 'Booking, scheduling, dispatch, invoicing, payments, and your customer + crew portals — one system, not five tools.' },
  { title: 'Selena, your AI front desk', body: 'Answers leads by text and web chat 24/7, quotes jobs, books them, and follows up — so no lead goes cold.' },
  { title: 'Automated money & payroll', body: 'Card/ACH checkout, automatic payouts to crews, and a double-entry ledger that reconciles itself.' },
  { title: 'Done-for-you setup', body: 'We migrate your data, wire your number, email, and payments, and hand you a running business — not a login.' },
]

export function buildProposalEmail(o: ProposalEmailOpts): { subject: string; html: string } {
  const greeting = o.contactName ? `Hi ${escapeHtml(o.contactName.split(' ')[0])},` : 'Hi,'
  const businessName = escapeHtml(o.businessName)
  const fmt = (n: number) => `$${n.toLocaleString()}`
  const firstYear = PRICING.setupFee + o.monthly * 12

  const cta = o.payUrl
    ? `<a href="${safeUrl(o.payUrl)}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:15px 30px;border-radius:8px;font-weight:600;font-size:15px;">Accept &amp; secure your setup →</a>`
    : `<a href="mailto:hello@fullloopcrm.com?subject=I accept — ${encodeURIComponent(o.businessName)}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:15px 30px;border-radius:8px;font-weight:600;font-size:15px;">Accept — send my agreement →</a>`

  const row = (label: string, val: string, strong = false) =>
    `<tr><td style="padding:9px 0;color:#475569;border-top:1px solid #eef2f6;">${label}</td><td style="padding:9px 0;text-align:right;font-weight:${strong ? 700 : 600};color:#0f172a;border-top:1px solid #eef2f6;">${val}</td></tr>`

  const includedHtml = INCLUDED.map(i => `
    <tr>
      <td style="padding:10px 0;vertical-align:top;width:24px;color:#0d9488;font-weight:700;">✓</td>
      <td style="padding:10px 0;">
        <div style="font-weight:600;color:#0f172a;font-size:14px;">${i.title}</div>
        <div style="color:#64748b;font-size:13px;line-height:1.5;margin-top:2px;">${i.body}</div>
      </td>
    </tr>`).join('')

  const territoryLine = o.territoryName
    ? `<p style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:14px 16px;color:#0f766e;font-size:14px;margin:0 0 22px;">
        <strong>Your territory:</strong> Full Loop CRM is one-per-market. Accepting this locks <strong>${escapeHtml(o.territoryName)}</strong> to ${businessName} — no competitor on the platform can take it while you hold it.
      </p>`
    : `<p style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:14px 16px;color:#0f766e;font-size:14px;margin:0 0 22px;">
        <strong>Exclusive territory:</strong> Full Loop CRM is one business per market. Accepting locks your territory to ${businessName} — no competitor on the platform can take it while you hold it.
      </p>`

  const subject = `Your Full Loop CRM proposal — ${o.businessName}`
  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:28px 24px;color:#0f172a;">

    <div style="font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#0d9488;margin-bottom:18px;">Full Loop CRM</div>

    <h1 style="font-size:24px;line-height:1.25;margin:0 0 8px;">Everything ${businessName} needs to run itself.</h1>
    <p style="color:#475569;margin:0 0 22px;font-size:15px;line-height:1.55;">${greeting} here's your setup. Full Loop CRM replaces the patchwork of tools, missed calls, and manual admin with one system that books the jobs, collects the money, pays the crew, and follows up — automatically.</p>

    ${territoryLine}

    <div style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;margin:0 0 6px;">What you get</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">${includedHtml}</table>

    <div style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;margin:0 0 6px;">Your pricing</div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:6px;">
      ${row(`Admin seats (${fmt(PRICING.adminMonthly)}/mo each)`, `${o.admins}`)}
      ${row(`Portal team members (${fmt(PRICING.teamMemberMonthly)}/mo each)`, `${o.teamMembers}`)}
      ${row('One-time setup', fmt(PRICING.setupFee))}
      ${row('Monthly', `${fmt(o.monthly)}/mo`)}
      ${row('First-year total', fmt(firstYear), true)}
    </table>
    <p style="color:#64748b;font-size:13px;margin:0 0 22px;">Pay the one-time setup by bank transfer (ACH) to skip card fees; your monthly runs on the same checkout. You own your business, your data, and your customers — cancel anytime, no lock-in contract.</p>

    <div style="margin:6px 0 10px;">${cta}</div>
    <p style="color:#94a3b8;font-size:12px;margin:0 0 22px;">This proposal is held for 7 days. After you accept, we start setup within one business day and you're live in under a week.</p>

    <hr style="border:none;border-top:1px solid #eef2f6;margin:0 0 16px;" />
    <p style="color:#64748b;font-size:13px;margin:0 0 4px;">Questions before you decide? Just reply to this email — a real person answers.</p>
    <p style="color:#94a3b8;font-size:12px;margin:0;">Full Loop CRM — automation that runs home-service businesses.</p>
  </div>`
  return { subject, html }
}
