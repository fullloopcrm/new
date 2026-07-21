import { supabaseAdmin } from './supabase'

/**
 * Best-effort hook called from the generic e-sign completion path
 * (/api/documents/public/[token]/sign) whenever any document finishes
 * signing. A sales partner is created with active=false (see POST
 * /api/sales-partners) and their PIN login is gated on active=true (see
 * /api/sales-partners/login), so this is what actually turns their portal
 * access on once they've signed the onboarding agreement. No-op for every
 * other document type -- the eq() below only matches a sales_partners row
 * that points at this exact document.
 */
export async function activateSalesPartnerForDocument(documentId: string): Promise<void> {
  await supabaseAdmin
    .from('sales_partners')
    .update({ active: true, approved_at: new Date().toISOString() })
    .eq('agreement_document_id', documentId)
    .eq('active', false)
}
