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
  { slug: 'miami-dade', urlSlug: 'miami-dade-maid-service', name: 'Miami-Dade County', state: 'FL', description: 'Professional house cleaning services throughout Miami-Dade County — from Miami Beach and Brickell to Coral Gables and Kendall.', lat: 25.7617, lng: -80.1918 },
  { slug: 'broward', urlSlug: 'broward-county-maid-service', name: 'Broward County', state: 'FL', description: 'Trusted cleaning services across Broward County — Fort Lauderdale, Hollywood, Pembroke Pines, Weston, and more.', lat: 26.1224, lng: -80.1373 },
  { slug: 'palm-beach', urlSlug: 'palm-beach-county-maid-service', name: 'Palm Beach County', state: 'FL', description: 'Premium cleaning services in Palm Beach County — West Palm Beach, Boca Raton, Delray Beach, Jupiter, and beyond.', lat: 26.7153, lng: -80.0534 },
  { slug: 'tampa-bay', urlSlug: 'tampa-bay-maid-service', name: 'Tampa Bay', state: 'FL', description: 'Reliable cleaning services in the Tampa Bay area — Tampa, St. Petersburg, Clearwater, and surrounding communities.', lat: 27.9506, lng: -82.4572 },
  { slug: 'orlando', urlSlug: 'orlando-maid-service', name: 'Orlando / Central Florida', state: 'FL', description: 'Professional cleaning services in the Orlando metro — Winter Park, Kissimmee, Lake Nona, and Central Florida neighborhoods.', lat: 28.5383, lng: -81.3792 },
  { slug: 'jacksonville', urlSlug: 'jacksonville-maid-service', name: 'Jacksonville', state: 'FL', description: 'Expert cleaning services throughout Jacksonville — the Beaches, San Marco, Riverside, Ponte Vedra, and St. Augustine.', lat: 30.3322, lng: -81.6557 },
  { slug: 'southwest-florida', urlSlug: 'southwest-florida-maid-service', name: 'Southwest Florida', state: 'FL', description: 'Premium cleaning services in Southwest Florida — Naples, Fort Myers, Sarasota, Cape Coral, and the Gulf Coast islands.', lat: 26.1420, lng: -81.7948 },
  { slug: 'space-coast', urlSlug: 'space-coast-maid-service', name: 'Space Coast / Treasure Coast', state: 'FL', description: 'Trusted cleaning services along the Space Coast and Treasure Coast — Melbourne, Cocoa Beach, Port St. Lucie, and Vero Beach.', lat: 28.0836, lng: -80.6081 },
  { slug: 'florida-keys', urlSlug: 'florida-keys-maid-service', name: 'Florida Keys', state: 'FL', description: 'Professional cleaning services throughout the Florida Keys — Key West, Key Largo, Islamorada, Marathon, and all the islands in between.', lat: 24.5551, lng: -81.7800 },
  { slug: 'north-central-florida', urlSlug: 'north-central-florida-maid-service', name: 'North Central Florida', state: 'FL', description: 'Reliable cleaning services across North Central Florida — Gainesville, Ocala, The Villages, Crystal River, and surrounding communities.', lat: 29.1872, lng: -82.1401 },
  { slug: 'panhandle', urlSlug: 'panhandle-maid-service', name: 'Florida Panhandle / Northwest Florida', state: 'FL', description: 'Professional cleaning services across the Florida Panhandle — Pensacola, Destin, Panama City Beach, Tallahassee, 30A, and the Emerald Coast.', lat: 30.4383, lng: -86.4958 },
]
