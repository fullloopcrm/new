/**
 * Tool implementations for FullLoop's prospect-qualification voice agent
 * (xAI Grok, connected via the MCP server at
 * src/app/api/voice/mcp/[secret]/[transport]/route.ts).
 *
 * Every tool reuses EXISTING FullLoop pipelines — createProspect() is the same
 * function the public /qualify form calls — so voice-originated leads land in
 * the identical Leads/Prospects review flow as every other channel.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { createProspect, type ProspectInput } from '@/lib/prospects'
import { PRICING, computeMonthly } from '@/lib/billing-pricing'
import { QUALIFY_OPTIONS } from '@/lib/lead-fit'

export async function getPricing(): Promise<string> {
  const example = computeMonthly(1, 0)
  return [
    `Full Loop pricing: a one-time $${(PRICING.setupFee / 1000).toFixed(0)}k setup fee (paid by ACH), `,
    `then $${PRICING.adminMonthly}/month per admin seat and $${PRICING.teamMemberMonthly}/month per team-member seat.`,
    `A single-admin business runs $${example}/month after setup.`,
    `This isn't priced like a cheap CRM — it's automation that runs the business, not a tool you configure yourself.`,
  ].join(' ')
}

export async function checkSlotAvailability(trade: string, zip: string): Promise<string> {
  if (!trade || !zip) return 'Need both a trade and a ZIP code to check territory availability.'
  const { data } = await supabaseAdmin
    .from('prospects') // tenant-scope-ok: platform-level territory check, not tenant-scoped
    .select('id')
    .eq('trade', trade)
    .eq('primary_zip', zip)
    .in('status', ['approved', 'paid'])
    .limit(1)
  const taken = !!(data && data.length > 0)
  return taken
    ? `That trade × ZIP territory is already taken by another Full Loop tenant. Still worth applying — flag it and the team will discuss options.`
    : `That territory is open for ${trade} in ${zip}.`
}

export interface SubmitApplicationArgs {
  business_name: string
  owner_name: string
  owner_email: string
  owner_phone?: string
  trade: string
  primary_city?: string
  primary_state?: string
  primary_zip?: string
  annual_revenue?: string // one of QUALIFY_OPTIONS.annual_revenue values
  revenue_trajectory?: string
  growth_goal?: string
  automation_comfort?: string
  lead_gen_spend?: string
  pain_point?: string
  timeline?: string
  current_system?: string
  wants_automation?: boolean
  wants_growth?: boolean
  comparing_prices?: boolean
  notes?: string
  channel: 'voice_agent' | 'chat_agent'
}

export async function submitApplication(a: SubmitApplicationArgs): Promise<string> {
  if (!a.business_name || !a.owner_name || !a.owner_email || !a.trade) {
    return 'Missing required info — need business name, owner name, email, and trade before submitting.'
  }
  const input: ProspectInput = {
    business_name: a.business_name,
    owner_name: a.owner_name,
    owner_email: a.owner_email,
    owner_phone: a.owner_phone,
    trade: a.trade,
    primary_city: a.primary_city,
    primary_state: a.primary_state,
    primary_zip: a.primary_zip,
    annual_revenue: a.annual_revenue,
    annual_revenue_bracket: a.annual_revenue,
    revenue_trajectory: a.revenue_trajectory,
    growth_goal: a.growth_goal,
    automation_comfort: a.automation_comfort,
    lead_gen_spend: a.lead_gen_spend,
    pain_point: a.pain_point,
    timeline: a.timeline,
    launch_timeline: a.timeline,
    current_system: a.current_system,
    wants_automation: a.wants_automation,
    wants_growth: a.wants_growth,
    comparing_prices: a.comparing_prices,
    top_pain_point: a.pain_point,
    wants_call: true,
    source: a.channel,
  }
  const result = await createProspect(input)
  if (a.notes) {
    await supabaseAdmin.from('prospects').update({ agent_notes: a.notes }).eq('id', result.id)
  }
  return result.slotTaken
    ? `Application submitted. Heads up: that territory looks taken already — the team will follow up either way.`
    : `Application submitted — the team reviews every application and reaches out within 2 business days.`
}

export async function logCallNote(ownerPhone: string, note: string): Promise<string> {
  if (!ownerPhone || !note) return 'Need both a phone number and a note.'
  const { data: recent } = await supabaseAdmin
    .from('prospects')
    .select('id, agent_notes')
    .eq('owner_phone', ownerPhone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!recent) return 'No application on file yet for that number — submit the application first.'
  const merged = [recent.agent_notes, note].filter(Boolean).join('\n')
  await supabaseAdmin.from('prospects').update({ agent_notes: merged }).eq('id', recent.id)
  return 'Note saved.'
}

export const QUALIFYING_FIELD_OPTIONS = QUALIFY_OPTIONS
