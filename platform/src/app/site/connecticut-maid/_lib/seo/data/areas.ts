export interface Area {
  slug: string
  urlSlug: string
  name: string
  state: string
  description: string
  lat: number
  lng: number
}

export const AREAS: Area[] = [
  { slug: 'fairfield-county', urlSlug: 'fairfield-county-maid-service', name: 'Fairfield County', state: 'CT', description: 'Professional house cleaning across lower Fairfield County — Norwalk, Stamford, Westport, Darien, Wilton, Greenwich, and New Canaan.', lat: 41.1408, lng: -73.3579 },
]
