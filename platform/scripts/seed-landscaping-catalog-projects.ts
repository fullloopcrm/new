/**
 * W1 catalog task (LEADER 13:12 priority override): own PROJECT-type services
 * for Tucker's Landscaping Company (tenant_id cf50c81f-f726-48e0-82a8-673f1112fbe8),
 * same service_types catalog W2 seeded 220 items into. Two parts:
 *
 * 1) RETAG: 7 of W2's existing rows are full one-off installation jobs
 *    (privacy/chain-link fence builds, French drain / dry well / catch basin /
 *    yard regrading installs) that were left at the default item_type='service'
 *    instead of 'project' -- the exact category of item this task owns. Repair/
 *    staining/maintenance siblings (Fence Repair, Fence Staining, Silt Fence,
 *    Erosion Control Matting, Downspout Extension, Sump Pump Discharge Line)
 *    correctly stay 'service' and are untouched.
 * 2) INSERT: 15 new, distinctly-named project-type items rounding out
 *    drainage, fencing, outdoor lighting, and landscape design/install --
 *    categories W2's set covers thinly. Checked against all 224 existing
 *    names first; zero collisions.
 *
 * USAGE: cd platform && npx tsx scripts/seed-landscaping-catalog-projects.ts
 */
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
if (!url || !key) { console.error('Missing Supabase env'); process.exit(1) }
const supabase = createClient(url, key, { auth: { persistSession: false } })

const TENANT_ID = 'cf50c81f-f726-48e0-82a8-673f1112fbe8'

// Full one-off installation jobs mistagged 'service' -- flip to 'project'.
// Repair/staining/maintenance siblings are intentionally excluded.
const RETAG_TO_PROJECT = [
  'Privacy Fence Installation (Wood)',
  'Privacy Fence Installation (Vinyl)',
  'Chain Link Fence Installation',
  'French Drain Installation',
  'Dry Well Installation',
  'Catch Basin Installation',
  'Yard Grading & Regrading',
]

type ItemType = 'service' | 'project' | 'product'
type PerUnit = 'hour' | 'job' | 'unit' | 'sqft' | 'linear_ft' | 'visit' | 'day' | 'custom'
// [name, description, category, item_type, per_unit, priceDollars, durationHours]
type Row = [string, string, string, ItemType, PerUnit, number, number | null]

const NEW_ROWS: Row[] = [
  // Landscape design/install -- W2's set only had 2 project rows here
  ['Full Landscape Design & Master Plan', 'Whole-property design consultation with scaled plan drawings', 'Planting & Garden Design', 'project', 'job', 2200, 4],
  ['Complete Backyard Landscape Renovation', 'Full teardown-and-rebuild of an existing backyard landscape', 'Planting & Garden Design', 'project', 'job', 9500, 8],
  ['New Construction Full Landscape Install', 'Turnkey landscape build-out for a new-construction lot', 'Planting & Garden Design', 'project', 'job', 12500, 8],
  ['Front Yard Curb Appeal Redesign & Install', 'Full front-yard bed, turf, and planting redesign', 'Planting & Garden Design', 'project', 'job', 4800, 6],

  // Outdoor lighting -- W2's set only had 1 project row here
  ['Whole-Property Landscape Lighting System Install', 'Full low-voltage lighting system across the entire property', 'Holiday & Landscape Lighting', 'project', 'job', 3200, 6],
  ['Architectural Uplighting Package (Multi-Fixture)', 'Coordinated uplighting package for facade and specimen trees', 'Holiday & Landscape Lighting', 'project', 'job', 1850, 4],
  ['Low-Voltage Pathway & Accent Lighting System', 'New path and accent lighting run with transformer and zones', 'Holiday & Landscape Lighting', 'project', 'job', 2400, 5],

  // Drainage -- W2's set had zero project rows here despite covering the category
  ['Whole-Yard Drainage System Design & Install', 'Engineered multi-point drainage system for chronic wet-yard issues', 'Drainage & Grading', 'project', 'job', 4200, 6],
  ['Underground Downspout & Drainage Overhaul', 'Full property re-route of downspouts into a buried drainage network', 'Drainage & Grading', 'project', 'job', 2600, 4],

  // Fencing -- new project-tier variants beyond the retagged existing ones
  ['Board-on-Board Privacy Fence Installation', 'Overlapping-board wood privacy fence build for zero-gap privacy', 'Outdoor Living & Structures', 'project', 'linear_ft', 36, null],
  ['Aluminum Ornamental Fence Installation', 'Powder-coated aluminum ornamental fence build', 'Outdoor Living & Structures', 'project', 'linear_ft', 42, null],
  ['PVC Picket Fence Installation', 'Low-maintenance PVC picket fence build', 'Outdoor Living & Structures', 'project', 'linear_ft', 28, null],

  // Hardscaping -- round out with additional true project-tier builds
  ['Paver Pool Deck Installation', 'Full-base paver deck build around an existing pool', 'Hardscaping', 'project', 'sqft', 26, null],
  ['Full Backyard Hardscape Package (Patio, Walkway & Wall)', 'Combined patio, connecting walkway, and low retaining wall build', 'Hardscaping', 'project', 'job', 15000, 8],
  ['Belgian Block Paver Border Install', 'Belgian block edging border set around a hardscape install', 'Hardscaping', 'project', 'linear_ft', 16, null],
]

async function main() {
  const { data: existing, error: existingErr } = await supabase
    .from('service_types')
    .select('id, name, item_type, sort_order')
    .eq('tenant_id', TENANT_ID)
    .order('sort_order', { ascending: false })
  if (existingErr) { console.error(existingErr); process.exit(1) }

  const existingNames = new Set((existing || []).map((r) => r.name))
  const dup = NEW_ROWS.filter(([name]) => existingNames.has(name))
  if (dup.length) {
    console.error('Name collision with existing catalog rows, refusing to insert:', dup.map((r) => r[0]))
    process.exit(1)
  }

  // Part 1: retag
  const toRetag = (existing || []).filter((r) => RETAG_TO_PROJECT.includes(r.name) && r.item_type !== 'project')
  const alreadyCorrect = RETAG_TO_PROJECT.filter(
    (name) => (existing || []).some((r) => r.name === name && r.item_type === 'project')
  )
  const missing = RETAG_TO_PROJECT.filter((name) => !(existing || []).some((r) => r.name === name))
  if (missing.length) {
    console.error('Expected retag targets not found in catalog:', missing)
    process.exit(1)
  }
  console.log(`Retagging ${toRetag.length} rows to item_type='project' (${alreadyCorrect.length} already correct)`)
  for (const row of toRetag) {
    const { error } = await supabase.from('service_types').update({ item_type: 'project' }).eq('id', row.id)
    if (error) { console.error('Retag failed for', row.name, error); process.exit(1) }
    console.log(`  retagged: ${row.name}`)
  }

  // Part 2: insert new project rows
  let nextSort = (existing?.[0]?.sort_order ?? 0) + 1
  const payload = NEW_ROWS.map(([name, description, category, item_type, per_unit, priceDollars, durationHours]) => ({
    tenant_id: TENANT_ID,
    name,
    description,
    category,
    item_type,
    per_unit,
    unit_label: null,
    price_cents: Math.round(priceDollars * 100),
    min_charge_cents: null,
    cost_cents: null,
    taxable: true,
    default_duration_hours: durationHours,
    active: true,
    sort_order: nextSort++,
  }))

  const { data: inserted, error: insertErr } = await supabase.from('service_types').insert(payload).select('id, item_type')
  if (insertErr) { console.error('Insert failed', insertErr); process.exit(1) }
  console.log(`Inserted ${inserted?.length ?? 0} new project rows`)
  const wrongType = (inserted || []).filter((r) => r.item_type !== 'project')
  if (wrongType.length) {
    console.error('BUG: inserted rows did not save item_type=project as expected:', wrongType)
    process.exit(1)
  }

  const { count, error: countErr } = await supabase
    .from('service_types')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID)
  if (countErr) { console.error(countErr); process.exit(1) }
  const { count: projectCount, error: projectCountErr } = await supabase
    .from('service_types')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID)
    .eq('item_type', 'project')
  if (projectCountErr) { console.error(projectCountErr); process.exit(1) }
  console.log(`Done. Tenant now has ${count} total catalog items, ${projectCount} of them item_type='project'.`)
}

main()
