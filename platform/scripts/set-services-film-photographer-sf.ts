#!/usr/bin/env tsx
/**
 * Replace the AI-tailored placeholder services on The Film Photographer of
 * San Francisco with the real 10-service vintage-film-B&W list Jeff approved.
 */
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') })

const TENANT_ID = '4bc42098-5b4c-435e-8dbf-90d88d18616a'

const SERVICES = [
  { name: 'Black & White Portrait Session', description: 'One-on-one black-and-white portraits, shot on film, in the spirit of the 1970s and 80s.', hours: 1.5, price: 35000 },
  { name: 'Black & White Headshot Session', description: 'Professional headshots in classic black-and-white film style.', hours: 1, price: 25000 },
  { name: 'Black & White Landscape Photography', description: 'Landscape work shot and printed in black-and-white film.', hours: 2, price: 30000 },
  { name: 'Couples & Engagement Session', description: 'Black-and-white film portraits built around real relationships.', hours: 1.5, price: 45000 },
  { name: 'Family Portrait Session', description: 'Black-and-white family portraits, shot on film.', hours: 2, price: 40000 },
  { name: 'Wedding Photography', description: 'Full black-and-white film wedding-day coverage.', hours: 8, price: 250000 },
  { name: 'Senior Portrait Session', description: 'Black-and-white film senior portraits.', hours: 1.5, price: 30000 },
  { name: 'Analog Film Photography Session', description: 'True analog film — not a digital filter made to look like one.', hours: 2, price: 40000 },
  { name: 'Fine Art Darkroom Prints', description: 'Hand-printed black-and-white darkroom prints from your session or your own negatives.', hours: 0, price: 15000, startingPrice: true },
  { name: 'Studio Session with Vintage Backdrops & Props', description: 'Studio black-and-white session with period-correct 70s/80s backdrops and props.', hours: 2, price: 35000 },
]

async function main() {
  const { supabaseAdmin } = await import('../src/lib/supabase')

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('service_types')
    .select('id')
    .eq('tenant_id', TENANT_ID)
  if (fetchErr) throw new Error(fetchErr.message)

  if (existing && existing.length > 0) {
    const { error: delErr } = await supabaseAdmin
      .from('service_types')
      .delete()
      .eq('tenant_id', TENANT_ID)
    if (delErr) throw new Error(delErr.message)
    console.log(`Deleted ${existing.length} placeholder service(s).`)
  }

  const rows = SERVICES.map((s, i) => ({
    tenant_id: TENANT_ID,
    name: s.name,
    description: s.description,
    default_duration_hours: s.hours,
    default_hourly_rate: s.hours > 0 ? Math.round(s.price / s.hours / 100) : null,
    sort_order: i + 1,
    active: true,
    mode: 'booking',
    pricing_model: 'flat',
    price_cents: s.price,
    price_is_starting: !!s.startingPrice,
    item_type: 'service',
    taxable: true,
  }))

  const { data, error } = await supabaseAdmin.from('service_types').insert(rows).select('id,name,price_cents')
  if (error) throw new Error(error.message)
  console.log(`Inserted ${data?.length} service(s):`)
  for (const r of data || []) console.log(`  ${r.name} — $${(r.price_cents / 100).toFixed(0)}`)
}

main().catch((err) => {
  console.error('ERROR:', err)
  process.exit(1)
})
