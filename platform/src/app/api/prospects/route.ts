/**
 * Public prospect qualification intake. No auth.
 * Posts to prospects table. Checks for trade × zip slot collision.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'

// Cap free-text fields so a single submission can't balloon to megabytes.
const MAX_TEXT = 2000
function cap(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v)
  return s.length > MAX_TEXT ? s.slice(0, MAX_TEXT) : s
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`qualify:${ip}`, 3, 60 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many submissions. Try again in an hour.' }, { status: 429 })
    }

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
      })
      .select('id, slot_taken_at_submit')
      .single()
    if (error) throw error

    return NextResponse.json({ ok: true, prospect_id: data.id, slot_taken: data.slot_taken_at_submit })
  } catch (err) {
    console.error('POST /api/prospects', err)
    // Don't leak Supabase constraint messages to the public caller.
    return NextResponse.json({ error: 'Submission failed. Please try again.' }, { status: 500 })
  }
}
