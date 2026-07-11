// Derives a neutral per-tenant AgentConfig from tenant data (row + settings).
//
// Used for NON-nyc-maid tenants: instead of shipping nyc-maid's prompt + a
// "pretend you're {tenant}" note, we build a real personality file from the
// tenant's own name, agent_name, industry, funnel_mode, and services. Persona
// is a neutral professional default (per-industry personas can be layered later
// via a registry keyed on industry). nyc-maid never uses this — it keeps its own
// authored playbook.

import { supabaseAdmin } from '@/lib/supabase'
import { getSettings } from '@/lib/settings'
import type { ServiceType } from '@/lib/settings'
import type { AgentConfig, BookingModel, PricingModel } from './agent-config'
import { getAuthoredConfig } from './tenants'

function funnelToBooking(funnel: string, hasHourly: boolean): BookingModel {
  if (funnel === 'lead_only') return 'lead_only'
  if (funnel === 'pipeline') return 'quote_first'
  return hasHourly ? 'hourly' : 'appointment'
}

function funnelToPricing(funnel: string, hasHourly: boolean): PricingModel {
  if (funnel === 'lead_only' || funnel === 'pipeline') return 'quote_only'
  return hasHourly ? 'hourly' : 'flat'
}

/**
 * Build the pricing copy the agent may quote for a booking/flat tenant. Carries
 * each active service's REAL configured rate into the prompt. Previously only
 * service NAMES survived here (the per-service dollar rate was dropped upstream
 * in the settings mapping), so a booking tenant's agent literally had no number
 * to quote and could only say "quote your configured rates" — with none present.
 * quote_only tenants quote nothing, so the copy is empty by design.
 */
export function buildPriceCopy(activeServices: ServiceType[], pricingModel: PricingModel): string {
  if (pricingModel === 'quote_only') return ''
  if (!activeServices.length) return 'Quote only your configured rates — never invent a number.'
  const unit = pricingModel === 'hourly' ? '/hr' : ''
  const list = activeServices
    .map((s) => (s.rate > 0 ? `${s.name} — $${s.rate}${unit}` : s.name))
    .join(', ')
  return `Services and rates: ${list}. Quote ONLY these configured rates — never invent a total you were not given.`
}

export async function getAgentConfig(tenantId: string): Promise<AgentConfig> {
  const [{ data: tenant }, settings] = await Promise.all([
    supabaseAdmin
      .from('tenants')
      .select('name, phone, email, domain, website_url, industry, agent_name, address, slug')
      .eq('id', tenantId)
      .single(),
    getSettings(tenantId),
  ])

  // Base-engine + per-tenant layer: if this tenant has an authored AgentConfig
  // (migrated one at a time — exterminator first), use it in place of the
  // neutral derivation below so it resolves to its OWN persona, not the generic
  // professional default. The tenant's DB persona (tenants.selena_config) still
  // folds ON TOP downstream (agent.ts applyPersonaToConfig) — this replaces only
  // the neutral BASE, never the tenant's own authored persona data.
  const authored = getAuthoredConfig((tenant as { slug?: string } | null)?.slug)
  if (authored) return authored

  const name = tenant?.name || 'the business'
  const agentName = tenant?.agent_name || 'Jefe'
  const industry = (tenant?.industry || 'home services').replace(/_/g, ' ')
  const phone = tenant?.phone || settings.business_phone || '<not configured>'
  const domain = tenant?.domain || tenant?.website_url?.replace(/^https?:\/\//, '').replace(/\/$/, '') || ''
  const portal = domain ? `${domain}/portal` : '<portal>'

  const activeServices = settings.service_types.filter((s) => s.active)
  const hasHourly = settings.funnel_mode === 'booking' && activeServices.length > 0 && settings.standard_rate > 0
  const bookingModel = funnelToBooking(settings.funnel_mode, hasHourly)
  const pricingModel = funnelToPricing(settings.funnel_mode, hasHourly)

  const priceCopy = buildPriceCopy(activeServices, pricingModel)

  const serviceList = activeServices.length
    ? `What do you need? (${activeServices.map((s) => s.name).join(', ')})`
    : 'What do you need help with?'

  return {
    identity: {
      agent_name: agentName,
      business_name: name,
      run_statement: `You run ${name} — sales, scheduling, and customer service.`,
    },
    voice: {
      persona: `You're professional, warm, and efficient. You make people feel taken care of, get the details fast, and hold the line on price and policy without being cold. You represent ${name} and you sound like a real person, not a script.`,
      examples: [],
      banned_phrases: [
        'certainly', 'absolutely', 'of course', 'great question', 'happy to help',
        "I'd love to help", "I'd be happy to", 'rest assured', 'feel free to', 'kindly', 'as per',
      ],
      endearments: [],
      openers: [
        `"Hi, I'm ${agentName} with ${name} — who am I chatting with?"`,
        `"Hey there, ${agentName} here. What's your name?"`,
        `"Hi! ${agentName} with ${name}. How can we help, and who am I speaking with?"`,
      ],
      emoji: true,
    },
    service_area: settings.business_name ? `wherever ${name} serves` : 'our service area',
    policies: [
      'Reviews: only after a job is completed, never at intake.',
      'Do not promise anything the owner might not honor. Escalate refunds, disputes, and legal threats.',
    ],
    pricing: { model: pricingModel, copy: priceCopy },
    intake: { questions: [serviceList, 'Where are you located?', 'When do you need it?'] },
    payment: {
      methods: settings.payment_methods || [],
      timing: 'as arranged',
    },
    contact: { phone, portal_url: portal },
    booking: { model: bookingModel },
  }
}
