// Automated client deduplication (Jeff, 2026-08-13): never have duplicate
// clients, auto-merge the safe cases, never lose a record (only combine).
//
// The actual merge mechanics already existed (./client-merge.ts -- re-points
// every FK table onto a canonical client, soft-retires the loser via
// clients.active=false, never a hard delete). This module adds the decision
// layer on top: which pairs are safe to merge with zero human review, which
// need a human, and which client wins the canonical/primary spot.
//
// TIE-BREAK: the client with an ACTIVE booking wins primary. If both or
// neither has one, whichever has more recent activity (booking/payment/SMS/
// comhub touch) wins. If neither has any activity at all, the more recently
// created row is kept (nothing else to differentiate two empty shells).
//
// AUTOMATION TIER: a pair matching on BOTH phone AND email is the
// zero-review auto-merge tier -- two different real customers sharing both
// pieces of contact info at once is a vanishingly rare false positive. A
// pair matching on only phone OR only email is queued for a human instead
// (client_dedupe_queue) -- same caution scripts/dedupe-clients-phone.mjs
// already encoded: a shared phone with different names is often a reused
// number (family landline), not one customer duplicated.
//
// Two more guards apply even within the auto-merge tier, ported from
// scripts/dedupe-clients-phone.mjs, and downgrade to the queue instead of
// merging blind:
//   - name mismatch on an exact phone+email match (still possible: a shared
//     account, a typo'd match) -- suspicious enough to want a human look.
//   - a colliding job_seq between the two clients' bookings/jobs -- a real,
//     customer-facing job number; not auto-resolvable (deleting destroys a
//     real booking, renumbering could change a number a customer already
//     saw on an invoice).
import { tenantDb } from './tenant-db'
import { mergeClients, type ClientMergeResult } from './client-merge'

// Matches the convention already established in
// src/app/api/client/book/route.ts's create_booking_atomic call.
const ACTIVE_BOOKING_STATUSES = ['scheduled', 'pending', 'confirmed', 'in_progress']

// Subset of client-merge.ts's REPOINT_TABLES -- just the tables that
// represent the client actually doing something (booking, paying,
// messaging), not their own static records (contacts/properties), which say
// nothing about recency.
const ACTIVITY_TABLES = ['bookings', 'payments', 'client_sms_messages', 'comhub_contacts'] as const

export interface CanonicalPick {
  canonicalId: string
  duplicateId: string
  reason: string
}

async function countActiveBookings(tenantId: string, clientId: string): Promise<number> {
  const db = tenantDb(tenantId)
  const { count } = await db
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .in('status', ACTIVE_BOOKING_STATUSES)
  return count || 0
}

async function lastActivityAt(tenantId: string, clientId: string): Promise<string | null> {
  const db = tenantDb(tenantId)
  const timestamps = await Promise.all(
    ACTIVITY_TABLES.map(async (table) => {
      const { data } = await db
        .from(table)
        .select('created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
      return (data?.[0] as { created_at?: string } | undefined)?.created_at || null
    })
  )
  const present = timestamps.filter((t): t is string => !!t)
  if (!present.length) return null
  return present.sort().reverse()[0]
}

/** Decides which of two duplicate client rows should be canonical. See module docstring for the rule. */
export async function pickCanonical(tenantId: string, clientAId: string, clientBId: string): Promise<CanonicalPick> {
  const [activeA, activeB] = await Promise.all([
    countActiveBookings(tenantId, clientAId),
    countActiveBookings(tenantId, clientBId),
  ])
  if (activeA > 0 && activeB === 0) {
    return { canonicalId: clientAId, duplicateId: clientBId, reason: 'has an active booking, the other does not' }
  }
  if (activeB > 0 && activeA === 0) {
    return { canonicalId: clientBId, duplicateId: clientAId, reason: 'has an active booking, the other does not' }
  }

  const [lastA, lastB] = await Promise.all([lastActivityAt(tenantId, clientAId), lastActivityAt(tenantId, clientBId)])
  if (lastA && (!lastB || lastA > lastB)) {
    return { canonicalId: clientAId, duplicateId: clientBId, reason: 'more recent activity' }
  }
  if (lastB && (!lastA || lastB > lastA)) {
    return { canonicalId: clientBId, duplicateId: clientAId, reason: 'more recent activity' }
  }

  const db = tenantDb(tenantId)
  const { data } = await db.from('clients').select('id, created_at').in('id', [clientAId, clientBId])
  const rows = (data || []) as { id: string; created_at: string }[]
  const sorted = [...rows].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const newer = sorted[0]?.id
  const older = sorted[1]?.id
  return {
    canonicalId: newer || clientAId,
    duplicateId: older || clientBId,
    reason: 'neither side has any activity -- kept the more recently created row',
  }
}

function normalizeName(n: string | null | undefined): string {
  return (n || '').trim().toLowerCase()
}

/** Safety guard ported from scripts/dedupe-clients-phone.mjs -- see module docstring. */
export function namesAgree(nameA: string | null | undefined, nameB: string | null | undefined): boolean {
  return normalizeName(nameA) === normalizeName(nameB)
}

async function jobSeqsFor(tenantId: string, clientId: string): Promise<Set<number>> {
  const db = tenantDb(tenantId)
  const [bookings, jobs] = await Promise.all([
    db.from('bookings').select('job_seq').eq('client_id', clientId).not('job_seq', 'is', null),
    db.from('jobs').select('job_seq').eq('client_id', clientId).not('job_seq', 'is', null),
  ])
  const seqs = new Set<number>()
  for (const row of [...(bookings.data || []), ...(jobs.data || [])] as { job_seq: number | null }[]) {
    if (row.job_seq != null) seqs.add(row.job_seq)
  }
  return seqs
}

/** Ported from scripts/dedupe-clients-phone.mjs's jobSeqBlocked check -- see module docstring. */
export async function hasJobSeqCollision(tenantId: string, clientAId: string, clientBId: string): Promise<boolean> {
  const [seqsA, seqsB] = await Promise.all([jobSeqsFor(tenantId, clientAId), jobSeqsFor(tenantId, clientBId)])
  for (const seq of seqsA) {
    if (seqsB.has(seq)) return true
  }
  return false
}

export type MatchType = 'phone' | 'email' | 'both'

export interface DuplicatePair {
  tenantId: string
  clientAId: string
  clientBId: string
  matchType: MatchType
  matchValue: string
}

/**
 * Finds candidate duplicate clients within one tenant by exact phone or
 * exact (case-insensitive) email match. `full` pairs match on BOTH fields
 * (the zero-review auto-merge tier); `partial` pairs match on only one
 * (routed to the review queue). Only active (non-retired) clients are
 * considered -- a client already soft-retired by a prior merge shouldn't be
 * re-surfaced as a fresh duplicate candidate.
 */
export async function findDuplicatePairs(tenantId: string): Promise<{ full: DuplicatePair[]; partial: DuplicatePair[] }> {
  const db = tenantDb(tenantId)
  const { data } = await db.from('clients').select('id, phone, email').eq('active', true)
  const rows = (data || []) as { id: string; phone: string | null; email: string | null }[]

  const byPhone = new Map<string, typeof rows>()
  const byEmail = new Map<string, typeof rows>()
  for (const r of rows) {
    if (r.phone) byPhone.set(r.phone, [...(byPhone.get(r.phone) || []), r])
    if (r.email) {
      const key = r.email.toLowerCase()
      byEmail.set(key, [...(byEmail.get(key) || []), r])
    }
  }

  const seen = new Set<string>()
  const full: DuplicatePair[] = []
  const partial: DuplicatePair[] = []
  const pairKey = (a: string, b: string) => [a, b].sort().join('::')

  for (const [phone, group] of byPhone) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]
        const b = group[j]
        const key = pairKey(a.id, b.id)
        if (seen.has(key)) continue
        seen.add(key)
        const emailMatches = !!a.email && !!b.email && a.email.toLowerCase() === b.email.toLowerCase()
        const pair: DuplicatePair = { tenantId, clientAId: a.id, clientBId: b.id, matchType: emailMatches ? 'both' : 'phone', matchValue: phone }
        ;(emailMatches ? full : partial).push(pair)
      }
    }
  }

  for (const [email, group] of byEmail) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]
        const b = group[j]
        const key = pairKey(a.id, b.id)
        if (seen.has(key)) continue // already classified via the phone pass above
        seen.add(key)
        partial.push({ tenantId, clientAId: a.id, clientBId: b.id, matchType: 'email', matchValue: email })
      }
    }
  }

  return { full, partial }
}

export interface QueueInput {
  tenantId: string
  clientAId: string
  clientBId: string
  matchType: MatchType
  matchValue: string
  suggestedReason?: string
}

/**
 * Queues a candidate duplicate pair for human review. Idempotent: a second
 * call for the same unordered pair while a 'pending' row already exists is a
 * silent no-op, backed by client_dedupe_queue's partial unique index on
 * (tenant_id, LEAST(a,b), GREATEST(a,b)) WHERE status='pending' -- both the
 * real-time creation check and the daily sweep can surface the same pair
 * without piling up duplicate queue rows.
 */
export async function queueForReview(input: QueueInput): Promise<void> {
  const [clientAId, clientBId] = [input.clientAId, input.clientBId].sort()
  let suggestedCanonicalId: string | null = null
  let suggestedReason = input.suggestedReason || null
  try {
    const pick = await pickCanonical(input.tenantId, clientAId, clientBId)
    suggestedCanonicalId = pick.canonicalId
    suggestedReason = suggestedReason || pick.reason
  } catch {
    // Non-fatal -- the queue row is still useful without a suggestion; a
    // human reviewing it can pick a canonical manually.
  }

  const db = tenantDb(input.tenantId)
  const { error } = await db.from('client_dedupe_queue').insert({
    client_a_id: clientAId,
    client_b_id: clientBId,
    match_type: input.matchType,
    match_value: input.matchValue,
    suggested_canonical_id: suggestedCanonicalId,
    suggested_reason: suggestedReason,
  })
  // Postgres unique_violation -- another call already queued this exact
  // pending pair (race between the real-time check and the sweep, or the
  // sweep re-finding a pair it already queued on a prior run). Not an error.
  if (error && (error as { code?: string }).code !== '23505') {
    throw error
  }
}

export interface ResolveResult {
  merged: boolean
  queued: boolean
  mergeResult?: ClientMergeResult
}

/**
 * Auto-merges a full-match pair (same phone AND same email) with no human
 * review, unless a safety guard trips (name mismatch or job_seq collision --
 * see module docstring), in which case it's downgraded to the review queue
 * instead of merging blind.
 */
export async function resolveFullMatch(pair: DuplicatePair, mergedBy?: string): Promise<ResolveResult> {
  const db = tenantDb(pair.tenantId)
  const { data } = await db.from('clients').select('id, name').in('id', [pair.clientAId, pair.clientBId])
  const rows = (data || []) as { id: string; name: string | null }[]
  const a = rows.find((r) => r.id === pair.clientAId)
  const b = rows.find((r) => r.id === pair.clientBId)

  if (!a || !b || !namesAgree(a.name, b.name)) {
    await queueForReview({ ...pair, suggestedReason: 'name mismatch on an exact phone+email match -- needs a human look' })
    return { merged: false, queued: true }
  }
  if (await hasJobSeqCollision(pair.tenantId, pair.clientAId, pair.clientBId)) {
    await queueForReview({ ...pair, suggestedReason: 'colliding job/booking numbers between the two clients -- needs a human look' })
    return { merged: false, queued: true }
  }

  const { canonicalId, duplicateId } = await pickCanonical(pair.tenantId, pair.clientAId, pair.clientBId)
  const mergeResult = await mergeClients({ tenantId: pair.tenantId, canonicalClientId: canonicalId, duplicateClientId: duplicateId, mergedBy })
  return { merged: true, queued: false, mergeResult }
}

export interface SweepResult {
  tenantId: string
  merged: number
  queued: number
}

/** Runs the full sweep for one tenant: auto-merges the clean cases, queues the rest. Used by the daily cron. */
export async function sweepTenant(tenantId: string): Promise<SweepResult> {
  const { full, partial } = await findDuplicatePairs(tenantId)
  let merged = 0
  let queued = 0

  for (const pair of full) {
    const result = await resolveFullMatch(pair)
    if (result.merged) merged++
    if (result.queued) queued++
  }
  for (const pair of partial) {
    await queueForReview(pair)
    queued++
  }

  return { tenantId, merged, queued }
}

/** Approves a queued pair: merges it (human-chosen canonical) and marks the queue row resolved. */
export async function approveQueueItem({
  tenantId,
  queueId,
  canonicalClientId,
  duplicateClientId,
  reviewedBy,
}: {
  tenantId: string
  queueId: string
  canonicalClientId: string
  duplicateClientId: string
  reviewedBy?: string
}): Promise<ClientMergeResult> {
  const db = tenantDb(tenantId)
  const result = await mergeClients({ tenantId, canonicalClientId, duplicateClientId, mergedBy: reviewedBy })
  await db
    .from('client_dedupe_queue')
    .update({ status: 'merged', reviewed_by: reviewedBy || null, reviewed_at: new Date().toISOString() })
    .eq('id', queueId)
  return result
}

/** Dismisses a queued pair without merging -- reviewer decided these are two different real people. */
export async function dismissQueueItem({
  tenantId,
  queueId,
  reviewedBy,
}: {
  tenantId: string
  queueId: string
  reviewedBy?: string
}): Promise<void> {
  const db = tenantDb(tenantId)
  await db
    .from('client_dedupe_queue')
    .update({ status: 'dismissed', reviewed_by: reviewedBy || null, reviewed_at: new Date().toISOString() })
    .eq('id', queueId)
}
