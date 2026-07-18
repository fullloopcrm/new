/**
 * Preset "scope of work" summaries for the quote-level Description field
 * (_QuoteBuilder.tsx Quote Details section — NOT the per-line-item catalog
 * description, which already exists on service_types).
 *
 * Keyed by IndustryKey (tenants.industry), mirroring the SERVICE_PRESETS
 * pattern in industry-presets.ts. Only a handful of verticals are populated
 * for now — see the `general` fallback for everyone else. Filling in the
 * remaining IndustryKeys is a separate content task, same as the rest of
 * SERVICE_PRESETS coverage.
 */
import type { IndustryKey } from './industry-presets'

export interface ScopeTemplate {
  label: string
  text: string
}

export const QUOTE_SCOPE_TEMPLATES: Partial<Record<IndustryKey, ScopeTemplate[]>> = {
  landscaping: [
    {
      label: 'Lawn Mowing & Maintenance',
      text: 'Routine mowing, edging, trimming, and blowing of all turf areas per the visit schedule above. Includes debris removal from walkways and driveways. Excludes fertilization, aeration, and irrigation repair unless quoted as separate line items. Assumes clear, unobstructed access to all mowed areas.',
    },
    {
      label: 'Seasonal Cleanup (Spring/Fall)',
      text: 'Full-property cleanup including leaf and debris removal, bed edging, and green-waste haul-away. Assumes normal seasonal accumulation — excessive debris (storm damage, multi-season buildup) may require a change order. Excludes gutter cleaning and tree/limb removal.',
    },
    {
      label: 'Mulching & Planting',
      text: 'Bed preparation, weed removal, and installation of mulch and/or plantings as specified in the line items above. Price includes materials and labor for the listed scope. Excludes irrigation adjustments, soil amendment beyond standard bed prep, and plant replacement after 30 days.',
    },
    {
      label: 'Landscape Design & Install',
      text: 'Design consultation, plant/hardscape selection, and full installation per the approved design. Assumes existing utility lines are marked and accessible before digging. Permit fees, if required by the municipality, are billed separately. Excludes ongoing maintenance after installation — see recurring service options.',
    },
  ],
  general: [
    {
      label: 'Standard Scope',
      text: 'Work performed is limited to the line items listed above, at the location provided. Additional work discovered on-site will be quoted separately before proceeding. Price assumes normal access and working conditions.',
    },
    {
      label: 'Estimate Assumptions',
      text: 'This quote is an estimate based on the information provided and is subject to on-site verification. Final pricing may adjust if actual conditions differ materially from what was described. Excludes permits, materials not listed above, and work outside the stated scope.',
    },
  ],
}

/** Templates for the tenant's industry, falling back to the general set. */
export function getScopeTemplates(industry: string | null | undefined): ScopeTemplate[] {
  const key = industry as IndustryKey
  return QUOTE_SCOPE_TEMPLATES[key] || QUOTE_SCOPE_TEMPLATES.general || []
}
