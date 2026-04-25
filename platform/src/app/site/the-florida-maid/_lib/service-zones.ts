export const SERVICE_ZONES = [
  { id: 'miami_dade', label: 'Miami-Dade County', labelES: 'Condado de Miami-Dade', car_required: true },
  { id: 'broward', label: 'Broward County', labelES: 'Condado de Broward', car_required: true },
  { id: 'palm_beach', label: 'Palm Beach County', labelES: 'Condado de Palm Beach', car_required: true },
  { id: 'tampa_bay', label: 'Tampa Bay Area', labelES: 'Área de Tampa Bay', car_required: true },
  { id: 'orlando', label: 'Orlando / Central Florida', labelES: 'Orlando / Florida Central', car_required: true },
  { id: 'jacksonville', label: 'Jacksonville / Northeast FL', labelES: 'Jacksonville / Noreste de FL', car_required: true },
  { id: 'southwest_fl', label: 'Southwest Florida (Naples / Fort Myers)', labelES: 'Suroeste de Florida (Naples / Fort Myers)', car_required: true },
  { id: 'space_coast', label: 'Space Coast / Brevard', labelES: 'Space Coast / Brevard', car_required: true },
  { id: 'florida_keys', label: 'Florida Keys', labelES: 'Cayos de Florida', car_required: true },
  { id: 'north_central', label: 'North Central Florida (Gainesville / Ocala)', labelES: 'Norte Central de Florida (Gainesville / Ocala)', car_required: true },
  { id: 'panhandle', label: 'Panhandle (Pensacola / Destin / Panama City)', labelES: 'Panhandle (Pensacola / Destin / Panama City)', car_required: true },
] as const

export type ServiceZoneId = typeof SERVICE_ZONES[number]['id']

export function guessZoneFromAddress(address: string): ServiceZoneId | null {
  const a = address.toLowerCase()
  if (a.includes('key west') || a.includes('key largo') || a.includes('islamorada') || a.includes('marathon') || /\b330[0-5]\d\b/.test(a)) return 'florida_keys'
  if (a.includes('miami') || a.includes('hialeah') || a.includes('homestead') || a.includes('coral gables') || a.includes('doral') || a.includes('kendall') || a.includes('aventura') || /\b331\d{2}\b/.test(a)) return 'miami_dade'
  if (a.includes('fort lauderdale') || a.includes('hollywood, fl') || a.includes('pembroke pines') || a.includes('miramar') || a.includes('coral springs') || a.includes('pompano') || a.includes('weston') || /\b333\d{2}\b/.test(a)) return 'broward'
  if (a.includes('west palm') || a.includes('boca raton') || a.includes('boynton') || a.includes('delray') || a.includes('jupiter') || a.includes('palm beach') || /\b334\d{2}\b/.test(a)) return 'palm_beach'
  if (a.includes('tampa') || a.includes('st petersburg') || a.includes('clearwater') || a.includes('sarasota') || a.includes('bradenton') || /\b336\d{2}\b/.test(a) || /\b337\d{2}\b/.test(a)) return 'tampa_bay'
  if (a.includes('orlando') || a.includes('kissimmee') || a.includes('winter park') || a.includes('sanford') || a.includes('daytona') || /\b328\d{2}\b/.test(a) || /\b327\d{2}\b/.test(a)) return 'orlando'
  if (a.includes('jacksonville') || a.includes('st augustine') || a.includes('ponte vedra') || /\b322\d{2}\b/.test(a)) return 'jacksonville'
  if (a.includes('naples') || a.includes('fort myers') || a.includes('cape coral') || a.includes('bonita springs') || /\b339\d{2}\b/.test(a) || /\b341\d{2}\b/.test(a)) return 'southwest_fl'
  if (a.includes('melbourne') || a.includes('cocoa') || a.includes('titusville') || a.includes('palm bay') || /\b329\d{2}\b/.test(a)) return 'space_coast'
  if (a.includes('gainesville') || a.includes('ocala') || /\b326\d{2}\b/.test(a)) return 'north_central'
  if (a.includes('pensacola') || a.includes('destin') || a.includes('panama city') || a.includes('tallahassee') || /\b325\d{2}\b/.test(a) || /\b324\d{2}\b/.test(a)) return 'panhandle'
  return null
}

export function zoneRequiresCar(zoneId: string): boolean {
  return SERVICE_ZONES.find(z => z.id === zoneId)?.car_required ?? false
}
