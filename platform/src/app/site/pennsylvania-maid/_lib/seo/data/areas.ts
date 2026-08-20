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
  { slug: 'philadelphia', urlSlug: 'philadelphia-maid-service', name: 'Philadelphia', state: 'PA', description: 'Professional house cleaning across Philadelphia — Center City, Old City, Fishtown, Manayunk, Chestnut Hill, University City, and South Philadelphia.', lat: 39.9526, lng: -75.1652 },
]
