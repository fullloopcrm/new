import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * GET /api/admin/businesses (the businesses LIST view powering
 * admin/businesses/page.tsx) used to `select('*')` on tenants and return it
 * verbatim -- every tenant's raw Stripe/Telnyx/Resend/Anthropic/IndexNow
 * keys, IMAP password, Telegram bot token, and Google OAuth tokens, in one
 * response, none of which the list page reads. Same pure-unused-over-
 * exposure class as the team_members/clients .pin leak. The per-tenant edit
 * form (admin/businesses/[id]/route.ts) still returns these raw -- that's
 * the legitimate credential-editing surface and is intentionally untouched.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/require-admin', () => ({
  requireAdmin: vi.fn(async () => null),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [
    {
      id: 't1',
      name: 'Acme Cleaning',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      stripe_api_key: 'sk_live_secret',
      telnyx_api_key: 'telnyx_secret',
      resend_api_key: 'resend_secret',
      anthropic_api_key: 'anthropic_secret',
      indexnow_key: 'indexnow_secret',
      telegram_bot_token: 'telegram_secret',
      imap_pass: 'imap_secret',
      google_tokens: { access_token: 'a', refresh_token: 'r' },
    },
  ])
})

describe('GET /api/admin/businesses — secret exposure', () => {
  it('never includes vendor secrets or Google OAuth tokens in the list response', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.businesses).toHaveLength(1)
    const biz = body.businesses[0]
    for (const field of [
      'stripe_api_key', 'telnyx_api_key', 'resend_api_key', 'anthropic_api_key',
      'indexnow_key', 'telegram_bot_token', 'imap_pass', 'google_tokens',
    ]) {
      expect(biz).not.toHaveProperty(field)
    }
  })

  it('still returns the fields the list page needs', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.businesses[0]).toMatchObject({ id: 't1', name: 'Acme Cleaning', status: 'active' })
  })
})
