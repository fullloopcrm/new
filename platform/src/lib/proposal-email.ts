/**
 * Proposal email — sent to a lead at the Proposed stage with the full breakdown
 * (seats, $25k setup, monthly) and a pay link. Previewed in admin before send.
 */
import { PRICING } from './billing-pricing'

export interface ProposalEmailOpts {
  businessName: string
  contactName?: string | null
  admins: number
  teamMembers: number
  monthly: number
  payUrl?: string | null
}

export function buildProposalEmail(o: ProposalEmailOpts): { subject: string; html: string } {
  const greeting = o.contactName ? `Hi ${o.contactName.split(' ')[0]},` : 'Hi,'
  const fmt = (n: number) => `$${n.toLocaleString()}`
  const cta = o.payUrl
    ? `<a href="${o.payUrl}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Accept &amp; set up payment →</a>`
    : `<span style="color:#94a3b8;">[Payment link inserted on send]</span>`

  const row = (label: string, val: string) =>
    `<tr><td style="padding:8px 0;color:#475569;">${label}</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#0f172a;">${val}</td></tr>`

  const subject = `Your Full Loop proposal — ${o.businessName}`
  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
    <h1 style="font-size:22px;margin:0 0 4px;">Full Loop — your setup</h1>
    <p style="color:#475569;margin:0 0 20px;">${greeting} here's everything to get ${o.businessName} running on Full Loop.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;border-top:1px solid #e2e8f0;">
      ${row(`Admins (${fmt(PRICING.adminMonthly)}/mo each)`, `${o.admins}`)}
      ${row(`Portal team members (${fmt(PRICING.teamMemberMonthly)}/mo each)`, `${o.teamMembers}`)}
      ${row('Setup (one-time)', fmt(PRICING.setupFee))}
      ${row('Monthly (recurring)', `${fmt(o.monthly)}/mo`)}
    </table>
    <p style="color:#64748b;font-size:13px;margin:16px 0 20px;">Pay the one-time setup by bank transfer (ACH) to avoid card fees; your monthly runs on the same checkout.</p>
    <div style="margin:8px 0 24px;">${cta}</div>
    <p style="color:#94a3b8;font-size:12px;">Full Loop — automation that runs home-service businesses.</p>
  </div>`
  return { subject, html }
}
