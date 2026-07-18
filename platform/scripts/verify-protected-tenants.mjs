#!/usr/bin/env node
/**
 * Protected-tenant guard. Fails (exit 1) if a LIVE tenant that must serve its
 * own bespoke public site would silently fall back to the shared global
 * template (/site/template).
 *
 * WHY THIS EXISTS
 * ---------------
 * Which tenants keep their own site is decided by a hardcoded `Set`,
 * `BESPOKE_SITE_TENANTS`, inside src/middleware.ts. Every tenant NOT in that set
 * is rewritten to /site/template. That means a single dropped line in a merge —
 * or a deleted /site/<slug> folder — silently replaces a live business's
 * website with the generic template, with no error and no alert. That is exactly
 * what happened in the 2026-07-08 "route ALL tenants except nycmaid to the
 * template" cutover, which un-routed and deleted several live tenants' sites.
 *
 * This script is the backstop. For every tenant listed in PROTECTED below it
 * asserts, at build time, BOTH:
 *   1. the slug is still present in middleware's BESPOKE_SITE_TENANTS set, and
 *   2. its /site/<slug>/page.tsx still exists on disk.
 * If either is false the build fails, so the regression cannot reach production.
 *
 * It runs automatically as the npm `prebuild` step (see package.json), so
 * `next build` — and therefore every Vercel deploy — will not proceed while a
 * protected tenant is broken.
 *
 *   node scripts/verify-protected-tenants.mjs
 *
 * TO PROTECT A NEW TENANT: add it to PROTECTED below, add its slug to
 * BESPOKE_SITE_TENANTS in src/middleware.ts, and make sure its
 * src/app/site/<slug>/ folder exists. All three or the guard fails.
 *
 * STRUCTURE: parseBespokeSetFromMiddleware (the pure text-parse logic) is
 * exported so it can be unit-tested without touching the filesystem or
 * exiting the process — same convention as scripts/reconcile-tenant-config.mjs.
 * The CLI (PROTECTED loop, disk checks, report, exit) runs ONLY when this
 * file is invoked directly.
 */
import { readFileSync, existsSync, readdirSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')

// Live tenants whose public site MUST be their own bespoke /site/<slug> subtree
// and MUST NOT fall back to the global template. slug = the tenant's slug AND
// the /site/<slug> folder name (middleware routes bespoke tenants to
// `/site/${tenantSlug}`, so these must match exactly).
const PROTECTED = [
  { slug: 'nycmaid', domain: 'thenycmaid.com — live primary' },
  { slug: 'we-pay-you-junk', domain: 'wepayyoujunkremoval.com' },
  { slug: 'nyc-mobile-salon', domain: 'thenycmobilesalon.com' },
  { slug: 'the-florida-maid', domain: 'thefloridamaid.com' },
  { slug: 'the-nyc-exterminator', domain: 'thenycexterminator.com' },
  { slug: 'nyc-tow', domain: 'nyctow' },
  { slug: 'nycroadsideemergencyassistance', domain: 'nycroadsideemergencyassistance.com' },
  { slug: 'theroadsidehelper', domain: 'theroadsidehelper.com' },
  { slug: 'toll-trucks-near-me', domain: 'tolltrucksnearme.com' },
  { slug: 'sunnyside-clean-nyc', domain: 'cleaningservicesunnysideny.com' },
  { slug: 'wash-and-fold-nyc', domain: 'washnfoldnyc' },
  { slug: 'wash-and-fold-hoboken', domain: 'hoboken laundry' },
  { slug: 'landscaping-in-nyc', domain: 'landscapinginnyc' },
  { slug: 'debt-service-ratio-loan', domain: 'debtserviceratioloan' },
  { slug: 'fla-dumpster-rentals', domain: 'fladumpsterrentals' },
  { slug: 'stretch-ny', domain: 'stretchny.com' },
  { slug: 'stretch-service', domain: 'stretch service' },
  { slug: 'the-home-services-company', domain: 'thehomeservicescompany' },
  { slug: 'the-nyc-interior-designer', domain: 'thenycinteriordesigner.com' },
  { slug: 'the-nyc-marketing-company', domain: 'thenycmarketingcompany / consortium' },
  { slug: 'the-nyc-seo', domain: 'thenycseo.com' },
  { slug: 'consortium-nyc', domain: 'consortiumnyc.com' },
]

// --- Extract the BESPOKE_SITE_TENANTS set from middleware source text. ---
// Static text parse on purpose: the failure mode we guard against is a human or
// a merge editing this exact literal, so we check the literal itself. Pure and
// exported so the comment-stripping behavior below can be unit-tested directly
// against a fixture string, without touching the filesystem.
export function parseBespokeSetFromMiddleware(mwSource) {
  const block = mwSource.match(/BESPOKE_SITE_TENANTS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/)
  if (!block) {
    return {
      bespokeSet: null,
      error:
        'could not find the BESPOKE_SITE_TENANTS set in src/middleware.ts — it was ' +
        'renamed or removed. Bespoke-site routing may be broken; verify manually.',
    }
  }
  // Strip comments BEFORE extracting quoted slugs. Without this, a slug
  // commented out during a merge/edit (`// 'nyc-tow',` or `/* 'nyc-tow', */`)
  // still matches the bare quoted-string regex and reads as present, even
  // though it is NOT in the live Set at runtime — middleware would route it
  // to /site/template (the exact 2026-07-08 outage class) while this guard
  // reports "OK". Mutation-verified: commenting out 'nyc-tow' left the
  // un-stripped version at exit 0 (false negative). Safe unconditionally —
  // every PROTECTED slug is a bare identifier (e.g. 'nycmaid'), none contain
  // `//` or `/*`, so this can never eat a real entry.
  const cleaned = block[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  // Item (197): matches reconcile-tenant-config.mjs's own parseBespokeSet —
  // ['"] alone misses a backtick-quoted slug (valid TS/JS, zero
  // interpolation), and the capture group must ALSO exclude backtick, not
  // just the delimiter class, or two adjacent all-backtick entries merge
  // into one corrupted capture (verified in node before shipping). Unlike
  // reconcile-tenant-config.mjs's version of this bug (an invisible miss —
  // a WARN/CRIT just never fires), a miss HERE is a false POSITIVE: this
  // guard's own assertion is "PROTECTED slug must be IN bespokeSet", so a
  // slug this regex fails to capture reads as "not in BESPOKE_SITE_TENANTS"
  // and exit(1)-blocks `next build` (this script is the npm `prebuild`
  // step) for a tenant that is actually correctly routed at runtime.
  return {
    bespokeSet: new Set([...cleaned.matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1])),
    error: null,
  }
}

// --- fresh ground, same "closure with zero test coverage, and only resolved
// ONE level of route-group nesting instead of the full chain" bug class
// reconcile-tenant-config.mjs's own hasHomePage had before item (238) fixed
// it there. This script's OWN independent homepage check — until now an
// inline main() closure (`hasHome`/`groupHome`) — never got the same fix,
// and this script is the ACTUAL npm `prebuild` step (see
// prebuild-guard-wiring.test.ts): a false "no homepage" HERE blocks
// `next build`, and therefore every Vercel deploy, for a PROTECTED tenant
// whose homepage legitimately renders two-or-more route groups deep — a
// higher-stakes gate than reconcile-tenant-config.mjs's own non-gating CI
// check, since this one fails the build itself rather than just reporting
// a WARN/CRIT in a separate job.
//
// Does `dir` render a real homepage at its own root URL — i.e. does
// page.tsx exist directly, or nested behind a Next.js route group ("(name)")
// at ANY depth (a route group is invisible in the URL, so a page.tsx one or
// more levels deep behind a group renders at the SAME effective root URL).
// Exported so it can be unit-tested directly against a fixture directory,
// same convention as reconcile-tenant-config.mjs's own hasHomePage.
//
// Landmine-only today, same disposition as (238): no CURRENT PROTECTED
// tenant nests its page.tsx two-or-more route groups deep (verified against
// every real src/app/site/<slug>/ folder, including wash-and-fold-nyc/
// hoboken's own one-level (marketing)/page.tsx).
export function hasProtectedTenantHomepage(dir) {
  if (!existsSync(dir)) return false
  if (existsSync(join(dir, 'page.tsx'))) return true
  return readdirSync(dir, { withFileTypes: true }).some(
    (e) => e.isDirectory() && e.name.startsWith('(') && e.name.endsWith(')') && hasProtectedTenantHomepage(join(dir, e.name)),
  )
}

function main() {
  const violations = []

  const mwPath = join(REPO, 'src', 'middleware.ts')
  let bespokeSet = null
  if (!existsSync(mwPath)) {
    violations.push(`middleware not found at src/middleware.ts — cannot verify routing`)
  } else {
    const { bespokeSet: parsed, error } = parseBespokeSetFromMiddleware(readFileSync(mwPath, 'utf8'))
    if (error) violations.push(error)
    bespokeSet = parsed
  }

  // Assert each protected tenant is routed bespoke AND has its folder.
  for (const t of PROTECTED) {
    if (bespokeSet && !bespokeSet.has(t.slug)) {
      violations.push(
        `'${t.slug}' (${t.domain}) is NOT in BESPOKE_SITE_TENANTS → it would render ` +
        `the global template instead of its own site. Re-add it to the set in src/middleware.ts.`
      )
    }
    // Homepage lives at <slug>/page.tsx OR, when the site uses a Next route
    // group (e.g. wash-and-fold's (marketing)/page.tsx) — at ANY depth of
    // nested route groups, resolved by hasProtectedTenantHomepage above (was
    // previously an inline one-level-only check with zero test coverage).
    const siteDir = join(REPO, 'src', 'app', 'site', t.slug)
    const hasHome = hasProtectedTenantHomepage(siteDir)
    if (!hasHome) {
      violations.push(
        `'${t.slug}' (${t.domain}) has no homepage (src/app/site/${t.slug}/page.tsx or ` +
        `(group)/page.tsx) → its bespoke site was deleted. Restore it ` +
        `(e.g. \`git checkout <commit> -- src/app/site/${t.slug}\`).`
      )
    }
  }

  if (violations.length > 0) {
    console.error('\n❌  PROTECTED-TENANT GUARD FAILED — a live tenant would lose its site:\n')
    for (const v of violations) console.error(`   • ${v}`)
    console.error(
      `\n   Build blocked. Fix the above so no live tenant silently falls back to ` +
      `/site/template.\n`
    )
    process.exit(1)
  }

  console.log(
    `✅  protected-tenant guard: ${PROTECTED.length} live bespoke site(s) OK ` +
    `(${PROTECTED.map((t) => t.slug).join(', ')})`
  )
}

// Run the CLI only when this file is the entrypoint (node scripts/…​.mjs).
// Importing the module (tests) must not touch the filesystem or exit the
// process — same convention as scripts/reconcile-tenant-config.mjs.
try {
  if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
    main()
  }
} catch {
  /* argv[1] unresolvable (e.g. odd runner) — treat as "not the entrypoint" */
}
