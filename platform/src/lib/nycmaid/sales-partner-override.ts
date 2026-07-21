// Two-tier sales-partner commission: a partner earns their own commission_rate
// on their direct referrals, AND a second override on referrals made by any
// partner they personally recruited (recruited_by_partner_id). Single level
// only — a recruiter's recruiter does not earn a third-tier override.
import { supabaseAdmin } from '@/lib/supabase'

export interface CommissionSplit {
  directPartnerId: string
  directAmountCents: number
  overridePartnerId: string | null
  overrideAmountCents: number
}

// saleAmountCents is the base the commission is computed against (e.g. the
// booking price). Both direct and override use the SAME rate structure
// (each partner's own commission_rate) — the override is not automatically
// equal to the direct commission if rates differ between partners.
export async function computeCommissionSplit(
  tenantId: string,
  directPartnerId: string,
  saleAmountCents: number,
): Promise<CommissionSplit> {
  const { data: direct } = await supabaseAdmin
    .from('sales_partners')
    .select('id, commission_rate, recruited_by_partner_id')
    .eq('id', directPartnerId)
    .eq('tenant_id', tenantId)
    .single()

  const directRate = direct?.commission_rate ?? 0
  const directAmountCents = Math.round(saleAmountCents * directRate)

  if (!direct?.recruited_by_partner_id) {
    return { directPartnerId, directAmountCents, overridePartnerId: null, overrideAmountCents: 0 }
  }

  const { data: recruiter } = await supabaseAdmin
    .from('sales_partners')
    .select('id, commission_rate, active')
    .eq('id', direct.recruited_by_partner_id)
    .eq('tenant_id', tenantId)
    .single()

  // Inactive recruiters don't earn overrides on new sales.
  if (!recruiter?.active) {
    return { directPartnerId, directAmountCents, overridePartnerId: null, overrideAmountCents: 0 }
  }

  const overrideRate = recruiter.commission_rate ?? 0
  const overrideAmountCents = Math.round(saleAmountCents * overrideRate)

  return {
    directPartnerId,
    directAmountCents,
    overridePartnerId: recruiter.id,
    overrideAmountCents,
  }
}
