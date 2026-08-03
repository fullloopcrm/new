/**
 * One-time data correction for the 2026-08-03 property/client geocode-drift
 * incident (Shelby Rodriguez + 9 other confirmed nycmaid clients — see
 * memory fullloop_property_geocode_mismatch_2026_08_03).
 *
 * Each `client_properties` row below is marked is_primary=true (actively
 * driving real dispatch) but its lat/lng was confirmed >50mi from that same
 * client's own (trusted) clients.latitude/longitude, for what is the same
 * physical address in every case but one (Jenni, handled separately below).
 *
 *   npx tsx --env-file=.env.local scripts/fix-property-geocode-drift-2026-08-03.ts
 */
import { supabaseAdmin } from '../src/lib/supabase'
import { logPropertyChange, deactivateProperty } from '../src/lib/client-properties'

const ACTOR = { changedBy: 'admin' as const, source: 'admin' as const }

// clientId -> propertyId: same address as the client's own record, property's
// geocode was bad. Fix = copy the client's own (verified plausible NYC-metro)
// coords onto the property.
const COPY_CLIENT_COORDS: { clientId: string; propertyId: string; label: string }[] = [
  { clientId: '49726962-e88e-43dc-8f7c-456d7e1f233e', propertyId: 'a6dee8fb-eea5-46fa-b2e1-354d2c1faa1c', label: 'Shelby Rodriguez' },
  { clientId: 'fb7e177f-426a-4e9c-8434-5ef976374b37', propertyId: '6ae1a25b-a66e-4c78-a4ad-ef79e7277d4b', label: 'Michelle Carrieri' },
  { clientId: '36c316b6-9d41-4e5c-8041-bc9dde9ccbb9', propertyId: '9de2ae2e-4ab1-4283-9bda-ae4b02a4dcd2', label: 'Endrit Jonuzi' },
  { clientId: '5906ed5c-50df-4a65-a367-114ca1335f8d', propertyId: '84213cc2-6fc0-48ed-b3b9-6c6ab0b8441c', label: 'Kajal' },
  { clientId: '79ea5225-1549-43d7-b7c7-920d4b730b45', propertyId: '7b35de14-a63f-4bc3-97e3-33e0dff80a66', label: 'Rene' },
  { clientId: 'e132d11c-4e44-4b5e-8a8e-2fa8d594aff7', propertyId: '9454ba87-522a-44ed-a4ba-507e745c3a65', label: 'Elizabeth Keys' },
  { clientId: '150eefac-fb3b-4deb-accd-eb01ab1d11dd', propertyId: '8d3e1b79-c833-4da9-b3f3-587cd49b6714', label: 'George Quinn' },
  { clientId: 'c43a4587-77ad-480f-a925-e6d661721839', propertyId: '912cea61-da5d-4c2f-8aac-bb0abffd85d7', label: 'Ashley Wong' },
]

async function fixByCopyingClientCoords() {
  for (const { clientId, propertyId, label } of COPY_CLIENT_COORDS) {
    const { data: client } = await supabaseAdmin.from('clients').select('latitude, longitude').eq('id', clientId).single()
    if (!client?.latitude || !client?.longitude) { console.error(`SKIP ${label}: client has no coords`); continue }
    const { data: before } = await supabaseAdmin.from('client_properties').select('latitude, longitude').eq('id', propertyId).single()
    const { error } = await supabaseAdmin
      .from('client_properties')
      .update({ latitude: client.latitude, longitude: client.longitude })
      .eq('id', propertyId)
      .eq('client_id', clientId)
    if (error) { console.error(`FAILED ${label}:`, error.message); continue }
    await logPropertyChange({
      clientId, propertyId, action: 'edit',
      oldValue: { latitude: before?.latitude, longitude: before?.longitude },
      newValue: { latitude: client.latitude, longitude: client.longitude, reason: '2026-08-03 geocode-drift incident fix' },
      actor: ACTOR,
    })
    console.log(`Fixed ${label}: property coords -> ${client.latitude}, ${client.longitude}`)
  }
}

// Micherre Fox: the client's OWN clients.latitude/longitude was also a bad
// geocode ("110 Bedford Street" with no city/state matched Bedford, VA
// instead of Bedford St, Manhattan). Both her client row and her property
// row get the freshly-verified, qualified geocode.
async function fixMicherreFox() {
  const clientId = '9f6fb94c-33da-4654-b8a8-a155e5bc7fbb'
  const propertyId = '361cf594-518e-4895-8c2f-9bb239dbb5b6'
  const correct = { latitude: 40.732579967049, longitude: -74.005459395138 } // verified via US Census geocoder against "110 Bedford Street, New York, NY"

  const { data: beforeClient } = await supabaseAdmin.from('clients').select('latitude, longitude').eq('id', clientId).single()
  const { error: clientErr } = await supabaseAdmin.from('clients').update(correct).eq('id', clientId)
  if (clientErr) { console.error('FAILED Micherre Fox client update:', clientErr.message); return }

  const { data: beforeProp } = await supabaseAdmin.from('client_properties').select('latitude, longitude').eq('id', propertyId).single()
  const { error: propErr } = await supabaseAdmin
    .from('client_properties')
    .update(correct)
    .eq('id', propertyId)
    .eq('client_id', clientId)
  if (propErr) { console.error('FAILED Micherre Fox property update:', propErr.message); return }

  await logPropertyChange({
    clientId, propertyId, action: 'edit',
    oldValue: { client: beforeClient, property: beforeProp },
    newValue: { ...correct, reason: '2026-08-03 geocode-drift incident fix — both client and property were bad, re-geocoded fresh' },
    actor: ACTOR,
  })
  console.log(`Fixed Micherre Fox: client + property coords -> ${correct.latitude}, ${correct.longitude}`)
}

// Jenni: has TWO properties both flagged is_primary=true from the 2026-06-22
// backfill — one real ("4323 42nd St, Sunnyside", correct, matches her
// client record) and one bogus test-seed data ("123 Test St, New York, NY").
// Fix = deactivate the bogus one so it can never be picked up as primary
// again. The real Sunnyside property stays primary and untouched.
async function fixJenni() {
  const clientId = '11d09856-ad35-48d3-b832-8c02abac277c'
  const bogusPropertyId = '6e6267ad-8a2e-4e36-a523-d7273847bea0'
  await deactivateProperty(clientId, bogusPropertyId, ACTOR) // clears active + is_primary in one call
  console.log('Fixed Jenni: deactivated bogus "123 Test St" property, Sunnyside property remains sole primary')
}

async function main() {
  await fixByCopyingClientCoords()
  await fixMicherreFox()
  await fixJenni()
}

main().catch((err) => { console.error(err); process.exit(1) })
