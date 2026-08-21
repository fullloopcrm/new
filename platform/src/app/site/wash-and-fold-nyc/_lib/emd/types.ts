export interface NeighborhoodChallenge {
  title: string
  body: string
}

export interface LocalFAQ {
  question: string
  answer: string
}

export interface WashFoldMicrositeConfig {
  /** Custom domain this config serves, e.g. "washandfoldbrooklyn.com" (no www, no protocol). */
  domain: string
  /** Route slug under emd-microsites-washandfold/, e.g. "washandfoldbrooklyn". */
  slug: string
  /** Brand name shown in the hero, e.g. "Wash & Fold Brooklyn". */
  brandName: string
  /** Neighborhood or borough name used in body copy, e.g. "Brooklyn" or "the Upper East Side". */
  areaName: string
  /** Borough this area belongs to (same value for a whole-borough config). */
  borough: string
  metaTitle: string
  metaDescription: string
  /** Opening welcome copy — 2-3 paragraphs, area-specific. */
  introParagraphs: string[]
  /** Local laundry-logistics specifics — building stock, density, whatever makes this area distinct. */
  areaChallenges: NeighborhoodChallenge[]
  /** Hyper-local FAQs, on top of the shared general FAQ set every site also renders. */
  localFaqs: LocalFAQ[]
  /** Real landmarks for this area, pulled from the parent tenant's own neighborhood data — used in body copy and schema, never invented. */
  landmarks: string[]
  /** Neighborhood names to feature in the "we serve" directory for this config — either the borough's full list or a hyper-local cluster. */
  featuredNeighborhoods: string[]
  /** Latitude/longitude for geo meta tags and schema. */
  geo: { lat: string; lng: string }
}
