import { AREAS, type Area } from './data/areas'
import { MIAMI_DADE_NEIGHBORHOODS } from './data/miami-dade'
import { BROWARD_NEIGHBORHOODS } from './data/broward'
import { PALM_BEACH_NEIGHBORHOODS } from './data/palm-beach'
import { TAMPA_BAY_NEIGHBORHOODS } from './data/tampa-bay'
import { ORLANDO_NEIGHBORHOODS } from './data/orlando'
import { JACKSONVILLE_NEIGHBORHOODS } from './data/jacksonville'
import { SOUTHWEST_FLORIDA_NEIGHBORHOODS } from './data/southwest-florida'
import { SPACE_COAST_NEIGHBORHOODS } from './data/space-coast'
import { FLORIDA_KEYS_NEIGHBORHOODS } from './data/florida-keys'
import { NORTH_CENTRAL_FLORIDA_NEIGHBORHOODS } from './data/north-central-florida'
import { PANHANDLE_NEIGHBORHOODS } from './data/panhandle'

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
  ...MIAMI_DADE_NEIGHBORHOODS,
  ...BROWARD_NEIGHBORHOODS,
  ...PALM_BEACH_NEIGHBORHOODS,
  ...TAMPA_BAY_NEIGHBORHOODS,
  ...ORLANDO_NEIGHBORHOODS,
  ...JACKSONVILLE_NEIGHBORHOODS,
  ...SOUTHWEST_FLORIDA_NEIGHBORHOODS,
  ...SPACE_COAST_NEIGHBORHOODS,
  ...FLORIDA_KEYS_NEIGHBORHOODS,
  ...NORTH_CENTRAL_FLORIDA_NEIGHBORHOODS,
  ...PANHANDLE_NEIGHBORHOODS,
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
