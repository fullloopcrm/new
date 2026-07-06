/**
 * Industry profile — maps a tenant's trade onto the vocabulary the template's
 * content generators need so a non-cleaning tenant's site stops reading as a
 * cleaning site. This is the L2 "industry-aware copy" seam referenced in
 * brand.ts. Cleaning is detected explicitly so existing cleaning tenants keep
 * their original copy verbatim (no regression); everything else gets neutral,
 * trade-correct wording built from the tenant's own name/geo/services.
 */
export interface IndustryProfile {
  key: string
  /** True for cleaning/maid tenants — content generators keep legacy copy. */
  isCleaning: boolean
  /**
   * True for virtual-assistant tenants. These are remote + national, so they get
   * a dedicated landing (VirtualAssistantLanding) rather than the local-trade
   * GenericLanding, and skip geo/address/"licensed & insured" framing.
   */
  isVirtualAssistant: boolean
  /** True for remote verticals (no service address, not geo-local). */
  isRemote: boolean
  /** Title-case service label, e.g. "House Cleaning", "Plumbing", "Home Services". */
  serviceLabel: string
  /** Lowercase noun for mid-sentence use, e.g. "plumbing", "home services". */
  serviceNoun: string
}

export function industryProfile(industry?: string | null): IndustryProfile {
  const key = (industry || '').toLowerCase()
  const isCleaning = key.includes('clean') || key.includes('maid')
  const isVirtualAssistant =
    key.includes('virtual assist') ||
    key.includes('virtual-assist') ||
    key === 'va' ||
    key.includes('assistant')

  let serviceLabel = 'Home Services'
  if (isCleaning) serviceLabel = 'House Cleaning'
  else if (isVirtualAssistant) serviceLabel = 'Virtual Assistant Services'
  else if (key.includes('plumb')) serviceLabel = 'Plumbing'
  else if (key.includes('hvac')) serviceLabel = 'HVAC'
  else if (key.includes('electric')) serviceLabel = 'Electrical'
  else if (key.includes('landscap')) serviceLabel = 'Landscaping'
  else if (key.includes('pest') || key.includes('extermin')) serviceLabel = 'Pest Control'
  else if (key.includes('tow')) serviceLabel = 'Towing'
  else if (key.includes('salon') || key.includes('hair') || key.includes('beauty')) serviceLabel = 'Salon Services'
  else if (key.includes('junk')) serviceLabel = 'Junk Removal'
  else if (key.includes('dumpster')) serviceLabel = 'Dumpster Rental'
  else if (key.includes('laundry') || key.includes('wash')) serviceLabel = 'Laundry & Wash'
  else if (key.includes('handyman') || key.includes('repair')) serviceLabel = 'Handyman Services'

  return {
    key,
    isCleaning,
    isVirtualAssistant,
    isRemote: isVirtualAssistant,
    serviceLabel,
    serviceNoun: serviceLabel.toLowerCase(),
  }
}
