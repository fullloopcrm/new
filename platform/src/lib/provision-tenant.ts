/**
 * Tenant provisioning — single entry point that seeds a new tenant with
 * sensible defaults so they can start operating immediately after save.
 *
 * Call after a tenant row is created (by /admin/businesses/new or the
 * onboarding wizard). Idempotent — safe to re-run; it only inserts if rows
 * don't already exist.
 *
 * Seeds:
 *   - service_types   — trade-specific default services (see industry-presets.ts)
 *   - selena_config   — AI name, tone, language, pricing_tiers, booking checklist
 *   - business_hours  — default Mon-Fri 8a-6p, Sat 9a-3p (override anytime)
 *   - payment_methods — ['zelle','apple_pay','credit_card','cash']
 *   - guidelines_en   — short boilerplate team guidelines
 *
 * The trade knowledge (IndustryKey, mapIndustry, per-trade service presets +
 * booking checklists for all 53 territory categories) lives in ./industry-presets.
 * mapIndustry + IndustryKey are re-exported here so existing importers of
 * '@/lib/provision-tenant' keep working unchanged.
 *
 * Does NOT provision external accounts (Stripe/Telnyx/Resend). Those are
 * operator-driven via /admin/businesses/[id].
 */
import { supabaseAdmin } from './supabase'
import {
  type IndustryKey,
  type DefaultService,
  mapIndustry,
  defaultFunnelMode,
  pricingShapeFor,
  priceLabel,
  SERVICE_PRESETS,
  CHECKLIST_BY_INDUSTRY,
} from './industry-presets'

export { mapIndustry }
export type { IndustryKey }

const DEFAULT_SELENA_CONFIG = (industry: IndustryKey, tenantName: string, services: DefaultService[]) => ({
  ai_enabled: true,
  ai_name: 'Selena',
  tone: 'warm_friendly',
  emoji_usage: 'one_per_message',
  language: 'en',
  // Project/lead trades qualify+quote (multi-day → year-long jobs); every other
  // trade books directly. Operators can flip this per-tenant in settings.
  funnel_mode: defaultFunnelMode(industry),
  // Label the price by the trade's real unit — "$350 flat" / "$20/visit" for
  // flat/per-unit trades, "$59/hr" for hourly — never "/hr" on a flat rate.
  pricing_rows: services.map(s => ({ label: s.name, price: priceLabel(s.default_hourly_rate, pricingShapeFor(industry)) })),
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

/**
 * Not a real DB transaction — the JS client can't span tenants/service_types
 * in one. Instead each step is checked for .error, and a failure triggers
 * compensating rollback of everything already committed (delete the rows just
 * inserted, restore the tenant columns to their pre-call values) before
 * rethrowing, so a mid-flight failure never leaves a half-seeded tenant.
 */
export async function provisionTenant(opts: ProvisionOptions): Promise<ProvisionResult> {
  const { tenantId } = opts
  const industry: IndustryKey = opts.industry || 'general'
  const result: ProvisionResult = {
    seeded: { services: 0, selena_config: false, guidelines: false, payment_methods: false, business_hours: false },
    skipped: [],
  }

  const compensations: Array<() => Promise<void>> = []
  const rollback = async (cause: unknown) => {
    for (const compensate of compensations.reverse()) {
      try {
        await compensate()
      } catch (rollbackErr) {
        console.error(`[provision-tenant] rollback step failed for tenant ${tenantId}:`, rollbackErr)
      }
    }
    const message = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`Provisioning failed for tenant ${tenantId}, rolled back: ${message}`)
  }

  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .select('id, name, business_hours, payment_methods, guidelines_en, selena_config')
    .eq('id', tenantId)
    .single()

  if (tenantErr || !tenant) throw new Error(`Tenant ${tenantId} not found: ${tenantErr?.message || 'no row'}`)

  try {
    // Services — only seed if tenant has zero active services
    const { count: existingServices, error: countErr } = await supabaseAdmin
      .from('service_types')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('active', true)
    if (countErr) throw new Error(`service_types count failed: ${countErr.message}`)

    if ((existingServices || 0) === 0) {
      const services = opts.overrides?.services || SERVICE_PRESETS[industry] || SERVICE_PRESETS.general
      // Seed BOTH the old booking columns (default_hourly_rate/duration) and the
      // SKU columns the quote builder reads (price_cents/item_type/per_unit) so
      // seeded services don't render as $0 in proposals. pricing_model/per_unit
      // come from the trade archetype: flat/per-unit trades (dumpster/junk/bin/
      // pet_waste/snow/laundry/fitness) bill the FIXED price, not elapsed-hours ×
      // rate — checkout + invoice math key off pricing_model.
      const shape = pricingShapeFor(industry)
      const rows = services.map(s => ({
        ...s,
        tenant_id: tenantId,
        active: true,
        item_type: 'service',
        pricing_model: shape.pricing_model,
        per_unit: shape.per_unit,
        price_cents: Math.round(s.default_hourly_rate * 100),
      }))
      const { data: inserted, error: insertErr } = await supabaseAdmin.from('service_types').insert(rows).select('id')
      if (insertErr) throw new Error(`service_types insert failed: ${insertErr.message}`)
      result.seeded.services = inserted?.length || 0
      const insertedIds = (inserted || []).map((r) => r.id as string)
      if (insertedIds.length > 0) {
        compensations.push(async () => {
          await supabaseAdmin.from('service_types').delete().in('id', insertedIds)
        })
      }
    } else {
      result.skipped.push(`services (${existingServices} already exist)`)
    }

    // Selena config — only seed if empty
    if (!tenant.selena_config || Object.keys(tenant.selena_config).length === 0) {
      const selena = opts.overrides?.selena_config
        ? { ...DEFAULT_SELENA_CONFIG(industry, tenant.name, SERVICE_PRESETS[industry] || SERVICE_PRESETS.general), ...opts.overrides.selena_config }
        : DEFAULT_SELENA_CONFIG(industry, tenant.name, SERVICE_PRESETS[industry] || SERVICE_PRESETS.general)
      const { error } = await supabaseAdmin.from('tenants').update({ selena_config: selena }).eq('id', tenantId)
      if (error) throw new Error(`selena_config update failed: ${error.message}`)
      result.seeded.selena_config = true
      compensations.push(async () => {
        await supabaseAdmin.from('tenants').update({ selena_config: tenant.selena_config }).eq('id', tenantId)
      })
    } else {
      result.skipped.push('selena_config (already populated)')
    }

    // Business hours
    if (!tenant.business_hours) {
      const { error } = await supabaseAdmin
        .from('tenants')
        .update({ business_hours: opts.overrides?.business_hours || 'Mon-Fri 8am-6pm, Sat 9am-3pm' })
        .eq('id', tenantId)
      if (error) throw new Error(`business_hours update failed: ${error.message}`)
      result.seeded.business_hours = true
      compensations.push(async () => {
        await supabaseAdmin.from('tenants').update({ business_hours: tenant.business_hours }).eq('id', tenantId)
      })
    } else {
      result.skipped.push('business_hours (already set)')
    }

    // Payment methods
    if (!tenant.payment_methods || (Array.isArray(tenant.payment_methods) && tenant.payment_methods.length === 0)) {
      const { error } = await supabaseAdmin
        .from('tenants')
        .update({ payment_methods: opts.overrides?.payment_methods || ['zelle', 'apple_pay', 'credit_card', 'cash'] })
        .eq('id', tenantId)
      if (error) throw new Error(`payment_methods update failed: ${error.message}`)
      result.seeded.payment_methods = true
      compensations.push(async () => {
        await supabaseAdmin.from('tenants').update({ payment_methods: tenant.payment_methods }).eq('id', tenantId)
      })
    } else {
      result.skipped.push('payment_methods (already set)')
    }

    // Guidelines
    if (!tenant.guidelines_en) {
      const { error } = await supabaseAdmin
        .from('tenants')
        .update({ guidelines_en: opts.overrides?.guidelines_en || DEFAULT_GUIDELINES_EN })
        .eq('id', tenantId)
      if (error) throw new Error(`guidelines_en update failed: ${error.message}`)
      result.seeded.guidelines = true
      compensations.push(async () => {
        await supabaseAdmin.from('tenants').update({ guidelines_en: tenant.guidelines_en }).eq('id', tenantId)
      })
    } else {
      result.skipped.push('guidelines_en (already set)')
    }

    return result
  } catch (err) {
    await rollback(err)
    throw err // unreachable — rollback() always throws — keeps TS control-flow happy
  }
}
