import type { WashFoldMicrositeConfig } from './types'
import { washAndFoldBrooklynConfig } from './washandfoldbrooklyn'
import { washAndFoldQueensConfig } from './washandfoldqueens'
import { washAndFoldUpperEastSideConfig } from './washandfolduppereastside'
import { washAndFoldUpperWestSideConfig } from './washandfoldupperweastside'

export const WASHFOLD_MICROSITE_CONFIGS: WashFoldMicrositeConfig[] = [
  washAndFoldBrooklynConfig,
  washAndFoldQueensConfig,
  washAndFoldUpperEastSideConfig,
  washAndFoldUpperWestSideConfig,
]

const BY_DOMAIN = new Map<string, WashFoldMicrositeConfig>(
  WASHFOLD_MICROSITE_CONFIGS.map(c => [c.domain, c]),
)

/** Looks up a wash-and-fold microsite config by request host (with or without "www."). */
export function getWashFoldConfigForHost(host: string): WashFoldMicrositeConfig | undefined {
  const clean = host.split(':')[0].toLowerCase().replace(/^www\./, '')
  return BY_DOMAIN.get(clean)
}

/** Every sister microsite other than `config` itself — used for the cross-link network. Only 4 total, so all of them are shown rather than a geo-nearest subset. */
export function getOtherWashFoldSites(config: WashFoldMicrositeConfig): WashFoldMicrositeConfig[] {
  return WASHFOLD_MICROSITE_CONFIGS.filter(c => c.domain !== config.domain)
}
