/**
 * Post a reply to a Google Business review. Tenant-aware: uses that tenant's
 * Google OAuth tokens + business location.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getValidAccessToken, getGoogleBusiness } from '@/lib/google'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { reviewId, reply } = await request.json()

    if (!reviewId || !reply?.trim()) {
      return NextResponse.json({ error: 'reviewId and reply are required' }, { status: 400 })
    }

    const accessToken = await getValidAccessToken(tenantId)
    if (!accessToken) {
      return NextResponse.json({ error: 'Not connected to Google' }, { status: 401 })
    }

    const business = await getGoogleBusiness(tenantId)
    if (!business?.location_name) {
      return NextResponse.json({ error: 'No location configured' }, { status: 400 })
    }

    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${business.location_name}/reviews/${reviewId}/reply`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: reply.trim() }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('Failed to reply to review:', err)
      return NextResponse.json({ error: 'Failed to post reply' }, { status: 500 })
    }

    await supabaseAdmin
      .from('google_reviews')
      .update({ reply: reply.trim() })
      .eq('tenant_id', tenantId)
      .eq('google_review_id', reviewId)

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('Failed to post reply:', e)
    return NextResponse.json({ error: 'Failed to post reply' }, { status: 500 })
  }
}
