export interface NeighborhoodChallenge {
  title: string
  body: string
}

export interface LocalFAQ {
  question: string
  answer: string
}

export interface NeighborhoodMicrositeConfig {
  /** Custom domain this config serves, e.g. "sohoexterminator.com" (no www, no protocol). */
  domain: string
  /** Route slug under emd-microsites-exterminator/, e.g. "soho-exterminator". */
  slug: string
  /** Brand name shown in the hero, e.g. "SoHo Exterminator". */
  brandName: string
  /** Neighborhood name used in body copy, e.g. "SoHo". */
  neighborhoodName: string
  /** Borough/region this neighborhood belongs to, matching data.ts region values. */
  borough: string
  metaTitle: string
  metaDescription: string
  /** Opening welcome copy — 2-3 paragraphs, neighborhood-specific. */
  introParagraphs: string[]
  /** Local pest-pressure specifics — building stock, density, whatever makes this neighborhood distinct. */
  neighborhoodChallenges: NeighborhoodChallenge[]
  /** Hyper-local FAQs, on top of the shared general FAQ set every site also renders. */
  localFaqs: LocalFAQ[]
  /** Latitude/longitude for geo meta tags and schema. */
  geo: { lat: string; lng: string }
}
