#!/usr/bin/env tsx
/**
 * One-off: create + activate The Film Photographer of San Francisco tenant.
 * Mirrors POST /api/admin/businesses (insert) + the Activate button
 * (activateTenant) exactly — same lib functions the live app uses.
 */
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') })

async function main() {
  // Dynamic imports, run AFTER loadEnv() above — static imports get hoisted
  // above top-level code in ESM, so src/lib/supabase.ts would otherwise
  // evaluate (and freeze its client) before dotenv populates process.env.
  const { supabaseAdmin } = await import('../src/lib/supabase')
  const { activateTenant } = await import('../src/lib/activate-tenant')

  const name = 'The Film Photographer of San Francisco'
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const { data: existing } = await supabaseAdmin.from('tenants').select('id').eq('slug', slug).maybeSingle()
  if (existing) {
    console.log(`Tenant already exists: id=${existing.id} slug=${slug} — activating only.`)
    const result = await activateTenant(existing.id)
    console.log(JSON.stringify(result, null, 2))
    return
  }

  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .insert({
      name,
      slug,
      industry: 'general',
      zip_code: '94105',
      team_size: 'solo',
      status: 'setup',
      owner_name: 'Jeff Tucker',
      owner_email: 'smile@filmphotographersanfrancisco.com',
      owner_phone: '(415) 573-3456',
      // tenants.domain is write-frozen by a DB trigger (P0001) — domain_name +
      // tenant_domains is the real path now; activateTenant's domain-routing
      // step reads tenant.domain_name and upserts tenant_domains itself.
      domain_name: 'filmphotographersanfrancisco.com',
      website_url: 'https://filmphotographersanfrancisco.com',
      phone: '(415) 573-3456',
      email: 'smile@filmphotographersanfrancisco.com',
      address: '415 Mission St, San Francisco, CA 94105',
      // Explicit SF center + 50mi radius per Jeff, rather than relying on
      // geocoding the street address (activateTenant would auto-geocode from
      // `address` only if these are left unset).
      service_area_lat: 37.7749,
      service_area_lng: -122.4194,
      service_radius_miles: 50,
    })
    .select()
    .single()

  if (error || !tenant) {
    console.error('Tenant insert failed:', error?.message)
    process.exit(1)
  }
  console.log(`Tenant created: id=${tenant.id} slug=${tenant.slug}`)

  const result = await activateTenant(tenant.id)
  console.log(JSON.stringify(result, null, 2))
}

main().catch((err) => {
  console.error('ERROR:', err)
  process.exit(1)
})
