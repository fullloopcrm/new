import type { NeighborhoodMicrositeConfig } from './types'
import { upperWestSideExterminatorConfig } from './upper-west-side-exterminator'
import { sohoExterminatorConfig } from './soho-exterminator'
import { chelseaExterminatorConfig } from './chelsea-exterminator'
import { dumboExterminatorConfig } from './dumbo-exterminator'
import { greenwichVillageExterminatorConfig } from './greenwich-village-exterminator'
import { harlemExterminatorConfig } from './harlem-exterminator'
import { longIslandCityExterminatorConfig } from './long-island-city-exterminator'
import { midtownExterminatorConfig } from './midtown-exterminator'
import { parkSlopeExterminatorConfig } from './park-slope-exterminator'
import { stuyTownExterminatorConfig } from './stuy-town-exterminator'
import { sunnysideExterminatorConfig } from './sunnyside-exterminator'
import { tribecaExterminatorConfig } from './tribeca-exterminator'
import { upperEastSideExterminatorConfig } from './upper-east-side-exterminator'
import { williamsburgExterminatorConfig } from './williamsburg-exterminator'

export const NEIGHBORHOOD_MICROSITE_CONFIGS: NeighborhoodMicrositeConfig[] = [
  upperWestSideExterminatorConfig,
  sohoExterminatorConfig,
  chelseaExterminatorConfig,
  dumboExterminatorConfig,
  greenwichVillageExterminatorConfig,
  harlemExterminatorConfig,
  longIslandCityExterminatorConfig,
  midtownExterminatorConfig,
  parkSlopeExterminatorConfig,
  stuyTownExterminatorConfig,
  sunnysideExterminatorConfig,
  tribecaExterminatorConfig,
  upperEastSideExterminatorConfig,
  williamsburgExterminatorConfig,
]

const BY_DOMAIN = new Map<string, NeighborhoodMicrositeConfig>(
  NEIGHBORHOOD_MICROSITE_CONFIGS.map(c => [c.domain, c]),
)

/** Looks up a neighborhood microsite config by request host (with or without "www."). */
export function getNeighborhoodConfigForHost(host: string): NeighborhoodMicrositeConfig | undefined {
  const clean = host.split(':')[0].toLowerCase().replace(/^www\./, '')
  return BY_DOMAIN.get(clean)
}

/** Every sister neighborhood microsite other than `config` itself — used for the cross-link network. Only 14 total, so all of them are shown rather than a geo-nearest subset. */
export function getOtherNeighborhoodSites(config: NeighborhoodMicrositeConfig): NeighborhoodMicrositeConfig[] {
  return NEIGHBORHOOD_MICROSITE_CONFIGS.filter(c => c.domain !== config.domain)
}
