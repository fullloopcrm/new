#!/usr/bin/env node
/**
 * One-time promotion: W2's sim-built "Tucker's Landscaping Company" tenant
 * (20 real-shaped clients, 5 team members, 272 service-history bookings,
 * already reported "cleaned up on exit" by W2 but never actually deleted)
 * needs to PERSIST for Jeff's live dashboard per 13:20 LEADER->W3.
 *
 * sim-cleanup.ts sweeps any tenant with slug LIKE 'sim-%'. This tenant's
 * slug still carries that prefix, so it would be destroyed the next time
 * anyone runs that sweep. This script strips the sim- prefix/suffix from
 * slug and name ONLY — no other rows touched, no data regenerated.
 *
 *   node scripts/promote-tucker-landscaping-tenant.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const envPath = new URL('../.env.local', import.meta.url)
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const TENANT_ID = 'cf50c81f-f726-48e0-82a8-673f1112fbe8'
const NEW_SLUG = 'tuckers-landscaping-company'
const NEW_NAME = "Tucker's Landscaping Company"

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data: before, error: fetchErr } = await s.from('tenants').select('id, slug, name').eq('id', TENANT_ID).single()
  if (fetchErr || !before) { console.error('tenant not found:', fetchErr?.message); process.exit(1) }
  if (!before.slug.startsWith('sim-')) { console.log('already promoted, slug:', before.slug); process.exit(0) }

  const { data: collision } = await s.from('tenants').select('id').eq('slug', NEW_SLUG)
  if (collision?.length) { console.error('slug collision, aborting:', NEW_SLUG); process.exit(1) }

  const { data: after, error } = await s.from('tenants').update({ slug: NEW_SLUG, name: NEW_NAME }).eq('id', TENANT_ID).select('id, slug, name').single()
  if (error) { console.error('update failed:', error.message); process.exit(1) }

  console.log('promoted:', JSON.stringify({ before, after }, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
