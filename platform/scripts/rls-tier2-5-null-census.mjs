// READ-ONLY census script — counts NULL tenant_id rows for Tier 2-5's 50 tables
// (deploy-prep/rls-gap-closure.sql on p1-w5). No writes, no DDL. Uses service_role
// key (bypasses RLS) purely to COUNT rows via PostgREST head requests.
//
// Run from platform/: node scripts/rls-tier2-5-null-census.mjs
// Results (as of 2026-07-15) are written up in deploy-prep/rls-tier2-5-readiness.md.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const platformDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function loadEnvLocal(p) {
  const text = readFileSync(p, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[m[1]] = val;
  }
  return env;
}

const env = loadEnvLocal(path.join(platformDir, '.env.local'));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const TIERS = {
  'Tier 2 — Finance / bookkeeping': [
    'invoice_activity', 'quotes', 'quote_activity', 'quote_templates',
    'journal_entries', 'journal_lines', 'chart_of_accounts', 'accounting_periods',
    'entities', 'bank_import_batches', 'categorization_patterns',
    'recurring_expenses', 'products', 'cpa_access_tokens',
  ],
  'Tier 3 — Documents (e-sign) + Jobs / projects': [
    'document_signers', 'document_fields', 'document_activity',
    'jobs', 'job_events', 'job_payments', 'projects',
  ],
  'Tier 4 — Core client / ops': [
    'booking_cleaners', 'booking_notes', 'cleaners', 'cleaner_payouts', 'crews',
    'recurring_schedules', 'schedule_issues', 'routes', 'notifications',
    'settings', 'tenant_settings', 'tenant_invites', 'member_pin_reset_codes',
    'oauth_state_nonces',
  ],
  'Tier 5 — Messaging + sales/applications + logs': [
    'outreach_log', 'yinez_memory', 'yinez_skills', 'team_notifications',
    'management_applications', 'management_application_drafts',
    'sales_applications', 'team_applications', 'referrers',
    'client_referral_stats', 'campaigns', 'reviews', 'google_reviews',
    'audit_log', 'error_logs',
  ],
};

async function countRows(table, filterNull) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filterNull) q = q.is('tenant_id', null);
  const { count, error } = await q;
  if (error) return { error: error.message };
  return { count };
}

async function main() {
  const results = [];
  for (const [tier, tables] of Object.entries(TIERS)) {
    for (const table of tables) {
      const [total, nulls] = await Promise.all([
        countRows(table, false),
        countRows(table, true),
      ]);
      results.push({ tier, table, total, nulls });
      const line = nulls.error
        ? `${table}: ERROR — ${nulls.error}`
        : `${table}: total=${total.count ?? '?'} null_tenant_id=${nulls.count}`;
      console.log(line);
    }
  }
  console.log('\n--- JSON ---');
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
