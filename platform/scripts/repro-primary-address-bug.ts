/**
 * Diagnostic: create a throwaway test client, add several addresses via the
 * REAL addProperty()/updateProperty() functions against production Supabase,
 * print is_primary after each step, then delete the test client + properties.
 *
 *   npx tsx --env-file=.env.local scripts/repro-primary-address-bug.ts
 */
import { supabaseAdmin } from '../src/lib/supabase'
import { addProperty, listProperties, updateProperty } from '../src/lib/client-properties'

const NYCMAID_TENANT = '00000000-0000-0000-0000-000000000001'

async function main() {
  const { data: client, error: cErr } = await supabaseAdmin
    .from('clients')
    .insert({ tenant_id: NYCMAID_TENANT, name: 'ZZTEST-DO-NOT-USE primary-bug-repro', phone: '+15550001111', email: 'zztest-repro@example.com', active: true })
    .select('id')
    .single()
  if (cErr || !client) { console.error('Failed to create test client:', cErr?.message); process.exit(1) }
  const clientId = client.id as string
  console.log('Created test client:', clientId)

  try {
    console.log('\n--- add address 1 (547 W 47th St) ---')
    await addProperty(clientId, '547 W 47th St, Apt 401', { actor: { changedBy: 'admin', source: 'admin' } })
    console.log(JSON.stringify(await listProperties(clientId), null, 2))

    console.log('\n--- add address 2 (123 Test Ave) ---')
    await addProperty(clientId, '123 Test Ave', { actor: { changedBy: 'admin', source: 'admin' } })
    console.log(JSON.stringify(await listProperties(clientId), null, 2))

    console.log('\n--- add address 3 (456 Another St) ---')
    await addProperty(clientId, '456 Another St', { actor: { changedBy: 'admin', source: 'admin' } })
    console.log(JSON.stringify(await listProperties(clientId), null, 2))

    console.log('\n--- edit address 2 text (should not touch primary) ---')
    const props = await listProperties(clientId)
    const addr2 = props.find((p: { address: string }) => p.address.includes('123 Test Ave'))
    if (addr2) {
      await updateProperty(clientId, addr2.id, { address: '123 Test Ave Updated' }, { changedBy: 'admin', source: 'admin' })
    }
    console.log(JSON.stringify(await listProperties(clientId), null, 2))
  } finally {
    console.log('\n--- cleaning up test client ---')
    await supabaseAdmin.from('client_properties').delete().eq('client_id', clientId)
    await supabaseAdmin.from('property_changes').delete().eq('client_id', clientId)
    await supabaseAdmin.from('clients').delete().eq('id', clientId)
    console.log('Deleted test client and its properties.')
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
