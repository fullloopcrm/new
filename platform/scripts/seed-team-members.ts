/**
 * Seed one default team member per test tenant so checkAvailability actually
 * returns open slots (was returning empty because no team existed).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const NAMES = ['Maria', 'Carlos', 'Jessica', 'Ahmed', 'Lena', 'Jamal', 'Priya', 'Tony']

async function main() {
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name')
    .like('slug', 'test-%')

  if (!tenants?.length) { console.error('No test tenants'); process.exit(1) }

  let created = 0
  for (let i = 0; i < tenants.length; i++) {
    const t = tenants[i]
    const { count } = await supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id)
    if ((count || 0) > 0) continue
    const name = `${NAMES[i % NAMES.length]} Test${i + 1}`
    await supabase.from('team_members').insert({
      tenant_id: t.id,
      name,
      email: `team${i + 1}@example.test`,
      phone: `555010${String(i).padStart(4, '0')}`,
      status: 'active',
      notes: JSON.stringify({ availability: { working_days: [1, 2, 3, 4, 5, 6], blocked_dates: [] } }),
    })
    created++
    process.stdout.write(`\r  [${i + 1}/${tenants.length}] seeded ${name} for ${t.name}`)
  }
  console.log(`\n[team-seed] created ${created} team members`)
}

main().catch(err => { console.error(err); process.exit(1) })
