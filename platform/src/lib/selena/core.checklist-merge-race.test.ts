import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * updateChecklist() (lib/selena/core.ts) — booking_checklist merge race.
 *
 * BUG (fixed here, same TOCTOU class as the admin/businesses setup_progress
 * / selena_config fix): updateChecklist read the current booking_checklist
 * jsonb blob (loadChecklist), spread the caller's partial patch over it in
 * JS, then wrote the merged blob back with a blind UPDATE. Every inbound
 * webhook message (SMS/Telegram/voice/email) calls this at least once, often
 * several times per turn. Two overlapping calls for the SAME conversation --
 * a customer's second text arriving before Yinez's reply to the first has
 * landed, or a provider redelivering the same webhook while the first
 * delivery is still mid-flight (askSelena can take several seconds) -- both
 * read the same stale blob, and whichever write lands second silently
 * reverts whatever field the first call had just extracted: the checklist
 * loses a field the customer already gave, and Yinez re-asks for it.
 *
 * FIX: delegate the merge to an atomic Postgres-side `||` in
 * migrations/2026_07_16_sms_conversation_checklist_merge_atomic.sql
 * (merge_sms_conversation_checklist) -- no JS-side read step, so there is
 * nothing left to race. Falls back to the pre-fix read-merge-write only if
 * the RPC errors (e.g. migration not applied yet) -- that fallback KEEPS the
 * pre-fix race (see the FALLBACK PROBE below), which is an accepted, temporary
 * bridge state until the leader applies the migration, not a claim of full
 * safety in that branch.
 */

const CONVO_A = 'convo-a'

interface Deferred<T> { promise: Promise<T>; resolve: (v: T) => void }
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}
const flush = () => new Promise((r) => setTimeout(r, 0))

const holder = vi.hoisted(() => ({
  checklist: null as null | Record<string, unknown>,
  rpc: null as null | ((fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>),
  updateCalls: [] as Array<{ table: string; values: Record<string, unknown> }>,
  // Gates below let a test control exactly when a concurrent call's read (or
  // RPC apply) is allowed to land — the only way to prove a TOCTOU race
  // deterministically in a single-threaded test runner.
  readGates: [] as Array<Deferred<void>>,
  gateReads: false,
  rpcGates: [] as Array<Deferred<void>>,
  gateRpc: false,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => {
            // Snapshot captured at query time (like a real DB read would),
            // even though resolution to the caller may be gated below —
            // this is what makes the legacy read-merge-write racy: the
            // snapshot can go stale while the read is "in flight".
            const snapshot = { booking_checklist: holder.checklist, phone: '2125551234' }
            if (holder.gateReads && table === 'sms_conversations') {
              const gate = deferred<void>()
              holder.readGates.push(gate)
              await gate.promise
            }
            return { data: table === 'sms_conversations' ? snapshot : null, error: null }
          },
        }),
      }),
      update: (values: Record<string, unknown>) => ({
        eq: async () => {
          holder.updateCalls.push({ table, values })
          if (table === 'sms_conversations' && 'booking_checklist' in values) {
            holder.checklist = values.booking_checklist as Record<string, unknown>
          }
          return { data: null, error: null }
        },
      }),
    }),
    rpc: (fn: string, args: Record<string, unknown>) => holder.rpc!(fn, args),
  },
}))

import { updateChecklist, EMPTY_CHECKLIST } from './core'

beforeEach(() => {
  holder.checklist = { ...EMPTY_CHECKLIST, status: 'collecting' }
  holder.updateCalls = []
  holder.readGates = []
  holder.gateReads = false
  holder.rpcGates = []
  holder.gateRpc = false
  // Fake the atomic Postgres `||` merge for real: the patch is applied
  // against whatever the row holds AT APPLY TIME (gated below), not a
  // snapshot taken earlier — that's the structural difference from the
  // legacy read-merge-write that makes this race-proof.
  holder.rpc = async (fn, args) => {
    if (fn !== 'merge_sms_conversation_checklist') return { data: null, error: { message: 'unknown fn' } }
    if (holder.gateRpc) {
      const gate = deferred<void>()
      holder.rpcGates.push(gate)
      await gate.promise
    }
    const merged = { ...(holder.checklist || {}), ...(args.p_patch as Record<string, unknown>) }
    holder.checklist = merged
    return { data: merged, error: null }
  }
})

describe('updateChecklist — booking_checklist merge race', () => {
  it('merges via the atomic RPC only — never falls through to the legacy blind update when the RPC succeeds', async () => {
    await updateChecklist(CONVO_A, { bedrooms: 2 })
    expect(holder.checklist).toMatchObject({ bedrooms: 2, status: 'collecting' })
    // No JS-side read-then-write happened: the legacy `.update()` path is
    // never invoked when the RPC path succeeds.
    expect(holder.updateCalls.filter((u) => u.table === 'sms_conversations')).toEqual([])
  })

  it('CONCURRENCY PROBE (fixed / RPC path): two overlapping calls for the same conversation both survive, regardless of which one\'s write actually lands first', async () => {
    holder.gateRpc = true
    const pA = updateChecklist(CONVO_A, { bedrooms: 2 })
    await flush()
    expect(holder.rpcGates.length).toBe(1)
    const pB = updateChecklist(CONVO_A, { name: 'Jane' })
    await flush()
    expect(holder.rpcGates.length).toBe(2)

    // Release B's write first, then A's — out-of-order completion is exactly
    // the shape that clobbers a stale JS-side merge. It doesn't here because
    // each atomic apply reads the row fresh at release time.
    holder.rpcGates[1].resolve()
    await flush()
    holder.rpcGates[0].resolve()
    await Promise.all([pA, pB])

    expect(holder.checklist).toMatchObject({ bedrooms: 2, name: 'Jane', status: 'collecting' })
  })

  it('auto-transitions to recap via a second atomic patch once all fields are collected, without dropping the first patch', async () => {
    holder.checklist = {
      ...EMPTY_CHECKLIST,
      status: 'collecting',
      service_type: 'regular', bedrooms: 2, bathrooms: 1, rate: 69,
      day: 'Mon', time: '10am', name: 'Jane', phone: '2125551234', address: '123 Main St',
      email: 'jane@example.com',
    }
    const result = await updateChecklist(CONVO_A, { notes: 'ring bell' })
    expect(result.status).toBe('recap')
    expect(result.notes).toBe('ring bell')
    expect(holder.checklist).toMatchObject({ status: 'recap', notes: 'ring bell' })
  })

  it('falls back to the read-merge-write path when the RPC errors (e.g. migration not yet applied), so the flow still works', async () => {
    holder.rpc = async () => ({ data: null, error: { message: 'function merge_sms_conversation_checklist does not exist' } })
    const result = await updateChecklist(CONVO_A, { bedrooms: 3 })
    expect(result.bedrooms).toBe(3)
    expect(holder.checklist).toMatchObject({ bedrooms: 3 })
    const smsUpdates = holder.updateCalls.filter((u) => u.table === 'sms_conversations')
    expect(smsUpdates.length).toBeGreaterThan(0)
  })

  it('FALLBACK PROBE (RPC unavailable — accepted, temporary until the migration lands): overlapping calls CAN still clobber each other via the legacy read-merge-write', async () => {
    holder.rpc = async () => ({ data: null, error: { message: 'function merge_sms_conversation_checklist does not exist' } })
    holder.gateReads = true

    const pA = updateChecklist(CONVO_A, { bedrooms: 2 })
    await flush()
    expect(holder.readGates.length).toBe(1)
    const pB = updateChecklist(CONVO_A, { name: 'Jane' })
    await flush()
    expect(holder.readGates.length).toBe(2)

    // A's read resolves and its write lands first.
    holder.readGates[0].resolve()
    await flush()
    // B's read resolves with the snapshot it captured BEFORE A's write —
    // its merge is based on stale state, so its write reverts A's field.
    holder.readGates[1].resolve()
    await Promise.all([pA, pB])

    expect(holder.checklist).toMatchObject({ name: 'Jane' })
    expect((holder.checklist as Record<string, unknown>).bedrooms).toBeNull()
  })
})
