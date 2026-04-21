/**
 * Public prospect qualification intake. No auth.
 * Posts to prospects table. Checks for trade × zip slot collision.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const required = ['business_name', 'owner_name', 'owner_email', 'trade']
    for (const r of required) {
      if (!body[r]) return NextResponse.json({ error: `${r} required` }, { status: 400 })
    }

    // Slot collision check
    let slotTaken = false
    if (body.primary_zip && body.trade) {
      const { data: existing } = await supabaseAdmin
        .from('prospects')
        .select('id')
        .eq('trade', body.trade)
        .eq('primary_zip', body.primary_zip)
        .in('status', ['approved', 'paid'])
        .limit(1)
      if (existing && existing.length > 0) slotTaken = true
    }

    const { data, error } = await supabaseAdmin
      .from('prospects')
      .insert({
        business_name: body.business_name,
        legal_name: body.legal_name || null,
        ein: body.ein || null,
        entity_type: body.entity_type || null,
        owner_name: body.owner_name,
        owner_email: body.owner_email,
        owner_phone: body.owner_phone || null,
        trade: body.trade,
        primary_city: body.primary_city || null,
        primary_state: body.primary_state || null,
        primary_zip: body.primary_zip || null,
        service_zips: body.service_zips || null,
        years_in_business: body.years_in_business || null,
        annual_revenue_bracket: body.annual_revenue_bracket || null,
        revenue_trajectory: body.revenue_trajectory || null,
        team_size_wtwo: body.team_size_wtwo || null,
        team_size_contractor: body.team_size_contractor || null,
        current_tech_stack: body.current_tech_stack || null,
        growth_target_12mo: body.growth_target_12mo || null,
        uses_ai_tools: body.uses_ai_tools ?? null,
        ai_tools_list: body.ai_tools_list || null,
        ai_comfort_level: body.ai_comfort_level || null,
        has_crm: body.has_crm ?? null,
        crm_name: body.crm_name || null,
        day_to_day_operator: body.day_to_day_operator || null,
        launch_timeline: body.launch_timeline || null,
        territory_exclusive_ok: body.territory_exclusive_ok ?? null,
        top_pain_point: body.top_pain_point || null,
        heard_from: body.heard_from || null,
        biggest_competitor: body.biggest_competitor || null,
        wants_call: body.wants_call ?? null,
        tier_interest: body.tier_interest || null,
        slot_taken_at_submit: slotTaken,
        status: 'new',
      })
      .select('id, slot_taken_at_submit')
      .single()
    if (error) throw error

    return NextResponse.json({ ok: true, prospect_id: data.id, slot_taken: data.slot_taken_at_submit })
  } catch (err) {
    console.error('POST /api/prospects', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
