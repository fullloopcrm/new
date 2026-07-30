/**
 * Admin controls for a tenant's public onboarding-questionnaire link.
 *
 *   GET   → { url }                      current link (no side effects)
 *   POST  → { action: 'resend' }         re-send the current link by email
 *         → { action: 'regenerate' }     bump onboarding_link_version
 *           (invalidates every token minted before this call — see
 *           onboarding-token.ts) and return the new { url }
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { onboardingLinkUrl, createAndSendOnboardingLink } from '@/lib/onboarding-link'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params

  const { data: tenant } = await supabaseAdmin.from('tenants').select('onboarding_link_version').eq('id', id).single()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ url: onboardingLinkUrl(id, tenant.onboarding_link_version || 1) })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params

  const body = (await request.json().catch(() => ({}))) as { action?: 'resend' | 'regenerate' }

  if (body.action === 'regenerate') {
    const { data: current } = await supabaseAdmin.from('tenants').select('onboarding_link_version').eq('id', id).single()
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const nextVersion = (current.onboarding_link_version || 1) + 1
    const { error } = await supabaseAdmin.from('tenants').update({ onboarding_link_version: nextVersion }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ url: onboardingLinkUrl(id, nextVersion) })
  }

  // Default / 'resend'
  const { url, sent } = await createAndSendOnboardingLink(id)
  return NextResponse.json({ url, sent })
}
