import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/documents/public/[token]/decline read `document_signers.status`
 * once, then — after a separate `documents.status` terminal check — wrote
 * `status: 'declined'` with an UNCONDITIONAL update (no WHERE on the prior
 * signer status). A decline racing a concurrent sign() (which claims
 * atomically: `eq('id', signer.id).in('status', [...])`) could read stale
 * pending/sent/viewed data, lose the race, and then unconditionally
 * overwrite the freshly-signed signer + parent document back to 'declined'
 * with no way to recover — silently reverting a completed e-sign to
 * declined. Fixed by claiming the decline atomically too, scoped to the
 * still-open statuses, matching the same pattern already used in sign().
 */

const signer: Record<string, unknown> = {
  id: 'signer-1',
  document_id: 'doc-1',
  tenant_id: 'tenant-1',
  status: 'pending',
}
const doc: Record<string, unknown> = {
  id: 'doc-1',
  status: 'in_progress',
}

let activityEvents: string[] = []
// When true, simulates a concurrent sign() completing in the gap between
// decline's initial read and its write: the read returns the stale
// pre-race snapshot, then — as a side effect of that read resolving,
// mirroring the interleaving — the "true" row flips to signed/completed
// before decline's own write executes.
let raceWithConcurrentSign = false

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'document_signers') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { ...signer } }),
          }),
        }),
        // Real supabase-js query builders are thenables: `await update().eq()`
        // executes the write even with no trailing `.select()`. The mock must
        // do the same, or the pre-fix (unconditional) call shape would look
        // like a no-op and mask the bug this test exists to catch.
        update: (payload: Record<string, unknown>) => {
          const eqs: Record<string, unknown> = {}
          let statusIn: string[] | null = null
          const exec = () => {
            const idMatches = signer.id === eqs.id
            const statusMatches = !statusIn || statusIn.includes(signer.status as string)
            if (!idMatches || !statusMatches) return { data: null, error: null }
            Object.assign(signer, payload)
            return { data: { id: signer.id }, error: null }
          }
          const chain = {
            eq: (col: string, val: unknown) => {
              eqs[col] = val
              return chain
            },
            in: (col: string, vals: string[]) => {
              if (col === 'status') statusIn = vals
              return chain
            },
            select: () => ({
              maybeSingle: async () => exec(),
            }),
            then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
              Promise.resolve(exec()).then(resolve, reject),
          }
          return chain
        },
      }
    }
    if (table === 'documents') {
      return {
        select: () => ({
          eq: () => ({
            // This is the last read in decline's control flow before its
            // writes. The race fires its side effect *after* this snapshot
            // is captured, so decline's terminal-status precheck still sees
            // 'in_progress' (the race is not caught there) — only the
            // downstream writes see the now-flipped signed/completed state.
            maybeSingle: async () => {
              const snapshot = { ...doc }
              if (raceWithConcurrentSign) {
                signer.status = 'signed'
                doc.status = 'completed'
              }
              return { data: snapshot }
            },
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          const eqs: Record<string, unknown> = {}
          let statusNotIn: string[] | null = null
          const exec = () => {
            const idMatches = doc.id === eqs.id
            const excluded = statusNotIn && statusNotIn.includes(doc.status as string)
            if (idMatches && !excluded) Object.assign(doc, payload)
            return { data: null, error: null }
          }
          const chain = {
            eq: (col: string, val: unknown) => {
              eqs[col] = val
              return chain
            },
            not: (col: string, _op: string, val: string) => {
              if (col === 'status') statusNotIn = val.replace(/[()]/g, '').split(',')
              return chain
            },
            then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
              Promise.resolve(exec()).then(resolve, reject),
          }
          return chain
        },
      }
    }
    if (table === 'document_activity') {
      return {
        insert: async (row: Record<string, unknown>) => {
          activityEvents.push(row.event_type as string)
          return { data: null, error: null }
        },
      }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function req() {
  return new Request('http://localhost/api/documents/public/tok-a/decline', { method: 'POST' })
}
const params = { params: Promise.resolve({ token: 'tok-a' }) }

describe('POST /api/documents/public/[token]/decline — race with a concurrent sign()', () => {
  beforeEach(() => {
    signer.status = 'pending'
    doc.status = 'in_progress'
    activityEvents = []
    raceWithConcurrentSign = false
  })

  it('declines normally when the signer is still open', async () => {
    const res = await POST(req(), params)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(signer.status).toBe('declined')
    expect(doc.status).toBe('declined')
  })

  it('refuses to decline a signer that a concurrent sign() completed mid-request, and does not touch the document', async () => {
    // decline reads signer.status='pending' and doc.status='in_progress' —
    // both pass its precheck — then a concurrent sign() wins the race and
    // flips both to signed/completed before decline's own writes execute.
    raceWithConcurrentSign = true

    const res = await POST(req(), params)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/already signed/i)
    expect(signer.status).toBe('signed')
    expect(doc.status).toBe('completed')
  })
})
