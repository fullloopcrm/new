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
  { slug: 'manhattan', urlSlug: 'manhattan-wash-and-fold', name: 'Manhattan', state: 'NY', description: 'Professional wash and fold laundry service throughout Manhattan — from the Upper East Side to the Financial District.', lat: 40.7831, lng: -73.9712 },
  { slug: 'brooklyn', urlSlug: 'brooklyn-wash-and-fold', name: 'Brooklyn', state: 'NY', description: 'Trusted wash and fold laundry service across Brooklyn — Park Slope, Williamsburg, DUMBO, and more.', lat: 40.6782, lng: -73.9442 },
  { slug: 'queens', urlSlug: 'queens-wash-and-fold', name: 'Queens', state: 'NY', description: 'Reliable wash and fold laundry service in Queens — Astoria, Long Island City, Forest Hills, and beyond.', lat: 40.7282, lng: -73.7949 },
]
