#!/usr/bin/env node
/**
 * Tenant-config reconcile — read-only drift detector across the places that
 * decide "which domain -> which tenant -> which site -> which Vercel project":
 *   1. tenants.domain                    (resolver checks this FIRST)
 *   2. tenant_domains (active)           (resolver fallback) — carries the
 *      authoritative routing_mode / status / vercel_project per domain
 *   3. BESPOKE_SITE_TENANTS in src/middleware.ts (routes slug -> /site/<slug>)
 *   4. src/app/site/<slug>/              (the actual folder that renders)
 *   5. PROTECTED in scripts/verify-protected-tenants.mjs (the build-time
 *      guard's own copy of "which slugs must stay bespoke")
 *
 * There is no single source of truth today, so these drift and silently
 * mis-route (see the 2026-07-10 outage). This surfaces every disagreement so
 * we can design the authoritative registry around real data.
 * READ-ONLY: it issues SELECTs only — never writes.
 *
 *   node scripts/reconcile-tenant-config.mjs
 *
 * The Supabase Management-API token is read from the environment
 * ($SUPABASE_ACCESS_TOKEN_FULLLOOP, e.g. a CI secret) first, then from
 * ~/.env.local for local dev. If it is absent the script SKIPS CLEANLY
 * (exit 0) so it is safe to wire into CI on branches/forks that do not
 * carry the secret.
 *
 * STRUCTURE: the pure drift logic (parseBespokeSet / computeFindings /
 * summarize) is exported so it can be unit-tested without a DB or network.
 * The CLI (token guard, SQL, report, exit) runs ONLY when this file is invoked
 * directly — importing the module does no I/O and never exits.
 */
import { readFileSync, existsSync, readdirSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const REF = 'cetnrttgtoajzjacfbhe'

export const norm = (d) => {
  // Per the WHATWG URL spec's mandatory preprocessing step, leading/trailing
  // "C0 control or space" (0x00-0x20) is stripped — a WIDER range than
  // JS's `.trim()`, which only recognizes ECMAScript "whitespace" and misses
  // NUL, BEL, backspace, and most other C0 controls (0x00-0x08, 0x0E-0x1F).
  // A leading control char in that gap survives `.trim()` and then blocks
  // EVERY scheme-strip rule below (all anchored on "^[a-z]" / "^[\/\\]" at
  // position 0), so the path-strip at the end truncates at the scheme's own
  // "//" instead of the real host, corrupting the key into garbage (verified:
  // "\x00https://host" -> old code produced "\x00https", not the real host)
  // instead of merely failing to normalize it.
  let s = (d || '')
    .replace(/^[\x00-\x20]+/, '')
    .replace(/[\x00-\x20]+$/, '')
    .toLowerCase()
  // Per the WHATWG URL spec's mandatory preprocessing step, ALL ASCII tab
  // (U+0009) / LF (U+000A) / CR (U+000D) are removed from ANYWHERE in the
  // string, not just the ends — a stray tab/newline pasted into the MIDDLE of
  // a domain (or splitting a scheme, e.g. "ht\ttps://host") is invisible to a
  // real URL parser (verified: new URL('ht\\ttps://host').hostname === 'host')
  // but survives `.trim()` untouched here, and can corrupt the scheme-strip
  // below into a garbage non-empty key (e.g. "ht\ttps://host" -> "ht\ttps")
  // that silently fails to collapse with its clean twin, hiding the Drift F
  // collision. Must run BEFORE the scheme-strip loop so the scheme is intact
  // for it to match.
  s = s.replace(/[\t\n\r]/g, '')
  // Per IDNA/UTS46 domain-to-ASCII mapping (used by the WHATWG URL host
  // parser), certain non-ASCII "dot" look-alikes are treated as the ASCII
  // full stop '.', and certain zero-width/default-ignorable code points are
  // stripped outright — from ANYWHERE in the string, not just the edges.
  // Verified against Node's URL parser: new URL('https://shared-domain\u3002com')
  // .hostname === 'shared-domain.com' (U+3002 ideographic full stop), same
  // for U+FF0E (fullwidth full stop) and U+FF61 (halfwidth ideographic full
  // stop); new URL('https://shared\u200bdomain.com').hostname ===
  // 'shareddomain.com' (U+200B zero-width space silently removed), same for
  // U+2060 (word joiner), U+FEFF (BOM / zero-width no-break space), and
  // U+00AD (soft hyphen). A domain pasted with one of these invisible or
  // near-invisible characters resolves to the EXACT SAME real host in a
  // browser but survives here as a distinct, uncollapsed key — hiding a
  // Drift F collision instead of merely failing to normalize it. Must run
  // BEFORE the scheme-strip loop so a dot-lookalike inside a scheme name
  // (however unlikely) is already normalized when that loop matches.
  s = s.replace(/[\u3002\uff0e\uff61]/g, '.').replace(/[\u200b\u2060\ufeff\u00ad]/g, '')
  // The WHATWG URL spec's "forbidden host code point" list (C0 controls,
  // space, and the delimiter/reserved characters below) can never appear in a
  // real routable
  // hostname EVEN after percent-decoding or fullwidth-to-ASCII mapping (a
  // domain value containing one, decoded, cannot be visited by a real
  // browser, so it can never actually collide with anything real). Shared by
  // both the percent-decode and fullwidth-mapping steps below: each maps a
  // source byte through this same guard before accepting the decoded result,
  // so a value that would be spec-invalid once decoded is left un-decoded
  // (and therefore visibly distinct, not silently corrupted into a bogus
  // collision or a bogus non-collision).
  const FORBIDDEN_HOST_BYTES = new Set([
    0x23, 0x25, 0x2f, 0x3a, 0x3c, 0x3e, 0x3f, 0x40, 0x5b, 0x5c, 0x5d, 0x5e, 0x7c, 0x7f,
    ...Array.from({ length: 0x21 }, (_, i) => i), // 0x00-0x20: all C0 controls + space
  ])
  // Percent-decode any %XX triple whose decoded byte the WHATWG URL host
  // parser actually accepts. Verified against Node's URL parser: new
  // URL('https://shared%2edomain.com').hostname === 'shared.domain.com' and
  // new URL('https://shared%2ddomain.com').hostname === 'shared-domain.com'
  // - percent-encoding '.' or '-' (or any other non-forbidden ASCII byte,
  // including A-Z which the parser then lowercases) into a domain field
  // resolves to the EXACT SAME real host in a browser but survives here as a
  // distinct, uncollapsed key. %XX sequences whose byte IS forbidden (e.g.
  // %2f, %3a, %40 - verified: new URL('https://shared%2fdomain.com') throws
  // Invalid URL) are deliberately left un-decoded: that value can never be a
  // real routable host either way, so decoding it would only risk corrupting
  // the key via the path/scheme-strip rules below on a string that could
  // never collide with anything real in the first place.
  s = s.replace(/%([0-9a-fA-F]{2})/g, (m, hex) => {
    const byte = parseInt(hex, 16)
    // .toLowerCase() the decoded byte too: a percent-encoded uppercase letter
    // (e.g. %41 = 'A') is decoded THEN lowercased by the real URL host parser
    // (verified: new URL('https://shared%41domain.com').hostname ===
    // 'shareda...') — this decode step runs after the initial .toLowerCase()
    // call above, so a decoded uppercase byte would otherwise survive
    // uppercase and fail to collapse with its already-lowercase twin.
    return FORBIDDEN_HOST_BYTES.has(byte) ? m : String.fromCharCode(byte).toLowerCase()
  })
  // Map the "Halfwidth and Fullwidth Forms" ASCII block (U+FF01-U+FF5E) down
  // to plain ASCII, per the same IDNA/UTS46 domain-to-ASCII mapping used
  // above for the dot-equivalents. Verified against Node's URL parser: new
  // URL('https://' + fullwidthSpelling('shared-domain') + '.com').hostname
  // === 'shared-domain.com' where fullwidthSpelling maps each ASCII letter to
  // its U+FF01-U+FF5E fullwidth twin (e.g. 'shared' -> U+FF53 U+FF48 U+FF41
  // U+FF52 U+FF45 U+FF44) - fullwidth Latin letters/digits/hyphen (as typed by
  // an IME or a mobile keyboard's fullwidth mode, or pasted from CJK text)
  // resolve to the EXACT SAME real host in a browser but survive here as a
  // distinct, uncollapsed key. Each fullwidth code point in this block is
  // exactly its ASCII counterpart offset by +0xFEE0; the same forbidden-byte
  // guard applies (verified: new URL('https://a' + '\uff0f' + 'b.com') -
  // fullwidth solidus - throws Invalid URL, same as its ASCII twin, so it is
  // deliberately left un-mapped here too). Must run before the scheme-strip
  // loop so a scheme spelled out in fullwidth characters (however unlikely)
  // is already normalized when that loop matches; toLowerCase() above already
  // folds fullwidth uppercase letters (e.g. U+FF21) to their fullwidth
  // lowercase form (U+FF41), which this mapping then reduces to ASCII.
  s = s.replace(/[\uff01-\uff5e]/g, (ch) => {
    const byte = ch.codePointAt(0) - 0xfee0
    return FORBIDDEN_HOST_BYTES.has(byte) ? ch : String.fromCharCode(byte)
  })
  // Strip a URL scheme, a protocol-relative/stray-slash prefix, AND userinfo
  // (user:pass@), LOOPED to a fixed point rather than one pass each. A single
  // pass only partially strips a DOUBLED scheme ("https://https://host" ->
  // one pass leaves "https://host") or a scheme preceded by stray garbage
  // ("/https://host" strips the leading slash but never re-checks the
  // now-exposed scheme behind it) — the leftover "https:" prefix then gets
  // truncated by the path-strip below at ITS OWN "//" instead of the real
  // host's, corrupting the key to "https:". That's a non-empty value that
  // silently fails to collapse with its correctly-pasted twin, hiding the
  // Drift F collision instead of merely failing to normalize it. `:\/+`
  // (one-or-more slashes, not exactly two) also folds in triple/quad-slash
  // AND a single-slash scheme typo ("http:/host") in the same pass. Userinfo
  // MUST be stripped inside this same loop, not after it: stripping a scheme
  // can expose a leading "@" (e.g. "https:/@/host" -> scheme-strip eats the
  // lone slash -> "@/host"), and stripping THAT userinfo in turn re-exposes a
  // bare leading "/" ("/host") that path-strip below would otherwise treat as
  // an empty host followed by a path, collapsing the whole value to '' —
  // reintroducing the exact silently-invisible-to-Drift-F failure mode this
  // loop exists to close, just via a different combination of strips.
  //
  // The bound is the INPUT length (captured once, below, before the loop
  // starts shrinking s — reading s.length live in the loop condition would
  // re-evaluate against the shrinking string each check and undercount): every
  // successful strip in this loop matches a non-empty prefix and therefore
  // shrinks s by at least one character, so input-length iterations is always
  // enough to reach a fixed point and the loop provably terminates — no
  // pathological input can spin it forever. A fixed cap (10) is NOT enough:
  // 11+ stacked "https://" prefixes needs 11+ iterations to fully unwrap, and
  // a hard iteration cap that fires before the fixed point silently leaves a
  // leftover scheme in place. That leftover then gets truncated by the
  // path-strip below at ITS OWN "//" instead of the real host, corrupting the
  // key (e.g. to "https") — a non-empty value that fails to collapse with its
  // clean twin, hiding the Drift F collision instead of merely mangling it.
  const maxIters = s.length + 1 // captured ONCE, before the loop shrinks s — see note above
  for (let i = 0; i < maxIters; i++) {
    const before = s
    s = s
      .replace(/^[a-z][a-z0-9+.-]*:[\\/]+/, '') // scheme + 1-or-more separators, ANY scheme name — a "\" counts too: WHATWG URL parsing treats backslash as equivalent to "/" for special schemes, so "https:\\host" and "https:/\\host" are the SAME host in a real browser and must collapse the same as "https://host", not survive as a distinct, uncollapsed key.
      .replace(/^(?:https?|wss?|ftp):(?![\\/])(?=.)/, '') // ONLY the web-relevant "special" schemes (http/https/ws/wss/ftp) get zero-separator authority parsing per the URL spec — "https:host" (colon, no slash at all) resolves to host "host" in a real URL parser. A generic scheme name is NOT special ("foo:host" parses with an EMPTY host and "host" as an opaque path — genuinely not the same value), so this must stay scoped to the known special-scheme list, not the broad scheme-name class above. (?=.) requires something survive the strip — bare "https:" with nothing after must NOT collapse to '' (claim() would silently skip it).
      .replace(/^[\\/]+/, '') // protocol-relative prefix — backslash-led forms ("\\host") are the same host as "//host" per the URL spec.
      .replace(/^[^/\\?#]*@(?=.)/, '') // the (?=.) lookahead requires at least one char AFTER the '@': without it, any value ending in a bare '@' (nothing left to be a host) matches the whole string and collapses to '' — and claim() silently skips empty keys, making that row vanish from Drift F collision detection instead of just failing to normalize.
    if (s === before) break
  }
  return s
    .replace(/[/\\?#].*$/, '') // strip any path/query/fragment after the scheme strip — only the host decides routing. Backslash counts as a path separator here too (verified: "https://host\\path" parses with host "host").
    .replace(/^www\./, '')
    .replace(/:\d*$/, '') // strip a port suffix (e.g. example.com:8443), OR a bare trailing colon left by a truncated/typo'd port ("example.com:") — same real domain either way
    .replace(/\.+$/, '') // strip trailing dot(s) — absolute-FQDN form (example.com.) is the same domain
}

// --- Source 3: parse BESPOKE_SITE_TENANTS out of the middleware source ---
export function parseBespokeSet(middlewareSource) {
  const block = middlewareSource.match(/BESPOKE_SITE_TENANTS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/)
  return new Set(block ? [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [])
}

// --- Source 5: parse APEX_CANONICAL_DOMAINS out of the middleware source.
// This is the apex/www canonical-redirect loop-prevention exemption list — a
// domain in it is served at the bare apex instead of being 301'd to www. It
// lives ONLY in middleware source, outside every DB source the rest of this
// gate reconciles, so a typo here is invisible to every other Drift check.
export function parseApexCanonicalSet(middlewareSource) {
  const block = middlewareSource.match(/APEX_CANONICAL_DOMAINS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/)
  return new Set(block ? [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [])
}

// --- Source 5: parse the PROTECTED slugs out of verify-protected-tenants.mjs.
// That script is the OTHER guard over BESPOKE_SITE_TENANTS: at build time it
// asserts every PROTECTED entry is still in the middleware set AND still has a
// folder. But "add it to BESPOKE_SITE_TENANTS" and "add it to PROTECTED" are
// two independent manual edits in two different files — nothing enforces they
// stay in sync going forward. A slug added to BESPOKE_SITE_TENANTS without the
// matching PROTECTED entry gets ZERO build-time protection: its folder can be
// deleted, or its middleware entry silently dropped, with no guard catching
// it — the exact 2026-07-08 outage class, just with the new-tenant case this
// gate exists to prevent going forward. See Drift P below.
export function parseProtectedSlugs(verifyProtectedSource) {
  const block = verifyProtectedSource.match(/const PROTECTED\s*=\s*\[([\s\S]*?)\]/)
  return new Set(block ? [...block[1].matchAll(/slug:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]) : [])
}

// --- parse TENANTS_WITH_RICH_SITEMAP out of the middleware source.
// This is the set of tenants whose /sitemap.xml is rewritten to their own
// src/app/site/<slug>/sitemap.ts (or sitemap.xml/route.ts) instead of falling
// back to the generic /api/tenant-sitemap. Like APEX_CANONICAL_DOMAINS, it
// lives ONLY in middleware source, outside every DB source the rest of this
// gate reconciles, so a slug added here without its sitemap file is invisible
// to every other Drift check — see Drift Q below.
export function parseRichSitemapSet(middlewareSource) {
  const block = middlewareSource.match(/TENANTS_WITH_RICH_SITEMAP\s*=\s*new Set(?:<string>)?\(\[([\s\S]*?)\]\)/)
  return new Set(block ? [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [])
}

// --- parse NON_SERVING_STATUSES out of the middleware source. This is
// middleware's OWN gate on which tenant statuses still serve a site
// (tenantServesSite() — everything except this set). It is the mirror image
// of this script's `status in ('active','live','setup')` SQL filter: the two
// "which tenants matter" lists are independent, manually maintained, and
// nothing keeps them in sync. A status in neither list (e.g. 'pending', the
// default set by create-tenant-from-lead.ts) is invisible to every per-tenant
// drift check here (main loop only iterates active/live/setup) while
// middleware still serves it live — see Drift R below.
export function parseNonServingStatuses(middlewareSource) {
  const block = middlewareSource.match(/NON_SERVING_STATUSES\s*=\s*new Set\(\[([\s\S]*?)\]\)/)
  return new Set(block ? [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [])
}

// --- parse MAIN_HOSTS out of the middleware source. This is the reserved set
// of hostnames middleware treats as the main marketing/app host — isMainHost()
// gates the ENTIRE custom-domain routing block (`if (!isMainHost(hostname))`
// wraps every tenant-domain lookup). A tenant domain that collides with an
// entry here is silently swallowed: middleware never even attempts tenant
// resolution for that hostname, no matter what tenants.domain / tenant_domains
// / routing_mode declare. Like the other middleware-only lists, it lives
// outside every DB source this gate otherwise reconciles — see Drift S below.
export function parseMainHostsSet(middlewareSource) {
  const block = middlewareSource.match(/MAIN_HOSTS\s*=\s*new Set(?:<string>)?\(\[([\s\S]*?)\]\)/)
  return new Set(block ? [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [])
}

// --- parse ROOT_SITE_TENANTS out of the middleware source. This is the legacy
// "no /site/<slug> subtree, serve the shared /site root" set — middleware's
// siteBase ternary checks it FIRST: `ROOT_SITE_TENANTS.has(slug) ? '/site' :
// BESPOKE_SITE_TENANTS.has(slug) ? '/site/<slug>' : '/site/template'`. A slug in
// BOTH sets is therefore silently routed to the shared /site root — the
// bespoke /site/<slug> subtree BESPOKE_SITE_TENANTS + verify-protected-tenants.mjs
// exist to protect is never reached, with no error from either. It is currently
// empty (`new Set<string>([])`), so this is prospective, not yet an active
// collision — see Drift T below.
export function parseRootSiteTenantsSet(middlewareSource) {
  const block = middlewareSource.match(/ROOT_SITE_TENANTS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/)
  return new Set(block ? [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [])
}

// --- parse STATIC_TENANT_MAP out of the middleware source. This is a
// hardcoded hostname -> {id, slug} fallback ("used when DB lookup at the
// edge is unreliable") on the custom-domain routing path. It is the ONLY
// tenant-resolution source in this file that is NOT reconciled by any other
// Drift check, and it is uniquely dangerous: the branch that consults it
// calls rewriteToSite() unconditionally, with no tenantServesSite() status
// check at all (every other routing path — subdomain, DB domain lookup —
// checks status first). A stale id, a typo'd slug, or a tenant that gets
// suspended/cancelled/deleted after being added here is invisible to every
// other check in this file and keeps serving live traffic — see Drift U below.
export function parseStaticTenantMap(middlewareSource) {
  const block = middlewareSource.match(/STATIC_TENANT_MAP:\s*Record<string,\s*\{[^}]*\}>\s*=\s*\{([\s\S]*?)\n\s*\}/)
  const map = new Map()
  if (!block) return map
  const entryRe = /['"]([^'"]+)['"]\s*:\s*\{\s*id:\s*['"]([^'"]+)['"]\s*,\s*slug:\s*['"]([^'"]+)['"]\s*\}/g
  let m
  while ((m = entryRe.exec(block[1]))) map.set(m[1], { id: m[2], slug: m[3] })
  return map
}

// --- parse next.config.ts's rewrites().afterFiles for bare "/site/<segment>"
// source paths (no dynamic ":param", no further nesting). These are legacy
// short-URL aliases (e.g. "/site/about" -> "/site/about-the-nyc-maid-service-
// company") — the file's own comment says they run "AFTER middleware prefixes
// tenant requests with /site", i.e. they are meant to catch a tenant's
// middleware-rewritten pathname. But the ONLY middleware routing branch that
// ever produces a BARE "/site/<path>" (no tenant-slug segment in between) is
// ROOT_SITE_TENANTS membership — a BESPOKE_SITE_TENANTS tenant's pathname is
// "/site/<slug>/<path>" and a template tenant's is "/site/template/<path>",
// neither of which this literal source pattern matches. See Drift W below.
export function parseNextConfigSiteRewriteSources(nextConfigSource) {
  const block = nextConfigSource.match(/afterFiles:\s*\[([\s\S]*?)\]\s*,?\s*\n\s*fallback:/)
  if (!block) return []
  const entryRe = /\{\s*source:\s*['"]([^'"]+)['"]\s*,\s*destination:\s*['"]([^'"]+)['"]/g
  const out = []
  let m
  while ((m = entryRe.exec(block[1]))) {
    const source = m[1]
    // Bare, static "/site/<one-segment>" only — no ":param" (dynamic, matches
    // any tenant-slug-prefixed path too) and no extra "/" beyond the one
    // segment (e.g. "/site/blog/:slug" is dynamic AND nested; excluded either way).
    if (/^\/site\/[^/:]+$/.test(source)) out.push({ source, destination: m[2] })
  }
  return out
}

// KNOWN-PENDING allowlist for Drift L only. These bespoke-set entries are
// currently unresolvable (no tenants row) but are AWAITING JEFF'S DISPOSITION —
// the orphan question (delete the middleware entry + build-guard slug, or
// re-create the tenant?) is open to Jeff, not yet decided. Until he decides,
// they still SURFACE as CRIT in the report so they stay visible, but they do
// NOT red-gate CI (exit 1) — otherwise every unrelated PR is blocked on a
// disposition that isn't ours to make. Any OTHER unresolvable set entry still
// hard-fails the gate. REMOVE a slug from this set the moment Jeff dispositions
// it (recreate the tenant, or drop it from BESPOKE_SITE_TENANTS + the guard).
export const KNOWN_PENDING_ORPHANS = new Set(['toll-trucks-near-me', 'wash-and-fold-hoboken'])

/**
 * Pure drift computation over already-fetched inputs — no DB, no filesystem of
 * its own (folder existence is injected via hasHome). This is the gate logic.
 *
 * @param {object}   input
 * @param {Array}    input.tenants  rows: { id, slug, domain, status }
 * @param {Array}    input.tds      tenant_domains rows joined to tenants.slug:
 *                                  { tenant_id, domain, active, is_primary,
 *                                    routing_mode, status, vercel_project, slug }
 * @param {Set}      input.bespokeSet  slugs routed bespoke by middleware
 * @param {Function} input.hasHome  (slug) => boolean — does /site/<slug> render a home
 * @param {Set|null} input.resolvableSlugs  slugs that resolve to a tenants row of
 *                                  ANY status. Pass null to SKIP Drift L (the
 *                                  orphan-set check that needs a second query).
 * @param {Array}    [input.allTenantDomains]  tenants.domain rows of ANY status
 *                                  (not just active/live/setup), each { slug, domain }.
 *                                  Feeds Drift F ONLY (claim-only, never the main
 *                                  per-tenant loop) — see the claim() call below for why.
 * @param {Set}      [input.apexCanonicalSet]  domains from middleware's
 *                                  APEX_CANONICAL_DOMAINS (see parseApexCanonicalSet).
 *                                  Feeds Drift O ONLY. Pass an empty Set (default) to skip.
 * @param {Set}      [input.protectedSlugs]  slugs from verify-protected-tenants.mjs's
 *                                  PROTECTED array (see parseProtectedSlugs).
 *                                  Feeds Drift P ONLY. Pass an empty Set (default) to skip.
 * @param {Set}      [input.richSitemapSet]  slugs from middleware's
 *                                  TENANTS_WITH_RICH_SITEMAP (see parseRichSitemapSet).
 *                                  Feeds Drift Q ONLY. Pass an empty Set (default) to skip.
 * @param {Function} [input.hasSitemap]  (slug) => boolean — does
 *                                  src/app/site/<slug>/sitemap.ts or
 *                                  sitemap.xml/route.ts exist. Feeds Drift Q ONLY.
 *                                  Defaults to always-true (no-op) when omitted.
 * @param {Array}    [input.allTenants]  tenants rows of ANY status: { id, slug,
 *                                  status, domain }. Feeds Drift R ONLY. Pass an
 *                                  empty array (default) to skip.
 * @param {Set}      [input.nonServingStatuses]  statuses from middleware's
 *                                  NON_SERVING_STATUSES (see parseNonServingStatuses).
 *                                  Feeds Drift R ONLY. Pass an empty Set (default) to skip.
 * @param {Set}      [input.mainHostsSet]  hostnames from middleware's
 *                                  MAIN_HOSTS (see parseMainHostsSet).
 *                                  Feeds Drift S ONLY. Pass an empty Set (default) to skip.
 * @param {Set}      [input.rootSiteTenantsSet]  slugs from middleware's
 *                                  ROOT_SITE_TENANTS (see parseRootSiteTenantsSet).
 *                                  Feeds Drift T ONLY. Pass an empty Set (default) to skip.
 * @param {Map}      [input.staticTenantMap]  hostname -> {id, slug} from middleware's
 *                                  STATIC_TENANT_MAP (see parseStaticTenantMap).
 *                                  Feeds Drift U ONLY. Pass an empty Map (default) to skip.
 * @param {Set}      [input.knownPendingOrphans]  slugs from the KNOWN_PENDING_ORPHANS
 *                                  allowlist (see the const above). Feeds Drift V ONLY.
 *                                  Pass an empty Set (default) to skip.
 * @param {Array}    [input.nextConfigSiteRewrites]  { source, destination } pairs
 *                                  from next.config.ts's rewrites().afterFiles
 *                                  (see parseNextConfigSiteRewriteSources). Feeds
 *                                  Drift W ONLY. Pass an empty array (default) to skip.
 * @returns {Array} findings: { sev, slug, msg, pending? }
 */
export function computeFindings({ tenants, tds, bespokeSet, hasHome, resolvableSlugs = null, allTenantDomains = [], apexCanonicalSet = new Set(), protectedSlugs = new Set(), richSitemapSet = new Set(), hasSitemap = () => true, allTenants = [], nonServingStatuses = new Set(), mainHostsSet = new Set(), rootSiteTenantsSet = new Set(), staticTenantMap = new Map(), knownPendingOrphans = new Set(), nextConfigSiteRewrites = [] }) {
  const findings = []
  const add = (sev, slug, msg) => findings.push({ sev, slug, msg })

  const tdByTenant = new Map()
  for (const r of tds) {
    if (!tdByTenant.has(r.tenant_id)) tdByTenant.set(r.tenant_id, [])
    tdByTenant.get(r.tenant_id).push(r)
  }
  // domain -> [tenant slugs] to catch a domain claimed by >1 tenant
  const domainClaims = new Map()
  const claim = (domain, slug, src) => {
    const k = norm(domain)
    if (!k) return
    if (!domainClaims.has(k)) domainClaims.set(k, new Set())
    domainClaims.get(k).add(`${slug}(${src})`)
  }

  for (const t of tenants) {
    const tdRows = tdByTenant.get(t.id) || []
    const activeTd = tdRows.filter((r) => r.active)
    const isBespoke = bespokeSet.has(t.slug)
    const folderOk = hasHome(t.slug)

    // routing_mode is the DB's authoritative INTENT per active domain. What
    // actually renders is decided by middleware (isBespoke) + folder; drift is
    // when that outcome disagrees with the DB's declared routing_mode.
    const modes = new Set(activeTd.map((r) => (r.routing_mode || '').toLowerCase()).filter(Boolean))
    const dbBespoke = modes.has('bespoke')
    const dbTemplate = modes.has('template')

    if (t.domain) claim(t.domain, t.slug, 'tenants.domain')

    // Drift A: tenants.domain set but not mirrored in active tenant_domains
    if (t.domain && !activeTd.some((r) => norm(r.domain) === norm(t.domain))) {
      add('WARN', t.slug, `tenants.domain=${t.domain} has NO matching active tenant_domains row (resolver uses tenants.domain; tenant_domains is out of sync)`)
    }
    // Drift B: active tenant_domains but tenants.domain empty (resolver still works via fallback, but split brain)
    if (!t.domain && activeTd.length) {
      add('INFO', t.slug, `no tenants.domain; relies on tenant_domains fallback (${activeTd.map((r) => r.domain).join(', ')})`)
    }
    // Drift C: bespoke-routed but folder missing (guard should catch; double-check)
    if (isBespoke && !folderOk) add('CRIT', t.slug, `in BESPOKE_SITE_TENANTS but /site/${t.slug} has no homepage`)
    // Drift D: folder exists + has a domain but NOT bespoke-routed -> would serve
    // template. Suppressed when the DB explicitly declares routing_mode=bespoke
    // (that mismatch is the more precise Drift G below, don't double-report).
    if (!isBespoke && !dbBespoke && folderOk && (t.domain || activeTd.length)) {
      add('CRIT', t.slug, `has a /site/${t.slug} folder AND a live domain but is NOT in BESPOKE_SITE_TENANTS -> serves the generic template`)
    }
    // Drift G: DB says routing_mode=bespoke but middleware won't route it that way
    // -> the resolver serves the generic template. This is the exact 2026-07-10
    // silent mis-route class, now caught from the authoritative DB column.
    if (dbBespoke && !isBespoke) {
      add('CRIT', t.slug, `tenant_domains.routing_mode=bespoke but slug NOT in BESPOKE_SITE_TENANTS -> middleware serves the generic template`)
    }
    // Drift H: DB says template but middleware routes to the bespoke folder
    // (stale tenant_domains row, or middleware entry that should be dropped).
    if (dbTemplate && !dbBespoke && isBespoke) {
      add('WARN', t.slug, `tenant_domains.routing_mode=template but slug IS in BESPOKE_SITE_TENANTS -> middleware serves /site/${t.slug}, not the template the DB expects`)
    }
    // Drift I: a tenant's active domains disagree with each other on routing_mode.
    if (dbBespoke && dbTemplate) {
      add('WARN', t.slug, `active tenant_domains rows have MIXED routing_mode (bespoke + template) — ambiguous which site should render`)
    }
    // Drift J: an active domain whose status is not 'active' (enabled but not live).
    activeTd
      .filter((r) => (r.status || '').toLowerCase() !== 'active')
      .forEach((r) => add('WARN', t.slug, `active tenant_domains row ${r.domain} has status='${r.status}' (routing enabled on a non-active domain)`))
    // Drift E: has a domain, no folder, not obviously template-served
    if (!folderOk && (t.domain || activeTd.length) && t.slug !== 'full-loop-crm' && t.slug !== 'the-va-virtual-assistant') {
      add('INFO', t.slug, `live domain but no bespoke folder (template-served? confirm it's intentional)`)
    }
    // Drift M: is_primary is a real signal consumed elsewhere (tenant-health cron
    // picks the domain it health-checks by is_primary; activate-tenant.ts sets it
    // on creation) but nothing enforces it stays a single, present flag per tenant
    // once a second domain is added later (POST /api/admin/websites defaults
    // is_primary=false but doesn't stop a caller passing true again). With 2+
    // active domains, zero or 2+ marked is_primary is a real ambiguity — different
    // consumers (first-match-wins reducers, UI pickers) can silently disagree on
    // which domain is "the" one. A single active domain has nothing to
    // disambiguate, so this only fires once there's more than one to choose from.
    if (activeTd.length > 1) {
      const primaryDomains = activeTd.filter((r) => r.is_primary).map((r) => r.domain)
      if (primaryDomains.length === 0) {
        add('WARN', t.slug, `${activeTd.length} active tenant_domains rows but NONE marked is_primary — ambiguous canonical domain (${activeTd.map((r) => r.domain).join(', ')})`)
      } else if (primaryDomains.length > 1) {
        add('WARN', t.slug, `multiple active tenant_domains rows marked is_primary — ambiguous canonical domain (${primaryDomains.join(', ')})`)
      }
    }
  }

  // Claim source: tenant_domains, scanned across ALL rows (not just ones matched
  // to a tenant present in `tenants`). The tenants query filters to
  // active/live/setup status; a row whose owning tenant was hard-deleted or fell
  // outside that filter (the real query LEFT JOINs, so its slug can be null) is
  // otherwise invisible to Drift F — a stale active=true row then silently
  // squats a domain a live tenant also claims, with no collision ever surfacing.
  for (const r of tds) {
    if (r.active) claim(r.domain, r.slug || `tenant:${(r.tenant_id || '').slice(0, 8)}`, 'tenant_domains')
  }

  // Claim source: tenants.domain across ANY tenant status, not just the
  // active/live/setup ones the main loop above iterates. The live resolver's
  // getTenantByDomain() matches tenants.domain with NO status filter at all —
  // so a suspended/cancelled/deleted tenant whose domain column was never
  // cleared still really collides if that same domain gets reassigned to a
  // new active tenant (or worse, Postgres/PostgREST .single() ambiguity on
  // TWO matching rows silently swallows the error and falls through to
  // tenant_domains). Without this sweep, that stale row is entirely absent
  // from `tenants` here and Drift F never sees it. Distinct-by-slug dedup
  // below means re-claiming an already in-scope tenant's own domain is a
  // harmless no-op, not a double-count.
  for (const t of allTenantDomains) {
    if (t.domain) claim(t.domain, t.slug, 'tenants.domain(any-status)')
  }

  // Drift F: a domain claimed by more than one tenant
  for (const [domain, slugs] of domainClaims) {
    const distinct = new Set([...slugs].map((s) => s.split('(')[0]))
    if (distinct.size > 1) add('CRIT', [...distinct].join('+'), `domain ${domain} is claimed by MULTIPLE tenants: ${[...slugs].join(', ')}`)
  }

  // Drift K: any tenant_domains row with no vercel_project set. Warn-only — the
  // domain still routes, but we can't tie it to a Vercel project, which breaks
  // deploy/alias automation and makes cutover verification blind. Swept across
  // EVERY row (not just active ones on active tenants) so nothing is missed.
  for (const r of tds) {
    if (r.vercel_project === null || r.vercel_project === undefined || r.vercel_project === '') {
      const label = r.slug || `tenant:${(r.tenant_id || '').slice(0, 8)}`
      add('WARN', label, `tenant_domains row ${r.domain} has vercel_project=NULL (no Vercel project bound; deploy/alias automation can't target it)`)
    }
  }

  // Drift L: a BESPOKE_SITE_TENANTS entry with NO resolvable tenant. The main
  // loop above only iterates DB tenants, so a middleware set entry that points at
  // nothing (tenant deleted or never created) is invisible to it — the domain
  // falls through to the main site while the build guard still PROTECTs the slug,
  // giving false confidence. Resolvability is checked against tenants of ANY
  // status (not the active filter used above) so a legitimately paused/disabled
  // bespoke tenant is not mis-flagged. Since tenant_domains.tenant_id references
  // tenants, "no tenants row" already implies "no tenant_domains row" for the slug.
  // Skipped entirely when resolvableSlugs is null (caller had nothing to check).
  if (resolvableSlugs !== null && bespokeSet.size) {
    for (const slug of bespokeSet) {
      if (!resolvableSlugs.has(slug)) {
        const pending = KNOWN_PENDING_ORPHANS.has(slug)
        const suffix = pending
          ? ' [KNOWN-PENDING: awaiting Jeff disposition — reported but does NOT gate CI; remove from KNOWN_PENDING_ORPHANS once resolved]'
          : ''
        findings.push({
          sev: 'CRIT',
          slug,
          msg: `in BESPOKE_SITE_TENANTS but has NO resolvable tenant (no tenants row of any status) -> middleware routes nothing; the build guard PROTECTs a phantom slug${suffix}`,
          pending,
        })
      }
    }
  }

  // Drift N: a BESPOKE_SITE_TENANTS entry whose tenant EXISTS (resolvable, ANY
  // status) but is NOT in the main `tenants` scope (active/live/setup) — e.g.
  // suspended/cancelled/trial. The main loop above only iterates `tenants`, so
  // Drift C (folder missing) never runs for this slug; Drift L doesn't fire
  // either because the tenant DOES resolve. Middleware routes purely on slug
  // membership in BESPOKE_SITE_TENANTS — it does not check tenant status — so a
  // request still lands here regardless, and with the folder gone it 404s with
  // NO drift signal from any other check. Skipped when resolvableSlugs is null,
  // same as Drift L (caller had nothing to check).
  if (resolvableSlugs !== null && bespokeSet.size) {
    const inScopeSlugs = new Set(tenants.map((t) => t.slug))
    for (const slug of bespokeSet) {
      if (resolvableSlugs.has(slug) && !inScopeSlugs.has(slug) && !hasHome(slug)) {
        add(
          'CRIT',
          slug,
          `in BESPOKE_SITE_TENANTS with a resolvable tenant whose status is NOT active/live/setup, and /site/${slug} has no homepage -> middleware routes here regardless of tenant status; invisible to Drift C (tenant out of scope) and Drift L (tenant resolves)`,
        )
      }
    }
  }

  // Drift O: an APEX_CANONICAL_DOMAINS entry (middleware's apex/www
  // redirect-loop exemption list — see parseApexCanonicalSet) that matches NO
  // known tenant domain anywhere (tenants.domain of any status, or any
  // tenant_domains row). Either it's dead config for a domain nothing serves
  // (harmless), or it's a typo of the domain it was meant to protect — in
  // which case the apex<->www redirect fight the exemption exists to prevent
  // (Vercel's www->apex 307 vs middleware's apex->www 301, per the comment
  // above APEX_CANONICAL_DOMAINS in middleware.ts) silently resumes for that
  // tenant with zero drift signal from any other check, because this list
  // lives ONLY in middleware source, outside every DB source this gate
  // otherwise reconciles.
  if (apexCanonicalSet.size) {
    const knownDomains = new Set()
    for (const t of tenants) if (t.domain) knownDomains.add(norm(t.domain))
    for (const r of tds) if (r.domain) knownDomains.add(norm(r.domain))
    for (const t of allTenantDomains) if (t.domain) knownDomains.add(norm(t.domain))
    for (const d of apexCanonicalSet) {
      if (!knownDomains.has(norm(d))) {
        add('WARN', d, `in APEX_CANONICAL_DOMAINS (middleware apex/www redirect-loop exemption) but matches NO known tenant domain — dead entry, or a typo silently defeating the loop protection it exists for`)
      }
    }
  }

  // Drift P: a BESPOKE_SITE_TENANTS entry with no matching PROTECTED entry in
  // verify-protected-tenants.mjs. That script only guards the slugs it's told
  // about — adding a slug to BESPOKE_SITE_TENANTS without adding the matching
  // PROTECTED entry means the build-time guard never checks it, so its folder
  // can vanish or its middleware entry can get dropped in a future merge with
  // no CI signal at all, same failure mode as the 2026-07-08 outage this guard
  // exists to prevent — just for a tenant the guard was never told to watch.
  // The reverse (PROTECTED entry not in BESPOKE_SITE_TENANTS) is already
  // asserted by verify-protected-tenants.mjs itself at build time, so it is
  // deliberately not duplicated here.
  if (protectedSlugs.size) {
    for (const slug of bespokeSet) {
      if (!protectedSlugs.has(slug)) {
        add('WARN', slug, `in BESPOKE_SITE_TENANTS but has NO matching PROTECTED entry in scripts/verify-protected-tenants.mjs -> the build-time guard does not watch this tenant; its folder or middleware entry could silently disappear with no CI signal`)
      }
    }
  }

  // Drift Q: a TENANTS_WITH_RICH_SITEMAP entry (src/middleware.ts — tenants
  // that own a bespoke sitemap instead of falling back to the generic
  // /api/tenant-sitemap) with no sitemap file at
  // src/app/site/<slug>/sitemap.ts or src/app/site/<slug>/sitemap.xml/route.ts.
  // Like APEX_CANONICAL_DOMAINS, this list lives ONLY in middleware source,
  // outside every DB source this gate otherwise reconciles, so a slug added
  // here without its sitemap file is invisible to every other Drift check —
  // rewriteToSite() unconditionally rewrites /sitemap.xml to that path for
  // this slug, so the request 404s with no drift signal from any other check.
  if (richSitemapSet.size) {
    for (const slug of richSitemapSet) {
      if (!hasSitemap(slug)) {
        add('CRIT', slug, `in TENANTS_WITH_RICH_SITEMAP (src/middleware.ts) but has neither src/app/site/${slug}/sitemap.ts nor src/app/site/${slug}/sitemap.xml/route.ts -> the /sitemap.xml rewrite target 404s`)
      }
    }
  }

  // Drift R: a tenant whose status is OUTSIDE this script's own reconcile scope
  // (active/live/setup — the `tenants` SQL filter) but ALSO outside middleware's
  // NON_SERVING_STATUSES, so tenantServesSite() in src/middleware.ts still serves
  // its site to real visitors. These are two independent, manually maintained
  // "which tenants matter" lists; a status in neither — e.g. 'pending', the
  // default create-tenant-from-lead.ts sets on every new tenant before
  // activation — falls straight through the gap: the main loop above never
  // iterates it (so Drift C/D/E/G/H/I/J/M/N all skip it), yet middleware routes
  // real traffic to it if it has a domain. Zero drift signal from any other
  // check in this file. Skipped entirely when allTenants is empty (caller had
  // nothing to check) — nonServingStatuses empty is NOT treated as "everything
  // serves"; an empty allTenants list is the actual no-op signal.
  if (allTenants.length) {
    const inScopeSlugs = new Set(tenants.map((t) => t.slug))
    const activeTenantIds = new Set(tds.filter((r) => r.active).map((r) => r.tenant_id))
    for (const t of allTenants) {
      if (inScopeSlugs.has(t.slug)) continue
      if (nonServingStatuses.has((t.status || '').toLowerCase())) continue
      const hasDomain = Boolean(t.domain) || activeTenantIds.has(t.id)
      if (hasDomain) {
        add(
          'CRIT',
          t.slug,
          `tenants.status='${t.status}' is outside this gate's reconcile scope (active/live/setup) but NOT in middleware's NON_SERVING_STATUSES -> tenantServesSite() still serves this domain while every per-tenant drift check (C/D/E/G/H/I/J/M/N) is skipped for it`,
        )
      }
    }
  }

  // Drift S: a tenant domain (tenants.domain in scope, an active tenant_domains
  // row, or tenants.domain of any status) collides with a MAIN_HOSTS entry in
  // src/middleware.ts. isMainHost() gates the ENTIRE custom-domain routing
  // block (`if (!isMainHost(hostname)) { ... }` wraps every tenant lookup) —
  // a domain that normalizes to a MAIN_HOSTS entry is silently treated as the
  // main marketing/app host and NEVER reaches tenant resolution, no matter
  // what tenants.domain / tenant_domains / routing_mode declare. This is the
  // exact "DB says one thing, middleware serves something else" outage class
  // the whole gate exists to catch, just via a reserved-host collision instead
  // of a routing_mode mismatch — and it is currently invisible to every other
  // Drift check in this file.
  if (mainHostsSet.size) {
    const normMainHosts = new Map([...mainHostsSet].map((h) => [norm(h), h]))
    const reported = new Set()
    const checkDomain = (domain, slug) => {
      const k = norm(domain)
      if (!k || !normMainHosts.has(k)) return
      const dedupeKey = `${slug}|${k}`
      if (reported.has(dedupeKey)) return
      reported.add(dedupeKey)
      add(
        'CRIT',
        slug,
        `domain ${domain} collides with MAIN_HOSTS entry '${normMainHosts.get(k)}' in src/middleware.ts -> isMainHost() treats this hostname as the main app host and NEVER routes it to the tenant, regardless of tenants.domain / tenant_domains / routing_mode`,
      )
    }
    for (const t of tenants) if (t.domain) checkDomain(t.domain, t.slug)
    for (const r of tds) if (r.active && r.domain) checkDomain(r.domain, r.slug || `tenant:${(r.tenant_id || '').slice(0, 8)}`)
    for (const t of allTenantDomains) if (t.domain) checkDomain(t.domain, t.slug)
  }

  // Drift T: a slug present in BOTH ROOT_SITE_TENANTS and BESPOKE_SITE_TENANTS
  // in src/middleware.ts. The siteBase ternary checks ROOT_SITE_TENANTS FIRST
  // (`ROOT_SITE_TENANTS.has(slug) ? '/site' : BESPOKE_SITE_TENANTS.has(slug) ?
  // '/site/<slug>' : '/site/template'`), so ROOT_SITE_TENANTS silently wins: the
  // bespoke /site/<slug> subtree — the one BESPOKE_SITE_TENANTS membership and
  // verify-protected-tenants.mjs's PROTECTED entry both assume is reached — is
  // never rewritten to. Neither the build guard (only checks BESPOKE_SITE_TENANTS
  // membership + folder existence) nor Drift C/P above (same two facts) can see
  // this: both would report green while the live site silently serves the shared
  // /site root instead of the protected tenant's own site.
  for (const slug of rootSiteTenantsSet) {
    if (bespokeSet.has(slug)) {
      add(
        'CRIT',
        slug,
        `in BOTH ROOT_SITE_TENANTS and BESPOKE_SITE_TENANTS in src/middleware.ts -> ROOT_SITE_TENANTS wins the siteBase ternary, silently serving the shared /site root instead of /site/${slug} regardless of BESPOKE_SITE_TENANTS membership or the build guard`,
      )
    }
  }

  // Drift U: a STATIC_TENANT_MAP entry (src/middleware.ts — the hardcoded
  // hostname -> {id, slug} fallback used "when DB lookup at the edge is
  // unreliable" on the custom-domain routing path) whose slug has no
  // resolvable tenant, whose id disagrees with the actual tenants row, or
  // whose tenant status is in NON_SERVING_STATUSES. This source is uniquely
  // dangerous: unlike every other routing path in middleware.ts (subdomain
  // lookup, DB domain lookup — both call tenantServesSite() before
  // rewriting), the STATIC_TENANT_MAP branch calls rewriteToSite()
  // UNCONDITIONALLY, with no status check at all. A tenant suspended,
  // cancelled, or deleted after being hardcoded here keeps serving its live
  // site to every visitor of that hostname, with zero drift signal from any
  // other check in this file (Drift R only watches tenants outside this
  // script's own DB-query scope, not this separate hardcoded bypass).
  if (staticTenantMap.size) {
    const bySlug = new Map(allTenants.map((t) => [t.slug, t]))
    for (const [host, entry] of staticTenantMap) {
      const t = bySlug.get(entry.slug)
      if (!t) {
        add(
          'CRIT',
          entry.slug,
          `STATIC_TENANT_MAP['${host}'] in src/middleware.ts points at slug with NO resolvable tenant (no tenants row of any status) -> rewriteToSite() runs unconditionally on this path (no tenantServesSite() check), so this hostname serves a broken/phantom rewrite`,
        )
        continue
      }
      if (t.id !== entry.id) {
        add(
          'CRIT',
          entry.slug,
          `STATIC_TENANT_MAP['${host}'] id=${entry.id} does not match tenants.id=${t.id} for slug '${entry.slug}' -> stale hardcoded id in src/middleware.ts (tenant recreated?); rewriteToSite() runs unconditionally on this path`,
        )
      }
      if (nonServingStatuses.has((t.status || '').toLowerCase())) {
        add(
          'CRIT',
          entry.slug,
          `STATIC_TENANT_MAP['${host}'] in src/middleware.ts serves this hostname UNCONDITIONALLY (no tenantServesSite() check on this bypass path) but tenants.status='${t.status}' is in NON_SERVING_STATUSES -> the tenant's site keeps serving live traffic despite being suspended/cancelled/deleted`,
        )
      }
    }
  }

  // Drift V: a KNOWN_PENDING_ORPHANS allowlist entry (see the comment above the
  // const, above) that is stale — either the slug was already dispositioned
  // (removed from BESPOKE_SITE_TENANTS entirely, so Drift L can never see it
  // again) or it became resolvable (Jeff recreated the tenant, so Drift L's own
  // "not resolvable" condition no longer matches it). Both cases are
  // functionally harmless today — Drift L simply never re-fires for that slug
  // either way — but the allowlist's whole purpose is to keep a CRIT visible
  // ONLY while a real disposition is still pending; an entry that no longer
  // matches that description is a forgotten cleanup, and it would silently
  // downgrade a BRAND NEW orphan to "known-pending, non-gating" if the same
  // slug were ever reused for a different bespoke tenant later. Takes the
  // allowlist as an explicit input (rather than reading the module-level
  // KNOWN_PENDING_ORPHANS constant directly, the way Drift L does) so this
  // check stays opt-in like Drift O/P/Q/R/S/T/U — Drift L only ever consults
  // the constant as a per-slug lookup scoped to bespokeSet's own members, but
  // this check independently enumerates the allowlist itself, which would
  // otherwise leak fixed real-tenant slugs into every caller's fixtures.
  // Skipped when resolvableSlugs is null (same guard as Drift L/N) or the
  // allowlist is empty (default — caller had nothing to check).
  if (resolvableSlugs !== null && knownPendingOrphans.size) {
    for (const slug of knownPendingOrphans) {
      if (!bespokeSet.has(slug)) {
        add('WARN', slug, `in KNOWN_PENDING_ORPHANS but no longer in BESPOKE_SITE_TENANTS -> this orphan was already dispositioned (or never was one); remove the stale entry from KNOWN_PENDING_ORPHANS in scripts/reconcile-tenant-config.mjs`)
      } else if (resolvableSlugs.has(slug)) {
        add('WARN', slug, `in KNOWN_PENDING_ORPHANS but now resolves to a tenants row -> Jeff already dispositioned this orphan (tenant recreated); remove the stale entry from KNOWN_PENDING_ORPHANS in scripts/reconcile-tenant-config.mjs`)
      }
    }
  }

  // Drift W: a next.config.ts rewrites().afterFiles entry whose source is a
  // bare "/site/<segment>" legacy short-URL alias (see
  // parseNextConfigSiteRewriteSources) while ROOT_SITE_TENANTS is empty. That
  // bare pathname is ONLY ever produced by middleware's rewriteToSite() for a
  // ROOT_SITE_TENANTS member (siteBase='/site'); every BESPOKE_SITE_TENANTS
  // tenant gets '/site/<slug>/<path>' and every other tenant gets
  // '/site/template/<path>' — neither matches a source this literal. With
  // ROOT_SITE_TENANTS empty, NO tenant's domain-routed traffic can ever hit
  // this rewrite, so it is unreachable dead config for real customer requests
  // (it only still fires for an un-rewritten direct /site/* browse on the main
  // host, not a tenant's own domain). This is exactly the nycmaid migration
  // case: nycmaid moved from root-routed ('/site') to BESPOKE_SITE_TENANTS
  // ('/site/nycmaid') without these short-alias rewrites being updated to the
  // new '/site/nycmaid/<path>' namespace or removed — so old bookmarked/
  // linked short URLs like thenycmaid.com/about now 404 instead of redirecting.
  if (nextConfigSiteRewrites.length && rootSiteTenantsSet.size === 0) {
    for (const { source, destination } of nextConfigSiteRewrites) {
      add(
        'WARN',
        source,
        `next.config.ts rewrites().afterFiles source '${source}' -> '${destination}' is a bare /site/<segment> alias, but ROOT_SITE_TENANTS is empty -> no tenant's middleware-routed traffic can ever produce that bare pathname (bespoke tenants get /site/<slug>/..., others get /site/template/...) -- unreachable dead config; likely a stale short-URL alias left behind after its tenant moved into BESPOKE_SITE_TENANTS`,
      )
    }
  }

  return findings
}

/**
 * Reduce findings to sorted report rows + gate decision. gatingCrit excludes
 * KNOWN-PENDING CRITs (reported, but they do not fail CI).
 */
export function summarize(findings) {
  const order = { CRIT: 0, WARN: 1, INFO: 2 }
  const sorted = [...findings].sort((a, b) => order[a.sev] - order[b.sev])
  const counts = sorted.reduce((c, f) => ((c[f.sev] = (c[f.sev] || 0) + 1), c), {})
  const pendingCrit = sorted.filter((f) => f.sev === 'CRIT' && f.pending).length
  const gatingCrit = (counts.CRIT || 0) - pendingCrit
  return { sorted, counts, pendingCrit, gatingCrit }
}

// --- Token guard: env var (CI) -> ~/.env.local (local) -> null (skip clean) ---
/**
 * @param {{ SUPABASE_ACCESS_TOKEN_FULLLOOP?: string, HOME?: string }} [env]
 */
export function loadToken(env = process.env) {
  const fromEnv = env.SUPABASE_ACCESS_TOKEN_FULLLOOP
  if (fromEnv && fromEnv.trim()) return fromEnv.trim()
  const envPath = join(env.HOME || '', '.env.local')
  if (!existsSync(envPath)) return null
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*SUPABASE_ACCESS_TOKEN_FULLLOOP\s*=\s*(.*)\s*$/)
    if (m) return m[1].replace(/^["']|["']$/g, '').trim() || null
  }
  return null
}

// --- CLI (runs only when invoked directly; import is side-effect-free I/O) ---
async function main() {
  const TOK = loadToken()
  if (!TOK) {
    console.log('reconcile-tenant-config: SUPABASE_ACCESS_TOKEN_FULLLOOP absent — skipping (exit 0).')
    process.exit(0)
  }

  const sql = async (query) => {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOK}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    const d = await r.json()
    if (!Array.isArray(d)) throw new Error('SQL: ' + JSON.stringify(d).slice(0, 200))
    return d
  }

  // Source 3 + 4 + 5 from the working tree.
  const middlewareSource = readFileSync(join(REPO, 'src', 'middleware.ts'), 'utf8')
  const bespokeSet = parseBespokeSet(middlewareSource)
  const apexCanonicalSet = parseApexCanonicalSet(middlewareSource)
  const richSitemapSet = parseRichSitemapSet(middlewareSource)
  const nonServingStatuses = parseNonServingStatuses(middlewareSource)
  const mainHostsSet = parseMainHostsSet(middlewareSource)
  const rootSiteTenantsSet = parseRootSiteTenantsSet(middlewareSource)
  const staticTenantMap = parseStaticTenantMap(middlewareSource)
  const verifyProtectedSource = readFileSync(join(REPO, 'scripts', 'verify-protected-tenants.mjs'), 'utf8')
  const protectedSlugs = parseProtectedSlugs(verifyProtectedSource)
  const nextConfigSource = readFileSync(join(REPO, 'next.config.ts'), 'utf8')
  const nextConfigSiteRewrites = parseNextConfigSiteRewriteSources(nextConfigSource)
  const siteDir = join(REPO, 'src', 'app', 'site')
  const hasHome = (slug) => {
    const d = join(siteDir, slug)
    if (!existsSync(d)) return false
    if (existsSync(join(d, 'page.tsx'))) return true
    return readdirSync(d).some((e) => e.startsWith('(') && e.endsWith(')') && existsSync(join(d, e, 'page.tsx')))
  }
  const hasSitemap = (slug) => {
    const d = join(siteDir, slug)
    return existsSync(join(d, 'sitemap.ts')) || existsSync(join(d, 'sitemap.xml', 'route.ts'))
  }

  const [tenants, tds, allTenantDomains, allTenants] = await Promise.all([
    sql("select id, slug, domain, status from tenants where status in ('active','live','setup')"),
    sql(
      'select td.tenant_id, td.domain, td.active, td.is_primary, td.routing_mode, td.status, td.vercel_project, t.slug' +
        ' from tenant_domains td left join tenants t on t.id = td.tenant_id',
    ),
    // ANY status, unlike the `tenants` query above — feeds the Drift F claim-only
    // sweep so a stale domain on a suspended/cancelled/deleted tenant still
    // collides (the live resolver's tenants.domain lookup has no status filter).
    sql('select slug, domain from tenants where domain is not null'),
    // ANY status, unfiltered — feeds Drift R's scan for a tenant status that
    // falls in the gap between this script's own scope and middleware's
    // NON_SERVING_STATUSES gate.
    sql('select id, slug, status, domain from tenants'),
  ])

  // Drift L needs a second query: which bespoke slugs resolve to a tenants row.
  let resolvableSlugs = null
  if (bespokeSet.size) {
    const slugList = [...bespokeSet].map((s) => `'${s.replace(/'/g, "''")}'`).join(',')
    const resolvable = await sql(`select slug from tenants where slug in (${slugList})`)
    resolvableSlugs = new Set(resolvable.map((r) => r.slug))
  }

  const findings = computeFindings({ tenants, tds, bespokeSet, hasHome, resolvableSlugs, allTenantDomains, apexCanonicalSet, protectedSlugs, richSitemapSet, hasSitemap, allTenants, nonServingStatuses, mainHostsSet, rootSiteTenantsSet, staticTenantMap, knownPendingOrphans: KNOWN_PENDING_ORPHANS, nextConfigSiteRewrites })

  // --- Report ---
  const { sorted, counts, pendingCrit, gatingCrit } = summarize(findings)
  console.log(`\nTenant-config reconcile — ${tenants.length} tenants | CRIT:${counts.CRIT || 0} (gating:${gatingCrit}, known-pending:${pendingCrit}) WARN:${counts.WARN || 0} INFO:${counts.INFO || 0}\n`)
  for (const f of sorted) console.log(`  [${f.sev}] ${f.slug.padEnd(30)} ${f.msg}`)
  if (!sorted.length) console.log('  no drift — all four sources agree.')
  console.log('')
  process.exit(gatingCrit ? 1 : 0)
}

// Run the CLI only when this file is the entrypoint (node scripts/…​.mjs).
// Importing the module (tests) must not touch the network or exit the process.
try {
  if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
    main().catch((e) => {
      console.error(e)
      process.exit(1)
    })
  }
} catch {
  /* argv[1] unresolvable (e.g. odd runner) — treat as "not the entrypoint" */
}
