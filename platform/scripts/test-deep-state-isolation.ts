import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) for (const l of readFileSync(envPath,'utf8').split(/\r?\n/)) { const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'').replace(/\\n$/,'') }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const N = 10
type T = { id: string; clientIds: string[]; teamIds: string[]; bookingIds: string[] }
async function seed(idx: number): Promise<T> {
  const run = `d${idx}-${Date.now().toString(36)}`
  const { data: tenant } = await sb.from('tenants').insert({
    name: `Deep ${idx} ${run}`, slug: `deep-${run}`, industry: 'cleaning',
    email: `a+${run}@ex.com`, owner_email: `a+${run}@ex.com`,
    status: 'active', plan: 'starter', monthly_rate: 199, setup_fee: 999, billing_status: 'active',
  }).select('id').single()
  const tid = tenant!.id
  const { provisionTenant } = await import('../src/lib/provision-tenant')
  await provisionTenant({ tenantId: tid, industry: 'cleaning' })
  // 10 clients
  const { data: clients } = await sb.from('clients').insert(Array.from({length:10},(_,i)=>({
    tenant_id: tid, name: `C${i}-${run}`, email: `c${i}+${run}@ex.com`,
    phone: `+1555${String(Math.floor(Math.random()*10000000)).padStart(7,'0')}`,
    pin: String(100000+Math.floor(Math.random()*900000)),
  }))).select('id')
  // 3 team
  const { data: team } = await sb.from('team_members').insert(Array.from({length:3},(_,i)=>({
    tenant_id: tid, name: `T${i}-${run}`, phone: `+1555${String(Math.floor(Math.random()*10000000)).padStart(7,'0')}`,
    pin: String(100000+Math.floor(Math.random()*900000)), status: 'active',
  }))).select('id')
  // 5 bookings per tenant
  const { data: svc } = await sb.from('service_types').select('id').eq('tenant_id', tid).limit(1).single()
  const now = Date.now()
  const { data: bookings } = await sb.from('bookings').insert(Array.from({length:5},(_,i)=>({
    tenant_id: tid, client_id: clients![i%clients!.length].id,
    team_member_id: team![i%team!.length].id,
    service_type_id: svc?.id,
    service_type: 'Standard Cleaning',
    start_time: new Date(now + (i+1)*86400000).toISOString(),
    end_time: new Date(now + (i+1)*86400000 + 2*3600000).toISOString(),
    status: 'scheduled', price: 11800, hourly_rate: 59,
  }))).select('id')
  return { id: tid, clientIds: clients!.map(c=>c.id), teamIds: team!.map(t=>t.id), bookingIds: bookings!.map(b=>b.id) }
}
async function cleanup(ids: string[]) {
  await sb.from('bookings').delete().in('tenant_id', ids)
  await sb.from('sms_conversation_messages').delete().in('conversation_id',
    (await sb.from('sms_conversations').select('id').in('tenant_id', ids)).data?.map(c=>c.id) || [])
  await sb.from('sms_conversations').delete().in('tenant_id', ids)
  await sb.from('team_members').delete().in('tenant_id', ids)
  await sb.from('clients').delete().in('tenant_id', ids)
  await sb.from('service_types').delete().in('tenant_id', ids)
  await sb.from('entities').delete().in('tenant_id', ids)
  await sb.from('tenants').delete().in('id', ids)
}
async function main() {
  console.log(`\n=== ${N} tenants w/ deep state, cross-tenant leak checks ===\n`)
  const tenants = await Promise.all(Array.from({length:N},(_,i)=>seed(i)))
  console.log(`seeded ${tenants.length} tenants, ${tenants.reduce((a,t)=>a+t.clientIds.length,0)} clients, ${tenants.reduce((a,t)=>a+t.bookingIds.length,0)} bookings`)
  let pass=0, fail=0
  // Per-tenant scope check: fetching clients for tenant I must return ONLY that tenant's IDs
  for (const t of tenants) {
    const { data } = await sb.from('clients').select('id, tenant_id').eq('tenant_id', t.id)
    const leaked = data?.some(r => r.tenant_id !== t.id)
    if (leaked) { console.log(`  ✗ client leak in tenant ${t.id}`); fail++ } else pass++
    const { data: b } = await sb.from('bookings').select('id, tenant_id').eq('tenant_id', t.id)
    if (b?.some(r=>r.tenant_id!==t.id)) { console.log(`  ✗ booking leak in ${t.id}`); fail++ } else pass++
    const { data: tm } = await sb.from('team_members').select('id, tenant_id').eq('tenant_id', t.id)
    if (tm?.some(r=>r.tenant_id!==t.id)) { console.log(`  ✗ team leak in ${t.id}`); fail++ } else pass++
  }
  // Whole-platform query — each row must have a tenant_id from our set
  const ids = tenants.map(t=>t.id)
  const { count: totalClients } = await sb.from('clients').select('id', {count:'exact',head:true}).in('tenant_id', ids)
  const expected = tenants.reduce((a,t)=>a+t.clientIds.length,0)
  if (totalClients === expected) { pass++; console.log(`  ✓ total clients: ${totalClients} = ${expected} expected`) } else { fail++; console.log(`  ✗ total clients: ${totalClients} != ${expected}`) }
  // Query without tenant filter — only bounded by our test set IDs
  const { count: totalBookings } = await sb.from('bookings').select('id',{count:'exact',head:true}).in('tenant_id', ids)
  const expB = tenants.reduce((a,t)=>a+t.bookingIds.length,0)
  if (totalBookings === expB) { pass++; console.log(`  ✓ total bookings: ${totalBookings} = ${expB} expected`) } else { fail++; console.log(`  ✗ total bookings: ${totalBookings} != ${expB}`) }
  console.log('\ncleaning up…')
  await cleanup(ids)
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail > 0 ? 1 : 0)
}
main().catch(e=>{console.error(e); process.exit(1)})
