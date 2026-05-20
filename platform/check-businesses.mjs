import { createClient } from '@supabase/supabase-js'
const url = 'https://ioppmvchszymwswtwsze.supabase.co'
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Check tenants by status (including non-active)
const { data: byStatus } = await supabase.from('tenants').select('status').order('status')
const statusCounts = {}
for (const r of (byStatus || [])) statusCounts[r.status || 'null'] = (statusCounts[r.status || 'null'] || 0) + 1
console.log('TENANTS by status:', statusCounts)

// Try common tables that may also hold business records
for (const tbl of ['businesses', 'business_management', 'admin_businesses', 'site_configs', 'sites', 'admin_tenants']) {
  const { data, error } = await supabase.from(tbl).select('*').limit(2)
  if (error) console.log(`${tbl}: ${error.code === '42P01' ? 'no table' : error.message}`)
  else console.log(`${tbl}: EXISTS — sample`, data)
}
