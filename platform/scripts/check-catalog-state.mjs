import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').replace(/\\n$/, '')
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(url, key, { auth: { persistSession: false } })
const TENANT_ID = 'cf50c81f-f726-48e0-82a8-673f1112fbe8'

const { data, error } = await supabase
  .from('service_types')
  .select('name, category, item_type, sort_order')
  .eq('tenant_id', TENANT_ID)
  .order('sort_order', { ascending: false })
if (error) { console.error(error); process.exit(1) }
console.log('Total rows:', data.length)
const byType = {}
for (const r of data) byType[r.item_type] = (byType[r.item_type] || 0) + 1
console.log('By item_type:', byType)
console.log('Max sort_order:', data[0]?.sort_order)
const projectRows = data.filter((r) => r.item_type === 'project')
console.log('Project rows count:', projectRows.length)
console.log(projectRows.map((r) => `${r.category} | ${r.name}`).join('\n'))
console.log('---all names (for dedup)---')
console.log(data.map((r) => r.name).join('\n'))
