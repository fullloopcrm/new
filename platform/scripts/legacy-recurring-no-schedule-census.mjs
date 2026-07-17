// READ-ONLY census script — checks whether any live tenant still has
// schedule_id-less recurring bookings (recurring_type set, schedule_id null,
// status scheduled). Informs whether the batch-update recurring_type
// allowlist gap (NOTICED #1, w2-batch-update-service-type-gap-plus-archetype-depth)
// is worth fixing or is dead legacy surface. No writes, no DDL.
//
// Run from platform/: node scripts/legacy-recurring-no-schedule-census.mjs

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

const { count: totalRecurring, error: e1 } = await supabase
  .from('bookings')
  .select('*', { count: 'exact', head: true })
  .not('recurring_type', 'is', null);
if (e1) { console.error('totalRecurring query error:', e1.message); process.exit(1); }

const { count: legacyNoSchedule, error: e2 } = await supabase
  .from('bookings')
  .select('*', { count: 'exact', head: true })
  .not('recurring_type', 'is', null)
  .is('schedule_id', null)
  .eq('status', 'scheduled');
if (e2) { console.error('legacyNoSchedule query error:', e2.message); process.exit(1); }

const { count: legacyNoScheduleAnyStatus, error: e3 } = await supabase
  .from('bookings')
  .select('*', { count: 'exact', head: true })
  .not('recurring_type', 'is', null)
  .is('schedule_id', null);
if (e3) { console.error('legacyNoScheduleAnyStatus query error:', e3.message); process.exit(1); }

console.log(`Total bookings with recurring_type set: ${totalRecurring}`);
console.log(`  ...schedule_id NULL, status=scheduled (live legacy-pattern series): ${legacyNoSchedule}`);
console.log(`  ...schedule_id NULL, any status (incl. completed/cancelled history): ${legacyNoScheduleAnyStatus}`);

if (legacyNoSchedule > 0) {
  const { data: sample } = await supabase
    .from('bookings')
    .select('id, tenant_id, client_id, recurring_type, start_time, status')
    .not('recurring_type', 'is', null)
    .is('schedule_id', null)
    .eq('status', 'scheduled')
    .order('start_time', { ascending: true })
    .limit(5);
  console.log('Sample rows:', JSON.stringify(sample, null, 2));
}
