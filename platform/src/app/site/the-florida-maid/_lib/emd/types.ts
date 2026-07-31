export interface EmdNeighborhood {
  name: string
  blurb: string
}

export interface EmdFAQ {
  question: string
  answer: string
}

export interface EmdChallenge {
  title: string
  body: string
}

export interface EmdTestimonial {
  text: string
  name: string
  neighborhood: string
}

export interface EmdMicrositeConfig {
  /** Custom domain this config serves, e.g. "miamibeachmaid.com" (no www, no protocol). */
  domain: string
  /** Brand name shown in the logo/title area, e.g. "Miami Beach Maid". */
  brandName: string
  /** City or area name used in body copy, e.g. "Miami Beach". */
  city: string
  /** Short region descriptor for metadata, e.g. "Miami Beach, FL". */
  regionLabel: string
  metaTitle: string
  metaDescription: string
  /** Opening welcome copy — 2-3 paragraphs, city-specific. */
  introParagraphs: string[]
  ourStory: string[]
  differentiation: string[]
  challenges: EmdChallenge[]
  neighborhoods: EmdNeighborhood[]
  pricingExplainer: string[]
  firstVisitSteps: string[]
  frequencyGuide: { frequency: string; body: string }[]
  testimonials: EmdTestimonial[]
  faqs: EmdFAQ[]
  /** Latitude/longitude for geo meta tags. */
  geo: { lat: string; lng: string }
}
