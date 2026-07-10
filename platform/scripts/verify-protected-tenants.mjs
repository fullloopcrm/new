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
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
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

const violations = []

// --- 1. Extract the BESPOKE_SITE_TENANTS set from middleware source text. ---
// Static text parse on purpose: the failure mode we guard against is a human or
// a merge editing this exact literal, so we check the literal itself.
const mwPath = join(REPO, 'src', 'middleware.ts')
let bespokeSet = null
if (!existsSync(mwPath)) {
  violations.push(`middleware not found at src/middleware.ts — cannot verify routing`)
} else {
  const mw = readFileSync(mwPath, 'utf8')
  const block = mw.match(/BESPOKE_SITE_TENANTS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/)
  if (!block) {
    violations.push(
      `could not find the BESPOKE_SITE_TENANTS set in src/middleware.ts — it was ` +
      `renamed or removed. Bespoke-site routing may be broken; verify manually.`
    )
  } else {
    bespokeSet = new Set([...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]))
  }
}

// --- 2. Assert each protected tenant is routed bespoke AND has its folder. ---
for (const t of PROTECTED) {
  if (bespokeSet && !bespokeSet.has(t.slug)) {
    violations.push(
      `'${t.slug}' (${t.domain}) is NOT in BESPOKE_SITE_TENANTS → it would render ` +
      `the global template instead of its own site. Re-add it to the set in src/middleware.ts.`
    )
  }
  // Homepage lives at <slug>/page.tsx OR, when the site uses a Next route group
  // (e.g. wash-and-fold's (marketing)/page.tsx), at <slug>/(group)/page.tsx.
  const siteDir = join(REPO, 'src', 'app', 'site', t.slug)
  const groupHome = existsSync(siteDir)
    ? readdirSync(siteDir).some(
        (e) => e.startsWith('(') && e.endsWith(')') && existsSync(join(siteDir, e, 'page.tsx'))
      )
    : false
  const hasHome = existsSync(join(siteDir, 'page.tsx')) || groupHome
  if (!hasHome) {
    violations.push(
      `'${t.slug}' (${t.domain}) has no homepage (src/app/site/${t.slug}/page.tsx or ` +
      `(group)/page.tsx) → its bespoke site was deleted. Restore it ` +
      `(e.g. \`git checkout <commit> -- src/app/site/${t.slug}\`).`
    )
  }
}

// --- 3. Report. ---
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
