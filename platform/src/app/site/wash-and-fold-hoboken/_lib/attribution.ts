// Zip code → Neighborhood → Domains mapping for attribution
// Note: Each zip maps to ONE primary neighborhood (no duplicates)

export const ZIP_TO_NEIGHBORHOOD: Record<string, string> = {
  // Manhattan - Upper East Side
  '10021': 'Upper East Side',
  '10028': 'Upper East Side',
  '10065': 'Upper East Side',
  '10075': 'Upper East Side',
  '10128': 'Upper East Side',
  '10029': 'Upper East Side',
  
  // Manhattan - Upper West Side
  '10023': 'Upper West Side',
  '10024': 'Upper West Side',
  '10025': 'Upper West Side',
  '10069': 'Upper West Side',
  
  // Manhattan - Midtown
  '10017': 'Midtown',
  '10018': 'Midtown',
  '10020': 'Midtown',
  '10022': 'Midtown',
  '10103': 'Midtown',
  '10110': 'Midtown',
  '10111': 'Midtown',
  '10112': 'Midtown',
  
  // Manhattan - Hells Kitchen
  '10019': 'Hells Kitchen',
  '10036': 'Hells Kitchen',
  
  // Manhattan - Chelsea / Hudson Yards
  '10001': 'Chelsea',
  '10011': 'Chelsea',
  
  // Manhattan - Gramercy / Murray Hill
  '10010': 'Gramercy',
  '10016': 'Murray Hill',
  
  // Manhattan - Greenwich Village / West Village / East Village
  '10014': 'West Village',
  '10012': 'Greenwich Village',
  '10003': 'East Village',
  '10009': 'East Village',
  
  // Manhattan - Lower East Side
  '10002': 'Lower East Side',
  
  // Manhattan - SoHo / Tribeca / FiDi
  '10013': 'Tribeca',
  '10007': 'Tribeca',
  '10006': 'Financial District',
  '10005': 'Financial District',
  '10004': 'Financial District',
  '10038': 'Financial District',
  '10280': 'Battery Park',
  '10282': 'Battery Park',
  
  // Manhattan - Harlem
  '10026': 'Harlem',
  '10027': 'Harlem',
  '10030': 'Harlem',
  '10037': 'Harlem',
  '10039': 'Harlem',
  
  // Manhattan - Washington Heights
  '10031': 'Washington Heights',
  '10032': 'Washington Heights',
  '10033': 'Washington Heights',
  '10034': 'Washington Heights',
  '10040': 'Washington Heights',
  
  // Manhattan - Roosevelt Island
  '10044': 'Roosevelt Island',
  
  // Brooklyn
  '11201': 'Brooklyn Heights',
  '11205': 'Brooklyn Heights',
  '11217': 'Park Slope',
  '11215': 'Park Slope',
  '11231': 'Park Slope',
  '11251': 'DUMBO',
  '11220': 'Sunset Park',
  '11232': 'Sunset Park',
  
  // Queens - Long Island City
  '11101': 'Long Island City',
  '11109': 'Long Island City',
  '11120': 'Long Island City',
  
  // Queens - Astoria
  '11102': 'Astoria',
  '11103': 'Astoria',
  '11105': 'Astoria',
  '11106': 'Astoria',
  
  // Queens - Sunnyside / Woodside
  '11104': 'Sunnyside',
  '11377': 'Woodside',
  
  // Queens - Jackson Heights
  '11372': 'Jackson Heights',
  '11370': 'Jackson Heights',
  
  // Queens - Elmhurst / Corona
  '11373': 'Elmhurst',
  '11368': 'Corona',
  
  // Queens - Rego Park / Forest Hills
  '11374': 'Rego Park',
  '11375': 'Forest Hills',
  
  // Queens - Kew Gardens
  '11415': 'Kew Gardens',
  '11418': 'Kew Gardens',
  
  // Queens - Flushing
  '11354': 'Flushing',
  '11355': 'Flushing',
  '11358': 'Flushing',
  
  // Queens - Bayside
  '11359': 'Bayside',
  '11360': 'Bayside',
  '11361': 'Bayside',
  
  // Long Island - Great Neck
  '11020': 'Great Neck',
  '11021': 'Great Neck',
  '11023': 'Great Neck',
  '11024': 'Great Neck',
  
  // Long Island - Manhasset
  '11030': 'Manhasset',
  
  // Long Island - Port Washington
  '11050': 'Port Washington',
  '11051': 'Port Washington',
  
  // Long Island - Garden City
  '11530': 'Garden City',
  '11531': 'Garden City',
  
  // New Jersey - Hoboken
  '07030': 'Hoboken',
  
  // New Jersey - Jersey City
  '07302': 'Jersey City',
  '07304': 'Jersey City',
  '07305': 'Jersey City',
  '07306': 'Jersey City',
  '07307': 'Jersey City',
  '07310': 'Jersey City',
  '07311': 'Jersey City',
  
  // New Jersey - Weehawken
  '07086': 'Weehawken',
  '07087': 'Weehawken',
  
  // New Jersey - Edgewater
  '07020': 'Edgewater',
  
  // Florida - Tampa
  '33601': 'Tampa',
  '33602': 'Channelside',
  '33606': 'Hyde Park Tampa',
  '33609': 'South Tampa',
  '33611': 'South Tampa',
  '33629': 'South Tampa',
  '33647': 'New Tampa',
  '33612': 'New Tampa',
  '33613': 'New Tampa',
  '33626': 'Westchase',
  '33625': 'Carrollwood',
  '33624': 'Carrollwood',
  '33603': 'Seminole Heights',
  '33604': 'Seminole Heights',
  '33616': 'Parkland Estates',
  
  // Florida - St Pete
  '33701': 'Downtown St Pete',
  '33702': 'Old Northeast',
  '33703': 'Old Northeast',
  '33704': 'Snell Isle',
  
  // Florida - Clearwater
  '33767': 'Clearwater Beach',
  '33785': 'Sand Key',
}

export const NEIGHBORHOOD_TO_DOMAINS: Record<string, string[]> = {
  // Manhattan
  'Upper East Side': ['uesmaid.com', 'uescleaningservice.com', 'uescarpetcleaner.com'],
  'Upper West Side': ['uwsmaid.com', 'uwscleaningservice.com', 'uwscarpetcleaner.com'],
  'Midtown': ['midtownmaid.com', 'cleaningserviceinmidtown.com'],
  'Hells Kitchen': ['hellskitchenmaid.com', 'hellskitchencleaningservice.com'],
  'Chelsea': ['chelseacleaningservice.com', 'hudsonyardsmaid.com'],
  'Gramercy': ['grammercymaid.com'],
  'Murray Hill': ['murrayhillmaid.com', 'kipsbaymaid.com'],
  'West Village': ['westvillagemaid.com', 'westvillagecleaningservice.com'],
  'Greenwich Village': ['greenwichvillagemaid.com', 'greenwichvillagecleaningservice.com'],
  'East Village': ['eastvillagemaid.com'],
  'Lower East Side': ['lesmaid.com'],
  'SoHo': ['sohomaid.com', 'sohocleaningservice.com'],
  'Tribeca': ['tribecamaid.com', 'tribecacleaningservice.com'],
  'Financial District': ['fidimaid.com'],
  'Battery Park': ['batteryparkmaid.com'],
  'Harlem': ['harlemmaid.com'],
  'Washington Heights': ['washingtonheightsmaid.com'],
  'Stuyvesant Town': ['stuytownmaid.com', 'stuytowncleaningservice.com'],
  'Union Square': ['unionsquarecleaningservice.com'],
  'Columbus Circle': ['columbuscirclecleaningservice.com'],
  'Central Park': ['centralparkcleaningservice.com'],
  'Roosevelt Island': ['rooseveltislandcleaningservice.com'],
  'NoMad': ['nomadmaid.com'],
  'Flatiron': ['flatironmaid.com'],
  
  // Brooklyn
  'Brooklyn Heights': ['brooklynheightsmaid.com'],
  'Park Slope': ['parkslopemaid.com'],
  'DUMBO': ['cleaningservicedumbony.com'],
  'Sunset Park': ['sunsetparkmaid.com'],
  'Brooklyn': ['cleaningservicebrooklynny.com'],
  
  // Queens
  'Long Island City': ['licmaid.com', 'cleaningservicelongislandcity.com'],
  'Astoria': ['cleaningserviceastoriany.com'],
  'Sunnyside': ['cleaningservicesunnysideny.com'],
  'Woodside': ['woodsidemaid.com'],
  'Jackson Heights': ['jacksonheightsmaid.com'],
  'Elmhurst': ['elmhurstmaid.com'],
  'Corona': ['coronamaid.com'],
  'Rego Park': ['regoparkmaid.com'],
  'Forest Hills': ['foresthillsmaid.com'],
  'Kew Gardens': ['kewgardensmaid.com'],
  'Flushing': ['flushingmaid.com'],
  'Bayside': ['baysidemaid.com'],
  'Queens': ['cleaningservicequeensny.com', 'maidservicequeensny.com'],
  
  // Long Island
  'Great Neck': ['greatneckmaid.com'],
  'Manhasset': ['manhassetmaid.com'],
  'Port Washington': ['portwashingtonmaid.com'],
  'Garden City': ['gardencitymaid.com'],
  
  // New Jersey
  'Hoboken': ['hobokenmaidservice.com'],
  'Jersey City': ['jerseycitymaid.com'],
  'Weehawken': ['weehawkenmaid.com'],
  'Edgewater': ['edgewatermaid.com'],
  
  // Florida - Tampa
  'Tampa': ['thetampamaid.com'],
  'South Tampa': ['southtampamaid.com'],
  'New Tampa': ['newtampamaid.com'],
  'Channelside': ['channelsidemaid.com'],
  'Hyde Park Tampa': ['hydeparkmaid.com'],
  'Westchase': ['westchasemaid.com'],
  'Carrollwood': ['carrollwoodmaid.com'],
  'Seminole Heights': ['seminoleheightsmaid.com'],
  'Palma Ceia': ['palmaceiamaid.com'],
  'Beach Park': ['beachparkmaid.com'],
  'Davis Islands': ['davislandsmaid.com'],
  'Parkland Estates': ['parklandestatesmaid.com'],
  
  // Florida - St Pete
  'Downtown St Pete': ['downtownstpetemaid.com'],
  'Old Northeast': ['oldnortheastmaid.com'],
  'Snell Isle': ['snellislemaid.com'],
  
  // Florida - Clearwater
  'Clearwater Beach': ['clearwaterbeachmaid.com'],
  'Sand Key': ['sandkeymaid.com'],
}

// Extract zip code from address string
export function extractZip(address: string): string | null {
  // Match 5-digit zip at end of string
  const match = address.match(/\b(\d{5})(?:-\d{4})?\s*$/);
  if (match) return match[1];
  
  // Match 5-digit zip anywhere
  const anyMatch = address.match(/\b(\d{5})\b/);
  return anyMatch ? anyMatch[1] : null;
}

// Get neighborhood from zip
export function getNeighborhood(zip: string): string | null {
  return ZIP_TO_NEIGHBORHOOD[zip] || null;
}

// Get domains for a neighborhood
export function getDomainsForNeighborhood(neighborhood: string): string[] {
  return NEIGHBORHOOD_TO_DOMAINS[neighborhood] || [];
}

// Search engine / AI referrer detection
const SEARCH_DOMAINS = ['google.', 'bing.com', 'duckduckgo.', 'yahoo.', 'baidu.', 'yandex.', 'ecosia.', 'brave.', 'perplexity.ai', 'chatgpt.com', 'you.com']
function isSearchReferrer(referrer: string | null): boolean {
  if (!referrer) return false
  const low = referrer.toLowerCase()
  return SEARCH_DOMAINS.some(d => low.includes(d))
}

// Generic domains — high traffic, only match on CTA actions within short window
const GENERIC_DOMAINS = [
  'thenycmaid.com', 'thenycmaidservice.com',
  'thenyccleaningservice.com', 'thenyccleaningcrew.com',
  'nychousecleanernearme.com', 'citycleannyc.com', 'cleanservicenyc.com',
  'imlookingforamaidnearme.com', 'imlookingforamaidinnyctoday.com',
  'samedaycleannyc.com', 'nycemergencycleaning.com', 'maidny.com',
  'theusamaid.com', 'thetampamaid.com',
  'manhtattanmaidservice.com', 'maidservicequeensny.com',
  'thebestnychousecleaningservice.com',
]

// Core attribution logic:
// Site visited within 24h before booking from that location = 100% attribution
// Beyond 24h = no attribution
export async function attributeByAddress(
  address: string,
  submittedAt?: string,
  excludeClickIds?: string[]
): Promise<{
  domain: string
  confidence: number
  action: string
  minutesAgo: number
  neighborhood: string
  clickId: string
} | null> {
  const { supabaseAdmin } = await import('@/app/site/wash-and-fold-hoboken/_lib/supabase')

  const zip = extractZip(address)
  if (!zip) return null

  const neighborhood = getNeighborhood(zip)
  if (!neighborhood) return null

  const neighborhoodDomains = getDomainsForNeighborhood(neighborhood)
  const now = new Date(submittedAt || new Date().toISOString())
  const lookback10d = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)

  // Include both www and non-www variants for all domains
  const allDomains = [...neighborhoodDomains, ...GENERIC_DOMAINS.filter(d => !neighborhoodDomains.includes(d))]
  const allDomainVariants = allDomains.flatMap(d => [d, `www.${d}`])

  if (allDomainVariants.length > 0) {
    // Priority 1: CTA clicks (call/text) — highest confidence
    let ctaQuery = supabaseAdmin
      .from('lead_clicks')
      .select('id, domain, action, created_at')
      .in('domain', allDomainVariants)
      .in('action', ['call', 'text'])
      .gte('created_at', lookback10d.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (excludeClickIds && excludeClickIds.length > 0) {
      ctaQuery = ctaQuery.not('id', 'in', `(${excludeClickIds.join(',')})`)
    }

    const { data: ctas } = await ctaQuery

    if (ctas && ctas.length > 0) {
      const match = ctas[0]
      const minutes = Math.floor((now.getTime() - new Date(match.created_at).getTime()) / 60000)
      const confidence = calculateConfidence(minutes)
      if (confidence > 0) {
        return { domain: match.domain.replace(/^www\./, ''), confidence, action: match.action, minutesAgo: minutes, neighborhood, clickId: match.id }
      }
    }

    // Priority 2: Search-referred visits (Google/Bing/AI) within 3 days — person searched, saw site, called manually
    const lookback3d = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const { data: recentVisits } = await supabaseAdmin
      .from('lead_clicks')
      .select('id, domain, action, created_at, referrer, engaged_30s')
      .in('domain', allDomainVariants)
      .eq('action', 'visit')
      .gte('created_at', lookback3d.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    if (recentVisits && recentVisits.length > 0) {
      // 2a: Search-referred visit — strongest non-CTA signal (Bing → regoparkmaid.com → called)
      const searchVisit = recentVisits.find(v => isSearchReferrer(v.referrer))
      if (searchVisit) {
        const minutes = Math.floor((now.getTime() - new Date(searchVisit.created_at).getTime()) / 60000)
        const confidence = Math.min(90, calculateConfidence(minutes))
        if (confidence > 0) {
          return { domain: searchVisit.domain.replace(/^www\./, ''), confidence, action: 'search_visit', minutesAgo: minutes, neighborhood, clickId: searchVisit.id }
        }
      }

      // 2b: Engaged visit (30s+) — they browsed, then called
      const engagedVisit = recentVisits.find(v => v.engaged_30s)
      if (engagedVisit) {
        const minutes = Math.floor((now.getTime() - new Date(engagedVisit.created_at).getTime()) / 60000)
        const confidence = Math.min(80, calculateConfidence(minutes))
        if (confidence > 0) {
          return { domain: engagedVisit.domain.replace(/^www\./, ''), confidence, action: 'engaged_visit', minutesAgo: minutes, neighborhood, clickId: engagedVisit.id }
        }
      }
    }

    // Priority 3: Any visit from neighborhood domains within 24h — weakest signal
    const lookback1d = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    // Only match neighborhood-specific domains (not generic ones) for visit-only attribution
    const neighborhoodVariants = neighborhoodDomains.flatMap(d => [d, `www.${d}`])
    if (neighborhoodVariants.length > 0) {
      const recentNeighborhood = recentVisits?.filter(v =>
        neighborhoodVariants.includes(v.domain) &&
        new Date(v.created_at) >= lookback1d
      )
      const match = recentNeighborhood && recentNeighborhood.length > 0 ? recentNeighborhood[0] : null

      if (!match) {
        // Fallback query if no match in the 3-day window (visit might be from different domain set)
        const { data: visits } = await supabaseAdmin
          .from('lead_clicks')
          .select('id, domain, action, created_at')
          .in('domain', neighborhoodVariants)
          .eq('action', 'visit')
          .gte('created_at', lookback1d.toISOString())
          .lte('created_at', now.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)

        if (visits && visits.length > 0) {
          const v = visits[0]
          const minutes = Math.floor((now.getTime() - new Date(v.created_at).getTime()) / 60000)
          const confidence = Math.min(50, calculateConfidence(minutes))
          if (confidence > 0) {
            return { domain: v.domain.replace(/^www\./, ''), confidence, action: 'visit', minutesAgo: minutes, neighborhood, clickId: v.id }
          }
        }
      } else {
        const minutes = Math.floor((now.getTime() - new Date(match.created_at).getTime()) / 60000)
        const confidence = Math.min(50, calculateConfidence(minutes))
        if (confidence > 0) {
          return { domain: match.domain.replace(/^www\./, ''), confidence, action: 'visit', minutesAgo: minutes, neighborhood, clickId: match.id }
        }
      }
    }
  }

  return null
}

// Attribute a collect form submission — called when a new lead submits their info
export async function attributeCollectForm(
  clientName: string,
  address: string,
  clientId: string
): Promise<{ domain: string; confidence: number } | null> {
  const { supabaseAdmin } = await import('@/app/site/wash-and-fold-hoboken/_lib/supabase')

  const result = await attributeByAddress(address)
  if (!result) return null

  // Build notification message
  const timeLabel = result.minutesAgo < 60
    ? `${result.minutesAgo}min ago`
    : result.minutesAgo < 1440
      ? `${Math.round(result.minutesAgo / 60)}hr ago`
      : `${Math.round(result.minutesAgo / 1440)}d ago`

  const actionLabels: Record<string, string> = {
    call: '📞 Called from',
    text: '💬 Texted from',
    book: '📅 Booked from',
    search_visit: '🔍 Found',
    engaged_visit: '👀 Browsed',
    visit: '🌐 Visited',
  }
  const actionLabel = actionLabels[result.action] || '🌐 Visited'

  await supabaseAdmin.from('notifications').insert({
    type: 'hot_lead',
    title: 'Website → Lead',
    message: `${clientName} (${result.neighborhood}) — ${actionLabel} ${result.domain} ${timeLabel} → submitted collect form (${result.confidence}%)`
  })

  return { domain: result.domain, confidence: result.confidence }
}

// Attribute a booking — called when a booking is created
export async function autoAttributeBooking(
  bookingId: string,
  clientId: string,
  bookingCreatedAt?: string
): Promise<{ domain: string; confidence: number } | null> {
  const { supabaseAdmin } = await import('@/app/site/wash-and-fold-hoboken/_lib/supabase')

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('address, name')
    .eq('id', clientId)
    .single()

  if (!client?.address) return null

  const result = await attributeByAddress(client.address, bookingCreatedAt)
  if (!result) return null

  // Update booking with attribution
  await supabaseAdmin
    .from('bookings')
    .update({
      attributed_domain: result.domain,
      attribution_confidence: result.confidence,
      attributed_at: new Date().toISOString()
    })
    .eq('id', bookingId)

  // Build notification message
  const timeLabel = result.minutesAgo < 60
    ? `${result.minutesAgo}min ago`
    : result.minutesAgo < 1440
      ? `${Math.round(result.minutesAgo / 60)}hr ago`
      : `${Math.round(result.minutesAgo / 1440)}d ago`

  const actionLabels: Record<string, string> = {
    call: '📞 Called from',
    text: '💬 Texted from',
    book: '📅 Booked from',
    search_visit: '🔍 Found',
    engaged_visit: '👀 Browsed',
    visit: '🌐 Visited',
  }
  const actionLabel = actionLabels[result.action] || '🌐 Visited'

  await supabaseAdmin.from('notifications').insert({
    type: 'hot_lead',
    title: 'Website → Sale',
    message: `${client.name} (${result.neighborhood}) — ${actionLabel} ${result.domain} ${timeLabel} → booked (${result.confidence}%)`,
    booking_id: bookingId
  })

  return { domain: result.domain, confidence: result.confidence }
}

// Calculate confidence based on time difference (in minutes)
// Day 1 (24h) = 100%, then drops 10% per day, Day 11+ = 0%
export function calculateConfidence(minutesAgo: number): number {
  const days = Math.floor(minutesAgo / 1440)
  if (days <= 0) return 100
  if (days >= 10) return 0
  return 100 - (days * 10)
}
