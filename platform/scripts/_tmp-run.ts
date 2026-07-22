import { tenantDb } from '../src/lib/tenant-db'

async function main() {
  const jobId = '5d2da236-3828-4399-ad67-840d94ea967e'
  let query = tenantDb('cf50c81f-f726-48e0-82a8-673f1112fbe8').from('booking_notes').select('*').order('created_at', { ascending: true })
  query = query.eq('job_id', jobId).is('booking_id', null)
  const { data, error } = await query
  console.log('error:', error)
  console.log('data length:', data?.length)
  console.log('data:', JSON.stringify(data))
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
