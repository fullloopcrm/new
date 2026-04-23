/**
 * Tenant provisioning — single entry point that seeds a new tenant with
 * sensible defaults so they can start operating immediately after save.
 *
 * Call after a tenant row is created (by /admin/businesses/new or the
 * onboarding wizard). Idempotent — safe to re-run; it only inserts if rows
 * don't already exist.
 *
 * Seeds:
 *   - service_types   — 3-6 default services tuned to the chosen industry
 *   - selena_config   — AI name, tone, language, pricing_tiers, booking flow
 *   - business_hours  — default Mon-Fri 8a-6p, Sat 9a-3p (override anytime)
 *   - payment_methods — ['zelle','apple_pay','credit_card','cash']
 *   - guidelines_en   — short boilerplate team guidelines
 *
 * Does NOT provision external accounts (Stripe/Telnyx/Resend). Those are
 * operator-driven via /admin/businesses/[id].
 */
import { supabaseAdmin } from './supabase'

type IndustryKey = 'cleaning' | 'landscaping' | 'hvac' | 'plumbing' | 'handyman' | 'electrical' | 'pest' | 'general'

interface DefaultService {
  name: string
  description: string
  default_duration_hours: number
  default_hourly_rate: number
  sort_order: number
}

const SERVICE_PRESETS: Record<IndustryKey, DefaultService[]> = {
  cleaning: [
    { name: 'Standard Cleaning', description: 'Regular recurring cleaning for occupied homes', default_duration_hours: 2, default_hourly_rate: 59, sort_order: 1 },
    { name: 'Deep Cleaning', description: 'Top-to-bottom cleaning, inside appliances', default_duration_hours: 4, default_hourly_rate: 75, sort_order: 2 },
    { name: 'Move In/Out Cleaning', description: 'Empty-home deep clean for tenant transitions', default_duration_hours: 4, default_hourly_rate: 75, sort_order: 3 },
    { name: 'Post-Construction Cleanup', description: 'Dust + debris removal after renovation', default_duration_hours: 5, default_hourly_rate: 85, sort_order: 4 },
    { name: 'Airbnb Turnover', description: 'Fast same-day turnover cleaning', default_duration_hours: 2, default_hourly_rate: 65, sort_order: 5 },
    { name: 'Office Cleaning', description: 'Commercial office cleaning, after-hours', default_duration_hours: 3, default_hourly_rate: 65, sort_order: 6 },
  ],
  landscaping: [
    { name: 'Lawn Mowing', description: 'Mow, edge, trim, blow — weekly or biweekly', default_duration_hours: 1, default_hourly_rate: 75, sort_order: 1 },
    { name: 'Fall / Spring Cleanup', description: 'Full property cleanup + debris hauling', default_duration_hours: 4, default_hourly_rate: 85, sort_order: 2 },
    { name: 'Mulching & Planting', description: 'Bed prep, mulch install, new plantings', default_duration_hours: 3, default_hourly_rate: 85, sort_order: 3 },
    { name: 'Tree & Shrub Trimming', description: 'Shaping, health pruning, removal of dead growth', default_duration_hours: 3, default_hourly_rate: 85, sort_order: 4 },
  ],
  hvac: [
    { name: 'HVAC Tune-Up', description: 'Seasonal maintenance, filter change, coil clean', default_duration_hours: 1, default_hourly_rate: 125, sort_order: 1 },
    { name: 'Repair Service Call', description: 'Diagnosis + repair of AC or heating system', default_duration_hours: 2, default_hourly_rate: 150, sort_order: 2 },
    { name: 'Install / Replacement', description: 'New HVAC system install', default_duration_hours: 8, default_hourly_rate: 135, sort_order: 3 },
    { name: 'Duct Cleaning', description: 'Full duct system cleaning and sanitization', default_duration_hours: 3, default_hourly_rate: 125, sort_order: 4 },
  ],
  plumbing: [
    { name: 'Service Call', description: 'Diagnosis + repair of plumbing issue', default_duration_hours: 1, default_hourly_rate: 135, sort_order: 1 },
    { name: 'Drain Cleaning', description: 'Clear slow or blocked drains', default_duration_hours: 1, default_hourly_rate: 125, sort_order: 2 },
    { name: 'Water Heater Install', description: 'New water heater install, haul-away old', default_duration_hours: 3, default_hourly_rate: 150, sort_order: 3 },
    { name: 'Emergency Plumbing', description: 'After-hours urgent response', default_duration_hours: 2, default_hourly_rate: 175, sort_order: 4 },
  ],
  handyman: [
    { name: 'Small Repair', description: 'Single-item repair under 1 hour', default_duration_hours: 1, default_hourly_rate: 85, sort_order: 1 },
    { name: 'Half-Day Service', description: 'Multiple small jobs, 4 hours', default_duration_hours: 4, default_hourly_rate: 85, sort_order: 2 },
    { name: 'Full-Day Service', description: 'Multiple jobs, full day on site', default_duration_hours: 8, default_hourly_rate: 85, sort_order: 3 },
    { name: 'Furniture Assembly', description: 'Assembly of IKEA, Wayfair, etc.', default_duration_hours: 2, default_hourly_rate: 75, sort_order: 4 },
  ],
  electrical: [
    { name: 'Service Call', description: 'Diagnostic + minor repair', default_duration_hours: 1, default_hourly_rate: 150, sort_order: 1 },
    { name: 'Outlet / Switch Install', description: 'New outlet or switch install', default_duration_hours: 1, default_hourly_rate: 150, sort_order: 2 },
    { name: 'Panel Upgrade', description: 'Electrical panel replacement', default_duration_hours: 6, default_hourly_rate: 175, sort_order: 3 },
    { name: 'EV Charger Install', description: 'Level 2 charger install', default_duration_hours: 3, default_hourly_rate: 175, sort_order: 4 },
  ],
  pest: [
    { name: 'General Pest Control', description: 'Interior + exterior quarterly treatment', default_duration_hours: 1, default_hourly_rate: 95, sort_order: 1 },
    { name: 'Rodent Control', description: 'Rat / mouse exclusion + baiting', default_duration_hours: 2, default_hourly_rate: 115, sort_order: 2 },
    { name: 'Termite Inspection', description: 'Full structure inspection + report', default_duration_hours: 2, default_hourly_rate: 125, sort_order: 3 },
    { name: 'Bed Bug Treatment', description: 'Heat or chemical bed bug remediation', default_duration_hours: 4, default_hourly_rate: 150, sort_order: 4 },
  ],
  general: [
    { name: 'Service Call', description: 'Initial diagnostic visit + recommendation', default_duration_hours: 1, default_hourly_rate: 100, sort_order: 1 },
    { name: 'Standard Service', description: 'Typical service package', default_duration_hours: 2, default_hourly_rate: 100, sort_order: 2 },
    { name: 'Half-Day Service', description: 'Multiple items, 4 hours on site', default_duration_hours: 4, default_hourly_rate: 95, sort_order: 3 },
    { name: 'Full-Day Service', description: 'Full day on site, large or complex job', default_duration_hours: 8, default_hourly_rate: 95, sort_order: 4 },
    { name: 'Emergency / After-Hours', description: 'Urgent same-day or after-hours response', default_duration_hours: 2, default_hourly_rate: 150, sort_order: 5 },
    { name: 'Consultation', description: 'Assessment + written estimate, no hands-on work', default_duration_hours: 1, default_hourly_rate: 75, sort_order: 6 },
  ],
}

// Per-industry checklist_fields. Cleaning is the ONLY industry that asks
// bedrooms/bathrooms — everything else asks industry-appropriate notes instead.
const CHECKLIST_BY_INDUSTRY: Record<IndustryKey, Array<{ key: string; enabled: boolean; required: boolean; question: string; sms_options: string }>> = {
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
    { key: 'notes', enabled: true, required: true, question: 'Ask what the issue is and what system they have (central AC, boiler, mini-split, heat pump, etc).', sms_options: '' },
    { key: 'rate', enabled: true, required: true, question: 'Quote the service call fee.', sms_options: '' },
    { key: 'day', enabled: true, required: true, question: 'Ask what day works.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
    { key: 'time', enabled: true, required: true, question: 'Ask what time works.', sms_options: '' },
    { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
    { key: 'phone', enabled: true, required: true, question: 'Ask for phone.', sms_options: '' },
    { key: 'address', enabled: true, required: true, question: 'Ask for address.', sms_options: '' },
    { key: 'email', enabled: true, required: true, question: 'Ask for email.', sms_options: '' },
  ],
  plumbing: [
    { key: 'service_type', enabled: true, required: true, question: 'Ask what kind of plumbing service — repair, drain cleaning, install, or emergency.', sms_options: 'Service call,Drain,Install,Emergency' },
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
    { key: 'notes', enabled: true, required: true, question: 'Ask about the property — size, specific areas, and any conditions (slope, gate access, pets).', sms_options: '' },
    { key: 'rate', enabled: true, required: true, question: 'Quote pricing.', sms_options: '' },
    { key: 'day', enabled: true, required: true, question: 'Ask what day works.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
    { key: 'time', enabled: true, required: true, question: 'Ask what time works.', sms_options: '' },
    { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
    { key: 'phone', enabled: true, required: true, question: 'Ask for phone.', sms_options: '' },
    { key: 'address', enabled: true, required: true, question: 'Ask for address.', sms_options: '' },
    { key: 'email', enabled: true, required: true, question: 'Ask for email.', sms_options: '' },
  ],
  handyman: [
    { key: 'service_type', enabled: true, required: true, question: 'Ask what the job is — small repair, half-day, full-day, or furniture assembly.', sms_options: 'Small repair,Half-day,Full-day,Assembly' },
    { key: 'notes', enabled: true, required: true, question: 'Ask them to list exactly what needs to be fixed or built.', sms_options: '' },
    { key: 'rate', enabled: true, required: true, question: 'Quote hourly rate.', sms_options: '' },
    { key: 'day', enabled: true, required: true, question: 'Ask what day works.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
    { key: 'time', enabled: true, required: true, question: 'Ask what time works.', sms_options: '' },
    { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
    { key: 'phone', enabled: true, required: true, question: 'Ask for phone.', sms_options: '' },
    { key: 'address', enabled: true, required: true, question: 'Ask for address.', sms_options: '' },
    { key: 'email', enabled: true, required: true, question: 'Ask for email.', sms_options: '' },
  ],
  electrical: [
    { key: 'service_type', enabled: true, required: true, question: 'Ask what type of electrical work — service call, outlet/switch install, panel upgrade, or EV charger.', sms_options: 'Service call,Outlet,Panel,EV charger' },
    { key: 'notes', enabled: true, required: true, question: 'Ask what the issue or project is and if there are any safety concerns (sparking, burning smell, tripped breaker).', sms_options: '' },
    { key: 'rate', enabled: true, required: true, question: 'Quote service call fee.', sms_options: '' },
    { key: 'day', enabled: true, required: true, question: 'Ask what day works.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
    { key: 'time', enabled: true, required: true, question: 'Ask what time works.', sms_options: '' },
    { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
    { key: 'phone', enabled: true, required: true, question: 'Ask for phone.', sms_options: '' },
    { key: 'address', enabled: true, required: true, question: 'Ask for address.', sms_options: '' },
    { key: 'email', enabled: true, required: true, question: 'Ask for email.', sms_options: '' },
  ],
  pest: [
    { key: 'service_type', enabled: true, required: true, question: 'Ask what type of pest issue — general, rodents, termites, or bed bugs.', sms_options: 'General,Rodents,Termites,Bed bugs' },
    { key: 'notes', enabled: true, required: true, question: 'Ask about pest type, severity, where they are seeing them, and property type (house/apt/commercial).', sms_options: '' },
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

const DEFAULT_SELENA_CONFIG = (industry: IndustryKey, tenantName: string, services: DefaultService[]) => ({
  ai_enabled: true,
  ai_name: 'Selena',
  tone: 'warm_friendly',
  emoji_usage: 'one_per_message',
  language: 'en',
  pricing_rows: services.map(s => ({ label: s.name, price: `$${s.default_hourly_rate}/hr` })),
  time_estimates: services.map(s => ({ label: s.name, hours: s.default_duration_hours })),
  service_areas: [] as string[],
  business_tagline: `${tenantName} — reliable ${industry} service`,
  cancellation_policy: 'First-time clients cannot cancel or reschedule. Recurring clients need 7 days notice.',
  no_cancellation_first_time: true,
  checklist_fields: CHECKLIST_BY_INDUSTRY[industry] || CHECKLIST_BY_INDUSTRY.general,
})

const DEFAULT_GUIDELINES_EN = `Team Guidelines

1. Arrive within the scheduled arrival window.
2. Check in via the team portal when you arrive on site.
3. Walk through the job with the client (or self-inspect if empty).
4. Complete the work to professional standards.
5. Walk through final results with the client for sign-off.
6. Check out via the team portal when finished.
7. Be polite, patient, and professional. The client is the business.

If anything goes wrong: stop, text your manager, and wait for guidance.
Never leave a job early without manager approval.`

export interface ProvisionOptions {
  tenantId: string
  industry?: IndustryKey
  overrides?: Partial<{
    services: DefaultService[]
    selena_config: Record<string, unknown>
    guidelines_en: string
    business_hours: string
    payment_methods: string[]
  }>
}

export interface ProvisionResult {
  seeded: {
    services: number
    selena_config: boolean
    guidelines: boolean
    payment_methods: boolean
    business_hours: boolean
  }
  skipped: string[]
}

export async function provisionTenant(opts: ProvisionOptions): Promise<ProvisionResult> {
  const { tenantId } = opts
  const industry: IndustryKey = opts.industry || 'general'
  const result: ProvisionResult = {
    seeded: { services: 0, selena_config: false, guidelines: false, payment_methods: false, business_hours: false },
    skipped: [],
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, business_hours, payment_methods, guidelines_en, selena_config')
    .eq('id', tenantId)
    .single()

  if (!tenant) throw new Error(`Tenant ${tenantId} not found`)

  // Services — only seed if tenant has zero active services
  const { count: existingServices } = await supabaseAdmin
    .from('service_types')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('active', true)

  if ((existingServices || 0) === 0) {
    const services = opts.overrides?.services || SERVICE_PRESETS[industry] || SERVICE_PRESETS.general
    const rows = services.map(s => ({ ...s, tenant_id: tenantId, active: true }))
    const { data: inserted } = await supabaseAdmin.from('service_types').insert(rows).select('id')
    result.seeded.services = inserted?.length || 0
  } else {
    result.skipped.push(`services (${existingServices} already exist)`)
  }

  // Selena config — only seed if empty
  if (!tenant.selena_config || Object.keys(tenant.selena_config).length === 0) {
    const selena = opts.overrides?.selena_config
      ? { ...DEFAULT_SELENA_CONFIG(industry, tenant.name, SERVICE_PRESETS[industry] || SERVICE_PRESETS.general), ...opts.overrides.selena_config }
      : DEFAULT_SELENA_CONFIG(industry, tenant.name, SERVICE_PRESETS[industry] || SERVICE_PRESETS.general)
    await supabaseAdmin.from('tenants').update({ selena_config: selena }).eq('id', tenantId)
    result.seeded.selena_config = true
  } else {
    result.skipped.push('selena_config (already populated)')
  }

  // Business hours
  if (!tenant.business_hours) {
    await supabaseAdmin
      .from('tenants')
      .update({ business_hours: opts.overrides?.business_hours || 'Mon-Fri 8am-6pm, Sat 9am-3pm' })
      .eq('id', tenantId)
    result.seeded.business_hours = true
  } else {
    result.skipped.push('business_hours (already set)')
  }

  // Payment methods
  if (!tenant.payment_methods || (Array.isArray(tenant.payment_methods) && tenant.payment_methods.length === 0)) {
    await supabaseAdmin
      .from('tenants')
      .update({ payment_methods: opts.overrides?.payment_methods || ['zelle', 'apple_pay', 'credit_card', 'cash'] })
      .eq('id', tenantId)
    result.seeded.payment_methods = true
  } else {
    result.skipped.push('payment_methods (already set)')
  }

  // Guidelines
  if (!tenant.guidelines_en) {
    await supabaseAdmin
      .from('tenants')
      .update({ guidelines_en: opts.overrides?.guidelines_en || DEFAULT_GUIDELINES_EN })
      .eq('id', tenantId)
    result.seeded.guidelines = true
  } else {
    result.skipped.push('guidelines_en (already set)')
  }

  return result
}
