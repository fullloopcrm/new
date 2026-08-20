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
  { slug: 'nassau-county', urlSlug: 'nassau-county-maid-service', name: 'Nassau County', state: 'NY', description: 'Professional house cleaning across central Nassau County — Garden City, Mineola, Great Neck, Manhasset, Rockville Centre, Port Washington, and Hempstead.', lat: 40.7282, lng: -73.5871 },
]
