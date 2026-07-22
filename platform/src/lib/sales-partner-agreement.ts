import { supabaseAdmin } from './supabase'
import { sendSalesPartnerStripeInvite } from '@/app/api/sales-partners/[id]/stripe-invite/route'

/**
 * Best-effort hook called from the generic e-sign completion path
 * (/api/documents/public/[token]/sign) whenever any document finishes
 * signing. A sales partner is created with active=false (see POST
 * /api/sales-partners) and their PIN login is gated on active=true (see
 * /api/sales-partners/login), so this is what actually turns their portal
 * access on once they've signed the onboarding agreement. No-op for every
 * other document type -- the eq() below only matches a sales_partners row
 * that points at this exact document.
 *
 * Also auto-sends the Stripe Connect invite (SMS/email) the moment approval
 * lands, per Jeff's mid-session requirement -- "no admin has to go hunting
 * for a stripe-onboard action." Best-effort: a delivery failure here must
 * never block activation, which is why it's fire-and-forget with its own
 * catch, same as the other notify()/smsAdmins() side effects on this path.
 */
export async function activateSalesPartnerForDocument(documentId: string): Promise<void> {
  const { data: activated } = await supabaseAdmin
    .from('sales_partners')
    .update({ active: true, approved_at: new Date().toISOString() })
    .eq('agreement_document_id', documentId)
    .eq('active', false)
    .select('id, tenant_id')

  for (const partner of activated || []) {
    sendSalesPartnerStripeInvite(partner.id as string, partner.tenant_id as string)
      .catch(err => console.error('[sales-partner-agreement] auto stripe-invite failed:', err))
  }
}
