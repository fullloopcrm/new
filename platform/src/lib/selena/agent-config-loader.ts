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
import type { AgentConfig, BookingModel, PricingModel } from './agent-config'

function funnelToBooking(funnel: string, hasHourly: boolean): BookingModel {
  if (funnel === 'lead_only') return 'lead_only'
  if (funnel === 'pipeline') return 'quote_first'
  return hasHourly ? 'hourly' : 'appointment'
}

function funnelToPricing(funnel: string, hasHourly: boolean): PricingModel {
  if (funnel === 'lead_only' || funnel === 'pipeline') return 'quote_only'
  return hasHourly ? 'hourly' : 'flat'
}

interface ChecklistField {
  key: string
  enabled: boolean
  required: boolean
  question: string
  sms_options?: string
}

export async function getAgentConfig(tenantId: string): Promise<AgentConfig> {
  const [{ data: tenant }, settings] = await Promise.all([
    supabaseAdmin
      .from('tenants')
      .select('name, phone, email, domain, website_url, industry, agent_name, address, selena_config')
      .eq('id', tenantId)
      .single(),
    getSettings(tenantId),
  ])

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

  const priceCopy =
    pricingModel === 'quote_only'
      ? ''
      : activeServices.length
        ? `Services: ${activeServices.map((s) => s.name).join(', ')}. Quote only your configured rates — never invent a total you were not given.`
        : 'Quote only your configured rates — never invent a number.'

  const serviceList = activeServices.length
    ? `What do you need? (${activeServices.map((s) => s.name).join(', ')})`
    : 'What do you need help with?'

  // provision-tenant.ts seeds tenants.selena_config.checklist_fields from
  // CHECKLIST_BY_INDUSTRY[industry] at signup, so every non-cleaning trade
  // (hvac, roofing, plumbing, ...) already has its own qualifying checklist
  // sitting in the DB. Before this, intake always fell back to the generic
  // 3-question list below and that per-trade checklist was never read.
  const rawChecklist = (tenant?.selena_config as { checklist_fields?: ChecklistField[] } | null)?.checklist_fields
  const checklistQuestions = Array.isArray(rawChecklist)
    ? rawChecklist.filter((f) => f.enabled).map((f) => f.question)
    : []

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
    intake: {
      questions: checklistQuestions.length ? checklistQuestions : [serviceList, 'Where are you located?', 'When do you need it?'],
    },
    payment: {
      methods: settings.payment_methods || [],
      timing: 'as arranged',
    },
    contact: { phone, portal_url: portal },
    booking: { model: bookingModel },
  }
}
