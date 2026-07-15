/**
 * getClientProfile(phone) matched an existing client via
 * `ilike('phone', '%'+last10digits+'%')` with no minimum-length guard. A
 * short or malformed phone (e.g. a single digit) matched an ARBITRARY
 * unrelated client and leaked their full profile (address/email/notes/
 * booking history) into the AI's context. Same bug class already fixed in
 * the shared engines (src/lib/selena/core.ts, src/lib/selena-legacy.ts) but
 * this bespoke per-tenant clone was missed. Fixed to require a full, exact
 * 10-digit match.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/app/site/wash-and-fold-hoboken/_lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/app/site/wash-and-fold-hoboken/_lib/supabase'
import { getClientProfile } from './selena'

const fake = supabaseAdmin as unknown as FakeSupabase

function seed() {
  fake._seed('clients', [
    {
      id: 'unrelated-client',
      name: 'Unrelated Client',
      email: 'unrelated@x.com',
      phone: '5551234567',
      address: '123 Secret St',
      notes: 'private notes',
      active: true,
      do_not_service: false,
      created_at: new Date().toISOString(),
    },
  ])
}

describe('wash-and-fold-hoboken getClientProfile — phone match must be exact', () => {
  it('a short malformed phone does NOT leak an unrelated client profile', async () => {
    fake._store.clear()
    seed()
    const profile = JSON.parse(await getClientProfile('5'))
    expect(profile.error).toBe('Client not found')
  })

  it('an empty phone does NOT leak an unrelated client profile', async () => {
    fake._store.clear()
    seed()
    const profile = JSON.parse(await getClientProfile(''))
    expect(profile.error).toBe('Client not found')
  })

  it('a full exact phone match still returns that client profile', async () => {
    fake._store.clear()
    seed()
    const profile = JSON.parse(await getClientProfile('5551234567'))
    expect(profile.name).toBe('Unrelated Client')
  })
})
