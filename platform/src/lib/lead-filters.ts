import { getOwnedDomainSet } from './domains'

const SPAM_REFERRERS = [
  'siteground', 'sgcaptcha',
  'twicsy.com', 'merobase.com', 'notidc.com', 'wicked.cc', 'vatrouver.com',
  'nerdydata.com', 'pptsearch365.com', 'zhongsou.com', 'schoolbox.cloud',
  'satchelone.com', 'askboth.com', 'activesearchresults.com',
  'spyhost.site', 'jariblog.online', '258.com', 'scrubtheweb.com',
  'lycos.com', 'siteslikesites.com', 'surfwax.com',
  'sharepoint.com', 'teams.microsoft', 'teams.cloud.microsoft',
  'brilliant.org', 'colorhunt.co',
]

const BOT_USER_AGENTS = [
  'bot', 'crawler', 'spider', 'scraper', 'googlebot', 'bingbot', 'slurp',
  'duckduckbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
  'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot', 'bytespider', 'petalbot',
  'yandexbot', 'headlesschrome', 'phantomjs', 'puppeteer', 'curl/', 'wget/',
  'python-requests', 'go-http-client', 'uptimerobot', 'pingdom',
  'site24x7', 'statuscake', 'dataforseobot', 'gptbot', 'claudebot',
  'amazonbot', 'anthropic-ai', 'applebot/',
]

const BLOCKED_PAGES = ['/admin', '/team', '/portal/dashboard']

const SEARCH_ENGINES = [
  'google.', 'bing.com', 'duckduckgo.com', 'yahoo.com', 'baidu.com',
  'yandex.', 'ecosia.org', 'search.brave.com',
]

const ENGAGEMENT_ACTIONS = new Set([
  'engaged_30s', 'scroll_25', 'scroll_50', 'scroll_75', 'scroll_100',
  'call', 'text', 'book', 'form_start', 'form_success',
])

export interface ClickRow {
  referrer?: string | null
  user_agent?: string | null
  page?: string | null
  action?: string | null
  time_on_page?: number | null
  scroll_depth?: number | null
  visitor_id?: string | null
  session_id?: string | null
  [key: string]: unknown
}

export function isSpamReferrer(referrer: string | null | undefined): boolean {
  if (!referrer) return false
  const lower = referrer.toLowerCase()
  return SPAM_REFERRERS.some(s => lower.includes(s))
}

export function isAdminReferrer(referrer: string | null | undefined): boolean {
  if (!referrer) return false
  return (
    referrer.includes('/admin') ||
    referrer.includes('/team') ||
    referrer.includes('/portal/dashboard') ||
    referrer.includes('/administrator')
  )
}

export async function isOwnedReferrer(tenantId: string, referrer: string | null | undefined): Promise<boolean> {
  if (!referrer) return false
  try {
    const url = referrer.startsWith('http') ? referrer : `https://${referrer}`
    const host = new URL(url).hostname.toLowerCase()
    const ownedDomains = await getOwnedDomainSet(tenantId)
    return ownedDomains.has(host)
  } catch {
    return false
  }
}

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false
  const lower = ua.toLowerCase()
  return BOT_USER_AGENTS.some(b => lower.includes(b))
}

export function isBlockedPage(page: string | null | undefined): boolean {
  if (!page) return false
  return BLOCKED_PAGES.some(p => page.startsWith(p))
}

export function isSearchReferrer(referrer: string | null | undefined): boolean {
  if (!referrer || referrer === 'direct') return false
  const lower = referrer.toLowerCase()
  return SEARCH_ENGINES.some(s => lower.includes(s))
}

export function isCleanClick(click: ClickRow): boolean {
  return (
    !isSpamReferrer(click.referrer) &&
    !isAdminReferrer(click.referrer) &&
    !isBotUserAgent(click.user_agent) &&
    !isBlockedPage(click.page)
  )
}

export function isEngagementAction(action: string | null | undefined): boolean {
  if (!action) return false
  return ENGAGEMENT_ACTIONS.has(action)
}

/**
 * A visitor is real only if they have a referrer. Direct = not counted.
 */
export function findRealVisitorIds(allEvents: ClickRow[]): Set<string> {
  const visitorEvents = new Map<string, ClickRow[]>()
  for (const e of allEvents) {
    const id = e.visitor_id || e.session_id
    if (!id) continue
    if (!visitorEvents.has(id as string)) visitorEvents.set(id as string, [])
    visitorEvents.get(id as string)!.push(e)
  }

  const real = new Set<string>()
  for (const [id, events] of visitorEvents) {
    const first = events.find(e => e.action === 'visit') || events[0]
    if (first.referrer && first.referrer !== 'direct') {
      real.add(id)
    }
  }

  return real
}
