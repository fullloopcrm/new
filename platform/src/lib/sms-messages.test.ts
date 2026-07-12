import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * insertConversationMessage (src/lib/sms-messages.ts) — the tenant-safe writer
 * for `sms_conversation_messages`.
 *
 * Contract locked here:
 *   - tenant_id is ALWAYS derived from the parent conversation and stamped on
 *     the inserted row (callers cannot omit it — the table's DEFAULT would
 *     otherwise silently mis-stamp every non-nycmaid message as nycmaid).
 *   - if the caller's expectedTenantId disagrees with the conversation's real
 *     owner, the append is refused and NO row is written (cross-tenant probe).
 *   - a conversation that cannot be resolved → error, no insert.
 *
 * supabaseAdmin is mocked with a configurable recorder so we can assert the
 * exact stamped payload and the cross-tenant refusal without a DB.
 */

const { state } = vi.hoisted(() => ({
  state: {
    convoTenant: null as string | null,
    convoError: null as { message: string } | null,
    insertError: null as { message: string } | null,
    inserts: [] as Record<string, unknown>[],
    selectedConvoIds: [] as unknown[],
  },
}))

vi.mock('@/lib/supabase', () => {
  return {
    supabaseAdmin: {
      from(table: string) {
        if (table === 'sms_conversations') {
          const builder: Record<string, (...a: unknown[]) => unknown> = {}
          builder.select = () => builder
          builder.eq = (_col: unknown, val: unknown) => {
            state.selectedConvoIds.push(val)
            return builder
          }
          builder.maybeSingle = async () => ({
            data: state.convoTenant ? { tenant_id: state.convoTenant } : null,
            error: state.convoError,
          })
          return builder
        }
        // sms_conversation_messages
        return {
          insert(row: Record<string, unknown>) {
            state.inserts.push(row)
            const result = {
              data: state.insertError ? null : { id: 'msg-1', ...row },
              error: state.insertError,
            }
            return {
              select: () => ({ single: async () => result }),
              then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
                Promise.resolve(result).then(res, rej),
            }
          },
        }
      },
    },
  }
})

// Import AFTER the mock is registered.
import { insertConversationMessage } from './sms-messages'

const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TENANT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const CONVO = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

beforeEach(() => {
  state.convoTenant = null
  state.convoError = null
  state.insertError = null
  state.inserts = []
  state.selectedConvoIds = []
})

describe('insertConversationMessage — stamps tenant from the parent conversation', () => {
  it('stamps the conversation owner tenant_id on the inserted row', async () => {
    state.convoTenant = TENANT_A
    const { error } = await insertConversationMessage({
      conversation_id: CONVO,
      direction: 'inbound',
      message: 'hi',
    })
    expect(error).toBeNull()
    expect(state.inserts).toHaveLength(1)
    expect(state.inserts[0]).toEqual({
      conversation_id: CONVO,
      direction: 'inbound',
      message: 'hi',
      tenant_id: TENANT_A,
    })
    // it resolved the tenant by looking up THIS conversation
    expect(state.selectedConvoIds).toEqual([CONVO])
  })

  it('derives tenant even when the caller provides no expectedTenantId', async () => {
    state.convoTenant = TENANT_B
    const { error } = await insertConversationMessage({
      conversation_id: CONVO,
      direction: 'outbound',
      message: 'reply',
    })
    expect(error).toBeNull()
    expect((state.inserts[0] as { tenant_id: string }).tenant_id).toBe(TENANT_B)
  })

  it('allows the insert when expectedTenantId matches the conversation owner', async () => {
    state.convoTenant = TENANT_A
    const { error } = await insertConversationMessage(
      { conversation_id: CONVO, direction: 'inbound', message: 'ok' },
      { expectedTenantId: TENANT_A },
    )
    expect(error).toBeNull()
    expect((state.inserts[0] as { tenant_id: string }).tenant_id).toBe(TENANT_A)
  })

  it('returns the inserted row when returnRow is set', async () => {
    state.convoTenant = TENANT_A
    const { data, error } = await insertConversationMessage(
      { conversation_id: CONVO, direction: 'outbound', message: 'r' },
      { returnRow: true },
    )
    expect(error).toBeNull()
    expect(data).toMatchObject({ id: 'msg-1', tenant_id: TENANT_A, message: 'r' })
  })
})

describe('insertConversationMessage — WRONG-TENANT PROBE', () => {
  it('refuses to append to another tenant conversation and writes NOTHING', async () => {
    // Conversation is owned by A; caller operating as B tries to append.
    state.convoTenant = TENANT_A
    const { data, error } = await insertConversationMessage(
      { conversation_id: CONVO, direction: 'inbound', message: 'mole' },
      { expectedTenantId: TENANT_B },
    )
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/cross-tenant append blocked/)
    expect(data).toBeNull()
    expect(state.inserts).toHaveLength(0) // nothing written under either tenant
  })

  it('errors (and writes nothing) when the conversation cannot be resolved', async () => {
    state.convoTenant = null // not found
    const { error } = await insertConversationMessage({
      conversation_id: CONVO,
      direction: 'inbound',
      message: 'x',
    })
    expect(error?.message).toMatch(/cannot resolve tenant/)
    expect(state.inserts).toHaveLength(0)
  })

  it('errors when conversation_id is missing', async () => {
    const { error } = await insertConversationMessage({
      conversation_id: '',
      direction: 'inbound',
      message: 'x',
    })
    expect(error?.message).toMatch(/conversation_id is required/)
    expect(state.inserts).toHaveLength(0)
  })
})
