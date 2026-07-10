/**
 * Service agreement — the document a client signs after accepting a proposal.
 * Plain-language terms: scope (all-inclusive), fees, third-party pass-through
 * costs, 50/50 payment schedule, ≤30-day onboarding, month-to-month/cancel-
 * anytime, ownership, and a signature block. Rendered per-lead from their seats.
 */
import { PRICING } from './billing-pricing'

export interface AgreementOpts {
  businessName: string
  contactName?: string | null
  admins: number
  teamMembers: number
  monthly: number
  territoryName?: string | null
  /** e.g. "July 8, 2026" — the date shown at the top. */
  effectiveDate?: string | null
  /** Governing-law state; placeholder until set. */
  governingState?: string | null
}

// What every client gets — the delivered, production features.
const INCLUDED: string[] = [
  'Custom marketing website, fully built and launched for your business',
  'Local SEO — on-page, technical, and ongoing optimization to rank in your market',
  'Online booking, scheduling, and job dispatch',
  'Customer portal and crew/team portal',
  'Invoicing and payment collection (card + ACH)',
  'Automated customer communication — SMS and email',
  'Reviews and reputation management',
  'Exclusive territory — one business per market on the platform',
  'Reporting and operations dashboard',
]

// In active development. Included at no extra cost, but not guaranteed
// deliverables and not part of the build scope.
const BETA: string[] = ['HR', 'Finance', 'Bookkeeping']

const THIRD_PARTY: { name: string; use: string }[] = [
  { name: 'Anthropic', use: 'AI (Selena)' },
  { name: 'Telnyx', use: 'SMS, and voice if applicable' },
  { name: 'Resend', use: 'email' },
  { name: 'Stripe', use: 'payment processing' },
]

export function buildAgreement(o: AgreementOpts): { title: string; html: string } {
  const fmt = (n: number) => `$${n.toLocaleString()}`
  const setup = PRICING.setupFee
  const half = Math.round(setup / 2)
  const contact = o.contactName || 'the undersigned'
  const state = o.governingState || '[State]'
  const date = o.effectiveDate || '________________'

  const li = (s: string) => `<li style="margin:6px 0;line-height:1.55;">${s}</li>`
  const clause = (n: string, title: string, body: string) => `
    <section style="margin:0 0 20px;">
      <h2 style="font-size:15px;margin:0 0 6px;color:#0f172a;">${n}. ${title}</h2>
      <div style="color:#334155;font-size:14px;line-height:1.6;">${body}</div>
    </section>`

  const title = `Full Loop CRM — Service Agreement — ${o.businessName}`
  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:680px;margin:0 auto;padding:32px 28px;color:#0f172a;">
    <div style="font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#0d9488;margin-bottom:6px;">Full Loop<span style="color:#94a3b8;">/</span></div>
    <h1 style="font-size:24px;margin:0 0 4px;">Service Agreement</h1>
    <p style="color:#64748b;font-size:13px;margin:0 0 24px;">Effective ${date} · between <strong>Full Loop CRM</strong> ("Full Loop") and <strong>${o.businessName}</strong> ("Client").</p>

    ${clause('1', 'What\'s included', `
      Full Loop provides an all-inclusive platform and done-for-you setup${o.territoryName ? ` for the <strong>${o.territoryName}</strong> territory` : ''}. Included:
      <ul style="margin:8px 0 0;padding-left:20px;">${INCLUDED.map(li).join('')}</ul>
      <p style="margin:12px 0 0;color:#64748b;font-size:13px;line-height:1.6;"><strong>In beta:</strong> ${BETA.join(', ')} are in active development and included at no extra cost when available, but are provided as-is and are not guaranteed deliverables or part of the build scope.</p>
    `)}

    ${clause('2', 'Selena (AI)', `
      Selena is Full Loop's AI assistant. Selena handles <strong>SMS and email communication with your leads</strong> — capturing, replying, quoting, booking, and following up — and <strong>keeps you informed and in contact via a Telegram chat</strong> for owner/admin updates and approvals. Selena runs on the Client's own Anthropic account (see §4).
    `)}

    ${clause('3', 'Fees', `
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:4px 0;">
        <tr><td style="padding:6px 0;color:#475569;">One-time setup</td><td style="padding:6px 0;text-align:right;font-weight:600;">${fmt(setup)}</td></tr>
        <tr><td style="padding:6px 0;color:#475569;">Admin seats — ${o.admins} × ${fmt(PRICING.adminMonthly)}/mo</td><td style="padding:6px 0;text-align:right;font-weight:600;">${fmt(o.admins * PRICING.adminMonthly)}/mo</td></tr>
        <tr><td style="padding:6px 0;color:#475569;">Portal team members — ${o.teamMembers} × ${fmt(PRICING.teamMemberMonthly)}/mo</td><td style="padding:6px 0;text-align:right;font-weight:600;">${fmt(o.teamMembers * PRICING.teamMemberMonthly)}/mo</td></tr>
        <tr><td style="padding:8px 0;border-top:1px solid #e2e8f0;color:#0f172a;font-weight:700;">Monthly total</td><td style="padding:8px 0;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;">${fmt(o.monthly)}/mo</td></tr>
      </table>
    `)}

    ${clause('4', 'Third-party services (paid by Client)', `
      The platform uses third-party services billed directly to the Client's own accounts, at cost, not marked up by Full Loop:
      <ul style="margin:8px 0 0;padding-left:20px;">
        ${THIRD_PARTY.map(t => li(`<strong>${t.name}</strong> — ${t.use}`)).join('')}
      </ul>
    `)}

    ${clause('5', 'Payment schedule', `
      <strong>50% of the setup fee (${fmt(half)}) is due up front by wire</strong> to begin work. The remaining <strong>50% (${fmt(half)}) is due at 90% completion</strong> — defined as the build being complete and pending only the edits requested by the Client. Monthly fees begin at launch and are billed monthly.
    `)}

    ${clause('6', 'Onboarding & timeline', `
      Onboarding takes <strong>up to 30 days</strong> from the date Full Loop receives the Client's fully completed onboarding questionnaire. Timelines depend on the Client providing required information and materials promptly.
    `)}

    ${clause('7', 'Term & cancellation', `
      This is a <strong>month-to-month</strong> agreement with <strong>no long-term contract — cancel anytime</strong>. Fees already paid (including the setup fee) are non-refundable. On cancellation, monthly service and access end at the close of the paid period.
    `)}

    ${clause('8', 'Ownership', `
      The Client owns their business, their data, and their customer relationships. Full Loop retains ownership of the underlying platform, software, and templates.
    `)}

    ${clause('9', 'Governing law', `This agreement is governed by the laws of the State of ${state}.`)}

    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e2e8f0;">
      <p style="color:#64748b;font-size:13px;margin:0 0 16px;">By signing below, the Client agrees to the terms above.</p>
      <table style="width:100%;font-size:14px;">
        <tr>
          <td style="width:50%;padding-right:16px;vertical-align:bottom;">
            <div style="border-bottom:1px solid #94a3b8;height:32px;"></div>
            <div style="color:#64748b;font-size:12px;margin-top:4px;">Client — ${contact}, ${o.businessName}</div>
          </td>
          <td style="width:50%;vertical-align:bottom;">
            <div style="border-bottom:1px solid #94a3b8;height:32px;"></div>
            <div style="color:#64748b;font-size:12px;margin-top:4px;">Date</div>
          </td>
        </tr>
      </table>
    </div>

    <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Full Loop CRM — automation that runs home-service businesses.</p>
  </div>`
  return { title, html }
}
