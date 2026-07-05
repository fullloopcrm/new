import { AREAS, type Area } from './data/areas'
import { MANHATTAN_NEIGHBORHOODS } from './data/manhattan'
import { BROOKLYN_NEIGHBORHOODS } from './data/brooklyn'
import { QUEENS_NEIGHBORHOODS } from './data/queens'
import { LONG_ISLAND_NEIGHBORHOODS } from './data/long-island'
import { NEW_JERSEY_NEIGHBORHOODS } from './data/new-jersey'

export interface Neighborhood {
  slug: string
  urlSlug: string
  name: string
  area: string
  lat: number
  lng: number
  zip_codes: string[]
  landmarks: string[]
  housing_types: string[]
  cleaning_challenges: string[]
  nearby: string[]
}

export const ALL_NEIGHBORHOODS: Neighborhood[] = [
  ...MANHATTAN_NEIGHBORHOODS,
  ...BROOKLYN_NEIGHBORHOODS,
  ...QUEENS_NEIGHBORHOODS,
  ...LONG_ISLAND_NEIGHBORHOODS,
  ...NEW_JERSEY_NEIGHBORHOODS,
]

export function getArea(slug: string): Area | undefined {
  return AREAS.find(a => a.slug === slug)
}

export function getAreaByUrlSlug(urlSlug: string): Area | undefined {
  return AREAS.find(a => a.urlSlug === urlSlug)
}

export function getNeighborhood(slug: string): Neighborhood | undefined {
  return ALL_NEIGHBORHOODS.find(n => n.slug === slug)
}

export function getNeighborhoodByUrlSlug(urlSlug: string): Neighborhood | undefined {
  return ALL_NEIGHBORHOODS.find(n => n.urlSlug === urlSlug)
}

export function getNeighborhoodsByArea(areaSlug: string): Neighborhood[] {
  return ALL_NEIGHBORHOODS.filter(n => n.area === areaSlug)
}

export function getAreaForNeighborhood(neighborhoodSlug: string): Area | undefined {
  const n = getNeighborhood(neighborhoodSlug)
  if (!n) return undefined
  return getArea(n.area)
}

export function getAllAreaSlugs(): string[] {
  return AREAS.map(a => a.slug)
}

export function getAllAreaUrlSlugs(): string[] {
  return AREAS.map(a => a.urlSlug)
}

export function getAllNeighborhoodSlugs(): string[] {
  return ALL_NEIGHBORHOODS.map(n => n.slug)
}

export function getAllNeighborhoodUrlSlugs(): string[] {
  return ALL_NEIGHBORHOODS.map(n => n.urlSlug)
}

export function getAllUrlSlugs(): string[] {
  return [...getAllAreaUrlSlugs(), ...getAllNeighborhoodUrlSlugs()]
}

export { AREAS, type Area }
