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

// --- Shared by every parseXSet/parseXMap below: strip comments out of an
// extracted array/object-literal block BEFORE running a quoted-string regex
// over it. Without this, a slug commented out during a merge/edit/debugging
// session (`// 'nyc-tow',` or `/* 'nyc-tow', */`) is still matched as a live
// entry — the exact false-negative this gate exists to prevent, just moved
// one level up from the outage itself into the gate's own parser. Verified
// empirically (not just reasoned about) against parseBespokeSet's twin,
// scripts/verify-protected-tenants.mjs: commenting out 'nyc-tow' in
// src/middleware.ts left that script's own un-stripped regex reporting
// "✅ ... OK" (exit 0) while middleware would actually route it to
// /site/template at runtime — see the sibling fix there.
//
// The comment strip is quote-aware (matches a full quoted string OR a
// `//...` comment OR a `/*...*/` block comment, all in ONE pass, and only
// erases the two comment branches) rather than two separate passes. A bare
// line-comment version treats the FIRST `//` on a line as a comment start
// even when it appears INSIDE a quoted value — and three of this file's own
// parsers (parseNextConfigSiteRewriteSources,
// parseAllNextConfigSiteRewriteSources, parseNextConfigRedirects) extract
// next.config.ts `destination` values, which can legitimately be a full
// external URL (`'https://partner-site.com/path'` — an ordinary Next.js
// redirect-to-a-third-party-site shape). A bare line-comment strip run on
// `{ source: '/old', destination: 'https://partner.com/x' },` truncates the
// LINE at the `//` in `https://`, deleting everything after it — the
// destination's closing quote, its comma, and any same-line `permanent:
// true`. Mutation-verified live (not reasoned about): the entry does not
// cleanly vanish. entryRe's `destination` capture (`[^'"\`]+`) is not
// anchored to end-of-line, so with the closing quote gone it keeps matching
// PAST the newline and swallows the START of the next array entry as part
// of the same "destination" value — corrupting one real entry into a
// garbled merge of two, rather than dropping one cleanly. Either way the
// affected entry's real `source`/`destination` pair is lost. A lost
// `source` also vanishes from findShadowedKilledRoutePages'
// `redirectSources` set (Drift AD), so a killed route legitimately rescued
// by that redirect would get wrongly reported as permanently unreachable —
// a false positive from the gate's OWN parser, not a real config bug.
//
// The SAME unquoted-scan hazard applies to the block-comment branch
// (`/\/\*[\s\S]*?\*\//g`), and it used to run as a SEPARATE, quote-BLIND
// first pass over the raw block text before the quote-aware line-comment
// pass ever saw it. A destination value containing a literal `/*` (e.g.
// `'/site/bar/*baz'` — a wildcard-shaped path segment, no different in kind
// from the `//`-bearing external-URL case above) was treated as a block-
// comment START regardless of being inside a quote, and the non-greedy
// `[\s\S]*?\*\/` then matched forward to the NEXT literal `*/` ANYWHERE
// later in the block — including a genuine block comment on a LATER,
// unrelated array entry — silently deleting every real entry in between.
// Mutation-verified live: a block containing `destination: '/site/bar/*baz'`
// followed on a later line by an unrelated real `/* trailing comment */`
// had the entire span between the quoted `/*` and that real `*/` erased,
// truncating the first entry's destination AND deleting the second entry
// outright. No current next.config.ts source/destination contains a literal
// `/*` (verified: `grep '/\*' next.config.ts src/middleware.ts
// src/app/robots.ts scripts/verify-protected-tenants.mjs` — every hit is in
// a real code comment, none inside a parsed quoted value), so like the
// line-comment fix above this is landmine-only today, same prospective-bug
// shape as Drift T/W and the line-comment fix itself, just the sibling
// branch of the SAME shared helper the line-comment fix left "untouched."
// Folding both comment forms into the SAME quoted-string-first alternation
// closes both at once: whichever alternative matches at a given position
// wins that span, and the quoted-string alternative is tried first, so a
// `/*` or `//` already inside an open quote is consumed as part of the
// string match and never separately reaches either comment branch.
function stripComments(text) {
  return text.replace(/(['"`])(?:(?!\1)[^\\]|\\.)*\1|\/\/.*$|\/\*[\s\S]*?\*\//gm, (m) =>
    m.startsWith('//') || m.startsWith('/*') ? '' : m,
  )
}

// --- Source 3: parse BESPOKE_SITE_TENANTS out of the middleware source ---
export function parseBespokeSet(middlewareSource) {
  const block = middlewareSource.match(/BESPOKE_SITE_TENANTS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/)
  return new Set(block ? [...stripComments(block[1]).matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : [])
}

// --- Source 5: parse APEX_CANONICAL_DOMAINS out of the middleware source.
// This is the apex/www canonical-redirect loop-prevention exemption list — a
// domain in it is served at the bare apex instead of being 301'd to www. It
// lives ONLY in middleware source, outside every DB source the rest of this
// gate reconciles, so a typo here is invisible to every other Drift check.
export function parseApexCanonicalSet(middlewareSource) {
  const block = middlewareSource.match(/APEX_CANONICAL_DOMAINS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/)
  return new Set(block ? [...stripComments(block[1]).matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : [])
}

// --- parse the relative import specifiers ("from './foo'") out of a source
// file. Used to follow a bespoke tenant's sitemap.ts one hop into a sibling
// _lib module when it re-exports its URL base (e.g. SITE_DOMAIN) rather than
// inlining it — see findHardcodedWwwApexDomains below and Drift AB.
export function parseRelativeImportPaths(source) {
  return new Set([...source.matchAll(/from\s*['"](\.[^'"]+)['"]/g)].map((m) => m[1]))
}

// --- scan a bespoke tenant's own canonical-URL sources (sitemap.ts, robots.ts,
// and anything sitemap.ts relative-imports) for a hardcoded "https://www.<x>"
// literal naming a domain that IS in middleware's APEX_CANONICAL_DOMAINS. That
// list exists specifically because www does not serve cleanly on Vercel for
// those domains (see the comment above APEX_CANONICAL_DOMAINS in middleware.ts)
// — a tenant's own generator hardcoding the www form anyway means every URL it
// produces (a sitemap.xml can carry thousands) points crawlers at the exact
// host the exemption was added to avoid. See Drift AB below.
export function findHardcodedWwwApexDomains(sources, apexCanonicalSet) {
  const found = new Set()
  for (const src of sources) {
    if (!src) continue
    for (const m of src.matchAll(/https?:\/\/(www\.[a-z0-9.-]+)/gi)) {
      const apex = m[1].toLowerCase().replace(/^www\./, '')
      if (apexCanonicalSet.has(apex)) found.add(apex)
    }
  }
  return found
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
  return new Set(block ? [...stripComments(block[1]).matchAll(/slug:\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : [])
}

// --- parse TENANTS_WITH_RICH_SITEMAP out of the middleware source.
// This is the set of tenants whose /sitemap.xml is rewritten to their own
// src/app/site/<slug>/sitemap.ts (or sitemap.xml/route.ts) instead of falling
// back to the generic /api/tenant-sitemap. Like APEX_CANONICAL_DOMAINS, it
// lives ONLY in middleware source, outside every DB source the rest of this
// gate reconciles, so a slug added here without its sitemap file is invisible
// to every other Drift check — see Drift Q below (and its mirror, Drift Y, for
// the reverse case: a sitemap file that exists but was never added here).
export function parseRichSitemapSet(middlewareSource) {
  const block = middlewareSource.match(/TENANTS_WITH_RICH_SITEMAP\s*=\s*new Set(?:<string>)?\(\[([\s\S]*?)\]\)/)
  return new Set(block ? [...stripComments(block[1]).matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : [])
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
  return new Set(block ? [...stripComments(block[1]).matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : [])
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
  return new Set(block ? [...stripComments(block[1]).matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : [])
}

// --- parse the MAIN_HOSTS out of src/app/robots.ts. Unlike every other list
// this file reconciles, this one is not an independent source of routing
// truth — it is a second, hand-maintained COPY of middleware's own MAIN_HOSTS,
// kept only because robots.ts can't import from middleware.ts at build time.
// robots.ts's own comment says so explicitly: "Same MAIN_HOSTS as
// middleware.ts — keep in sync if that list changes." Nothing enforces that.
// See Drift Z below for what happens when the copy falls behind.
export function parseRobotsMainHostsSet(robotsSource) {
  const block = robotsSource.match(/MAIN_HOSTS\s*=\s*new Set(?:<string>)?\(\[([\s\S]*?)\]\)/)
  return new Set(block ? [...stripComments(block[1]).matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : [])
}

// --- parse KILLED_ROUTES out of the middleware source. Routes killed during
// the 2026-05-03 teaser pivot — isKilledRoute() 410s them on the main host
// (see MAIN_HOSTS above). Currently a single entry ('/apply'), but it is an
// array, not a constant — see Drift AA below for the second hand-maintained
// copy of it.
export function parseKilledRoutes(middlewareSource) {
  const block = middlewareSource.match(/KILLED_ROUTES\s*=\s*\[([\s\S]*?)\]/)
  return new Set(block ? [...stripComments(block[1]).matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : [])
}

// --- parse src/app/robots.ts's own hardcoded copy of KILLED_ROUTES out of its
// `if (isMainHost) { ... }` block. Exactly like parseRobotsMainHostsSet above,
// robots.ts can't import middleware.ts's KILLED_ROUTES const at build time, so
// it re-hardcodes each killed route as its own disallow.push(...) call inside
// that block, with a comment explaining the teaser-pivot origin but nothing
// enforcing it stays in sync. See Drift AA below.
export function parseRobotsKilledRoutes(robotsSource) {
  const block = robotsSource.match(/if\s*\(isMainHost\)\s*\{([\s\S]*?)\n\s*\}/)
  return new Set(block ? [...stripComments(block[1]).matchAll(/disallow\.push\(\s*['"`]([^'"`]+)['"`]\s*\)/g)].map((m) => m[1]) : [])
}

// --- parse JOIN_CRAWLABLE_HOSTS out of src/app/robots.ts. This is a THIRD
// hardcoded hostname list in that file (alongside its own MAIN_HOSTS and
// KILLED_ROUTES copies above), but unlike those two it is not a copy of
// anything middleware.ts also declares — it exists only here, as a carve-out
// exempting specific tenant custom domains from the default '/join/'
// disallow rule so their public /join/* hiring-funnel pages (JobPosting
// structured data, crawlable pre-cutover on the standalone site) stay
// indexed. Because it lives entirely outside every DB source this gate
// otherwise reconciles, a domain that changes (or a typo at authoring time)
// gives zero drift signal anywhere else — see Drift AH below.
export function parseJoinCrawlableHosts(robotsSource) {
  const block = robotsSource.match(/JOIN_CRAWLABLE_HOSTS\s*=\s*new Set(?:<string>)?\(\[([\s\S]*?)\]\)/)
  return new Set(block ? [...stripComments(block[1]).matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : [])
}

// --- parse src/app/robots.ts's own hardcoded `disallow` array literal — the
// baseline list of private-app-surface path prefixes disallowed on every
// host (main + tenant), BEFORE the conditional '/join/' and '/apply'
// disallow.push() calls below it (those are covered separately: '/apply' by
// parseRobotsKilledRoutes/Drift AA, '/join/' by JOIN_CRAWLABLE_HOSTS/Drift
// AH-AI). This is a FOURTH hand-maintained hardcoded list in that file
// (alongside its MAIN_HOSTS copy, KILLED_ROUTES copy, and
// JOIN_CRAWLABLE_HOSTS), but unlike the first two it is not a copy of any
// single middleware.ts array — nothing ties it to middleware's
// APP_ROOT_PREFIXES (see parseAppRootPrefixes), even though every
// APP_ROOT_PREFIXES entry serves at its own literal, non-token-gated path on
// every tenant custom domain and is therefore exactly as globally
// crawlable/private as '/dashboard/' or '/admin/', which this array already
// covers. See Drift AJ below for what happens when a new APP_ROOT_PREFIXES
// entry is added without a matching disallow entry here.
export function parseRobotsDisallowList(robotsSource) {
  const block = robotsSource.match(/const disallow = \[([\s\S]*?)\]/)
  return block ? [...stripComments(block[1]).matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : []
}

// --- real robots.txt Disallow matching: a literal PREFIX match on the URL
// path, plus Google's '$' suffix meaning "end of path" (exact match only) —
// https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt#url-matching-based-on-path-values.
// Critically, a trailing-slash entry ('/team/') is a STRICTLY NARROWER
// prefix than the bare path ('/team'): it matches '/team/anything' but
// NEVER matches '/team' itself — this is the canonical example in Google's
// own docs ("Disallow: /fish/" does not match "/fish"). Drift AJ and Drift
// AK originally stripped one trailing '/' from BOTH the disallow entry and
// the path being checked before comparing, which silently treated
// '/team/' as equivalent to covering bare '/team' — true for no real
// robots.txt-consuming crawler. See Drift AJ/AK below for the live
// instances (bare '/dashboard', '/admin', '/portal', '/team' all resolve
// to real page.tsx files via middleware's APP_ROOT_PREFIXES passthrough)
// that false "covered" verdict left permanently invisible to this gate.
// The no-trailing-slash, no-'$' branch keeps the original path-segment
// boundary discipline (exact match OR prefix + '/') so an unrelated
// '/apiary' route still isn't credited to a bare '/api' entry.
export function robotsDisallowCoversPath(disallowList, path) {
  return disallowList.some((d) => {
    if (d.endsWith('$')) return path === d.slice(0, -1)
    if (d.endsWith('/')) return path.startsWith(d)
    return path === d || path.startsWith(d + '/')
  })
}

// --- parse PRIVATE_CLIENT_LOGIN_HOSTS out of src/app/robots.ts. This is a
// SECOND per-host disallow carve-out map in that file, alongside
// JOIN_CRAWLABLE_HOSTS above -- but where JOIN_CRAWLABLE_HOSTS EXEMPTS a
// host from a default disallow rule, this one ADDS a disallow rule for a
// host. It exists because a few bespoke tenants overload a
// public-lead-form-shaped top-level segment name (e.g. 'book') with an
// entirely different, PRIVATE client-PIN-login page instead -- see the
// comment above this map in robots.ts, and Drift AL below for what happens
// when a tenant with this shape falls out of sync with it.
export function parsePrivateClientLoginHosts(robotsSource) {
  const block = robotsSource.match(/PRIVATE_CLIENT_LOGIN_HOSTS\s*:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\n\s*\}/)
  const map = new Map()
  if (!block) return map
  const cleaned = stripComments(block[1])
  const entryRe = /['"`]([^'"`]+)['"`]\s*:\s*['"`]([^'"`]+)['"`]/g
  let m
  while ((m = entryRe.exec(cleaned))) map.set(m[1], m[2])
  return map
}

// --- given KILLED_ROUTES and a map of route -> [relative page/route.ts file
// paths found on disk directly under src/app/<route>], return the ones that
// are permanently unreachable in production. isMainHost() && isKilledRoute()
// 410s the ENTIRE prefix on the platform's own main host (see MAIN_HOSTS /
// KILLED_ROUTES above) before Next's router ever resolves the file there; on
// a tenant's own custom domain, middleware's rewriteToSite() rewrites the
// SAME pathname into /site/<slug>/... — a different physical directory
// outside src/app/site/ that the kill-check never even runs against — before
// this top-level route is ever the one considered. A next.config.ts redirect
// for one EXACT literal path (see parseNextConfigRedirects) CAN rescue that
// single path if it fires before middleware, but can never rescue a dynamic
// segment ([slug], [...rest]) beneath the killed prefix: a literal redirect
// `source` matches one exact string, never an infinite family of params. See
// Drift AD below.
export function findShadowedKilledRoutePages(killedRoutes, appFilesByRoute, redirectSources) {
  const shadowed = new Map()
  for (const route of killedRoutes) {
    const files = appFilesByRoute.get(route) || []
    const unrescued = files.filter((relPath) => {
      if (/\[/.test(relPath)) return true // dynamic segment — no literal redirect source can ever match it
      const literalSuffix = relPath.replace(/\/?(page|route)\.tsx?$/, '')
      const fullPath = literalSuffix ? `${route}/${literalSuffix}` : route
      return !redirectSources.has(fullPath)
    })
    if (unrescued.length) shadowed.set(route, unrescued)
  }
  return shadowed
}

// --- walk `dir` one level at a time collecting real top-level URL segment
// names, resolving a Next.js route group ("(name)") down to ITS children
// (a route group is invisible in the URL, so its children are the real
// first path segment — see the comment on findShadowedAppRootPages below
// for why this matters for Drift AE, and findClientPortalLoginDir below for
// Drift AL). Recurses into a route group so a doubly-wrapped segment
// (a group nested inside a group) still resolves correctly.
//
// Exported at module scope — like every other pure parseX/findX in this
// file (per the header comment: "the pure drift logic ... is exported so
// it can be unit-tested without a DB or network") — rather than left as a
// closure inside main(). Before this round it was defined INSIDE main()
// alongside findClientPortalLoginDir and collectPageFiles below: the only
// three non-trivial pieces of logic in this whole file with ZERO test
// coverage, invisible to this file's own 4000+-line test suite, because
// main() only runs with a real Supabase token (see the token guard) and
// none of the 60+ existing describe blocks exercise it. A bug here would
// ship with no red test anywhere, unlike a bug in any parseX/findX, which
// this file's test suite exhaustively covers.
export function collectFirstSegmentDirs(dir) {
  if (!existsSync(dir)) return []
  const names = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
      names.push(...collectFirstSegmentDirs(join(dir, entry.name)))
    } else {
      names.push(entry.name)
    }
  }
  return names
}

// --- given a bespoke tenant's own site/<slug>/ folder, find a top-level
// route-segment directory whose own children include BOTH a 'dashboard' and
// a 'collect' subdirectory — the client-PIN-login-portal clone fingerprint
// (see Drift AL in computeFindings: an email+PIN form at the segment root,
// POST /api/client/login, structurally identical to the global '/portal'
// page, just forked per tenant). Recurses into a route group ("(name)")
// wrapping the CANDIDATE segment itself, same as collectFirstSegmentDirs.
//
// The inner children check now reuses collectFirstSegmentDirs (previously a
// raw readdirSync call) so a route group wrapping the 'dashboard'/'collect'
// PAIR — e.g. site/<slug>/portal/(app)/dashboard + (app)/collect, an
// entirely ordinary Next.js layout choice, no different in kind from the
// (app)/(marketing) split 2 of this check's own 3 concrete instances
// (wash-and-fold-nyc, wash-and-fold-hoboken) already use one level up —
// resolves correctly instead of silently failing to match. The OLD raw
// readdirSync here only ever saw the group's own literal "(app)" name as a
// child, never "dashboard"/"collect" themselves, so the fingerprint check
// would never fire for a tenant whose portal folder happened to be
// route-grouped at that exact depth: the tenant's real client-login portal
// would stay fully crawlable/indexable with zero drift signal, the exact
// failure mode Drift AL exists to catch, defeated by this function's own
// blind spot rather than a config gap. No CURRENT bespoke tenant's
// dashboard/collect pair is itself route-grouped (verified: wash-and-fold-
// nyc/hoboken's own book/(collect|dashboard) and the-florida-maid's
// clients/(collect|dashboard) are both bare, one level under a bare or
// singly-grouped segment) — landmine-only today, same disposition as items
// (233)'s block-comment branch and (234): a parser assumption the
// surrounding code (an ordinary route-group refactor) can silently violate
// without anyone touching this function itself.
export function findClientPortalLoginDir(dir) {
  if (!existsSync(dir)) return null
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
      const nested = findClientPortalLoginDir(join(dir, entry.name))
      if (nested) return nested
      continue
    }
    const children = collectFirstSegmentDirs(join(dir, entry.name))
    if (children.includes('dashboard') && children.includes('collect')) return entry.name
  }
  return null
}

// --- feeds Drift AD: for every KILLED_ROUTES entry, collect the relative
// path of every page.tsx/page.ts/route.ts that still exists on disk under a
// given directory — used against src/app/<route>, the top-level tree
// isMainHost()+isKilledRoute() 410s, NOT src/app/site/<slug> (a different
// physical tree entirely, reached via middleware's rewriteToSite() instead,
// which this walk never touches — see findShadowedKilledRoutePages above).
// Exported for the same reason as collectFirstSegmentDirs/
// findClientPortalLoginDir above — this was the third fs-walking closure
// living inside main() with zero test coverage.
export function collectPageFiles(dir, prefix = '') {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) out.push(...collectPageFiles(join(dir, entry.name), rel))
    else if (entry.name === 'page.tsx' || entry.name === 'page.ts' || entry.name === 'route.ts') out.push(rel)
  }
  return out
}

// --- item (238), continuing (237)'s surface: does `dir` render a real
// homepage at its own root URL? True for a direct page.tsx, OR one nested
// behind a CHAIN of Next.js route groups ("(name)") at ANY depth — a route
// group is invisible in the URL, so site/<slug>/(a)/(b)/page.tsx renders at
// exactly the same URL as site/<slug>/page.tsx, same as the recursion
// collectFirstSegmentDirs above already applies for the "which top-level
// segments exist" question. This backs Drift C ("in BESPOKE_SITE_TENANTS
// but /site/<slug> has no homepage") and Drift D — main() wires it up as
// `hasHome = (slug) => hasHomePage(join(siteDir, slug))`, the single
// callback threaded through every hasHome(...) call in computeFindings.
//
// Exported for the same "closure inside main() with zero test coverage"
// reason as collectFirstSegmentDirs/findClientPortalLoginDir/
// collectPageFiles above: every computeFindings test in this file's own
// suite injects a hand-written `alwaysHome`/`neverHome` fixture instead of
// exercising the real filesystem check even once, so a bug in the REAL
// hasHome implementation — unlike a bug in any parseX/findX — had zero red
// test anywhere in this file, the same blind spot (237) closed for the
// three sibling functions.
//
// The OLD implementation (`readdirSync(d).some(e => e.startsWith('(') &&
// e.endsWith(')') && existsSync(join(d, e, 'page.tsx')))`) only checked ONE
// level of route-group nesting — a page.tsx one route-group-chain deeper
// (e.g. site/<slug>/(a)/(b)/page.tsx) was invisible to it, which would
// wrongly report Drift C/D's "no homepage" CRIT for a tenant whose home
// page renders fine in production. Recursing through the FULL chain (same
// discipline collectFirstSegmentDirs already applies for segment-name
// resolution) closes that gap. No CURRENT bespoke tenant nests its
// homepage two-or-more route groups deep (verified against every
// src/app/site/<slug>/ folder — every existing page.tsx is either direct or
// exactly one group deep), so this is landmine-only today, same
// disposition as (237)'s own fix and items (233)-(235): a parser/fs-walk
// assumption an ordinary future route-group refactor could silently
// violate without anyone touching this function itself.
export function hasHomePage(dir) {
  if (!existsSync(dir)) return false
  if (existsSync(join(dir, 'page.tsx'))) return true
  return readdirSync(dir, { withFileTypes: true }).some(
    (e) => e.isDirectory() && e.name.startsWith('(') && e.name.endsWith(')') && hasHomePage(join(dir, e.name)),
  )
}

// --- fresh ground, same "closure inside main() with zero test coverage"
// class as (237)/(238): does `dir` render a real sitemap.xml at its own root
// URL — i.e. does src/app/site/<slug>/sitemap.ts OR
// src/app/site/<slug>/sitemap.xml/route.ts exist, resolving a chain of
// Next.js route groups ("(name)") at ANY depth the same way hasHomePage
// above already does for page.tsx. This backs Drift Q (CRIT — a
// TENANTS_WITH_RICH_SITEMAP entry with no matching sitemap file) and Drift Y
// (WARN — the mirror: a real sitemap file not listed in
// TENANTS_WITH_RICH_SITEMAP). main() wires it up as
// `hasSitemap = (slug) => hasSitemapFile(join(siteDir, slug))`, the single
// callback threaded through both hasSitemap(...) call sites in
// computeFindings.
//
// Exported for the same reason hasHomePage/collectFirstSegmentDirs/
// findClientPortalLoginDir/collectPageFiles were: every computeFindings test
// in this file's own suite injects a hand-written `alwaysSitemap`/
// `neverSitemap` fixture instead of exercising the real filesystem check
// even once, so a bug in the REAL hasSitemap implementation had zero red
// test anywhere in this file — the same blind spot (237)/(238) closed for
// their four sibling functions, just never closed for this one.
//
// The OLD implementation (`existsSync(join(d, 'sitemap.ts')) ||
// existsSync(join(d, 'sitemap.xml', 'route.ts'))`) only checked DIRECT
// children of `dir` — a sitemap.ts (or sitemap.xml/route.ts) behind a route
// group (e.g. site/<slug>/(app)/sitemap.ts, an entirely ordinary layout
// choice — wash-and-fold-nyc/hoboken already split their own tree into
// (app)/(marketing) one level up) was invisible to it. Because Drift Q is
// CRIT and gates the merge, that false negative would fail the build for a
// tenant whose sitemap.xml renders correctly in production — the exact
// false-positive failure mode item (238) just closed for hasHomePage/Drift
// C/D, here on Drift Q's CRIT instead. Recursing through the FULL
// route-group chain (same discipline hasHomePage/collectFirstSegmentDirs
// already apply) closes that gap for both the sitemap.ts and the
// sitemap.xml/route.ts form.
//
// No CURRENT bespoke tenant's sitemap.ts or sitemap.xml/route.ts sits behind
// a route group (verified against every real src/app/site/<slug>/ folder —
// every existing sitemap file is a direct child of its slug's own root,
// including nycmaid's sitemap.xml/route.ts and wash-and-fold-nyc's own
// direct-child sitemap.ts despite that tenant's (app)/(marketing) split
// existing one level below it), so this is landmine-only today, same
// disposition as (237)/(238) and items (233)-(235): a parser/fs-walk
// assumption an ordinary future route-group refactor could silently violate
// without anyone touching this function itself.
export function hasSitemapFile(dir) {
  if (!existsSync(dir)) return false
  if (existsSync(join(dir, 'sitemap.ts')) || existsSync(join(dir, 'sitemap.xml', 'route.ts'))) return true
  return readdirSync(dir, { withFileTypes: true }).some(
    (e) => e.isDirectory() && e.name.startsWith('(') && e.name.endsWith(')') && hasSitemapFile(join(dir, e.name)),
  )
}

// --- given the single-segment (no nested "/") entries of APP_ROOT_PREFIXES
// and, per bespoke tenant, the top-level route-segment names found on disk
// under its own site/<slug>/ folder (route groups already resolved down to
// their real first segment — see collectFirstSegmentDirs above), return
// the tenant slugs whose own site folder contains a directory that collides
// with a reserved app-root name. Multi-segment prefixes (e.g.
// '/reviews/submit') are deliberately out of scope: a first-level-only
// directory listing can't tell whether a deeper path collides with a
// two-segment prefix, and no live instance of that shape exists today. See
// Drift AE below for what this collision means at runtime.
export function findShadowedAppRootPages(bespokeSlugs, appRootPrefixes, siteTopLevelDirsBySlug) {
  // Strip leading/trailing slashes FIRST, then check for an internal "/" —
  // '/api/' carries a trailing slash as part of its own literal (unlike
  // '/team', '/admin', etc.) but is still a single segment ('api'); checking
  // slash-presence before stripping would wrongly treat it as multi-segment
  // and exclude the one entry this check found its first two real hits under.
  const bareSingleSegment = new Set(
    appRootPrefixes
      .map((p) => p.replace(/^\/+|\/+$/g, ''))
      .filter((p) => p && !p.includes('/')),
  )
  const shadowed = new Map()
  for (const slug of bespokeSlugs) {
    const dirs = siteTopLevelDirsBySlug.get(slug) || []
    const hits = dirs.filter((d) => bareSingleSegment.has(d))
    if (hits.length) shadowed.set(slug, hits)
  }
  return shadowed
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
  return new Set(block ? [...stripComments(block[1]).matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : [])
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
// --- Find the substring between an opening '{' at `openIdx` in `source` and
// its TRUE matching closing '}', tracking brace depth one character at a time
// (quote-aware: a '{'/'}' inside a '/"/` string does not change depth, the
// same quote-blindness class stripComments above guards against). Every
// OTHER block-extractor in this file terminates on a fixed-shape anchor right
// after the block (e.g. `\]\)` for a `new Set([...])`, or the literal
// `fallback:` keyword for next.config.ts's afterFiles array) that cannot
// appear mid-block by construction. STATIC_TENANT_MAP has no such anchor —
// its declaration just ends at "the closing brace of the object literal" —
// so parseStaticTenantMap used a `\n\s*\}` heuristic instead: "a lone '}' at
// the start of a line". That heuristic assumes every entry's own
// `{ id: ..., slug: ... }` value stays on ONE line. It silently breaks the
// moment a formatter (Prettier, or any editor's format-on-save — not
// confirmed to be wired into THIS repo specifically, but an entirely
// ordinary thing for any of them to do) wraps a single long entry (a longer
// hostname key, or simply running out of the print width) onto multiple
// lines: the entry's OWN closing '}' is then a lone '}' on its own line,
// matching `\n\s*\}` before the real end of the STATIC_TENANT_MAP
// declaration is ever reached. This repo's OWN existing entries are already
// close to that line length (~100 chars including indentation, comfortably
// past a default 80-char print width), so this is not a hypothetical shape.
// Verified live in node: feeding parseStaticTenantMap a 2-entry fixture where
// only the FIRST entry is Prettier-wrapped onto multiple lines returns an
// EMPTY map (size 0), not merely a truncated one — the old regex's capture
// group stops BEFORE the wrapped entry's own closing '}' (that brace is
// consumed as the terminator, not included in the captured text), so the
// captured slice contains an unclosed '{' with no matching '}' for entryRe to
// find at all, and the second, untouched entry is silently discarded outright
// since it never even makes it into the captured slice. That is Drift U's own
// input silently going empty: a STATIC_TENANT_MAP entry is the ONE routing
// source in this file whose rewriteToSite() branch runs UNCONDITIONALLY, with
// no tenantServesSite() status check at all (see the comment above Drift U) —
// an empty/corrupted staticTenantMap means a suspended/cancelled tenant
// hardcoded there keeps serving live traffic with the gate reporting nothing
// wrong, not because there is no drift, but because this parser never saw
// the entry that would have proven it. Same root cause, same severity class
// as items (233)/(234)'s stripComments quote-blindness: a parser assumption
// ("stays on one line") that the surrounding tooling (Prettier) can silently
// violate without anyone touching the parser itself.
export function extractBalancedBlock(source, openIdx) {
  let depth = 0
  let quote = null
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i]
    if (quote) {
      if (ch === '\\') {
        i++
        continue
      }
      if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return source.slice(openIdx + 1, i)
    }
  }
  return null
}

export function parseStaticTenantMap(middlewareSource) {
  const head = middlewareSource.match(/STATIC_TENANT_MAP:\s*Record<string,\s*\{[^}]*\}>\s*=\s*\{/)
  const map = new Map()
  if (!head) return map
  const block = extractBalancedBlock(middlewareSource, head.index + head[0].length - 1)
  if (block === null) return map
  // A trailing comma before the value's closing '}' (`slug: '...' ,\n }`) is
  // Prettier's own default style for a multi-line object literal — the SAME
  // wrapping that broke the block boundary above also adds one here. The
  // ORIGINAL `\s*\}` at the end (no comma tolerance) matches the single-line
  // style used everywhere in this file today (`{ id: '...', slug: '...' }`,
  // no trailing comma) but not Prettier's multi-line style, so fixing only
  // extractBalancedBlock above is not sufficient on its own — verified live:
  // with a correctly-bounded block but the old `\s*\}` ending, a Prettier-
  // wrapped entry still failed to match (its trailing comma is not
  // whitespace), silently dropping that one entry even once the block
  // itself parsed intact.
  const entryRe = /['"`]([^'"`]+)['"`]\s*:\s*\{\s*id:\s*['"`]([^'"`]+)['"`]\s*,\s*slug:\s*['"`]([^'"`]+)['"`]\s*,?\s*\}/g
  const cleaned = stripComments(block)
  let m
  while ((m = entryRe.exec(cleaned))) map.set(m[1], { id: m[2], slug: m[3] })
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
  const entryRe = /\{\s*source:\s*['"`]([^'"`]+)['"`]\s*,\s*destination:\s*['"`]([^'"`]+)['"`]/g
  const out = []
  const cleaned = stripComments(block[1])
  let m
  while ((m = entryRe.exec(cleaned))) {
    const source = m[1]
    // Bare, static "/site/<one-segment>" only — no ":param" (dynamic, matches
    // any tenant-slug-prefixed path too) and no extra "/" beyond the one
    // segment (e.g. "/site/blog/:slug" is dynamic AND nested; excluded either way).
    if (/^\/site\/[^/:]+$/.test(source)) out.push({ source, destination: m[2] })
  }
  return out
}

// --- parse next.config.ts's rewrites().afterFiles for EVERY "/site/..."
// source, regardless of nesting or a ":param" — the complement of
// parseNextConfigSiteRewriteSources above, which deliberately excludes
// anything but a bare one-segment source. Feeds Drift AC below: a source like
// "/site/careers/:slug" has a LITERAL first segment ("careers") exactly like
// the bare "/site/careers" case — the ":param" is a second, unrelated
// segment, not a stand-in for the first one — so it is bound by the same
// unreachability argument as Drift W, just missed by Drift W's own filter.
export function parseAllNextConfigSiteRewriteSources(nextConfigSource) {
  const block = nextConfigSource.match(/afterFiles:\s*\[([\s\S]*?)\]\s*,?\s*\n\s*fallback:/)
  if (!block) return []
  const entryRe = /\{\s*source:\s*['"`]([^'"`]+)['"`]\s*,\s*destination:\s*['"`]([^'"`]+)['"`]/g
  const out = []
  const cleaned = stripComments(block[1])
  let m
  while ((m = entryRe.exec(cleaned))) {
    const source = m[1]
    if (source.startsWith('/site/')) out.push({ source, destination: m[2] })
  }
  return out
}

// --- parse next.config.ts's redirects() array for { source, destination }
// pairs. Unlike parseNextConfigSiteRewriteSources (afterFiles rewrites), this
// covers the OTHER routing list in the same file — permanent 301s. See
// Drift X below for why a destination landing in the tenant-sites tree is a
// distinct hazard from the afterFiles case.
export function parseNextConfigRedirects(nextConfigSource) {
  const block = nextConfigSource.match(/async redirects\(\)\s*\{[\s\S]*?return\s*\[([\s\S]*?)\]\s*\n\s*\}/)
  if (!block) return []
  const entryRe = /\{\s*source:\s*['"`]([^'"`]+)['"`]\s*,\s*destination:\s*['"`]([^'"`]+)['"`]/g
  const out = []
  const cleaned = stripComments(block[1])
  let m
  while ((m = entryRe.exec(cleaned))) out.push({ source: m[1], destination: m[2] })
  return out
}

// --- parse APP_ROOT_PREFIXES out of the middleware source. This is
// rewriteToSite()'s list of pathnames that are served at their OWN root path
// (tenant headers injected, no /site/<slug> prefix applied) rather than
// rewritten into the tenant-sites tree — /portal, /dashboard, /api, etc.
// Feeds Drift X (as the "safe" destination-prefix allowlist) and Drift AM
// (see findTrailingSlashAppRootPrefixes below).
export function parseAppRootPrefixes(middlewareSource) {
  const block = middlewareSource.match(/APP_ROOT_PREFIXES\s*=\s*\[([\s\S]*?)\]/)
  return block ? [...stripComments(block[1]).matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : []
}

// --- given APP_ROOT_PREFIXES's raw entries, return the ones that carry a
// trailing slash — a shape matchesAppRootPrefix (src/middleware.ts) can
// never actually match against a real request. That function's own contract
// is `pathname === prefix || pathname.startsWith(prefix + '/')`: it appends
// its OWN '/' for the sub-path boundary check, so a caller-supplied prefix
// that already ends in '/' produces a literal DOUBLE slash
// ('/api/' + '/' === '/api//') that no real request path ever has — the
// exact-match branch then only matches the single literal string '/api/'
// itself (nothing after it), so the entry silently matches nothing a real
// request would ever send. Every other APP_ROOT_PREFIXES entry ('/portal',
// '/team', '/dashboard', '/admin', etc.) is bare, by construction — '/api/'
// was the sole trailing-slash outlier, present since the array was first
// introduced, and unlike robots.ts's own disallow array (Drift AJ/AK, which
// independently normalizes a trailing slash via `prefix.replace(/\/$/, '')`
// before comparing, masking the discrepancy from ever surfacing there) this
// file's own PRODUCTION ROUTER has no such normalization: every tenant
// subdomain/custom-domain '/api/*' call (client-PIN-login POSTs,
// '/api/tenant-sitemap', etc.) fell through past this branch entirely into
// the tenant-site rewrite at the bottom of rewriteToSite() instead of being
// served headers-only at its real path. See Drift AM below and
// src/middleware.app-root-prefix-boundary.test.ts's "must not carry a
// baked-in trailing slash" describe block for the concrete before/after.
export function findTrailingSlashAppRootPrefixes(appRootPrefixes) {
  return appRootPrefixes.filter((p) => p.endsWith('/'))
}

// --- parse isPublicRoute's pattern array out of the middleware source. These
// patterns are compiled by createRouteMatcher() into anchored regexes —
// '(.*)' is replaced with a BARE '.*' (no path-segment boundary of its own,
// unlike matchesAppRootPrefix's explicit `pathname === p || pathname.startsWith(p
// + '/')` check) — so a single-segment pattern like '/api/client(.*)' can
// accidentally match a DIFFERENT, unrelated /api/ directory that merely shares
// the same leading characters. Feeds Drift AF ONLY.
export function parsePublicRoutePatterns(middlewareSource) {
  const block = middlewareSource.match(/const isPublicRoute = createRouteMatcher\(\[([\s\S]*?)\]\)/)
  return block ? [...stripComments(block[1]).matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : []
}

// --- given isPublicRoute's patterns and every real top-level directory name under
// src/app/api/, find a single-segment '/api/<name>(.*)' pattern that also matches a
// DIFFERENT top-level api directory — reproducing the EXACT regex
// createRouteMatcher builds (see parsePublicRoutePatterns above), not an
// approximation of it, so this test can never diverge from the live matcher's real
// behavior. Concrete instance that motivated this check: '/api/client(.*)'
// (intended only for the ported nycmaid client-portal routes at /api/client/...)
// also matched /api/clients (the full CRM customer API) and /api/client-reviews,
// silently marking both fully public — skipping middleware's ENTIRE
// Clerk-session-redirect and admin-impersonation-bypass-allowlist gate for them,
// since isPublicRoute is checked first and short-circuits past both. Scoped
// deliberately to single-segment patterns only (the same scoping Drift AE uses for
// APP_ROOT_PREFIXES): a multi-segment pattern like '/api/quotes/public(.*)' needs a
// directory listing one level deeper to check for a real collision, and no live
// instance of that shape exists today.
export function findUnboundedApiPublicRouteCollisions(patterns, apiDirNames) {
  const collisions = []
  for (const pattern of patterns) {
    const m = pattern.match(/^\/api\/([^/]+)\(\.\*\)$/)
    if (!m) continue
    const literalDir = m[1]
    const re = new RegExp('^' + pattern.replace(/\(\.\*\)/g, '.*') + '$')
    for (const dir of apiDirNames) {
      if (dir === literalDir) continue
      if (re.test(`/api/${dir}`)) collisions.push({ pattern, literalDir, collidesWithDir: dir })
    }
  }
  return collisions
}

// --- parse the admin-impersonation bypass allowlist's own `p.startsWith('...')`
// prefixes out of the middleware source — the chain a few lines below
// isPublicRoute in src/middleware.ts that lets a verified admin_token cookie
// skip Clerk on specific dashboard/API prefixes. Uses the same stripComments +
// quoted-string-extraction convention as every other parseX in this file.
// `p.startsWith(` is this exact chain's own unique receiver name — no other
// startsWith call anywhere else in the file uses a bare `p.` (they use
// `pathname.`, `req.nextUrl.pathname.`, `canonicalHost.`, etc.) — so this
// regex can't accidentally pick up an unrelated startsWith call elsewhere in
// the file. Operates on the FULL middleware source (not a sub-block, unlike
// parsePublicRoutePatterns/parseAppRootPrefixes) because that unique-receiver
// property is what scopes it, not source position. Feeds Drift AG ONLY.
export function parseAdminBypassPrefixes(middlewareSource) {
  return [...stripComments(middlewareSource).matchAll(/\bp\.startsWith\(['"`]([^'"`]+)['"`]\)/g)].map((m) => m[1])
}

// --- given isPublicRoute's patterns and the admin-impersonation bypass
// allowlist's own prefixes (see parseAdminBypassPrefixes above), find a
// bypass-list prefix that is fully unreachable because an isPublicRoute
// pattern already matches EVERY path under it — meaning
// `if (!isPublicRoute(req))` in src/middleware.ts is always false for that
// prefix, so the bypass allowlist below it is never even evaluated for any
// request under that prefix. Generalizes the exact shape (181) found by hand
// for '/api/client-reviews' (unreachable there, shadowed by the old unbounded
// '/api/client(.*)' pattern, before that pattern was narrowed) into an
// automated check — same escalation Drift AF gave (181)'s OTHER half (the
// isPublicRoute-vs-real-API-directory collision) in (182). Concrete instance
// this check found live in the current repo: a `p.startsWith('/api/selena')`
// bypass entry, fully shadowed by isPublicRoute's own unbounded
// '/api/selena(.*)' pattern — removed in (183); this check exists so that
// shape can't silently return. Reproduces createRouteMatcher's EXACT regex
// conversion (see parsePublicRoutePatterns above), not an approximation: an
// unbounded '/api/...(.*)' pattern's match set is exactly "every path
// starting with <the pattern's '(.*)'-stripped literal prefix>" (no
// path-segment boundary), so a bypass prefix P is fully contained in that
// set iff P itself starts with the same literal prefix — P's own match set
// (every path starting with P) is then necessarily a subset. NOT scoped to
// single-segment patterns like Drift AF's collision check (that scoping was
// AF-specific, needed because AF checks a pattern against a REAL DIRECTORY
// LISTING one level deep for multi-segment patterns; this check compares two
// hand-maintained string-literal lists directly against each other, so no
// filesystem-depth limitation applies here).
export function findShadowedAdminBypassPrefixes(publicRoutePatterns, bypassPrefixes) {
  const shadowed = []
  for (const pattern of publicRoutePatterns) {
    const m = pattern.match(/^(\/api\/.+)\(\.\*\)$/)
    if (!m) continue
    const literalPrefix = m[1]
    for (const bypassPrefix of bypassPrefixes) {
      if (bypassPrefix.startsWith(literalPrefix)) {
        shadowed.push({ bypassPrefix, shadowedByPattern: pattern })
      }
    }
  }
  return shadowed
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
 *                                  Feeds Drift Q and Drift Y. Pass an empty Set (default) to skip both.
 * @param {Function} [input.hasSitemap]  (slug) => boolean — does
 *                                  src/app/site/<slug>/sitemap.ts or
 *                                  sitemap.xml/route.ts exist. Feeds Drift Q AND Drift Y, with
 *                                  OPPOSITE fail-safe defaults when omitted: Q assumes the file
 *                                  exists (always-true no-op, no false "missing" CRIT), Y is
 *                                  skipped entirely (no false "orphaned" WARN) — see the comment
 *                                  at the top of this function.
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
 * @param {Array}    [input.allNextConfigSiteRewrites]  { source, destination } pairs
 *                                  for EVERY "/site/..." afterFiles source, nested/
 *                                  dynamic included (see
 *                                  parseAllNextConfigSiteRewriteSources). Feeds
 *                                  Drift AC ONLY. Pass an empty array (default) to skip.
 * @param {Array}    [input.nextConfigRedirects]  { source, destination } pairs
 *                                  from next.config.ts's redirects() (see
 *                                  parseNextConfigRedirects). Feeds Drift X and
 *                                  (as the exact-literal-path rescue list) Drift AD.
 *                                  Pass an empty array (default) to skip.
 * @param {Array}    [input.appRootPrefixes]  prefixes from src/middleware.ts's
 *                                  APP_ROOT_PREFIXES (see parseAppRootPrefixes).
 *                                  Feeds Drift X (as the safe-destination
 *                                  allowlist), Drift AJ, and Drift AM (a
 *                                  trailing-slash entry — see
 *                                  findTrailingSlashAppRootPrefixes).
 *                                  Pass an empty array (default) to skip
 *                                  (treats every "/site/..." destination as unsafe).
 * @param {Set}      [input.robotsMainHostsSet]  hostnames from src/app/robots.ts's
 *                                  own hand-maintained copy of middleware's MAIN_HOSTS
 *                                  (see parseRobotsMainHostsSet). Feeds Drift Z ONLY.
 *                                  Pass an empty Set (default) to skip.
 * @param {Set}      [input.killedRoutesSet]  routes from src/middleware.ts's
 *                                  KILLED_ROUTES (see parseKilledRoutes). Feeds
 *                                  Drift AA and Drift AD. Pass an empty Set
 *                                  (default) to skip.
 * @param {Set}      [input.robotsKilledRoutesSet]  routes from src/app/robots.ts's
 *                                  own hand-maintained copy of KILLED_ROUTES (see
 *                                  parseRobotsKilledRoutes). Feeds Drift AA ONLY.
 *                                  Pass an empty Set (default) to skip.
 * @param {Map}      [input.wwwApexDomainsBySlug]  slug -> Set<domain> from
 *                                  findHardcodedWwwApexDomains — bespoke tenants
 *                                  whose own sitemap.ts/robots.ts hardcode a
 *                                  "https://www.<domain>" for a domain that IS in
 *                                  APEX_CANONICAL_DOMAINS. Feeds Drift AB ONLY.
 *                                  Pass an empty Map (default) to skip.
 * @param {Map}      [input.killedRouteAppFiles]  KILLED_ROUTES entry -> array of
 *                                  relative page.tsx/route.ts paths found on disk
 *                                  under src/app/<route> (see
 *                                  findShadowedKilledRoutePages). Feeds Drift AD
 *                                  ONLY. Pass an empty Map (default) to skip.
 * @param {Map}      [input.bespokeSiteTopLevelDirs]  bespoke tenant slug ->
 *                                  array of top-level route-segment directory
 *                                  names under its own site/<slug>/ folder,
 *                                  with any wrapping Next.js route group
 *                                  resolved down to its real first URL
 *                                  segment (see collectFirstSegmentDirs
 *                                  above and findShadowedAppRootPages).
 *                                  Feeds Drift AE, Drift AI, and Drift AK.
 *                                  Pass an empty Map (default) to skip all
 *                                  three.
 * @param {Array}    [input.apiPublicRouteCollisions]  { pattern, literalDir,
 *                                  collidesWithDir } entries from
 *                                  findUnboundedApiPublicRouteCollisions — an
 *                                  isPublicRoute pattern (src/middleware.ts) that
 *                                  accidentally also matches a different real
 *                                  /api/ directory than the one it names. Feeds
 *                                  Drift AF ONLY. Pass an empty array (default) to
 *                                  skip.
 * @param {Array}    [input.adminBypassPrefixShadows]  { bypassPrefix,
 *                                  shadowedByPattern } entries from
 *                                  findShadowedAdminBypassPrefixes — an
 *                                  admin-impersonation-bypass allowlist prefix
 *                                  (src/middleware.ts) that is fully unreachable
 *                                  dead code because an isPublicRoute pattern
 *                                  already matches every path under it. Feeds
 *                                  Drift AG ONLY. Pass an empty array (default)
 *                                  to skip.
 * @param {Set}      [input.joinCrawlableHosts]  hostnames from src/app/robots.ts's
 *                                  JOIN_CRAWLABLE_HOSTS (see
 *                                  parseJoinCrawlableHosts) — tenant custom
 *                                  domains exempted from the default '/join/'
 *                                  disallow rule. Feeds Drift AH and (as the
 *                                  coverage set) Drift AI. Pass an empty Set
 *                                  (default) to skip AH; AI still needs
 *                                  bespokeSiteTopLevelDirs to run at all.
 * @param {Array}    [input.robotsDisallowList]  path prefixes from
 *                                  src/app/robots.ts's own hardcoded
 *                                  `disallow` array literal (see
 *                                  parseRobotsDisallowList). Feeds Drift AJ,
 *                                  as the coverage list checked against
 *                                  appRootPrefixes, AND Drift AK, as the
 *                                  coverage list checked for '/login'
 *                                  coverage against bespokeSiteTopLevelDirs.
 *                                  Pass an empty array (default) to skip both.
 * @param {Map}      [input.privateClientLoginHosts]  hostname -> path from
 *                                  src/app/robots.ts's
 *                                  PRIVATE_CLIENT_LOGIN_HOSTS (see
 *                                  parsePrivateClientLoginHosts) — the
 *                                  per-host carve-out that disallows a
 *                                  public-lead-form-shaped segment name on
 *                                  the specific tenant domain(s) where it is
 *                                  actually a private client-PIN-login page.
 *                                  Feeds Drift AL ONLY, as the coverage map
 *                                  checked against clientPortalLoginDirsBySlug.
 *                                  Pass an empty Map (default) to skip.
 * @param {Map}      [input.clientPortalLoginDirsBySlug]  bespoke tenant slug
 *                                  -> top-level site/<slug>/ segment name
 *                                  whose own children include BOTH a
 *                                  'dashboard' and a 'collect' subdirectory
 *                                  — the client-PIN-login-portal clone
 *                                  fingerprint (see findClientPortalLoginDir
 *                                  above). Feeds Drift AL ONLY. Pass an
 *                                  empty Map (default) to skip.
 * @returns {Array} findings: { sev, slug, msg, pending? }
 */
export function computeFindings({ tenants, tds, bespokeSet, hasHome, resolvableSlugs = null, allTenantDomains = [], apexCanonicalSet = new Set(), protectedSlugs = new Set(), richSitemapSet = new Set(), hasSitemap = null, allTenants = [], nonServingStatuses = new Set(), mainHostsSet = new Set(), rootSiteTenantsSet = new Set(), staticTenantMap = new Map(), knownPendingOrphans = new Set(), nextConfigSiteRewrites = [], allNextConfigSiteRewrites = [], nextConfigRedirects = [], appRootPrefixes = [], robotsMainHostsSet = new Set(), killedRoutesSet = new Set(), robotsKilledRoutesSet = new Set(), wwwApexDomainsBySlug = new Map(), killedRouteAppFiles = new Map(), bespokeSiteTopLevelDirs = new Map(), apiPublicRouteCollisions = [], adminBypassPrefixShadows = [], joinCrawlableHosts = new Set(), robotsDisallowList = [], privateClientLoginHosts = new Map(), clientPortalLoginDirsBySlug = new Map() }) {
  // hasSitemap's two consumers (Drift Q and Drift Y below) need OPPOSITE fail-
  // safe defaults when the caller omits it entirely: Q must assume the file
  // EXISTS (so a caller who doesn't wire up the fs check never gets a false
  // "missing sitemap" CRIT), while Y must assume the file does NOT exist (so
  // the same omission never produces a false "orphaned sitemap" WARN). One
  // function can't satisfy both defaults at once, so the raw param defaults to
  // null (distinguishable from "explicitly provided") and each check applies
  // its own fallback below.
  const sitemapFileExists = hasSitemap || (() => true)
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
      if (!sitemapFileExists(slug)) {
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

  // Drift AC: a next.config.ts rewrites().afterFiles source starting with
  // "/site/" whose literal FIRST segment is neither 'template' nor a
  // BESPOKE_SITE_TENANTS slug, while ROOT_SITE_TENANTS is empty — the same
  // unreachability argument as Drift W above, just for sources Drift W's own
  // parser deliberately skips. Drift W only looks at a BARE one-segment
  // source (no ':param', no extra nesting) because its parser's comment
  // reasons that a dynamic source "matches any tenant-slug-prefixed path
  // too" — true ONLY when the param stands in for the first segment itself
  // (e.g. "/site/:slug"). A source like "/site/careers/:slug" has "careers"
  // as a literal, fixed first segment; the ":slug" is a second, unrelated
  // path component. rewriteToSite() can only ever produce "/site/<path>"
  // (ROOT_SITE_TENANTS, empty today), "/site/<bespoke-slug>/<path>", or
  // "/site/template/<path>" — so a literal first segment that is neither
  // 'template' nor a real bespoke slug can never be hit by ANY tenant's
  // domain-routed traffic, dynamic param or not. Skips any source Drift W
  // already reports (the bare case) to avoid double-counting the same dead
  // entry under two different Drift letters.
  if (allNextConfigSiteRewrites.length && rootSiteTenantsSet.size === 0) {
    const bareSources = new Set(nextConfigSiteRewrites.map((r) => r.source))
    for (const { source, destination } of allNextConfigSiteRewrites) {
      if (bareSources.has(source)) continue
      const m = source.match(/^\/site\/([^/]+)/)
      if (!m) continue
      const firstSegment = m[1]
      if (firstSegment === 'template' || bespokeSet.has(firstSegment)) continue
      add(
        'WARN',
        source,
        `next.config.ts rewrites().afterFiles source '${source}' -> '${destination}' has a literal first segment '${firstSegment}' after /site/ that is neither 'template' nor a BESPOKE_SITE_TENANTS slug, but ROOT_SITE_TENANTS is empty -> rewriteToSite() (src/middleware.ts) can only ever produce /site/<bespoke-slug>/... or /site/template/... for tenant-domain-routed traffic, so this source can never match regardless of its ':param'/nesting -- unreachable dead config, same root cause as Drift W (a stale short-URL alias Drift W's own bare-segment-only filter missed)`,
      )
    }
  }

  // Drift X: a next.config.ts redirects() entry whose destination begins with
  // "/site/" -- a path into the tenant-sites tree. Unlike Drift W (a rewrite
  // whose SOURCE never matches, so it never fires at all), this is about
  // where the 301 SENDS the browser: rewriteToSite() in src/middleware.ts
  // UNCONDITIONALLY re-prefixes any incoming pathname on a tenant's own
  // custom domain with that tenant's siteBase ('/site/<slug>' for a
  // BESPOKE_SITE_TENANTS member) -- EXCEPT for an exact '/sitemap.xml',
  // '/robots.txt', '/admin' (or '/admin/...'), or an APP_ROOT_PREFIXES entry
  // (/portal, /dashboard, /api/, etc.). None of those live in the '/site/'
  // string space, so ANY destination starting with '/site/' is unconditionally
  // unsafe here -- appRootPrefixes is accepted for documentation/future-proofing
  // (see parseAppRootPrefixes) but never actually changes the verdict, since a
  // prefix match and a '/site/' match are mutually exclusive by construction.
  // So the follow-up request this redirect sends the browser to gets
  // DOUBLE-prefixed on a bespoke tenant's own domain (e.g. "/site/careers/x"
  // on nycmaid's domain becomes "/site/nycmaid/site/careers/x", which
  // resolves nowhere) even though the exact same redirect can appear to work
  // when the destination is browsed directly on the main host, where
  // rewriteToSite() is never invoked at all. Same "written assuming bare
  // /site/<path> is directly reachable, never updated for
  // BESPOKE_SITE_TENANTS" root cause as Drift W, just via redirects() instead
  // of rewrites().afterFiles. This check needs no DB/tenant data at all -- the
  // destination is broken for ANY bespoke tenant's own domain regardless of
  // which specific tenant a source path happens to belong to, so it is not
  // gated on resolvableSlugs like Drift L/N/V.
  if (nextConfigRedirects.length) {
    for (const { source, destination } of nextConfigRedirects) {
      if (!destination.startsWith('/site/')) continue
      add(
        'WARN',
        source,
        `next.config.ts redirects() source '${source}' -> '${destination}' sends visitors into the tenant-sites tree, but rewriteToSite() (src/middleware.ts) unconditionally re-prefixes ANY pathname on a tenant's own custom domain with that tenant's siteBase (unless it is exactly /sitemap.xml, /robots.txt, /admin(/*), or an APP_ROOT_PREFIXES entry -- none of which start with /site/) -- on a BESPOKE_SITE_TENANTS tenant's own domain this destination gets double-prefixed (e.g. '/site/<slug>${destination}') and resolves nowhere, even though it may appear to work when browsed directly on the main host`,
      )
    }
  }

  // Drift Y: a BESPOKE_SITE_TENANTS tenant whose folder HAS a real sitemap
  // file (src/app/site/<slug>/sitemap.ts or sitemap.xml/route.ts) but is NOT
  // listed in middleware's TENANTS_WITH_RICH_SITEMAP — the mirror image of
  // Drift Q. rewriteToSite() only rewrites /sitemap.xml to that file for a
  // slug IN TENANTS_WITH_RICH_SITEMAP; every other tenant's /sitemap.xml is
  // unconditionally rewritten to the generic 7-URL /api/tenant-sitemap
  // instead (see the TENANTS_WITH_RICH_SITEMAP block in rewriteToSite()).
  // A tenant whose sitemap.ts was built and deployed but never added to that
  // set gets the generic sitemap served to every visitor and Googlebot
  // forever — unlike Drift Q's missing-file case, nothing here 404s, so
  // there is zero drift signal short of noticing the wrong sitemap.xml
  // content in Search Console. Gated on hasSitemap being explicitly provided
  // (not the Drift Q fallback) — see the comment on computeFindings' params:
  // a caller that never wires up the real fs check must never get a false
  // "orphaned sitemap" WARN just because Drift Q's own always-true default
  // happens to answer "yes" for every slug.
  if (bespokeSet.size && hasSitemap) {
    for (const slug of bespokeSet) {
      if (!richSitemapSet.has(slug) && hasSitemap(slug)) {
        add('WARN', slug, `has a real sitemap file (src/app/site/${slug}/sitemap.ts or sitemap.xml/route.ts) but is NOT in TENANTS_WITH_RICH_SITEMAP (src/middleware.ts) -> rewriteToSite() serves the generic 7-URL /api/tenant-sitemap instead; the real file is built and deployed but permanently unreachable`)
      }
    }
  }

  // Drift Z: src/app/robots.ts's own hardcoded MAIN_HOSTS copy (see
  // parseRobotsMainHostsSet) has drifted from middleware's real MAIN_HOSTS.
  // robots.ts can't import middleware.ts's const at build time, so it keeps a
  // second, independently maintained copy — its own comment says "Same
  // MAIN_HOSTS as middleware.ts — keep in sync if that list changes," but
  // nothing enforces that. robots.ts's isMainHost() drives two real, visible
  // behaviors: which origin the emitted sitemap URL uses, and whether the
  // /apply disallow rule applies (robots.ts's own comment: the 2026-05-03
  // teaser pivot killed /apply on the marketing host only — middleware
  // returns 410 there — and tenant sites keep a live /apply hiring funnel, so
  // /apply is deliberately left crawlable everywhere else). A host present in
  // middleware's real MAIN_HOSTS but missing from robots.ts's stale copy
  // makes isMainHost() wrongly return false there: the /apply disallow never
  // gets added, so robots.txt tells crawlers /apply is crawlable on a host
  // where middleware's KILLED_ROUTES actually 410s it. The reverse (present
  // in robots.ts's copy but not middleware's real set) wrongly treats a real
  // tenant host as the main host, hiding that tenant's own sitemap origin.
  // Invisible to every other check here, which only ever reads mainHostsSet
  // from middleware — this is the only check that reads both copies.
  if (robotsMainHostsSet.size) {
    for (const host of mainHostsSet) {
      if (!robotsMainHostsSet.has(host)) {
        add(
          'WARN',
          host,
          `in middleware's MAIN_HOSTS but MISSING from src/app/robots.ts's own hardcoded MAIN_HOSTS copy (that file's own comment: "keep in sync if that list changes") -> robots.ts's isMainHost('${host}') wrongly returns false, so the /apply disallow rule never gets added for this host even though middleware's KILLED_ROUTES still returns 410 for /apply there -- robots.txt tells crawlers a 410'ing route is crawlable`,
        )
      }
    }
    for (const host of robotsMainHostsSet) {
      if (!mainHostsSet.has(host)) {
        add(
          'WARN',
          host,
          `in src/app/robots.ts's own hardcoded MAIN_HOSTS copy but NOT in middleware's real MAIN_HOSTS -> robots.ts's isMainHost('${host}') wrongly returns true for this host, hiding its real per-tenant sitemap origin and applying the /apply disallow rule middleware's actual routing does not require there`,
        )
      }
    }
  }

  // Drift AA: src/app/robots.ts's own hardcoded copy of middleware's
  // KILLED_ROUTES (see parseRobotsKilledRoutes) has drifted from the real
  // list. Same shape of bug as Drift Z (MAIN_HOSTS), one const over: robots.ts
  // can't import middleware.ts's KILLED_ROUTES array at build time, so inside
  // its own `if (isMainHost)` block it re-hardcodes each route as a literal
  // disallow.push(...) call, with a comment tying it to the same 2026-05-03
  // teaser pivot but nothing enforcing the two stay in sync. Currently both
  // sides carry exactly one entry ('/apply'), so there is no LIVE drift today
  // — this guards the moment a second route is added to KILLED_ROUTES (or
  // removed) without the matching robots.ts edit. A route present in
  // middleware's real KILLED_ROUTES but missing from robots.ts's copy means
  // middleware still returns 410 for it on the main host while robots.txt
  // keeps telling crawlers it's crawlable. The reverse (present in robots.ts's
  // copy but not middleware's real list) disallows a route in robots.txt that
  // middleware no longer kills, hiding a live, crawlable page from indexing
  // for no routing reason.
  if (killedRoutesSet.size || robotsKilledRoutesSet.size) {
    for (const route of killedRoutesSet) {
      if (!robotsKilledRoutesSet.has(route)) {
        add(
          'WARN',
          route,
          `in middleware's KILLED_ROUTES but MISSING from src/app/robots.ts's own hardcoded copy of it (isMainHost block) -> middleware's isKilledRoute() still returns 410 for '${route}' on the main host, but robots.txt never disallows it there -- crawlers are told a 410'ing route is crawlable`,
        )
      }
    }
    for (const route of robotsKilledRoutesSet) {
      if (!killedRoutesSet.has(route)) {
        add(
          'WARN',
          route,
          `in src/app/robots.ts's own hardcoded KILLED_ROUTES copy but NOT in middleware's real KILLED_ROUTES -> robots.txt disallows '${route}' on the main host even though middleware no longer 410s it there, hiding a live page from indexing for no routing reason`,
        )
      }
    }
  }

  // Drift AD: a KILLED_ROUTES entry (see parseKilledRoutes / isKilledRoute
  // above) still has a REAL Next.js page/route.ts file on disk at
  // src/app/<same-prefix>/... (outside src/app/site/ — the physical tree
  // middleware's rewriteToSite() targets instead, which the main-host kill
  // check never runs against). Any such file is now permanently unreachable:
  // on any isMainHost() domain, isMainHost() && isKilledRoute() 410s the whole
  // prefix before Next's router ever resolves it; on a tenant's own custom
  // domain, middleware rewrites the identical pathname into /site/<slug>/...
  // before this top-level route is ever the one considered. A next.config.ts
  // redirect for one exact literal path can rescue that single path if it
  // fires before middleware, but can never rescue a dynamic segment beneath
  // the killed prefix — see findShadowedKilledRoutePages above. Concrete
  // instance today: src/app/apply/[slug]/page.tsx is a real, tenant-agnostic
  // hiring-form page (looks up the tenant by slug at runtime) that
  // KILLED_ROUTES's blanket '/apply' 410 — added for the UNRELATED
  // 2026-05-03 buyer-funnel pivot, main-host-only by design — now silently
  // orphans. The one carved-out next.config.ts redirect,
  // '/apply/operations-coordinator', sends traffic to a DIFFERENT destination
  // entirely (/site/careers/operations-coordinator), not to this file, so it
  // does not rescue it either, and it cannot rescue the dynamic [slug]
  // segment regardless.
  if (killedRouteAppFiles.size) {
    const redirectSources = new Set(nextConfigRedirects.map((r) => r.source))
    const shadowed = findShadowedKilledRoutePages(killedRoutesSet, killedRouteAppFiles, redirectSources)
    for (const [route, files] of shadowed) {
      for (const relPath of files) {
        add(
          'WARN',
          `${route}/${relPath}`,
          `src/app${route}/${relPath} exists on disk but is unreachable in production: isMainHost() && isKilledRoute('${route}') 410s every path under '${route}' on the main host (src/middleware.ts), and a tenant custom domain never reaches this top-level tree at all (rewriteToSite() rewrites the same pathname into /site/<slug>/... first) -- no next.config.ts redirect can rescue a dynamic path segment here`,
        )
      }
    }
  }

  // Drift AB: a BESPOKE_SITE_TENANTS tenant's own canonical-URL sources
  // (sitemap.ts, a relative-imported SITE_DOMAIN/BASE-shaped constant,
  // robots.ts, or layout.tsx's `metadata` export — see
  // findHardcodedWwwApexDomains) hardcode an absolute
  // "https://www.<domain>" URL for a domain that IS in middleware's
  // APEX_CANONICAL_DOMAINS. That list exists specifically because www does
  // not serve cleanly on Vercel for these domains (Vercel's own alias 307s
  // www->apex; APEX_CANONICAL_DOMAINS keeps middleware from ALSO redirecting
  // apex->www, which is what would infinite-loop the two). A tenant's own
  // generator hardcoding the www form anyway means every URL it builds from
  // that base — up to thousands, in a rich sitemap — points crawlers at the
  // exact host the exemption exists to steer them away from, adding a
  // redirect hop per URL and splitting canonical/link-equity signal across
  // two hosts instead of the one middleware itself declared canonical.
  // Invisible to Drift O, which only checks that the APEX_CANONICAL_DOMAINS
  // entry matches a KNOWN tenant domain — not what that tenant's own
  // generated URLs actually use.
  if (wwwApexDomainsBySlug.size) {
    for (const [slug, domains] of wwwApexDomainsBySlug) {
      for (const domain of domains) {
        add(
          'WARN',
          slug,
          `own sitemap/canonical-URL source hardcodes https://www.${domain}, but ${domain} is in middleware's APEX_CANONICAL_DOMAINS (apex is the canonical host there specifically because www does not serve cleanly on Vercel for it) -> every URL built from that hardcoded www base points crawlers at the non-canonical host through an extra redirect hop, splitting canonical signal between two hosts; invisible to Drift O, which only checks that the APEX_CANONICAL_DOMAINS entry matches a known tenant domain, not what that tenant's own generated URLs use`,
        )
      }
    }
  }

  // Drift AE: a BESPOKE_SITE_TENANTS tenant's own site/<slug>/ folder
  // contains a top-level route directory whose name is IDENTICAL to a
  // reserved, single-segment APP_ROOT_PREFIXES entry (see
  // findShadowedAppRootPages and parseAppRootPrefixes). rewriteToSite() in
  // src/middleware.ts checks APP_ROOT_PREFIXES BEFORE the tenant-site
  // rewrite (matchesAppRootPrefix: exact match, or the prefix followed by
  // "/"): a request whose pathname collides is served via NextResponse.next()
  // from whatever the TOP-LEVEL src/app/<prefix>/ tree resolves — it can
  // never reach /site/<slug>/<prefix>/..., no matter what the tenant built
  // there. Concrete instance that motivated this check:
  // site/the-nyc-marketing-company/api/contact/route.ts (a bespoke,
  // Resend-backed, multipart/file-attachment contact handler, 187 lines) is
  // permanently shadowed by the global src/app/api/contact/route.ts
  // (JSON-only, tenant resolved via header). The tenant's own frontend
  // (_lib/submitLead.ts) already migrated its main lead form to POST JSON at
  // the global handler — but the RFP form's file picker (ContactPageClient.tsx)
  // still lets a visitor attach up to 5 files and then silently drops them,
  // sending only a text note ("Attached N file(s)... uploaded separately on
  // request") to the global JSON handler, which has no attachment support —
  // the one handler that COULD accept them is unreachable. Same root cause
  // also affects wash-and-fold-hoboken/wash-and-fold-nyc's own
  // site/<slug>/unsubscribe/ pages, shadowed by the global,
  // already-tenant-aware src/app/unsubscribe/page.tsx (harmless there — the
  // global page correctly brands per tenant via /api/tenant/public — but the
  // per-tenant pages are dead, unreachable forks; wash-and-fold-hoboken's
  // copy also hardcodes NYC Maid's own name/phone, a stale copy-paste that
  // would be visibly wrong branding if it were ever somehow reached).
  if (bespokeSiteTopLevelDirs.size) {
    const shadowed = findShadowedAppRootPages(bespokeSet, appRootPrefixes, bespokeSiteTopLevelDirs)
    for (const [slug, dirs] of shadowed) {
      for (const d of dirs) {
        add(
          'WARN',
          slug,
          `src/app/site/${slug}/${d}/ collides with reserved APP_ROOT_PREFIXES entry '/${d}' in src/middleware.ts -> rewriteToSite()'s app-root check (matchesAppRootPrefix) matches before the /site/${slug} rewrite ever runs, so this tenant's own /${d} page or route is permanently unreachable on its own domain, shadowed by whatever src/app/${d}/ resolves to instead`,
        )
      }
    }
  }

  // Drift AF: an isPublicRoute pattern (src/middleware.ts) whose compiled regex —
  // createRouteMatcher has NO path-segment boundary before '(.*)', unlike
  // rewriteToSite()'s explicit matchesAppRootPrefix check — accidentally matches a
  // DIFFERENT top-level /api/ directory than the one it names (see
  // findUnboundedApiPublicRouteCollisions above). Any such directory is silently
  // treated as fully public: middleware's ENTIRE Clerk-session-redirect AND
  // admin-impersonation-bypass-allowlist gate (the p.startsWith(...) chain a few
  // lines below isPublicRoute in src/middleware.ts) is skipped for it, because
  // isPublicRoute is checked first and short-circuits past both. Concrete instance
  // that motivated this check: '/api/client(.*)' (intended only for the ported
  // nycmaid client-portal routes at /api/client/...) also matched /api/clients (the
  // full CRM customer API) and /api/client-reviews. WARN, not CRIT: not
  // automatically a live data leak — every real route.ts still self-gates via its
  // own getTenantForRequest()/requirePermission() call, which independently
  // requires a valid Clerk session or admin_token regardless of what middleware
  // did — but it is still a real, silent contradiction between two independently-
  // maintained lists in the same file, the same "two lists that should agree but
  // don't" shape this whole gate exists to catch elsewhere, just in the auth-gate
  // subsystem instead of tenant-site routing. Same severity as Drift AE for the
  // same "surfaces for a human decision, does not gate CI" reasoning.
  for (const { pattern, literalDir, collidesWithDir } of apiPublicRouteCollisions) {
    add(
      'WARN',
      collidesWithDir,
      `isPublicRoute pattern '${pattern}' (src/middleware.ts, intended for /api/${literalDir}/...) has no path-segment boundary before its '(.*)' and ALSO matches /api/${collidesWithDir} -> middleware treats /api/${collidesWithDir} as fully public, skipping its entire Clerk/admin-impersonation gate; not necessarily a live data leak (the route may self-gate via getTenantForRequest()/requirePermission()) but silently bypasses a gate two other independently-maintained lists in this file assume is applied`,
    )
  }

  // Drift AG: an admin-impersonation-bypass allowlist prefix (the
  // `p.startsWith(...)` chain in src/middleware.ts, below isPublicRoute) that
  // is fully unreachable dead code because an isPublicRoute pattern already
  // matches EVERY path under it (see findShadowedAdminBypassPrefixes above).
  // `if (!isPublicRoute(req))` is always false for such a prefix, so the
  // bypass allowlist entry below it is never even evaluated for any real
  // request. Concrete instance that motivated this check: a
  // `p.startsWith('/api/selena')` entry, fully shadowed by isPublicRoute's own
  // unbounded '/api/selena(.*)' pattern — removed in (183). WARN, not CRIT:
  // by construction a shadowed entry can never change live behavior (its
  // whole prefix was already public before the bypass check would have run),
  // so this is a forgotten-cleanup / stale-allowlist-entry signal, the same
  // "two lists that should agree but don't" shape Drift V already watches for
  // on KNOWN_PENDING_ORPHANS, just applied to this different list.
  for (const { bypassPrefix, shadowedByPattern } of adminBypassPrefixShadows) {
    add(
      'WARN',
      bypassPrefix,
      `admin-impersonation-bypass allowlist entry '${bypassPrefix}' (src/middleware.ts) is dead code -> isPublicRoute pattern '${shadowedByPattern}' already matches every path under it, so \`if (!isPublicRoute(req))\` is always false there and this bypass entry is never evaluated for any real request`,
    )
  }

  // Drift AH: a JOIN_CRAWLABLE_HOSTS entry (src/app/robots.ts — see
  // parseJoinCrawlableHosts) that matches NO known tenant domain anywhere
  // (tenants.domain of any status, or any tenant_domains row). Same "two
  // lists that should agree but don't" shape as Drift O (APEX_CANONICAL_DOMAINS),
  // just for a different hardcoded hostname list in a different file: this
  // Set exists purely to carve the tenant's public /join/* hiring-funnel
  // pages out of the default '/join/' disallow rule, and it lives entirely
  // outside every DB source this gate otherwise reconciles. A tenant domain
  // change (or a typo at authoring time — e.g. a dropped 'www.' twin, or a
  // stale domain left behind after a cutover) gives zero drift signal
  // anywhere else: robots.ts keeps disallowing '/join/' for the tenant's
  // REAL current domain (since it never matched the stale entry to begin
  // with) while the dead entry harmlessly matches nothing, silently hiding
  // indexed job pages from Google with no CI signal at all. WARN, not CRIT:
  // this is a crawlability regression, not a live data leak or routing
  // break — the underlying /join/* pages still render correctly, they just
  // stop being offered to crawlers.
  if (joinCrawlableHosts.size) {
    const knownDomains = new Set()
    for (const t of tenants) if (t.domain) knownDomains.add(norm(t.domain))
    for (const r of tds) if (r.domain) knownDomains.add(norm(r.domain))
    for (const t of allTenantDomains) if (t.domain) knownDomains.add(norm(t.domain))
    for (const host of joinCrawlableHosts) {
      if (!knownDomains.has(norm(host))) {
        add('WARN', host, `in src/app/robots.ts's JOIN_CRAWLABLE_HOSTS (the '/join/' disallow-rule exemption for this tenant's public hiring-funnel pages) but matches NO known tenant domain -> dead entry, or a typo/stale-domain silently defeating the crawlability exemption it exists for; robots.ts still disallows '/join/' for whatever domain the tenant ACTUALLY serves on today`)
      }
    }
  }

  // Drift AI: the reverse of Drift AH -- a bespoke tenant with a real
  // site/<slug>/join/ folder (a live public hiring-funnel page, JobPosting
  // structured data) whose known domain(s) are NOT in JOIN_CRAWLABLE_HOSTS.
  // robots.ts's default '/join/' disallow rule applies to every host NOT in
  // that Set (see parseJoinCrawlableHosts above), so a tenant that actually
  // serves /join/* content but was never added to the exemption list -- or
  // fell out of it after a domain change -- has its indexed job pages
  // silently hidden from crawlers, with zero drift signal anywhere else in
  // this file. Same "forgot the code you fixed" shape (182)/(184)
  // generalized for their own lists, just applied to this one: today's only
  // bespoke tenant with a site/<slug>/join folder (nyc-mobile-salon) is
  // already correctly listed, so this check exists to catch the NEXT one.
  // Skipped for a slug with no known domain at all -- an unresolvable/
  // out-of-scope tenant is already covered by Drift C/E/L, and warning here
  // too would just be duplicate noise with no new domain to act on.
  if (bespokeSiteTopLevelDirs.size) {
    const normJoinHosts = new Set([...joinCrawlableHosts].map(norm))
    for (const [slug, dirs] of bespokeSiteTopLevelDirs) {
      if (!dirs.includes('join')) continue
      const domains = new Set()
      for (const t of tenants) if (t.slug === slug && t.domain) domains.add(norm(t.domain))
      for (const r of tds) if (r.slug === slug && r.domain) domains.add(norm(r.domain))
      for (const t of allTenantDomains) if (t.slug === slug && t.domain) domains.add(norm(t.domain))
      if (!domains.size) continue
      const covered = [...domains].some((d) => normJoinHosts.has(d))
      if (!covered) {
        add('WARN', slug, `has a site/${slug}/join/ folder (a live public hiring-funnel page) but its known domain(s) [${[...domains].join(', ')}] are NOT in src/app/robots.ts's JOIN_CRAWLABLE_HOSTS -> robots.ts's default '/join/' disallow rule hides this tenant's indexed job pages from crawlers on its own domain`)
      }
    }
  }

  // Drift AM: an APP_ROOT_PREFIXES entry (src/middleware.ts) carries a
  // trailing slash — a shape matchesAppRootPrefix can never actually match
  // against a real request (see findTrailingSlashAppRootPrefixes above for
  // the full mechanism). CRIT, not WARN: unlike every other robots.ts-only
  // check in this file (a crawlability regression, not a live break), this
  // is a real production ROUTING bug — the affected prefix's entire
  // app-root branch (headers-only passthrough, tenant-scoped API/page
  // served at its own literal path) is unreachable from any tenant
  // subdomain or custom domain; every request under it falls through to the
  // tenant-site rewrite instead. Concrete instance found live in the current
  // repo: '/api/' (the sole trailing-slash entry, present since the array
  // was first introduced) meant every tenant's real '/api/*' call — the
  // client-PIN-login POST endpoint Drift AL's own fix depends on being
  // globally reachable, '/api/tenant-sitemap', etc. — fell through to
  // `/site/<slug>/api/...` instead, 404ing on every bespoke tenant except
  // the-nyc-marketing-company (whose own site/the-nyc-marketing-company/api/
  // subtree happened to have a matching file, silently serving ITS local,
  // unshadowed copy instead of the global handler Drift AE's own writeup
  // already assumed was authoritative).
  if (appRootPrefixes.length) {
    const trailingSlashPrefixes = findTrailingSlashAppRootPrefixes(appRootPrefixes)
    for (const prefix of trailingSlashPrefixes) {
      add(
        'CRIT',
        prefix,
        `APP_ROOT_PREFIXES entry '${prefix}' (src/middleware.ts) carries a trailing slash -> matchesAppRootPrefix('<pathname>', '${prefix}') can never match a real request (it would require a literal double slash), so every real request under this prefix on every tenant subdomain/custom domain falls through to the tenant-site rewrite instead of being served at its own reserved path -> use the bare form ('${prefix.replace(/\/$/, '')}') instead, matching every other APP_ROOT_PREFIXES entry`,
      )
    }
  }

  // Drift AJ: an APP_ROOT_PREFIXES entry (src/middleware.ts — see
  // parseAppRootPrefixes) has no corresponding rule in src/app/robots.ts's
  // own hardcoded `disallow` array (see parseRobotsDisallowList).
  // rewriteToSite()'s matchesAppRootPrefix check (Drift AE above) means
  // every APP_ROOT_PREFIXES entry serves at its OWN literal path — tenant
  // headers injected, no auth gate of any kind — on EVERY tenant custom
  // domain (that routing block runs BEFORE isPublicRoute is ever
  // consulted), not just the main host. A reserved route missing here is
  // therefore just as globally crawlable/indexable as '/dashboard/' or
  // '/admin/' (both of which ARE in the disallow array), with zero drift
  // signal anywhere else in this file. Concrete instances found live in the
  // current repo: '/fullloop' (the per-tenant operator PIN login page) and
  // '/reset-pin' (the self-service PIN reset page) are both real, fixed,
  // non-token-gated pages reachable on every tenant domain — structurally
  // identical in sensitivity to '/sign-in/' and '/admin-login', which ARE
  // disallowed — yet neither has ever been added here. '/reviews/submit' is
  // the third: a fixed, non-token-gated review-submission FORM, unlike the
  // genuinely token-gated '/quote/(.*)', '/invoice/(.*)', '/sign/(.*)'
  // public flows this check deliberately does not flag (those are
  // unguessable per-visit URLs, not reserved fixed prefixes, so being
  // absent from a static disallow list is correct for them). Coverage uses
  // real robots.txt Disallow semantics (see robotsDisallowCoversPath above)
  // — a trailing-slash entry like '/team/' only covers paths STRICTLY under
  // it, never the bare prefix itself, so '/dashboard', '/admin', '/portal',
  // and '/team' each need their own exact-match ('$'-anchored) disallow
  // entry alongside the trailing-slash one that covers their subpages.
  if (appRootPrefixes.length) {
    for (const prefix of appRootPrefixes) {
      const normPrefix = prefix.replace(/\/$/, '')
      const covered = robotsDisallowCoversPath(robotsDisallowList, normPrefix)
      if (!covered) {
        add(
          'WARN',
          prefix,
          `APP_ROOT_PREFIXES entry '${prefix}' (src/middleware.ts) serves at its own literal path — tenant headers injected, no auth gate — on every tenant custom domain, but has no corresponding rule in src/app/robots.ts's disallow array -> this reserved route is crawlable/indexable on every tenant domain even though it is just as private as '/dashboard/' or '/admin/', which the disallow array does cover`,
        )
      }
    }
  }

  // Drift AK: a bespoke tenant with a real site/<slug>/login/ folder (the
  // SiteAdminLoginClient operator-PIN-login form — same component and same
  // sensitivity class as the global '/fullloop' page Drift AJ's own fix
  // added to the disallow array) whose robots.ts disallow list has no
  // '/login' coverage. Unlike every APP_ROOT_PREFIXES entry Drift AJ
  // reconciles, '/login' is not a middleware constant at all — it exists
  // purely as a literal page file inside four bespoke tenants' own
  // site/<slug>/ subtree (nyc-mobile-salon, the-florida-maid,
  // wash-and-fold-nyc, wash-and-fold-hoboken), so rewriteToSite() resolves it
  // through the ordinary /site/<slug> rewrite like any other tenant content
  // page, never touching the APP_ROOT_PREFIXES/matchesAppRootPrefix branch
  // Drift AE/AJ watch. That made it invisible to every existing Drift check
  // in this file — including AJ, whose diff is scoped to APP_ROOT_PREFIXES
  // entries only. Same real robots.txt Disallow semantics AJ uses (see
  // robotsDisallowCoversPath) — a trailing-slash-only '/login/' entry would
  // NOT actually cover the bare '/login' page in a real crawler, so it does
  // not count as coverage here either; a future '/login/foo' disallow entry
  // would still correctly count as covering nested paths, just never the
  // bare page by itself. Concrete instances found live in the current
  // repo: all four tenants above ship this exact page, unindexed by no
  // mechanism other than this new check going forward. WARN, not CRIT —
  // same "crawlability regression, not a live data leak" reasoning as AH/AJ:
  // the page still self-gates via its own PIN submission to
  // /api/client/login or the admin PIN endpoint, it is just indexable when
  // it shouldn't be.
  if (bespokeSiteTopLevelDirs.size) {
    const loginCovered = robotsDisallowCoversPath(robotsDisallowList, '/login')
    if (!loginCovered) {
      for (const [slug, dirs] of bespokeSiteTopLevelDirs) {
        if (!dirs.includes('login')) continue
        add(
          'WARN',
          slug,
          `has a site/${slug}/login/ folder (the SiteAdminLoginClient operator-PIN-login form, same sensitivity class as the global '/fullloop' page) but src/app/robots.ts's disallow array has no '/login' coverage -> this tenant's own PIN-login page is crawlable/indexable on its own domain; not a middleware APP_ROOT_PREFIXES entry, so invisible to Drift AJ's own diff too`,
        )
      }
    }
  }

  // Drift AL: a bespoke tenant with a detected client-PIN-login-portal
  // directory (see clientPortalLoginDirsBySlug / findClientPortalLoginDir
  // above — a top-level site/<slug>/ segment whose own children include
  // BOTH a 'dashboard' and a 'collect' subdirectory, the fingerprint of the
  // tenant-embedded client-login-portal clone: an email+PIN form at the
  // segment root, POST /api/client/login, structurally identical to the
  // global '/portal' page above, just forked per tenant instead of shared)
  // whose known domain(s) have NO matching entry in robots.ts's
  // PRIVATE_CLIENT_LOGIN_HOSTS map (see parsePrivateClientLoginHosts), OR
  // whose entry names a DIFFERENT path than the one actually found on disk
  // (a stale/typo'd value would silently disallow the wrong segment while
  // leaving the real one crawlable). Same "two lists that should agree but
  // don't" shape as Drift AH/AI, just for this file's SECOND per-host
  // carve-out map instead of its first (JOIN_CRAWLABLE_HOSTS) — and, unlike
  // AH/AI, this one can't be a blanket disallow entry at all: the same
  // top-level segment name ('book') is nyc-mobile-salon's and
  // the-home-services-company's genuinely PUBLIC lead-capture page, so the
  // carve-out has to name the exact host, not just the exact path. Concrete
  // instances found live in the current repo: wash-and-fold-nyc and
  // wash-and-fold-hoboken's own '/book' (client PIN login there, distinct
  // from the public '/book' lead form on those OTHER tenants) and
  // the-florida-maid's own '/clients' were all three fully crawlable until
  // this round's fix — structurally identical in sensitivity to the global
  // '/portal' page, which IS disallowed. WARN, not CRIT: same
  // crawlability-regression-not-a-data-leak reasoning as every other
  // robots.ts Drift check — the page still self-gates via its own PIN
  // submission to /api/client/login. Skipped for a slug with no known domain
  // at all — same reasoning as Drift AI (Drift C/E/L already cover an
  // unresolvable/out-of-scope tenant).
  if (clientPortalLoginDirsBySlug.size) {
    const normPrivateHosts = new Map([...privateClientLoginHosts].map(([hostname, path]) => [norm(hostname), path]))
    for (const [slug, dirName] of clientPortalLoginDirsBySlug) {
      const domains = new Set()
      for (const t of tenants) if (t.slug === slug && t.domain) domains.add(norm(t.domain))
      for (const r of tds) if (r.slug === slug && r.domain) domains.add(norm(r.domain))
      for (const t of allTenantDomains) if (t.slug === slug && t.domain) domains.add(norm(t.domain))
      if (!domains.size) continue
      const expectedPath = `/${dirName}`
      const covered = [...domains].some((d) => normPrivateHosts.get(d) === expectedPath)
      if (!covered) {
        add(
          'WARN',
          slug,
          `has a site/${slug}/${dirName}/ folder shaped like the client-PIN-login-portal clone (dashboard/ + collect/ subpages, same email+PIN form as the global '/portal' page) but none of its known domain(s) [${[...domains].join(', ')}] have a matching '${expectedPath}' entry in src/app/robots.ts's PRIVATE_CLIENT_LOGIN_HOSTS -> this tenant's client-login portal is crawlable/indexable on its own domain`,
        )
      }
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
    if (!m) continue
    // dotenv-compatible value extraction (matches node_modules/dotenv/lib/main.js's
    // own LINE regex, the convention every other script in scripts/ that loads
    // .env.local already follows): a quoted value captures everything up to its
    // TRUE matching closing quote verbatim, so a literal '#' inside stays part of
    // the value; an unquoted value stops at the first '#' -- everything from
    // there on is a trailing comment, never part of the value. Without this, an
    // ordinary dotenv-style token line (`KEY=value # note`) got the comment text
    // glued onto the token instead of stripped, returning a non-null but INVALID
    // credential -- main() then skips the clean-skip path and every subsequent
    // Supabase call 401s.
    const valueMatch = m[1].match(/^\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)"|`((?:\\`|[^`])*)`|([^#]*))/)
    const value = valueMatch ? (valueMatch[1] ?? valueMatch[2] ?? valueMatch[3] ?? valueMatch[4] ?? '') : m[1]
    return value.trim() || null
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

  // Same class of bug items (227)-(230) closed on the curl calls in
  // ci.yml/tenant-config-reconcile.yml/db-backup.yml: fetch() has no default
  // response timeout of its own. This gate makes up to 5 of these calls (4
  // in the Promise.all below + 1 more for Drift L) — a DNS hang or slow-drip
  // response from api.supabase.com on any one of them would silently consume
  // the reconcile job's entire 10-minute timeout-minutes budget (see
  // reconcile-gate-wiring.test.ts's job-level bound) before the real drift
  // report is ever produced, instead of failing fast within one call.
  // AbortSignal.timeout(30_000) mirrors the --max-time 30 bound already used
  // for every third-party curl call in this lane.
  const sql = async (query) => {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOK}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(30_000),
    })
    // r.ok is false on ANY non-2xx response (401 expired/rotated token, 403,
    // 429 rate-limited, or a 5xx api.supabase.com outage) -- and a 5xx from a
    // gateway in front of that API can return an HTML error page, not JSON.
    // Falling straight into r.json() on that path throws a bare, opaque
    // SyntaxError ("Unexpected token '<'...") with no HTTP status and no hint
    // of which of this gate's up-to-5 per-run queries failed -- exactly the
    // wrong failure mode for a merge-blocking CI gate a human has to triage
    // fast: it can't be told apart from a real drift-query bug at a glance.
    // Checking status first, and slicing the query into every thrown message,
    // means a red run always names the HTTP status and the query, so
    // "Supabase token expired" and "PR introduced a real drift bug" are never
    // confused with each other in the log.
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      throw new Error(`SQL ${r.status} ${r.statusText} for query "${query.slice(0, 80)}": ${body.slice(0, 200)}`)
    }
    const d = await r.json()
    if (!Array.isArray(d)) throw new Error(`SQL for query "${query.slice(0, 80)}": ` + JSON.stringify(d).slice(0, 200))
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
  const allNextConfigSiteRewrites = parseAllNextConfigSiteRewriteSources(nextConfigSource)
  const nextConfigRedirects = parseNextConfigRedirects(nextConfigSource)
  const appRootPrefixes = parseAppRootPrefixes(middlewareSource)
  const killedRoutesSet = parseKilledRoutes(middlewareSource)
  const robotsSource = readFileSync(join(REPO, 'src', 'app', 'robots.ts'), 'utf8')
  const robotsMainHostsSet = parseRobotsMainHostsSet(robotsSource)
  const robotsKilledRoutesSet = parseRobotsKilledRoutes(robotsSource)
  const joinCrawlableHosts = parseJoinCrawlableHosts(robotsSource)
  const robotsDisallowList = parseRobotsDisallowList(robotsSource)
  const privateClientLoginHosts = parsePrivateClientLoginHosts(robotsSource)
  const siteDir = join(REPO, 'src', 'app', 'site')
  // hasHomePage is now a module-level exported function (see above) — was a
  // closure here with zero test coverage, and only resolved ONE level of
  // route-group nesting instead of the full chain.
  const hasHome = (slug) => hasHomePage(join(siteDir, slug))
  // hasSitemapFile is now a module-level exported function (see above) — was
  // a closure here with zero test coverage, and only resolved DIRECT
  // children instead of the full route-group chain.
  const hasSitemap = (slug) => hasSitemapFile(join(siteDir, slug))

  // Feeds Drift AD: for every KILLED_ROUTES entry, collect the relative path of
  // every page.tsx/route.ts that still exists on disk directly under
  // src/app/<route> — the top-level tree isMainHost()+isKilledRoute() 410s,
  // NOT src/app/site/<slug> (a different physical tree entirely, reached via
  // middleware's rewriteToSite() instead, which this walk never touches).
  // collectPageFiles is now a module-level exported function (see above) —
  // was a closure here with zero test coverage.
  const killedRouteAppFiles = new Map()
  for (const route of killedRoutesSet) {
    const dir = join(REPO, 'src', 'app', route.replace(/^\//, ''))
    if (!existsSync(dir)) continue
    const files = collectPageFiles(dir)
    if (files.length) killedRouteAppFiles.set(route, files)
  }

  // Feeds Drift AB: for every bespoke tenant, read its own sitemap.ts (plus
  // whatever it relative-imports one hop deep — e.g. a sibling _lib/siteData.ts
  // re-exporting SITE_DOMAIN), robots.ts, AND layout.tsx, then scan those
  // sources for a hardcoded www. form of an APEX_CANONICAL_DOMAINS entry.
  // layout.tsx is the highest-value source of the three: its `metadata`
  // export is what actually emits the <link rel="canonical"> tag and
  // openGraph/twitter url on every single page render — the literal signal
  // Google uses to pick a canonical host — whereas sitemap.ts only affects
  // sitemap.xml entries. A tenant could fix its sitemap.ts (clearing this
  // check) while its layout.tsx still hardcodes the non-canonical www host
  // on every page; scanning layout.tsx directly closes that blind spot.
  const wwwApexDomainsBySlug = new Map()
  if (apexCanonicalSet.size) {
    for (const slug of bespokeSet) {
      const dir = join(siteDir, slug)
      const sources = []
      const sitemapPath = join(dir, 'sitemap.ts')
      let sitemapSrc = null
      if (existsSync(sitemapPath)) {
        sitemapSrc = readFileSync(sitemapPath, 'utf8')
        sources.push(sitemapSrc)
      }
      const robotsPath = join(dir, 'robots.ts')
      if (existsSync(robotsPath)) sources.push(readFileSync(robotsPath, 'utf8'))
      const layoutPath = join(dir, 'layout.tsx')
      if (existsSync(layoutPath)) sources.push(readFileSync(layoutPath, 'utf8'))
      if (sitemapSrc) {
        for (const rel of parseRelativeImportPaths(sitemapSrc)) {
          const base = join(dir, rel)
          const candidate = [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find((p) => existsSync(p))
          if (candidate) sources.push(readFileSync(candidate, 'utf8'))
        }
      }
      const found = findHardcodedWwwApexDomains(sources, apexCanonicalSet)
      if (found.size) wwwApexDomainsBySlug.set(slug, found)
    }
  }

  // Feeds Drift AE: for every bespoke tenant, the top-level route-segment
  // directory names under its own site/<slug>/ folder. A Next.js route group
  // ("(name)") is invisible in the URL, so its CHILDREN are the real first
  // path segment — recurse one level into a group rather than reporting the
  // group's own literal name (which can never appear in a real pathname and
  // would never collide with anything in matchesAppRootPrefix's real input).
  // collectFirstSegmentDirs is now a module-level exported function (see
  // above) — was a closure here with zero test coverage.
  const bespokeSiteTopLevelDirs = new Map()
  for (const slug of bespokeSet) {
    const names = collectFirstSegmentDirs(join(siteDir, slug))
    if (names.length) bespokeSiteTopLevelDirs.set(slug, names)
  }

  // Feeds Drift AL: for every bespoke tenant, find a top-level route-segment
  // directory whose own children include BOTH a 'dashboard' and a 'collect'
  // subdirectory — the client-PIN-login-portal clone fingerprint (see the
  // comment above Drift AL in computeFindings). findClientPortalLoginDir is
  // now a module-level exported function (see above) — was a closure here
  // with zero test coverage.
  const clientPortalLoginDirsBySlug = new Map()
  for (const slug of bespokeSet) {
    const found = findClientPortalLoginDir(join(siteDir, slug))
    if (found) clientPortalLoginDirsBySlug.set(slug, found)
  }

  // Feeds Drift AF: pure static analysis over the working tree (no DB, no
  // network) — computed here alongside the other middleware-source parses above,
  // ahead of the SQL calls below, purely for locality with its sibling checks.
  const publicRoutePatterns = parsePublicRoutePatterns(middlewareSource)
  const apiDir = join(REPO, 'src', 'app', 'api')
  const apiDirNames = existsSync(apiDir)
    ? readdirSync(apiDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
    : []
  const apiPublicRouteCollisions = findUnboundedApiPublicRouteCollisions(publicRoutePatterns, apiDirNames)

  // Feeds Drift AG: same pure static analysis, no DB, no network — the admin
  // bypass allowlist's own prefixes compared directly against isPublicRoute's
  // patterns (both already parsed from middlewareSource above).
  const adminBypassPrefixes = parseAdminBypassPrefixes(middlewareSource)
  const adminBypassPrefixShadows = findShadowedAdminBypassPrefixes(publicRoutePatterns, adminBypassPrefixes)

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

  const findings = computeFindings({ tenants, tds, bespokeSet, hasHome, resolvableSlugs, allTenantDomains, apexCanonicalSet, protectedSlugs, richSitemapSet, hasSitemap, allTenants, nonServingStatuses, mainHostsSet, rootSiteTenantsSet, staticTenantMap, knownPendingOrphans: KNOWN_PENDING_ORPHANS, nextConfigSiteRewrites, allNextConfigSiteRewrites, nextConfigRedirects, appRootPrefixes, robotsMainHostsSet, killedRoutesSet, robotsKilledRoutesSet, wwwApexDomainsBySlug, killedRouteAppFiles, bespokeSiteTopLevelDirs, apiPublicRouteCollisions, adminBypassPrefixShadows, joinCrawlableHosts, robotsDisallowList, privateClientLoginHosts, clientPortalLoginDirsBySlug })

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
