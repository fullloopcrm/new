/**
 * Backfill: update the 100 test tenants' selena_config.checklist_fields so
 * Selena asks industry-appropriate questions (no more "bedrooms" for HVAC).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

type Industry = 'cleaning' | 'landscaping' | 'hvac' | 'plumbing' | 'handyman' | 'electrical' | 'pest' | 'general'

const CHECKLIST_BY_INDUSTRY: Record<Industry, Array<{ key: string; enabled: boolean; required: boolean; question: string; sms_options: string }>> = {
  cleaning: [
    { key: 'service_type', enabled: true, required: true, question: 'Ask what type of clean they need.', sms_options: 'Standard,Deep,Move in/out' },
    { key: 'bedrooms', enabled: true, required: true, question: 'Ask how many bedrooms and bathrooms.', sms_options: '1bd/1ba,2bd/1ba,3bd/2ba' },
    { key: 'rate', enabled: true, required: true, question: 'Give pricing and ask which rate.', sms_options: '' },
    { key: 'day', enabled: true, required: true, question: 'Ask what day works.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
    { key: 'time', enabled: true, required: true, question: 'Ask what time works.', sms_options: '8am,10am,12pm,2pm,4pm' },
    { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
    { key: 'phone', enabled: true, required: true, question: 'Ask for phone.', sms_options: '' },
    { key: 'address', enabled: true, required: true, question: 'Ask for address.', sms_options: '' },
    { key: 'email', enabled: true, required: true, question: 'Ask for email.', sms_options: '' },
    { key: 'notes', enabled: true, required: false, question: 'Ask about special requests, pets, access.', sms_options: '' },
  ],
  hvac: [
    { key: 'service_type', enabled: true, required: true, question: 'Ask what kind of HVAC service — tune-up, repair, install, or duct cleaning.', sms_options: 'Tune-up,Repair,Install,Duct clean' },
    { key: 'notes', enabled: true, required: true, question: 'Ask what the issue is and what system they have (central AC, boiler, mini-split, heat pump).', sms_options: '' },
    { key: 'rate', enabled: true, required: true, question: 'Quote the service call fee.', sms_options: '' },
    { key: 'day', enabled: true, required: true, question: 'Ask what day works.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
    { key: 'time', enabled: true, required: true, question: 'Ask what time works.', sms_options: '' },
    { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
    { key: 'phone', enabled: true, required: true, question: 'Ask for phone.', sms_options: '' },
    { key: 'address', enabled: true, required: true, question: 'Ask for address.', sms_options: '' },
    { key: 'email', enabled: true, required: true, question: 'Ask for email.', sms_options: '' },
  ],
  plumbing: [
    { key: 'service_type', enabled: true, required: true, question: 'Ask what kind of plumbing — repair, drain, install, or emergency.', sms_options: 'Service call,Drain,Install,Emergency' },
    { key: 'notes', enabled: true, required: true, question: 'Ask what the issue is — leak, no hot water, clogged drain, burst pipe — and where in the home.', sms_options: '' },
    { key: 'rate', enabled: true, required: true, question: 'Quote service call fee.', sms_options: '' },
    { key: 'day', enabled: true, required: true, question: 'Ask what day works.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
    { key: 'time', enabled: true, required: true, question: 'Ask what time works.', sms_options: '' },
    { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
    { key: 'phone', enabled: true, required: true, question: 'Ask for phone.', sms_options: '' },
    { key: 'address', enabled: true, required: true, question: 'Ask for address.', sms_options: '' },
    { key: 'email', enabled: true, required: true, question: 'Ask for email.', sms_options: '' },
  ],
  landscaping: [
    { key: 'service_type', enabled: true, required: true, question: 'Ask what landscaping service — mowing, cleanup, planting, trimming.', sms_options: 'Mowing,Cleanup,Planting,Trimming' },
    { key: 'notes', enabled: true, required: true, question: 'Ask about the property — size, specific areas, gate/pet conditions.', sms_options: '' },
    { key: 'rate', enabled: true, required: true, question: 'Quote pricing.', sms_options: '' },
    { key: 'day', enabled: true, required: true, question: 'Ask what day works.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
    { key: 'time', enabled: true, required: true, question: 'Ask what time works.', sms_options: '' },
    { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
    { key: 'phone', enabled: true, required: true, question: 'Ask for phone.', sms_options: '' },
    { key: 'address', enabled: true, required: true, question: 'Ask for address.', sms_options: '' },
    { key: 'email', enabled: true, required: true, question: 'Ask for email.', sms_options: '' },
  ],
  handyman: [
    { key: 'service_type', enabled: true, required: true, question: 'Ask what the job is — small repair, half-day, full-day, or assembly.', sms_options: 'Small repair,Half-day,Full-day,Assembly' },
    { key: 'notes', enabled: true, required: true, question: 'Ask them to list what needs to be fixed or built.', sms_options: '' },
    { key: 'rate', enabled: true, required: true, question: 'Quote hourly rate.', sms_options: '' },
    { key: 'day', enabled: true, required: true, question: 'Ask what day works.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
    { key: 'time', enabled: true, required: true, question: 'Ask what time works.', sms_options: '' },
    { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
    { key: 'phone', enabled: true, required: true, question: 'Ask for phone.', sms_options: '' },
    { key: 'address', enabled: true, required: true, question: 'Ask for address.', sms_options: '' },
    { key: 'email', enabled: true, required: true, question: 'Ask for email.', sms_options: '' },
  ],
  electrical: [
    { key: 'service_type', enabled: true, required: true, question: 'Ask what type of electrical work — service call, outlet/switch, panel upgrade, EV charger.', sms_options: 'Service call,Outlet,Panel,EV charger' },
    { key: 'notes', enabled: true, required: true, question: 'Ask what the issue or project is — safety concerns, sparking, burning smell, tripped breaker.', sms_options: '' },
    { key: 'rate', enabled: true, required: true, question: 'Quote service call fee.', sms_options: '' },
    { key: 'day', enabled: true, required: true, question: 'Ask what day works.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
    { key: 'time', enabled: true, required: true, question: 'Ask what time works.', sms_options: '' },
    { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
    { key: 'phone', enabled: true, required: true, question: 'Ask for phone.', sms_options: '' },
    { key: 'address', enabled: true, required: true, question: 'Ask for address.', sms_options: '' },
    { key: 'email', enabled: true, required: true, question: 'Ask for email.', sms_options: '' },
  ],
  pest: [
    { key: 'service_type', enabled: true, required: true, question: 'Ask what type of pest issue — general, rodents, termites, bed bugs.', sms_options: 'General,Rodents,Termites,Bed bugs' },
    { key: 'notes', enabled: true, required: true, question: 'Ask about pest type, severity, where, and property type.', sms_options: '' },
    { key: 'rate', enabled: true, required: true, question: 'Quote service rate.', sms_options: '' },
    { key: 'day', enabled: true, required: true, question: 'Ask what day works.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
    { key: 'time', enabled: true, required: true, question: 'Ask what time works.', sms_options: '' },
    { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
    { key: 'phone', enabled: true, required: true, question: 'Ask for phone.', sms_options: '' },
    { key: 'address', enabled: true, required: true, question: 'Ask for address.', sms_options: '' },
    { key: 'email', enabled: true, required: true, question: 'Ask for email.', sms_options: '' },
  ],
  general: [
    { key: 'service_type', enabled: true, required: true, question: 'Ask what service they need.', sms_options: '' },
    { key: 'notes', enabled: true, required: true, question: 'Ask for details about the job — what exactly needs doing.', sms_options: '' },
    { key: 'rate', enabled: true, required: true, question: 'Quote pricing.', sms_options: '' },
    { key: 'day', enabled: true, required: true, question: 'Ask what day works.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
    { key: 'time', enabled: true, required: true, question: 'Ask what time works.', sms_options: '' },
    { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
    { key: 'phone', enabled: true, required: true, question: 'Ask for phone.', sms_options: '' },
    { key: 'address', enabled: true, required: true, question: 'Ask for address.', sms_options: '' },
    { key: 'email', enabled: true, required: true, question: 'Ask for email.', sms_options: '' },
  ],
}

async function main() {
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, industry, selena_config')
    .like('slug', 'test-%')

  if (!tenants || tenants.length === 0) {
    console.error('No test tenants found')
    process.exit(1)
  }

  let updated = 0
  for (const t of tenants) {
    const industry = (t.industry as Industry) || 'general'
    const fields = CHECKLIST_BY_INDUSTRY[industry] || CHECKLIST_BY_INDUSTRY.general
    const existingConfig = (t.selena_config as Record<string, unknown>) || {}
    const newConfig = { ...existingConfig, checklist_fields: fields }

    await supabase.from('tenants').update({ selena_config: newConfig }).eq('id', t.id)
    updated++
    process.stdout.write(`\r  [${updated}/${tenants.length}]`)
  }
  console.log(`\n[backfill] updated ${updated} tenants`)
}

main().catch(err => { console.error(err); process.exit(1) })
