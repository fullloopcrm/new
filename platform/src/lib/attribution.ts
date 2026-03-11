import { supabaseAdmin } from '@/lib/supabase'
import { extractZip, getNeighborhoodFromZip, getDomainsForNeighborhood, getTenantDomains } from '@/lib/domains'
import { isSearchReferrer } from '@/lib/lead-filters'

// Calculate confidence based on time difference (in minutes)
// Day 1 (24h) = 100%, then drops 10% per day, Day 11+ = 0%
export function calculateConfidence(minutesAgo: number): number {
  const days = Math.floor(minutesAgo / 1440)
  if (days <= 0) return 100
  if (days >= 10) return 0
  return 100 - (days * 10)
}

// Core attribution: match a client's address to a website visit/click
export async function attributeByAddress(
  tenantId: string,
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
  const zip = extractZip(address)
  if (!zip) return null

  const neighborhood = await getNeighborhoodFromZip(tenantId, zip)
  if (!neighborhood) return null

  const neighborhoodDomains = await getDomainsForNeighborhood(tenantId, neighborhood)
  const allDomains = await getTenantDomains(tenantId)
  const genericDomains = allDomains.filter(d => d.type === 'generic').map(d => d.domain)

  const now = new Date(submittedAt || new Date().toISOString())
  const lookback10d = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)

  // Include both www and non-www variants
  const allDomainNames = [...neighborhoodDomains, ...genericDomains.filter(d => !neighborhoodDomains.includes(d))]
  const allDomainVariants = allDomainNames.flatMap(d => [d, `www.${d}`])

  if (allDomainVariants.length === 0) return null

  // Priority 1: CTA clicks (call/text) — highest confidence
  let ctaQuery = supabaseAdmin
    .from('lead_clicks')
    .select('id, domain, action, created_at')
    .eq('tenant_id', tenantId)
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

  // Priority 2: Search-referred visits within 3 days
  const lookback3d = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const { data: recentVisits } = await supabaseAdmin
    .from('lead_clicks')
    .select('id, domain, action, created_at, referrer, engaged_30s')
    .eq('tenant_id', tenantId)
    .in('domain', allDomainVariants)
    .eq('action', 'visit')
    .gte('created_at', lookback3d.toISOString())
    .lte('created_at', now.toISOString())
    .order('created_at', { ascending: false })
    .limit(20)

  if (recentVisits && recentVisits.length > 0) {
    const searchVisit = recentVisits.find(v => isSearchReferrer(v.referrer))
    if (searchVisit) {
      const minutes = Math.floor((now.getTime() - new Date(searchVisit.created_at).getTime()) / 60000)
      const confidence = Math.min(90, calculateConfidence(minutes))
      if (confidence > 0) {
        return { domain: searchVisit.domain.replace(/^www\./, ''), confidence, action: 'search_visit', minutesAgo: minutes, neighborhood, clickId: searchVisit.id }
      }
    }

    const engagedVisit = recentVisits.find(v => v.engaged_30s)
    if (engagedVisit) {
      const minutes = Math.floor((now.getTime() - new Date(engagedVisit.created_at).getTime()) / 60000)
      const confidence = Math.min(80, calculateConfidence(minutes))
      if (confidence > 0) {
        return { domain: engagedVisit.domain.replace(/^www\./, ''), confidence, action: 'engaged_visit', minutesAgo: minutes, neighborhood, clickId: engagedVisit.id }
      }
    }
  }

  // Priority 3: Any visit from neighborhood domains within 24h
  const lookback1d = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
  const neighborhoodVariants = neighborhoodDomains.flatMap(d => [d, `www.${d}`])
  if (neighborhoodVariants.length > 0) {
    const { data: visits } = await supabaseAdmin
      .from('lead_clicks')
      .select('id, domain, action, created_at')
      .eq('tenant_id', tenantId)
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
  }

  return null
}

// Attribute a booking automatically
export async function autoAttributeBooking(
  tenantId: string,
  bookingId: string,
  clientId: string,
  bookingCreatedAt?: string
): Promise<{ domain: string; confidence: number } | null> {
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('address, name')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!client?.address) return null

  const result = await attributeByAddress(tenantId, client.address, bookingCreatedAt)
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
    .eq('tenant_id', tenantId)

  // Build notification
  const timeLabel = result.minutesAgo < 60
    ? `${result.minutesAgo}min ago`
    : result.minutesAgo < 1440
      ? `${Math.round(result.minutesAgo / 60)}hr ago`
      : `${Math.round(result.minutesAgo / 1440)}d ago`

  const actionLabels: Record<string, string> = {
    call: 'Called from',
    text: 'Texted from',
    book: 'Booked from',
    search_visit: 'Found',
    engaged_visit: 'Browsed',
    visit: 'Visited',
  }
  const actionLabel = actionLabels[result.action] || 'Visited'

  await supabaseAdmin.from('notifications').insert({
    tenant_id: tenantId,
    type: 'hot_lead',
    title: 'Website → Sale',
    message: `${client.name} (${result.neighborhood}) — ${actionLabel} ${result.domain} ${timeLabel} → booked (${result.confidence}%)`,
    channel: 'system',
    recipient_type: 'admin',
    booking_id: bookingId,
  })

  return { domain: result.domain, confidence: result.confidence }
}
