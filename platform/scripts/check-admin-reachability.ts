/**
 * Checks the REAL admin-email resolution path (tenant_members role
 * owner/admin -> tenants.email fallback -> ADMIN_EMAIL env) for tenants
 * flagged by verify-comms-gate.ts as missing tenants.owner_email, since
 * that column is NOT what emailAdmins()/getAdminContacts() actually reads.
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

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const slugs = ['nycmaid', 'the-nyc-exterminator', 'the-florida-maid']
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, email, phone, owner_email')
    .in('slug', slugs)

  for (const t of tenants || []) {
    console.log(`\n=== ${t.name} (${t.slug}) ===`)
    console.log(`  tenants.owner_email: ${t.owner_email || 'null'}`)
    console.log(`  tenants.email:       ${t.email || 'null'}`)

    const { data: members, error } = await supabase
      .from('tenant_members')
      .select('email, role, name')
      .eq('tenant_id', t.id)
      .in('role', ['owner', 'admin'])

    if (error) console.log(`  tenant_members query error: ${error.message}`)
    if (!members || members.length === 0) {
      console.log(`  tenant_members: NONE — falls through to tenants.email, then ADMIN_EMAIL env`)
    } else {
      for (const m of members) {
        console.log(`  tenant_members: role=${m.role} email=${m.email || 'MISSING'} name=${m.name || '—'}`)
      }
    }

    const reachable = (members || []).some(m => m.email) || !!t.email || !!process.env.ADMIN_EMAIL
    console.log(`  ACTUAL admin email reachable: ${reachable ? 'YES' : 'NO — every owner_new_lead/booking/application email for this tenant is a dead send'}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
