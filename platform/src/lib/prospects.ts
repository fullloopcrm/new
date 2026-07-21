/**
 * Shared prospect-intake pipeline: fit scoring + insert + partner_requests fold
 * + admin alert. Used by the public /qualify form (src/app/api/prospects/route.ts)
 * and the voice/chat prospect agent (src/lib/voice-agent/tools.ts) so every
 * channel creates leads through the identical path — no duplicated scoring logic.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { computeFit } from '@/lib/lead-fit'
import { buildProspectNotificationHtml } from '@/app/api/prospects/notification-email'

// Cap free-text fields so a single submission can't balloon to megabytes.
const MAX_TEXT = 2000
function cap(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v)
  return s.length > MAX_TEXT ? s.slice(0, MAX_TEXT) : s
}

export interface ProspectInput {
  business_name: string
  legal_name?: string
  ein?: string
  entity_type?: string
  owner_name: string
  owner_email: string
  owner_phone?: string
  trade: string
  primary_city?: string
  primary_state?: string
  primary_zip?: string
  service_zips?: string[]
  years_in_business?: number
  annual_revenue_bracket?: string
  revenue_trajectory?: string
  team_size_wtwo?: number
  team_size_contractor?: number
  current_tech_stack?: string
  growth_target_12mo?: string
  uses_ai_tools?: boolean
  ai_tools_list?: string
  ai_comfort_level?: number
  has_crm?: boolean
  crm_name?: string
  day_to_day_operator?: string
  launch_timeline?: string
  territory_exclusive_ok?: boolean
  top_pain_point?: string
  heard_from?: string
  biggest_competitor?: string
  wants_call?: boolean
  tier_interest?: string
  billing_address?: string
  billing_city?: string
  billing_state?: string
  billing_zip?: string
  annual_revenue?: string
  growth_goal?: string
  automation_comfort?: string
  lead_gen_spend?: string
  pain_point?: string
  timeline?: string
  current_system?: string
  wants_automation?: boolean
  wants_growth?: boolean
  comparing_prices?: boolean
  source?: string // 'form' | 'voice_agent' | 'chat_agent' — defaults to 'form'
}

export interface CreateProspectResult {
  id: string
  slotTaken: boolean
}

export async function createProspect(body: ProspectInput): Promise<CreateProspectResult> {
  const required = ['business_name', 'owner_name', 'owner_email', 'trade'] as const
  for (const r of required) {
    if (!body[r]) throw new Error(`${r} required`)
  }

  let slotTaken = false
  if (body.primary_zip && body.trade) {
    const { data: existing } = await supabaseAdmin
      .from('prospects') // tenant-scope-ok: prospect intake is platform-level (pre-tenant), collision check is global by design
      .select('id')
      .eq('trade', body.trade)
      .eq('primary_zip', body.primary_zip)
      .in('status', ['approved', 'paid'])
      .limit(1)
    if (existing && existing.length > 0) slotTaken = true
  }

  const { data, error } = await supabaseAdmin
    .from('prospects') // tenant-scope-ok: prospect intake is platform-level (pre-tenant), collision check is global by design
    .insert({
      business_name: cap(body.business_name),
      legal_name: cap(body.legal_name),
      ein: cap(body.ein),
      entity_type: cap(body.entity_type),
      owner_name: cap(body.owner_name),
      owner_email: cap(body.owner_email),
      owner_phone: cap(body.owner_phone),
      trade: cap(body.trade),
      primary_city: cap(body.primary_city),
      primary_state: cap(body.primary_state),
      primary_zip: cap(body.primary_zip),
      service_zips: body.service_zips || null,
      years_in_business: body.years_in_business || null,
      annual_revenue_bracket: cap(body.annual_revenue_bracket),
      revenue_trajectory: cap(body.revenue_trajectory),
      team_size_wtwo: body.team_size_wtwo || null,
      team_size_contractor: body.team_size_contractor || null,
      current_tech_stack: cap(body.current_tech_stack),
      growth_target_12mo: cap(body.growth_target_12mo),
      uses_ai_tools: body.uses_ai_tools ?? null,
      ai_tools_list: cap(body.ai_tools_list),
      ai_comfort_level: body.ai_comfort_level || null,
      has_crm: body.has_crm ?? null,
      crm_name: cap(body.crm_name),
      day_to_day_operator: cap(body.day_to_day_operator),
      launch_timeline: cap(body.launch_timeline),
      territory_exclusive_ok: body.territory_exclusive_ok ?? null,
      top_pain_point: cap(body.top_pain_point),
      heard_from: cap(body.heard_from),
      biggest_competitor: cap(body.biggest_competitor),
      wants_call: body.wants_call ?? null,
      tier_interest: cap(body.tier_interest),
      slot_taken_at_submit: slotTaken,
      status: 'new',
      source: cap(body.source) || 'form',
    })
    .select('id, slot_taken_at_submit')
    .single()
  if (error) throw error

  // Score the lead on intent (growth + automation), then fold the full answer
  // set into the single lead bucket (partner_requests) so it surfaces, sorts,
  // and flags shoppers in the Leads pipeline. Best-effort — never block intake.
  const fit = computeFit({
    automation_comfort: body.automation_comfort,
    growth_goal: body.growth_goal,
    revenue_trajectory: body.revenue_trajectory,
    timeline: body.timeline,
    current_system: body.current_system,
    lead_gen_spend: body.lead_gen_spend,
    wants_automation: body.wants_automation,
    wants_growth: body.wants_growth,
    comparing_prices: body.comparing_prices,
  })
  try {
    await supabaseAdmin.from('partner_requests').insert({
      business_name: cap(body.business_name) || 'Unknown',
      contact_name: cap(body.owner_name) || 'Unknown',
      email: cap(body.owner_email) || '',
      phone: cap(body.owner_phone) || '',
      service_category: cap(body.trade) || 'Other',
      city: cap(body.primary_city) || 'N/A',
      state: cap(body.primary_state) || 'NA',
      billing_address: cap(body.billing_address),
      billing_city: cap(body.billing_city),
      billing_state: cap(body.billing_state),
      billing_zip: cap(body.billing_zip),
      monthly_revenue: cap(body.annual_revenue),
      current_system: cap(body.current_system),
      revenue_trajectory: cap(body.revenue_trajectory),
      growth_goal: cap(body.growth_goal),
      automation_comfort: cap(body.automation_comfort),
      lead_gen_spend: cap(body.lead_gen_spend),
      pain_point: cap(body.pain_point),
      timeline: cap(body.timeline),
      wants_automation: body.wants_automation ?? null,
      wants_growth: body.wants_growth ?? null,
      comparing_prices: body.comparing_prices ?? null,
      fit_score: fit.score,
      fit_bucket: fit.bucket,
      referral_source: body.source === 'voice_agent' ? 'Voice agent' : body.source === 'chat_agent' ? 'Chat agent' : 'Qualify form',
      status: 'new',
    })
  } catch (foldErr) {
    console.error('[prospects] fold to partner_requests failed (non-fatal):', foldErr)
  }

  // Alert platform admin so new leads don't sit unreviewed. Best-effort:
  // any failure here must NOT surface to the caller.
  try {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
    if (adminEmail) {
      const { sendEmail } = await import('@/lib/email')
      const summary = [
        `Business: ${body.business_name}`,
        `Trade: ${body.trade}`,
        `Owner: ${body.owner_name} <${body.owner_email}>`,
        body.owner_phone ? `Phone: ${body.owner_phone}` : '',
        body.primary_city && body.primary_state
          ? `Location: ${body.primary_city}, ${body.primary_state} ${body.primary_zip || ''}`.trim()
          : '',
        body.tier_interest ? `Tier interest: ${body.tier_interest}` : '',
        body.launch_timeline ? `Launch: ${body.launch_timeline}` : '',
        body.source && body.source !== 'form' ? `Source: ${body.source}` : '',
        slotTaken ? 'Note: slot already taken (trade × zip)' : '',
      ].filter(Boolean).join('\n')
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://homeservicesbusinesscrm.com'
      await sendEmail({
        to: adminEmail,
        subject: `New Full Loop lead: ${body.business_name} (${body.trade})`,
        html: buildProspectNotificationHtml(summary, appUrl),
      })
    }
  } catch (alertErr) {
    console.error('[prospects] admin alert failed (non-fatal):', alertErr)
  }

  return { id: data.id as string, slotTaken: !!data.slot_taken_at_submit }
}
