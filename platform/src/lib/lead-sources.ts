/**
 * Curated lead-source options for direct-booking flows (self-book, admin
 * quick-add) that create a new client without ever touching the deals
 * pipeline. Derived from the real free-text values already observed in
 * deals.source / clients.source (referral, google, yelp, website, phone),
 * consolidated into a fixed set a <select> can enforce as required.
 *
 * Not the same list as deals.source, which is unconstrained free text
 * (URL paths, import tags, form types) -- there was no existing curated
 * list to reuse.
 */
export const LEAD_SOURCE_OPTIONS = [
  { value: 'referral', label: 'Referral (friend/family/existing client)' },
  { value: 'google', label: 'Google Search' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'yelp', label: 'Yelp' },
  { value: 'website', label: 'Website / Online Search' },
  { value: 'phone_inbound', label: 'Called In' },
  { value: 'walk_in', label: 'Walk-in / In-Person' },
  { value: 'returning_client', label: 'Returning Client' },
  { value: 'other', label: 'Other' },
] as const

export type LeadSource = typeof LEAD_SOURCE_OPTIONS[number]['value']

export const LEAD_SOURCE_VALUES: readonly string[] = LEAD_SOURCE_OPTIONS.map(o => o.value)

export function isValidLeadSource(value: unknown): value is LeadSource {
  return typeof value === 'string' && LEAD_SOURCE_VALUES.includes(value)
}
