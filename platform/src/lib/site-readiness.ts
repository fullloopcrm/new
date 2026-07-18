/**
 * Site-Readiness gate — the GLOBAL standard every tenant's public site must meet
 * before it's considered launch-complete. This is the enforcement engine that
 * makes the "new tenant build" rules real: one place, every tenant, red/green.
 *
 * Companion to runOnboardingGate (which proves the lead→review *spine* is wired).
 * This gate proves the *site* itself is built to standard: content depth (word
 * counts), on-page SEO (unique title/meta, single H1, schema), and the
 * operational/brand basics a live site needs.
 *
 * READ-ONLY and side-effect-free: it never writes rows and never sends anything,
 * so it's safe to run against live tenants and inside activation. Content checks
 * fetch the tenant's OWN rendered pages over HTTP; if the site isn't reachable
 * yet they degrade to 'action_needed', never a hard error.
 *
 * Thresholds below (PAGE_RULES / BLOG_MIN_WORDS) are the canonical rulebook —
 * change the standard here and it applies to every tenant at once.
 */
import { supabaseAdmin } from './supabase'
import { getSettings } from './settings'
import { safeFetch } from './ssrf'
import { getPrimaryTenantDomain } from './domains'

// ─────────────────────────────────────────────────────────────────────────────
// THE RULEBOOK — single source of truth for the new-tenant content standard.
// ─────────────────────────────────────────────────────────────────────────────

/** A canonical marketing page every tenant site must ship, with its word floor. */
export interface PageRule {
  key: string
  /** Human label for the readiness report. */
  label: string
  /** Route path on the tenant site, relative to the origin. */
  path: string
  /** Minimum body word count (counted inside <main>). */
  minWords: number
}

/**
 * The canonical page set + word-count floors. These are the generic, trade-neutral
 * routes the de-cleaned template serves; the old NYC-Maid slugs are a per-tenant
 * redirect concern, not part of the standard.
 */
export const PAGE_RULES: PageRule[] = [
  { key: 'home', label: 'Home', path: '/', minWords: 10000 },
  { key: 'services', label: 'Services', path: '/services', minWords: 5000 },
  { key: 'about', label: 'About', path: '/about', minWords: 3000 },
  { key: 'pricing', label: 'Pricing', path: '/pricing', minWords: 3000 },
  { key: 'reviews', label: 'Reviews', path: '/reviews', minWords: 3000 },
  { key: 'faq', label: 'FAQ', path: '/faq', minWords: 3000 },
  { key: 'contact', label: 'Contact', path: '/contact', minWords: 3000 },
  { key: 'careers', label: 'Careers', path: '/careers', minWords: 3000 },
  { key: 'referral', label: 'Referral Program', path: '/referral', minWords: 3000 },
]

/** Minimum word count for each individual blog post. */
export const BLOG_MIN_WORDS = 1500

/** How long to wait on a single page fetch before treating it as unreachable. */
const PAGE_FETCH_TIMEOUT_MS = 10000

// ─────────────────────────────────────────────────────────────────────────────
// Result shapes.
// ─────────────────────────────────────────────────────────────────────────────

export type CheckSeverity = 'required' | 'recommended'
export type CheckStatus = 'pass' | 'fail' | 'action_needed'

export interface ReadinessCheck {
  /** Stable key, e.g. 'content.home', 'ops.payment', 'seo.title.about'. */
  key: string
  group: 'content' | 'seo' | 'ops' | 'trust' | 'compliance'
  label: string
  status: CheckStatus
  severity: CheckSeverity
  detail: string
}

export interface SiteReadinessResult {
  tenantId: string
  /** True when every REQUIRED check passes. */
  passed: boolean
  /** 0–100 = required checks passed / required checks total. */
  score: number
  /** Origin the content checks were run against, or null if none resolvable. */
  origin: string | null
  checks: ReadinessCheck[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Page audit — fetch a tenant page and extract the signals the rules test.
// ─────────────────────────────────────────────────────────────────────────────

interface PageAudit {
  reachable: boolean
  status: number
  words: number
  title: string | null
  metaDescription: string | null
  h1Count: number
  hasSchema: boolean
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await safeFetch(url, { signal: ctrl.signal })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Strip scripts/styles/tags and count words in a chunk of HTML. */
function countWords(html: string): number {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return 0
  return text.split(' ').filter(Boolean).length
}

/** Prefer the word count inside <main>; fall back to <body>, then whole doc. */
function mainWordCount(html: string): number {
  const main = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html)
  if (main) return countWords(main[1])
  const body = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html)
  if (body) return countWords(body[1])
  return countWords(html)
}

async function auditPage(url: string): Promise<PageAudit> {
  const res = await fetchWithTimeout(url, PAGE_FETCH_TIMEOUT_MS)
  if (!res) return { reachable: false, status: 0, words: 0, title: null, metaDescription: null, h1Count: 0, hasSchema: false }
  const status = res.status
  if (!res.ok) return { reachable: false, status, words: 0, title: null, metaDescription: null, h1Count: 0, hasSchema: false }

  const html = await res.text().catch(() => '')
  const title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '').trim() || null
  const metaDescription =
    (/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html)?.[1] ||
      /<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i.exec(html)?.[1] ||
      '').trim() || null
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length
  const hasSchema = /<script[^>]+type=["']application\/ld\+json["']/i.test(html)

  return { reachable: true, status, words: mainWordCount(html), title, metaDescription, h1Count, hasSchema }
}

// ─────────────────────────────────────────────────────────────────────────────
// The gate.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the origin the tenant's site serves from (custom domain preferred).
 * tenant_domains PRIMARY row wins over the legacy tenants.domain/domain_name
 * columns, same precedence as getPrimaryTenantDomain()'s other callers
 * (tenantSiteUrl(), tenantBrand(), getAgentConfig()) — previously read
 * tenant.domain/domain_name only and never consulted tenant_domains, so a
 * tenant whose custom domain lives only in tenant_domains (added via
 * admin/websites) fell through to the `<slug>.fullloopcrm.com` platform
 * subdomain here, making this admin readiness audit fetch and report on the
 * wrong origin instead of the tenant's real live site.
 */
export async function resolveOrigin(tenant: { id?: string | null; slug?: string | null; domain?: string | null; domain_name?: string | null }): Promise<string | null> {
  const primary = tenant.id ? await getPrimaryTenantDomain(tenant.id) : null
  // Strip any leftover "www." from a legacy tenant.domain/domain_name row —
  // pre-fix admin writes (before the www-order normalization fix landed in
  // admin/businesses POST) could persist "www.acme.com" literally. Matches
  // the resolver's own normalized form (getTenantByDomain in tenant-lookup.ts
  // strips www. too), so this audit fetches the same host the resolver
  // actually routes. Previously `.replace(/^www\./, 'www.')` was a no-op —
  // it replaced "www." with the identical string "www.", so a legacy
  // "www.acme.com" row was fetched as-is instead of "acme.com".
  const custom = (primary || tenant.domain || tenant.domain_name || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
  if (custom) return `https://${custom}`
  if (tenant.slug) return `https://${tenant.slug}.fullloopcrm.com`
  return null
}

export async function checkSiteReadiness(tenantId: string): Promise<SiteReadinessResult> {
  const checks: ReadinessCheck[] = []

  const [{ data: tenant }, settings, { count: teamCount }] = await Promise.all([
    supabaseAdmin
      .from('tenants')
      .select('id, name, slug, domain, domain_name, logo_url, primary_color, business_hours, phone, google_place_id')
      .eq('id', tenantId)
      .single(),
    getSettings(tenantId),
    supabaseAdmin
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
  ])

  const origin = tenant ? await resolveOrigin(tenant) : null

  // ── OPS: the operational basics a live site needs ─────────────────────────
  const activeServices = settings.service_types.filter((s) => s.active).length
  checks.push(op('ops.domain', 'Live domain', !!origin, origin ? `Serving from ${origin}` : 'No domain or slug'))
  checks.push(op('ops.services', 'At least one service', activeServices >= 1, `${activeServices} active service(s)`))
  checks.push(op('ops.team', 'At least one team member', (teamCount || 0) >= 1, `${teamCount || 0} active member(s)`))
  checks.push(op('ops.payment', 'Payment method configured', settings.payment_methods.length > 0, settings.payment_methods.join(', ') || 'None'))
  checks.push(op('ops.hours', 'Business hours set', !!tenant?.business_hours, tenant?.business_hours || 'Not set'))
  checks.push(op('ops.phone', 'Contact phone set', !!tenant?.phone, tenant?.phone || 'Not set'))

  // ── TRUST / BRAND ─────────────────────────────────────────────────────────
  checks.push(rec('trust.logo', 'Logo uploaded', !!tenant?.logo_url, tenant?.logo_url ? 'Set' : 'Using placeholder logo'))
  checks.push(rec('trust.color', 'Brand color set', !!tenant?.primary_color, tenant?.primary_color ? tenant.primary_color : 'Using neutral default'))
  const reviewTarget = tenant?.google_place_id || settings.google_review_link
  checks.push(op('trust.reviews_dest', 'Review destination set', !!reviewTarget, reviewTarget ? 'Configured' : 'Nowhere to send reviews'))

  // ── CONTENT + SEO: audit each canonical page over HTTP ─────────────────────
  if (!origin) {
    for (const rule of PAGE_RULES) {
      checks.push(need(`content.${rule.key}`, 'content', `${rule.label} ≥ ${rule.minWords.toLocaleString()} words`, `No origin to audit — register a domain first`))
    }
  } else {
    const audits = await Promise.all(PAGE_RULES.map(async (rule) => ({ rule, audit: await auditPage(origin + rule.path) })))

    // Word-count + on-page SEO per page.
    const titles = new Map<string, string[]>()
    const metas = new Map<string, string[]>()
    for (const { rule, audit } of audits) {
      if (!audit.reachable) {
        checks.push(need(`content.${rule.key}`, 'content', `${rule.label} ≥ ${rule.minWords.toLocaleString()} words`, audit.status ? `Page returned ${audit.status} at ${rule.path}` : `Page unreachable at ${rule.path}`))
        continue
      }
      // Content depth (required).
      checks.push(
        gate(
          `content.${rule.key}`,
          'content',
          `${rule.label} ≥ ${rule.minWords.toLocaleString()} words`,
          audit.words >= rule.minWords,
          `${audit.words.toLocaleString()} / ${rule.minWords.toLocaleString()} words`,
          'required',
        ),
      )
      // Single H1 (required on-page SEO).
      checks.push(gate(`seo.h1.${rule.key}`, 'seo', `${rule.label}: exactly one H1`, audit.h1Count === 1, `${audit.h1Count} <h1> found`, 'required'))
      // Meta title + description present (required).
      checks.push(gate(`seo.title.${rule.key}`, 'seo', `${rule.label}: has <title>`, !!audit.title, audit.title ? audit.title.slice(0, 60) : 'Missing', 'required'))
      checks.push(gate(`seo.meta.${rule.key}`, 'seo', `${rule.label}: has meta description`, !!audit.metaDescription, audit.metaDescription ? 'Set' : 'Missing', 'required'))
      // Schema (recommended).
      checks.push(gate(`seo.schema.${rule.key}`, 'seo', `${rule.label}: JSON-LD schema`, audit.hasSchema, audit.hasSchema ? 'Present' : 'No structured data', 'recommended'))
      if (audit.title) titles.set(audit.title, [...(titles.get(audit.title) || []), rule.key])
      if (audit.metaDescription) metas.set(audit.metaDescription, [...(metas.get(audit.metaDescription) || []), rule.key])
    }

    // Uniqueness across the site (duplicate titles / metas are an SEO fault).
    const dupTitles = [...titles.entries()].filter(([, keys]) => keys.length > 1)
    const dupMetas = [...metas.entries()].filter(([, keys]) => keys.length > 1)
    checks.push(gate('seo.title.unique', 'seo', 'Page titles are unique', dupTitles.length === 0, dupTitles.length ? `Duplicated on: ${dupTitles.map(([, k]) => k.join('/')).join(', ')}` : 'All unique', 'required'))
    checks.push(gate('seo.meta.unique', 'seo', 'Meta descriptions are unique', dupMetas.length === 0, dupMetas.length ? `Duplicated on: ${dupMetas.map(([, k]) => k.join('/')).join(', ')}` : 'All unique', 'required'))
  }

  const required = checks.filter((c) => c.severity === 'required')
  const passedRequired = required.filter((c) => c.status === 'pass').length
  const passed = required.every((c) => c.status === 'pass')
  const score = required.length === 0 ? 100 : Math.round((passedRequired / required.length) * 100)

  return { tenantId, passed, score, origin, checks }
}

// ─────────────────────────────────────────────────────────────────────────────
// Small builders — keep the check list readable above.
// ─────────────────────────────────────────────────────────────────────────────

function gate(key: string, group: ReadinessCheck['group'], label: string, ok: boolean, detail: string, severity: CheckSeverity): ReadinessCheck {
  return { key, group, label, status: ok ? 'pass' : 'fail', severity, detail }
}
/** Required operational check. */
function op(key: string, label: string, ok: boolean, detail: string): ReadinessCheck {
  return { key, group: 'ops', label, status: ok ? 'pass' : 'fail', severity: 'required', detail }
}
/** Recommended (non-blocking) check. */
function rec(key: string, label: string, ok: boolean, detail: string): ReadinessCheck {
  return { key, group: 'trust', label, status: ok ? 'pass' : 'fail', severity: 'recommended', detail }
}
/** A required check that couldn't be evaluated (e.g. page unreachable) → action_needed. */
function need(key: string, group: ReadinessCheck['group'], label: string, detail: string): ReadinessCheck {
  return { key, group, label, status: 'action_needed', severity: 'required', detail }
}
