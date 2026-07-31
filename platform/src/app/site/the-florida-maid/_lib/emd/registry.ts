import type { EmdMicrositeConfig } from './types'
import { miamiBeachMaidConfig } from './miami-beach-maid'
import { westPalmBeachMaidConfig } from './west-palm-beach-maid'
import { fortLauderdaleMaidConfig } from './fort-lauderdale-maid'
import { gainesvilleMaidConfig } from './gainesville-maid'
import { orlandoMaidConfig } from './orlando-maid'

const CONFIGS: EmdMicrositeConfig[] = [
  miamiBeachMaidConfig,
  westPalmBeachMaidConfig,
  fortLauderdaleMaidConfig,
  gainesvilleMaidConfig,
  orlandoMaidConfig,
]

const BY_DOMAIN = new Map<string, EmdMicrositeConfig>(
  CONFIGS.map(c => [c.domain, c]),
)

/** Looks up an EMD microsite config by request host (with or without "www."). */
export function getEmdConfigForHost(host: string): EmdMicrositeConfig | undefined {
  const clean = host.split(':')[0].toLowerCase().replace(/^www\./, '')
  return BY_DOMAIN.get(clean)
}
