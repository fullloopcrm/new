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
  { slug: 'central-jersey', urlSlug: 'central-jersey-maid-service', name: 'Central Jersey', state: 'NJ', description: 'Professional house cleaning across central New Jersey — New Brunswick, Highland Park, Edison, East Brunswick, Piscataway, North Brunswick, and Somerset.', lat: 40.4862, lng: -74.4518 },
]
