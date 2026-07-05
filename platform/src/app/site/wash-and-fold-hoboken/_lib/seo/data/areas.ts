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
  { slug: 'manhattan', urlSlug: 'manhattan-maid-service', name: 'Manhattan', state: 'NY', description: 'Professional house cleaning services throughout Manhattan — from the Upper East Side to the Financial District.', lat: 40.7831, lng: -73.9712 },
  { slug: 'brooklyn', urlSlug: 'brooklyn-maid-service', name: 'Brooklyn', state: 'NY', description: 'Trusted cleaning services across Brooklyn neighborhoods — Park Slope, Brooklyn Heights, DUMBO, and more.', lat: 40.6782, lng: -73.9442 },
  { slug: 'queens', urlSlug: 'queens-maid-service', name: 'Queens', state: 'NY', description: 'Reliable cleaning services in Queens — Astoria, Long Island City, Forest Hills, and beyond.', lat: 40.7282, lng: -73.7949 },
  { slug: 'long-island', urlSlug: 'long-island-maid-service', name: 'Long Island', state: 'NY', description: 'Premium cleaning services on Long Island — Great Neck, Manhasset, Port Washington, and Garden City.', lat: 40.7891, lng: -73.7002 },
  { slug: 'new-jersey', urlSlug: 'new-jersey-maid-service', name: 'New Jersey', state: 'NJ', description: 'Professional cleaning services in NJ waterfront communities — Hoboken, Jersey City, Weehawken, and Edgewater.', lat: 40.7439, lng: -74.0324 },
]
