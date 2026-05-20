import { createClient } from '@supabase/supabase-js'
const url = 'https://ioppmvchszymwswtwsze.supabase.co'
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await supabase.from('tenants').select('id, slug, name, industry, status, domain, created_at').order('created_at', { ascending: true })
if (error) { console.error('ERROR:', error.message); process.exit(1) }
console.log('TOTAL:', data.length)
console.log('')
for (const t of data) {
  const id = String(t.id).slice(0,8)
  const slug = (t.slug || '').padEnd(35)
  const name = (t.name || '').padEnd(32)
  const ind = (t.industry || '').padEnd(12)
  const st = (t.status || '').padEnd(8)
  const dom = (t.domain || '')
  const dt = (t.created_at || '').slice(0, 10)
  console.log(`${id} | ${slug} | ${name} | ${ind} | ${st} | ${dom.padEnd(28)} | ${dt}`)
}
