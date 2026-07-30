import { describe, it, expect, afterEach } from 'vitest'
import { findRowByPin } from './pin-lookup'
import { encryptSecret } from './secret-crypto'

/**
 * sec-07: clients.pin / team_members.pin move from plaintext to encrypted at
 * rest. Since AES-256-GCM never produces the same ciphertext twice, an exact
 * .eq('pin', guess) lookup can't find an encrypted row -- findRowByPin's
 * fallback (decrypt-and-compare each candidate) is what makes login still
 * work post-migration. This proves the three states that matter: legacy
 * plaintext (fast path), newly-encrypted (fallback), and a wrong guess in
 * both worlds.
 */

const KEY = 'c'.repeat(64)
const ORIGINAL_KEY = process.env.SECRET_ENCRYPTION_KEY

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.SECRET_ENCRYPTION_KEY
  else process.env.SECRET_ENCRYPTION_KEY = ORIGINAL_KEY
})

type Row = { id: string; pin: string | null }

describe('findRowByPin', () => {
  it('finds a legacy-plaintext row via the fast path, never touching the fallback', async () => {
    let fallbackCalled = false
    const row = await findRowByPin<Row>(
      '445566',
      async () => ({ id: 'legacy-row', pin: '445566' }),
      async () => { fallbackCalled = true; return [] },
    )
    expect(row?.id).toBe('legacy-row')
    expect(fallbackCalled).toBe(false)
  })

  it('finds an encrypted row via the decrypt-and-compare fallback when the fast path misses', async () => {
    process.env.SECRET_ENCRYPTION_KEY = KEY
    const encrypted = encryptSecret('998877')
    const row = await findRowByPin<Row>(
      '998877',
      async () => null, // fast .eq('pin', guess) can never match ciphertext
      async () => [
        { id: 'other-row', pin: encryptSecret('111111') },
        { id: 'target-row', pin: encrypted },
      ],
    )
    expect(row?.id).toBe('target-row')
  })

  it('rejects a wrong guess against encrypted candidates', async () => {
    process.env.SECRET_ENCRYPTION_KEY = KEY
    const row = await findRowByPin<Row>(
      '000000',
      async () => null,
      async () => [{ id: 'target-row', pin: encryptSecret('998877') }],
    )
    expect(row).toBeNull()
  })

  it('rejects a wrong guess against legacy-plaintext candidates', async () => {
    const row = await findRowByPin<Row>(
      '000000',
      async () => null,
      async () => [{ id: 'legacy-row', pin: '445566' }],
    )
    expect(row).toBeNull()
  })

  it('never throws on a null-pin candidate mixed into the scan', async () => {
    process.env.SECRET_ENCRYPTION_KEY = KEY
    const row = await findRowByPin<Row>(
      '998877',
      async () => null,
      async () => [{ id: 'no-pin-row', pin: null }, { id: 'target-row', pin: encryptSecret('998877') }],
    )
    expect(row?.id).toBe('target-row')
  })
})
