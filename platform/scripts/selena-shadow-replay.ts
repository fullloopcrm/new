/**
 * Selena shadow replay — compares fullloop's ported Selena against what nycmaid's
 * Selena actually responded with for real conversation history.
 *
 * READ-ONLY on the source conversations being sampled. However — IMPORTANT:
 * askSelena() may call tool handlers that mutate other tables (clients, bookings,
 * admin_tasks, selena_memory, etc) and may send real SMS via the tenant's Telnyx
 * credentials. Only run this with --dry-run, or AFTER temporarily removing the
 * tenant's telnyx_api_key (so SMS sends silently fail) and against a DB you are
 * ok writing to.
 *
 * Safer path before a real replay: set tenants.telnyx_api_key = NULL for the
 * shadow window, run this, then restore.
 *
 * USAGE:
 *   pnpm tsx scripts/selena-shadow-replay.ts --days 7 --sample 50
 *   pnpm tsx scripts/selena-shadow-replay.ts --dry-run            (shows plan, no API calls)
 *   pnpm tsx scripts/selena-shadow-replay.ts --tenant <id>        (override tenant)
 *
 * REQUIRED ENV (use .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY
 *
 * Output: scripts/out/selena-shadow-<YYYY-MM-DD>.md
 */
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

// Load .env.local manually — matches the pattern used by other scripts in this repo.
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const TENANT_NYCMAID = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

type Args = { days: number; sample: number; tenantId: string; dryRun: boolean }
function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (flag: string) => {
    const i = argv.indexOf(flag)
    return i >= 0 ? argv[i + 1] : undefined
  }
  return {
    days: Number.parseInt(get('--days') || '7', 10),
    sample: Number.parseInt(get('--sample') || '50', 10),
    tenantId: get('--tenant') || TENANT_NYCMAID,
    dryRun: argv.includes('--dry-run'),
  }
}

interface InboundEvent {
  conversation_id: string
  message_id: string
  inbound_text: string
  inbound_ts: string
  actual_outbound_text: string | null
  actual_outbound_ts: string | null
  phone: string | null
}

async function main() {
  const args = parseArgs()
  console.log(`[shadow-replay] days=${args.days} sample=${args.sample} tenant=${args.tenantId} dryRun=${args.dryRun}`)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const since = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000).toISOString()

  // 1. Get conversation IDs for tenant in window.
  const { data: convos, error: convErr } = await supabase
    .from('sms_conversations')
    .select('id, phone')
    .eq('tenant_id', args.tenantId)
    .gte('created_at', since)
  if (convErr) throw convErr
  const convoIds = (convos || []).map(c => c.id)
  const phoneByConvo: Record<string, string> = Object.fromEntries((convos || []).map(c => [c.id, c.phone as string]))
  console.log(`[shadow-replay] ${convoIds.length} conversations in window`)

  if (convoIds.length === 0) {
    console.log('[shadow-replay] nothing to replay')
    return
  }

  // 2. Pull all messages for those conversations, in order. Batch to keep URL short.
  const msgs: Array<{ id: string; conversation_id: string; direction: string; message: string; created_at: string }> = []
  const BATCH = 100
  for (let i = 0; i < convoIds.length; i += BATCH) {
    const chunk = convoIds.slice(i, i + BATCH)
    const { data, error } = await supabase
      .from('sms_conversation_messages')
      .select('id, conversation_id, direction, message, created_at')
      .in('conversation_id', chunk)
      .order('created_at', { ascending: true })
    if (error) throw error
    for (const m of data || []) msgs.push(m as typeof msgs[number])
  }

  // 3. Build (inbound → immediately-next outbound) pairs.
  const byConvo: Record<string, Array<{ id: string; direction: string; message: string; ts: string }>> = {}
  for (const m of msgs || []) {
    const arr = byConvo[m.conversation_id as string] ||= []
    arr.push({ id: m.id as string, direction: m.direction as string, message: m.message as string, ts: m.created_at as string })
  }

  const events: InboundEvent[] = []
  for (const [convoId, messages] of Object.entries(byConvo)) {
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i]
      if (m.direction !== 'inbound') continue
      const nextOutbound = messages.slice(i + 1).find(x => x.direction === 'outbound')
      events.push({
        conversation_id: convoId,
        message_id: m.id,
        inbound_text: m.message,
        inbound_ts: m.ts,
        actual_outbound_text: nextOutbound?.message ?? null,
        actual_outbound_ts: nextOutbound?.ts ?? null,
        phone: phoneByConvo[convoId] ?? null,
      })
    }
  }
  console.log(`[shadow-replay] ${events.length} inbound events collected`)

  // 4. Sample.
  const sample = events
    .map(e => ({ e, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .slice(0, Math.min(args.sample, events.length))
    .map(x => x.e)
  console.log(`[shadow-replay] sampled ${sample.length}`)

  if (args.dryRun) {
    const outDir = resolve(process.cwd(), 'scripts/out')
    mkdirSync(outDir, { recursive: true })
    const dryPath = resolve(outDir, `selena-shadow-${new Date().toISOString().slice(0, 10)}-dryrun.json`)
    writeFileSync(dryPath, JSON.stringify({ args, eventCount: events.length, sampleSize: sample.length, sample }, null, 2))
    console.log(`[shadow-replay] dry-run manifest: ${dryPath}`)
    return
  }

  // 5. Replay each sampled inbound against Selena, using a throwaway conversation
  //    that hydrates prior transcript from the original conversation (up to this point).
  const { askSelena } = await import('@/lib/selena')

  interface ReplayRow extends InboundEvent {
    replay_text: string
    replay_intent: string | null
    replay_ms: number
    replay_error: string | null
    bucket: 'identical' | 'semantic_match' | 'regression' | 'new_behavior' | 'error'
  }
  const results: ReplayRow[] = []

  for (const ev of sample) {
    const throwawayId = randomUUID()
    const t0 = Date.now()
    let replayText = ''
    let replayError: string | null = null

    try {
      // Hydrate throwaway with prior messages from the real conversation up to ev.
      const prior = byConvo[ev.conversation_id]
        .filter(m => m.ts < ev.inbound_ts)
        .slice(-10) // last 10 prior turns

      if (prior.length > 0) {
        await supabase.from('sms_conversations').insert({
          id: throwawayId,
          tenant_id: args.tenantId,
          phone: ev.phone || 'shadow-replay',
          state: 'welcome',
          shadow: true, // marker column may not exist — insert ignores unknown
        } as Record<string, unknown>).then(() => {})

        await supabase.from('sms_conversation_messages').insert(
          prior.map(m => ({
            conversation_id: throwawayId,
            direction: m.direction,
            message: m.message,
          }))
        )
      }

      const r = await askSelena(args.tenantId, 'sms', ev.inbound_text, throwawayId, ev.phone || undefined)
      replayText = r.text || ''
    } catch (err) {
      replayError = err instanceof Error ? err.message : String(err)
    } finally {
      // Clean up throwaway
      await supabase.from('sms_conversation_messages').delete().eq('conversation_id', throwawayId)
      await supabase.from('sms_conversations').delete().eq('id', throwawayId)
    }

    const replayMs = Date.now() - t0
    const bucket = classify(ev.actual_outbound_text, replayText, !!replayError)

    results.push({
      ...ev,
      replay_text: replayText,
      replay_intent: null,
      replay_ms: replayMs,
      replay_error: replayError,
      bucket,
    })
    console.log(`  [${bucket}] conv=${ev.conversation_id.slice(0, 8)} ms=${replayMs}`)
  }

  // 6. Report.
  const outDir = resolve(process.cwd(), 'scripts/out')
  mkdirSync(outDir, { recursive: true })
  const today = new Date().toISOString().slice(0, 10)
  const reportPath = resolve(outDir, `selena-shadow-${today}.md`)
  const jsonPath = resolve(outDir, `selena-shadow-${today}.json`)

  const counts = results.reduce((acc, r) => { acc[r.bucket] = (acc[r.bucket] || 0) + 1; return acc }, {} as Record<string, number>)
  const avgMs = Math.round(results.reduce((s, r) => s + r.replay_ms, 0) / Math.max(1, results.length))

  const md = [
    `# Selena Shadow Replay — ${today}`,
    ``,
    `Window: last ${args.days} days · Sampled: ${results.length} of ${events.length} eligible inbound events`,
    `Tenant: \`${args.tenantId}\``,
    ``,
    `## Buckets`,
    ``,
    ...(Object.entries(counts).map(([k, v]) => `- **${k}**: ${v}`)),
    ``,
    `Average Selena latency: ${avgMs}ms`,
    ``,
    `## Sample diffs (first 20)`,
    ``,
    ...results.slice(0, 20).flatMap(r => [
      `### conv \`${r.conversation_id.slice(0, 8)}\` · bucket \`${r.bucket}\``,
      ``,
      `**Inbound:** ${r.inbound_text}`,
      ``,
      `**Actual (nycmaid):** ${r.actual_outbound_text || '(none)'}`,
      ``,
      `**Replay (fullloop):** ${r.replay_text || '(empty)'}`,
      r.replay_error ? `\n**Error:** ${r.replay_error}` : '',
      ``,
      `---`,
      ``,
    ]),
  ].join('\n')

  writeFileSync(reportPath, md)
  writeFileSync(jsonPath, JSON.stringify(results, null, 2))
  console.log(`\n[shadow-replay] report: ${reportPath}`)
  console.log(`[shadow-replay] raw json: ${jsonPath}`)
  console.log(`[shadow-replay] buckets:`, counts)
}

function classify(actual: string | null, replay: string, errored: boolean): 'identical' | 'semantic_match' | 'regression' | 'new_behavior' | 'error' {
  if (errored) return 'error'
  if (!actual && !replay) return 'identical'
  if (!actual && replay) return 'new_behavior'
  if (actual && !replay) return 'regression'
  const a = (actual || '').trim().toLowerCase()
  const b = replay.trim().toLowerCase()
  if (a === b) return 'identical'
  // Rough semantic match: same first 3 words and length within 50%.
  const firstNonTrivialWords = (s: string) => s.split(/\s+/).filter(w => w.length > 2).slice(0, 3).join(' ')
  if (firstNonTrivialWords(a) === firstNonTrivialWords(b)) return 'semantic_match'
  // Very different — potential regression.
  return 'regression'
}

main().catch(err => {
  console.error('[shadow-replay] fatal:', err)
  process.exit(1)
})
