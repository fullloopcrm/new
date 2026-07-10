/** Sweep ALL leftover sim-* test tenants + children from prod. Safe: only slug LIKE 'sim-%'. */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const CHILD = ['quote_activity', 'quotes', 'job_events', 'job_payments', 'bookings', 'jobs', 'clients', 'service_types', 'entities', 'tenant_invites']
async function delRetry(tbl: string, tenantId: string, tries = 4): Promise<string | null> {
  for (let i = 0; i < tries; i++) { const { error } = await s.from(tbl).delete().eq('tenant_id', tenantId); if (!error) return null; if (i === tries - 1) return error.message }
  return null
}
async function main() {
  const { data: tenants } = await s.from('tenants').select('id, slug').like('slug', 'sim-%')
  console.log(`found ${tenants?.length || 0} sim-* tenants`)
  let purged = 0; const stuck: string[] = []
  for (const t of tenants || []) {
    let ok = true
    for (const tbl of CHILD) { const e = await delRetry(tbl, t.id); if (e) { ok = false; console.log(`  ${t.slug} ${tbl}: ${e}`) } }
    const { error } = await s.from('tenants').delete().eq('id', t.id)
    if (error) { ok = false; console.log(`  ${t.slug} tenants: ${error.message}`) }
    if (ok) purged++; else stuck.push(t.slug)
  }
  const { data: prospects } = await s.from('prospects').select('id').like('business_name', 'SIM %')
  if (prospects?.length) { await s.from('prospects').delete().like('business_name', 'SIM %'); console.log(`purged ${prospects.length} sim prospects`) }
  console.log(`\npurged ${purged} tenants; stuck: ${stuck.join(', ') || 'none'}`)
}
main().catch(e => { console.error(e); process.exit(1) })
