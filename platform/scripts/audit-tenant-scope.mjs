#!/usr/bin/env node
/**
 * Tenant-isolation guard. Fails (exit 1) if any LIVE query on a tenant-owned
 * table is not scoped by tenant_id and is not a row-specific id lookup — i.e.
 * a cross-tenant leak candidate.
 *
 * The platform runs every query through the service-role client, which BYPASSES
 * Postgres RLS. So tenant isolation is enforced only by each query including
 * `.eq('tenant_id', ...)`. This script is the backstop for that convention:
 * run it in CI / pre-push so a forgotten filter can't merge.
 *
 *   node scripts/audit-tenant-scope.mjs           # gate live code, exit 1 on leak
 *   node scripts/audit-tenant-scope.mjs --all     # include dead clones, never fails
 *
 * When a flagged query is a genuine false positive (e.g. an intentional
 * cross-tenant admin aggregate), add `// tenant-scope-ok: <reason>` on the
 * .from() line to silence it.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const ALL = process.argv.includes('--all')
const UPDATE_BASELINE = process.argv.includes('--update-baseline')
const ROOT = 'src'
// Known-accepted violations (existing debt + intentional cross-tenant paths).
// The gate fails only on findings NOT in this baseline, so new leaks can't
// merge while the 96 legacy candidates are triaged separately.
const BASELINE_FILE = 'scripts/.tenant-scope-baseline.json'
const keyOf = (f) => `${f.file}::${f.table}::${f.snippet}`

// Tables that carry tenant_id and hold per-tenant data.
const TENANT_TABLES = new Set([
  // Full set: every table in the live DB that carries a tenant_id column
  // (auto-derived from the schema; keep in sync when tables are added).
  'accounting_periods','admin_tasks','ai_usage','audit_log','audit_logs',
  'bank_accounts','bank_import_batches','bank_statements','bank_transactions','blocked_referrers',
  'booking_notes','booking_team_members','bookings','campaign_recipients','campaigns',
  'categorization_patterns','chart_of_accounts','cleaner_applications','client_contacts','client_properties',
  'client_referral_stats','client_reviews','client_sms_messages','clients','comhub_active_calls',
  'comhub_admin_phones','comhub_admin_presence','comhub_admin_voice_settings','comhub_channel_members','comhub_contacts',
  'comhub_mentions','comhub_messages','comhub_missed_call_sms','comhub_softphone_calls','comhub_templates',
  'comhub_threads','connect_channels','connect_messages','connect_read_cursors','cpa_access_tokens',
  'crews','deal_activities','deals','document_activity','document_fields',
  'document_signers','documents','domain_notes','domains','email_logs',
  'entities','error_logs','expenses','google_reviews','hr_document_reminders',
  'hr_document_requirements','hr_documents','hr_employee_profiles','hr_notes','impersonation_events',
  'import_batches','import_rows','invoice_activity','invoices','jefe_tasks',
  'job_events','job_payments','jobs','journal_entries','journal_lines',
  'lead_clicks','management_application_drafts','management_applications','marketing_opt_out_log','notifications',
  'oauth_state_nonces','onboarding_tasks','outreach_log','payments','payroll_payments',
  'platform_announcement_reads','portal_auth_codes','portal_leads','products','projects',
  'property_changes','prospects','push_subscriptions','quote_activity','quote_templates',
  'quotes','ratings','recurring_exceptions','recurring_expenses','recurring_schedules',
  'referral_commissions','referrals','referrers','reviews','routes',
  'sales_applications','schedule_issues','security_events','selena_memory','seo_changes',
  'seo_competitors','seo_issues','seo_properties','seo_serp','service_types',
  'sms_conversation_messages','sms_conversations','sms_logs','system_state','team_applications',
  'team_member_documents','team_member_payouts','team_members','team_notifications','tenant_domains',
  'tenant_invites','tenant_members','tenant_owner_messages','tenant_settings','territory_claims',
  'travel_time_cache','unmatched_payments','verification_codes','waitlist','website_visits',
  'yinez_memory','yinez_skills',
])

// Excluded from the gate: legacy per-tenant marketing/portal CLONES (each is a
// single fixed tenant, slated for deletion — see platform/CLAUDE.md) and the
// super-admin analytics surface (intentionally cross-tenant).
const EXCLUDE = ALL ? [] : [
  /^src\/app\/site\/(nyc-mobile-salon|wash-and-fold-hoboken|wash-and-fold-nyc)\//,
  /^src\/app\/admin\/analytics\//,
]

const files = execSync(`grep -rl "\\.from('" ${ROOT} --include="*.ts" --include="*.tsx"`, { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean)
  .filter(f => !EXCLUDE.some(rx => rx.test(f)))

const flagged = []
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n')
  // Variables assigned from tenantDb(...) anywhere in this file (e.g. `const db =
  // tenantDb(tenantId)` hoisted once, then reused across many `.from()` calls
  // spread far enough apart that the nearby-line window below would miss them).
  const tenantDbVars = []
  for (let j = 0; j < lines.length; j++) {
    const vm = lines[j].match(/\b(?:const|let)\s+(\w+)\s*=\s*tenantDb\(/)
    if (vm) tenantDbVars.push({ name: vm[1], line: j })
  }
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\.from\('([a-z_]+)'\)/)
    if (!m || !TENANT_TABLES.has(m[1])) continue
    if (/tenant-scope-ok/.test(lines[i])) continue
    if (/\.storage\.from\(/.test(lines[i])) continue             // storage bucket, not a table
    const chain = lines.slice(i, i + 12).join('\n')
    // tenantDb(tenantId).from(table) auto-applies .eq('tenant_id', …) inside the
    // wrapper (src/lib/tenant-db.ts), so the literal string never appears at the
    // call site — look a few lines back too, since `const db = tenantDb(id)` is
    // often hoisted above one or more `.from()` calls that reuse it.
    const context = lines.slice(Math.max(0, i - 15), i + 12).join('\n')
    // The object the `.from()` is actually called on sits within the couple of
    // lines immediately before it (e.g. `await db\n  .from(...)`), regardless of
    // how far above the `const db = tenantDb(...)` declaration itself is.
    const nearCallSite = lines.slice(Math.max(0, i - 3), i + 1).join('\n')
    const usesTenantDbVar = tenantDbVars.some(
      (v) => v.line < i && new RegExp(`\\b${v.name}\\b`).test(nearCallSite),
    )
    const scoped = /tenant_id/.test(chain) || /\btenantDb\(/.test(context) || usesTenantDbVar
    // Row/entity-specific keys are globally unique (UUIDs / secret tokens), so a
    // lookup by id / *_id / *token* is inherently row-scoped, not a leak.
    const idLookup = /\.(eq|in)\('(id|[a-z_]*_id|[a-z_]*token[a-z_]*)'\s*,/.test(chain)
    if (!scoped && !idLookup) {
      flagged.push({ file, line: i + 1, table: m[1], snippet: lines[i].trim().slice(0, 110) })
    }
  }
}

if (UPDATE_BASELINE) {
  const keys = flagged.map(keyOf).sort()
  writeFileSync(BASELINE_FILE, JSON.stringify(keys, null, 2) + '\n')
  console.log(`baseline updated: ${keys.length} accepted findings written to ${BASELINE_FILE}`)
  process.exit(0)
}

const baseline = existsSync(BASELINE_FILE)
  ? new Set(JSON.parse(readFileSync(BASELINE_FILE, 'utf8')))
  : new Set()
const fresh = flagged.filter((f) => !baseline.has(keyOf(f)))

if (fresh.length === 0) {
  console.log(`✓ tenant-scope guard: no NEW unscoped queries (${flagged.length} known/baselined)`)
  process.exit(0)
}
console.error(`✗ tenant-scope guard: ${fresh.length} NEW unscoped quer${fresh.length === 1 ? 'y' : 'ies'} on tenant tables\n`)
for (const f of fresh) console.error(`  ${f.file}:${f.line}  [${f.table}]  ${f.snippet}`)
console.error('\nAdd .eq(\'tenant_id\', tenantId); or `// tenant-scope-ok: <reason>` if intentional; or `npm run audit:tenant -- --update-baseline` to accept.')
process.exit(ALL ? 0 : 1)
