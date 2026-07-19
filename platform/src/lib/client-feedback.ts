// One-time $ credit earned from a feedback-campaign reply, auto-applied to a
// client's next booking. Ported from nycmaid's src/lib/client-feedback.ts,
// adapted to be tenant-scoped (nycmaid was single-tenant) so a credit can
// never be looked up or marked applied across tenant boundaries.
import { supabaseAdmin } from '@/lib/supabase'

export interface PendingFeedbackCredit {
  id: string
  credit_cents: number
}

// Oldest unapplied credit wins if somehow more than one is pending.
export async function getPendingFeedbackCredit(
  tenantId: string,
  clientId: string,
): Promise<PendingFeedbackCredit | null> {
  const { data } = await supabaseAdmin
    .from('client_feedback')
    .select('id, credit_cents')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('credit_applied', false)
    .not('credit_cents', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data && data.credit_cents ? { id: data.id as string, credit_cents: data.credit_cents as number } : null
}

export async function markFeedbackCreditApplied(
  tenantId: string,
  feedbackId: string,
  bookingId: string,
): Promise<void> {
  await supabaseAdmin
    .from('client_feedback')
    .update({ credit_applied: true, credit_applied_booking_id: bookingId })
    .eq('id', feedbackId)
    .eq('tenant_id', tenantId)
}
