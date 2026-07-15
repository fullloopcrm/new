#!/usr/bin/env node
/**
 * supabaseAdmin-gate guard. Fails (exit 1) if any API route file imports or
 * calls `supabaseAdmin` directly without also going through a recognized
 * tenant/permission gate — the exact bug shape behind nearly every
 * cross-tenant leak (IDOR) found across this platform's security fixes:
 * a route reads/writes a row via the raw service-role client without first
 * establishing (and checking) the caller's tenant/permission context.
 *
 * `supabaseAdmin` itself is NOT banned — it's the platform's standard
 * service-role client and legitimately backs `tenantDb()`, cross-tenant
 * platform tables, and every portal/cron/webhook auth helper below. This
 * guard only requires that a route calling it ALSO calls one of:
 *
 *   - requirePermission()     - dashboard/admin RBAC + tenant resolution
 *   - tenantDb()              - auto tenant_id-scoped query wrapper
 *   - getTenantForRequest()   - session -> tenant context (no permission gate)
 *   - requireAdmin()          - platform-admin-only routes
 *   - getTenantFromHeaders()  - public site routes, tenant resolved from host
 *   - requirePortalPermission() - team-portal session auth
 *   - verifyCronSecret()      - cron routes, secret-header auth
 *
 * or an explicit `// supabase-admin-ok: <reason>` escape hatch (auth
 * bootstrap endpoints, token-authenticated public links where the token
 * itself is the credential, etc).
 *
 *   node scripts/audit-supabase-admin-gate.mjs                  # gate, exit 1 on new violation
 *   node scripts/audit-supabase-admin-gate.mjs --update-baseline  # accept current findings
 *
 * Env overrides (used by scripts/audit-supabase-admin-gate.test.ts to point
 * this at a throwaway fixture tree instead of the real app):
 *   AUDIT_ROOT           default 'src/app/api'
 *   AUDIT_BASELINE_FILE  default 'scripts/.supabase-admin-gate-baseline.json'
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const UPDATE_BASELINE = process.argv.includes('--update-baseline')
const ROOT = process.env.AUDIT_ROOT || 'src/app/api'
const BASELINE_FILE = process.env.AUDIT_BASELINE_FILE || 'scripts/.supabase-admin-gate-baseline.json'

const GATE_RE =
  /\b(requirePermission|tenantDb|getTenantForRequest|requireAdmin|getTenantFromHeaders|requirePortalPermission|verifyCronSecret)\s*\(/

// Webhook routes verify a provider-specific signature/secret inline (Stripe,
// Telnyx, Telegram, Clerk, Resend) — there's no single shared gate function,
// and these are inherently cross-tenant (external caller, tenant resolved
// from the verified payload). Excluded architecturally, not baselined.
const EXCLUDE = [/^src\/app\/api\/webhooks\//]

let files = []
try {
  files = execSync(`grep -rl "supabaseAdmin" ${ROOT} --include="route.ts"`, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean)
} catch {
  files = [] // grep exits 1 with no matches
}
files = files.filter((f) => !EXCLUDE.some((rx) => rx.test(f)))

const flagged = []
for (const file of files) {
  const src = readFileSync(file, 'utf8')
  if (/supabase-admin-ok:/.test(src)) continue
  if (GATE_RE.test(src)) continue
  flagged.push(file)
}
flagged.sort()

if (UPDATE_BASELINE) {
  writeFileSync(BASELINE_FILE, JSON.stringify(flagged, null, 2) + '\n')
  console.log(`baseline updated: ${flagged.length} accepted findings written to ${BASELINE_FILE}`)
  process.exit(0)
}

const baseline = existsSync(BASELINE_FILE) ? new Set(JSON.parse(readFileSync(BASELINE_FILE, 'utf8'))) : new Set()
const fresh = flagged.filter((f) => !baseline.has(f))

if (fresh.length === 0) {
  console.log(`✓ supabase-admin-gate guard: no NEW ungated route (${flagged.length} known/baselined)`)
  process.exit(0)
}
console.error(
  `✗ supabase-admin-gate guard: ${fresh.length} route${fresh.length === 1 ? '' : 's'} call supabaseAdmin without a tenant/permission gate\n`
)
for (const f of fresh) console.error(`  ${f}`)
console.error(
  '\nAdd requirePermission()/tenantDb()/getTenantForRequest() (or the matching portal/cron/admin gate);' +
    " or `// supabase-admin-ok: <reason>` if intentional;" +
    ` or \`node scripts/audit-supabase-admin-gate.mjs --update-baseline\` to accept.`
)
process.exit(1)
