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

// Title-case service label per canonical IndustryKey (from lib/industry-presets).
// config.industry is the resolved key, so this map is the primary source; the
// substring fallback below still handles free-text/legacy inputs.
const LABEL_BY_KEY: Record<string, string> = {
  cleaning: 'House Cleaning', window_cleaning: 'Window Cleaning', gutter: 'Gutter Cleaning',
  carpet_cleaning: 'Carpet & Upholstery Cleaning', air_duct: 'Air Duct Cleaning',
  pressure_washing: 'Pressure Washing', post_construction: 'Post-Construction Cleaning',
  bin_cleaning: 'Bin Cleaning', pool: 'Pool Service', chimney: 'Chimney Sweep',
  lawn_care: 'Lawn Care', irrigation: 'Irrigation & Sprinklers', snow_removal: 'Snow Removal',
  tree_service: 'Tree Service', holiday_lighting: 'Holiday Lighting', pest: 'Pest Control',
  junk_removal: 'Junk Removal', dumpster: 'Dumpster Rental', towing: 'Towing',
  appliance_repair: 'Appliance Repair', garage_door: 'Garage Door Service', locksmith: 'Locksmith',
  home_inspection: 'Home Inspection', septic: 'Septic Services', auto_detailing: 'Auto Detailing',
  pet_grooming: 'Pet Grooming', pet_waste: 'Pet Waste Removal', handyman: 'Handyman Services',
  hvac: 'HVAC', plumbing: 'Plumbing', electrical: 'Electrical', mobile_salon: 'Salon Services',
  laundry: 'Laundry & Wash', fitness: 'Fitness Training', landscaping: 'Landscaping',
  remodeling: 'Remodeling & General Contracting', roofing: 'Roofing', siding: 'Siding',
  painting: 'Painting', flooring: 'Flooring', concrete: 'Concrete & Masonry', deck: 'Deck Building',
  fencing: 'Fencing', demolition: 'Demolition', drywall: 'Drywall', epoxy: 'Epoxy Flooring',
  foundation: 'Foundation & Waterproofing', insulation: 'Insulation', moving: 'Moving Services',
  paving: 'Paving', windows_doors: 'Windows & Doors', stucco: 'Stucco', solar: 'Solar Installation',
  smart_home: 'Smart Home & Security', accessibility: 'Accessibility & Mobility',
  restoration: 'Restoration', interior_design: 'Interior Design', general: 'Home Services',
}

export function industryProfile(industry?: string | null): IndustryProfile {
  const key = (industry || '').toLowerCase()
  // ONLY true house-cleaning / maid service. Must NOT catch cleaning-adjacent
  // trades (window_cleaning, carpet_cleaning, gutter, bin_cleaning, air_duct,
  // pressure_washing, post_construction) — they are their own verticals and must
  // not be served the maid marketing site with $59/hr bedrooms copy.
  const isCleaning = key === 'cleaning' || key.includes('house clean') || key.includes('maid')
  const isVirtualAssistant =
    key.includes('virtual assist') ||
    key.includes('virtual-assist') ||
    key === 'va' ||
    key.includes('assistant')

  let serviceLabel: string
  if (isCleaning) serviceLabel = 'House Cleaning'
  else if (isVirtualAssistant) serviceLabel = 'Virtual Assistant Services'
  else if (LABEL_BY_KEY[key]) serviceLabel = LABEL_BY_KEY[key]
  // Substring fallback for free-text / legacy inputs not matching a canonical key.
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
  else serviceLabel = 'Home Services'

  return {
    key,
    isCleaning,
    isVirtualAssistant,
    isRemote: isVirtualAssistant,
    serviceLabel,
    serviceNoun: serviceLabel.toLowerCase(),
  }
}
