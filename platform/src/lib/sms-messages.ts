// Tenant-safe insert for `sms_conversation_messages`.
//
// WHY THIS EXISTS
// ---------------
// This table is written via `supabaseAdmin` (service_role, which BYPASSES RLS)
// from webhook + chat paths that key off `conversation_id`. Historically those
// inserts omitted `tenant_id` on the theory that the row is "scoped by
// conversation_id" (see the old `// tenant-scope-ok` comments).
//
// That is a live isolation bug. The `2026_05_09_tenant_id_core.sql` migration
// added `tenant_id` to this table with a DEFAULT of the nycmaid tenant
// ('00000000-0000-0000-0000-000000000001'). So an insert that omits `tenant_id`
// is NOT stored as NULL — it is silently stamped as nycmaid, regardless of which
// tenant actually owns the conversation. Once scoped-client RLS lands (see
// docs/tenant-isolation-rls-plan.md), the real tenant would not see its own
// messages and nycmaid would see everyone's.
//
// THE FIX
// -------
// Derive `tenant_id` from the PARENT conversation (the single source of truth)
// and stamp it on every insert. If a caller passes an `expectedTenantId` that
// disagrees with the conversation's real owner, the append is refused — a
// message can never be written under a different tenant than its conversation.
//
// This never throws; it returns `{ data, error }` (mirroring supabase-js) so the
// mix of awaited and fire-and-forget call sites can keep their existing shape.

import { supabaseAdmin } from './supabase'

export type ConversationMessageInput = {
  conversation_id: string
  direction: 'inbound' | 'outbound'
  message: string
}

export type InsertConversationMessageOptions = {
  /**
   * The caller's already-resolved tenant. When provided and it disagrees with
   * the parent conversation's real owner, the insert is refused (cross-tenant
   * append blocked). Optional — when omitted, the tenant is simply derived from
   * the conversation.
   */
  expectedTenantId?: string | null
  /** Return the inserted row (adds a RETURNING clause). Off by default. */
  returnRow?: boolean
}

export type InsertConversationMessageResult = {
  data: Record<string, unknown> | null
  error: Error | null
}

/**
 * Insert one `sms_conversation_messages` row with `tenant_id` derived from its
 * parent conversation. See file header for the isolation rationale.
 */
export async function insertConversationMessage(
  input: ConversationMessageInput,
  opts: InsertConversationMessageOptions = {},
): Promise<InsertConversationMessageResult> {
  const { conversation_id } = input
  if (!conversation_id) {
    return { data: null, error: new Error('insertConversationMessage: conversation_id is required') }
  }

  // Single source of truth: the parent conversation's tenant.
  const { data: convoData, error: convoErr } = await supabaseAdmin
    .from('sms_conversations')
    .select('tenant_id')
    .eq('id', conversation_id)
    .maybeSingle()

  const convo = convoData as { tenant_id?: string | null } | null
  const tenantId = convo?.tenant_id ?? null

  if (convoErr || !tenantId) {
    return {
      data: null,
      error: new Error(
        `insertConversationMessage: cannot resolve tenant for conversation ${conversation_id}` +
          (convoErr ? ` (${convoErr.message})` : ' (conversation not found)'),
      ),
    }
  }

  // Defense in depth: a caller operating as tenant B must never append to a
  // conversation owned by tenant A.
  if (opts.expectedTenantId && opts.expectedTenantId !== tenantId) {
    return {
      data: null,
      error: new Error('insertConversationMessage: cross-tenant append blocked'),
    }
  }

  const payload = { ...input, tenant_id: tenantId }
  const query = supabaseAdmin.from('sms_conversation_messages').insert(payload)
  const { data, error } = opts.returnRow ? await query.select().single() : await query

  return {
    data: (data as Record<string, unknown> | null) ?? null,
    error: error ? new Error(error.message) : null,
  }
}
