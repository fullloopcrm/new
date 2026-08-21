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
import { wellingtonMaidConfig } from './wellington-maid'
import { wesleyChapelMaidConfig } from './wesley-chapel-maid'
import { westonMaidConfig } from './weston-maid'
import { winterGardenMaidConfig } from './winter-garden-maid'
import { winterParkMaidConfig } from './winter-park-maid'
import { oviedoMaidConfig } from './oviedo-maid'
import { palmBeachGardensMaidConfig } from './palm-beach-gardens-maid'
import { parklandMaidConfig } from './parkland-maid'
import { riverviewMaidConfig } from './riverview-maid'
import { windermereMaidConfig } from './windermere-maid'
import { altamonteSpringsMaidConfig } from './altamonte-springs-maid'
import { brentMaidConfig } from './brent-maid'
import { cordovaParkMaidConfig } from './cordova-park-maid'
import { eastHillMaidConfig } from './east-hill-maid'
import { ensleyMaidConfig } from './ensley-maid'
import { ferryPassMaidConfig } from './ferry-pass-maid'
import { northHillMaidConfig } from './north-hill-maid'
import { paceMaidConfig } from './pace-maid'
import { gulfBreezeMaidConfig } from './gulf-breeze-maid'
import { perdidoKeyMaidConfig } from './perdido-key-maid'
import { warringtonMaidConfig } from './warrington-maid'
import { tampaMaidConfig } from './tampa-maid'
import { southTampaMaidConfig } from './south-tampa-maid'
import { newTampaMaidConfig } from './new-tampa-maid'
import { seminoleHeightsMaidConfig } from './seminole-heights-maid'
import { clearwaterBeachMaidConfig } from './clearwater-beach-maid'
import { davisIslandsMaidConfig } from './davis-islands-maid'
import { sandKeyMaidConfig } from './sand-key-maid'
import { carrollwoodMaidConfig } from './carrollwood-maid'
import { oldNortheastMaidConfig } from './old-northeast-maid'
import { snellIsleMaidConfig } from './snell-isle-maid'
import { beachParkMaidConfig } from './beach-park-maid'
import { channelsideMaidConfig } from './channelside-maid'
import { palmaCeiaMaidConfig } from './palma-ceia-maid'
import { parklandEstatesMaidConfig } from './parkland-estates-maid'
import { sunsetParkMaidConfig } from './sunset-park-maid'
import { hydeParkMaidConfig } from './hyde-park-maid'
import { westchaseMaidConfig } from './westchase-maid'
import { downtownStPeteMaidConfig } from './downtown-st-pete-maid'

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
  wellingtonMaidConfig,
  wesleyChapelMaidConfig,
  westonMaidConfig,
  winterGardenMaidConfig,
  winterParkMaidConfig,
  oviedoMaidConfig,
  palmBeachGardensMaidConfig,
  parklandMaidConfig,
  riverviewMaidConfig,
  windermereMaidConfig,
  altamonteSpringsMaidConfig,
  brentMaidConfig,
  cordovaParkMaidConfig,
  eastHillMaidConfig,
  ensleyMaidConfig,
  ferryPassMaidConfig,
  northHillMaidConfig,
  paceMaidConfig,
  gulfBreezeMaidConfig,
  perdidoKeyMaidConfig,
  warringtonMaidConfig,
  tampaMaidConfig,
  southTampaMaidConfig,
  newTampaMaidConfig,
  seminoleHeightsMaidConfig,
  clearwaterBeachMaidConfig,
  davisIslandsMaidConfig,
  sandKeyMaidConfig,
  carrollwoodMaidConfig,
  oldNortheastMaidConfig,
  snellIsleMaidConfig,
  beachParkMaidConfig,
  channelsideMaidConfig,
  palmaCeiaMaidConfig,
  parklandEstatesMaidConfig,
  sunsetParkMaidConfig,
  hydeParkMaidConfig,
  westchaseMaidConfig,
  downtownStPeteMaidConfig,
]

const BY_DOMAIN = new Map<string, EmdMicrositeConfig>(
  CONFIGS.map(c => [c.domain, c]),
)

/** Looks up an EMD microsite config by request host (with or without "www."). */
export function getEmdConfigForHost(host: string): EmdMicrositeConfig | undefined {
  const clean = host.split(':')[0].toLowerCase().replace(/^www\./, '')
  return BY_DOMAIN.get(clean)
}

// Flat-earth approximation (equirectangular) — plenty accurate for ranking
// nearby Florida cities by distance; not used for anything requiring real
// geodesic precision.
function approxDistance(a: EmdMicrositeConfig['geo'], b: EmdMicrositeConfig['geo']): number {
  const lat1 = parseFloat(a.lat), lng1 = parseFloat(a.lng)
  const lat2 = parseFloat(b.lat), lng2 = parseFloat(b.lng)
  const avgLatRad = ((lat1 + lat2) / 2) * (Math.PI / 180)
  const dLat = lat2 - lat1
  const dLng = (lng2 - lng1) * Math.cos(avgLatRad)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

/** The `count` other EMD microsites geographically closest to `config` — for on-page "Nearby Locations" internal linking. */
export function getNearbyMicrosites(config: EmdMicrositeConfig, count = 5): EmdMicrositeConfig[] {
  return CONFIGS
    .filter(c => c.domain !== config.domain)
    .sort((a, b) => approxDistance(config.geo, a.geo) - approxDistance(config.geo, b.geo))
    .slice(0, count)
}
