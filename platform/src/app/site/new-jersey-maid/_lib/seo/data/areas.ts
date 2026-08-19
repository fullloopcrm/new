export interface Area {
  slug: string
  urlSlug: string
  name: string
  state: string
  description: string
  lat: number
  lng: number
}

// NYC-borough area data was removed 2026-08-19 — this tenant is an independent
// business with its own service area, not an extension of NYC Maid's coverage.
// Real area/neighborhood data for this tenant has not been built yet.
export const AREAS: Area[] = []
