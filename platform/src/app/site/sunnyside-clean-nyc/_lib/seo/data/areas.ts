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
  {
    slug: 'manhattan',
    urlSlug: 'nyc-cleaning-services',
    name: 'Manhattan',
    state: 'NY',
    description: 'Professional cleaning services across Manhattan — from the Upper East Side to the Financial District.',
    lat: 40.7831,
    lng: -73.9712,
  },
  {
    slug: 'queens',
    urlSlug: 'queens-cleaning-services',
    name: 'Queens',
    state: 'NY',
    description: 'Reliable cleaning services throughout Queens — Sunnyside, Astoria, LIC, Jackson Heights and more.',
    lat: 40.7282,
    lng: -73.7949,
  },
  {
    slug: 'brooklyn',
    urlSlug: 'brooklyn-cleaning-services',
    name: 'Brooklyn',
    state: 'NY',
    description: 'Trusted cleaning services across Brooklyn — Williamsburg, Park Slope, DUMBO, Bushwick and beyond.',
    lat: 40.6782,
    lng: -73.9442,
  },
]
