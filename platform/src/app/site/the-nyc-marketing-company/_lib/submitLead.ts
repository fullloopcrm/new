// @ts-nocheck
/**
 * Marketing-company lead submit → the global /api/contact endpoint, which
 * resolves the tenant from the host (thenycmarketingcompany.com) and creates a
 * client + portal_lead + a Sales pipeline deal, then alerts the owner. Replaces
 * the old window.location self-redirect that dropped every lead.
 */
export interface MarketingLead {
  name: string
  email?: string
  phone?: string
  subject: string
  message?: string
}

export async function submitLead(data: MarketingLead): Promise<boolean> {
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.ok
  } catch {
    return false
  }
}
