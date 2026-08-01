import type { EmdMicrositeConfig } from './types'
import { miamiBeachMaidConfig } from './miami-beach-maid'
import { westPalmBeachMaidConfig } from './west-palm-beach-maid'
import { fortLauderdaleMaidConfig } from './fort-lauderdale-maid'
import { gainesvilleMaidConfig } from './gainesville-maid'
import { orlandoMaidConfig } from './orlando-maid'
import { pompanoBeachMaidConfig } from './pompano-beach-maid'
import { tallahasseeMaidConfig } from './tallahassee-maid'
import { cocoaBeachMaidConfig } from './cocoa-beach-maid'
import { destinMaidConfig } from './destin-maid'
import { pensacolaMaidConfig } from './pensacola-maid'
import { portStLucieMaidConfig } from './port-st-lucie-maid'
import { veroBeachMaidConfig } from './vero-beach-maid'
import { coralGablesMaidConfig } from './coral-gables-maid'
import { fortMyersMaidConfig } from './fort-myers-maid'
import { naplesMaidConfig } from './naples-maid'
import { bocaRatonMaidConfig } from './boca-raton-maid'
import { sarasotaMaidConfig } from './sarasota-maid'
import { stPeteMaidConfig } from './st-pete-maid'
import { daytonaBeachMaidConfig } from './daytona-beach-maid'
import { panamaCityMaidConfig } from './panama-city-maid'
import { brandonMaidConfig } from './brandon-maid'
import { celebrationMaidConfig } from './celebration-maid'
import { clermontMaidConfig } from './clermont-maid'
import { coralSpringsMaidConfig } from './coral-springs-maid'
import { delandMaidConfig } from './deland-maid'
import { lakeMaryMaidConfig } from './lake-mary-maid'
import { longwoodMaidConfig } from './longwood-maid'
import { sanfordMaidConfig } from './sanford-maid'
import { theVillagesMaidConfig } from './the-villages-maid'

const CONFIGS: EmdMicrositeConfig[] = [
  miamiBeachMaidConfig,
  westPalmBeachMaidConfig,
  fortLauderdaleMaidConfig,
  gainesvilleMaidConfig,
  orlandoMaidConfig,
  pompanoBeachMaidConfig,
  tallahasseeMaidConfig,
  cocoaBeachMaidConfig,
  destinMaidConfig,
  pensacolaMaidConfig,
  portStLucieMaidConfig,
  veroBeachMaidConfig,
  coralGablesMaidConfig,
  fortMyersMaidConfig,
  naplesMaidConfig,
  bocaRatonMaidConfig,
  sarasotaMaidConfig,
  stPeteMaidConfig,
  daytonaBeachMaidConfig,
  panamaCityMaidConfig,
  brandonMaidConfig,
  celebrationMaidConfig,
  clermontMaidConfig,
  coralSpringsMaidConfig,
  delandMaidConfig,
  lakeMaryMaidConfig,
  longwoodMaidConfig,
  sanfordMaidConfig,
  theVillagesMaidConfig,
]

const BY_DOMAIN = new Map<string, EmdMicrositeConfig>(
  CONFIGS.map(c => [c.domain, c]),
)

/** Looks up an EMD microsite config by request host (with or without "www."). */
export function getEmdConfigForHost(host: string): EmdMicrositeConfig | undefined {
  const clean = host.split(':')[0].toLowerCase().replace(/^www\./, '')
  return BY_DOMAIN.get(clean)
}
