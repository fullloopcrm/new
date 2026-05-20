// One-shot: delete test tenants, import 20 real builds from nycmaid Supabase
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const NYCMAID_URL = process.env.NYCMAID_SUPABASE_URL
const NYCMAID_KEY = process.env.NYCMAID_SERVICE_ROLE_KEY
const FULLLOOP_CONN = process.env.FULLLOOP_DB_URL

if (!NYCMAID_URL || !NYCMAID_KEY || !FULLLOOP_CONN) {
  console.error('Missing env: NYCMAID_SUPABASE_URL, NYCMAID_SERVICE_ROLE_KEY, FULLLOOP_DB_URL')
  process.exit(1)
}

const src = createClient(NYCMAID_URL, NYCMAID_KEY, { auth: { persistSession: false } })

// 1) Pull 20 real builds from nycmaid Supabase tenants table
const { data: realBuilds, error } = await src.from('tenants').select('*').order('created_at', { ascending: true })
if (error) { console.error('SRC ERROR:', error.message); process.exit(1) }
console.log(`Source rows: ${realBuilds.length}`)

// 2) Connect to fullloop DB
const client = new pg.Client({ connectionString: FULLLOOP_CONN })
await client.connect()

// Get fullloop tenants columns (intersect with source row keys)
const { rows: colRows } = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='tenants'
`)
const fullloopCols = new Set(colRows.map(r => r.column_name))

// Existing fullloop tenant slugs/ids so we don't duplicate
const { rows: existingRows } = await client.query(`SELECT id, slug FROM tenants`)
const existingIds = new Set(existingRows.map(r => r.id))
const existingSlugs = new Set(existingRows.map(r => r.slug))

await client.query('BEGIN')
try {
  // 3) Delete tests (matches "(Test N)" or exact 'tesy565666')
  const del = await client.query(`
    DELETE FROM tenants
    WHERE name ~ '\\(Test [0-9]+\\)' OR name = 'tesy565666'
    RETURNING id
  `)
  console.log(`Deleted ${del.rowCount} test tenants (cascades to child tables)`)

  // 4) Insert real builds
  let inserted = 0, skipped = 0
  for (const row of realBuilds) {
    if (existingIds.has(row.id) || existingSlugs.has(row.slug)) {
      console.log(`  skip (exists): ${row.slug}`)
      skipped++
      continue
    }
    const cols = Object.keys(row).filter(k => fullloopCols.has(k))
    const vals = cols.map(k => row[k])
    const placeholders = cols.map((_, i) => `$${i+1}`).join(', ')
    const sql = `INSERT INTO tenants (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`
    await client.query(sql, vals)
    inserted++
    console.log(`  + ${row.slug}`)
  }
  console.log(`Inserted ${inserted}, skipped ${skipped}`)

  // 5) Final count
  const { rows: countRows } = await client.query(`SELECT count(*)::int AS n FROM tenants`)
  console.log(`Final tenant count: ${countRows[0].n}`)

  await client.query('COMMIT')
  console.log('COMMITTED')
} catch (e) {
  await client.query('ROLLBACK')
  console.error('ROLLBACK -', e.message)
  process.exit(2)
} finally {
  await client.end()
}
