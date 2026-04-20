/**
 * Conversation Quality Scorer — ported from nycmaid (2026-04-19), tenant-aware.
 *
 * Two layers:
 *   - Rule-based (instant, free) — runs after every conversation ends.
 *   - AI self-review (token cost) — Selena critiques her own conversation as if
 *     reviewing someone else's. Saved to selena_memory.type='self_review'.
 *
 * Per-tenant rules are read from `tenants.selena_config.scorer` so each business
 * can tune the deductions for their own brand voice.
 */
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

let _anthropic: Anthropic | null = null
function getClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

export interface ScoreResult {
  score: number       // 0-100
  issues: string[]
  strengths: string[]
}

interface TenantScorerConfig {
  banned_phrases?: string[]
  approved_emoji_only?: string[]
  hourly_rates?: number[]   // valid rates the tenant uses
  business_name?: string
  rules_summary?: string    // free-form rules sent to Claude in self-review
}

const DEFAULT_BANNED = ['great question', 'happy to help', "i'd love to help", "i'd be happy", 'certainly', 'absolutely']

async function getTenantScorerConfig(tenantId: string): Promise<TenantScorerConfig> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('name, selena_config')
    .eq('id', tenantId)
    .single()
  const cfg = (data?.selena_config?.scorer || {}) as TenantScorerConfig
  return { ...cfg, business_name: cfg.business_name || data?.name || 'the business' }
}

export async function scoreConversation(tenantId: string, conversationId: string): Promise<ScoreResult> {
  const config = await getTenantScorerConfig(tenantId)

  const { data: convo } = await supabaseAdmin
    .from('sms_conversations')
    .select('outcome, booking_checklist, name, created_at, completed_at, updated_at')
    .eq('id', conversationId)
    .single()

  const { data: messages } = await supabaseAdmin
    .from('sms_conversation_messages')
    .select('direction, message, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (!convo || !messages?.length) return { score: 0, issues: ['No data'], strengths: [] }

  const selenaMessages = messages.filter(m => m.direction === 'outbound').map(m => m.message)
  const clientMessages = messages.filter(m => m.direction === 'inbound').map(m => m.message)
  const allSelena = selenaMessages.join(' ')

  let score = 70
  const issues: string[] = []
  const strengths: string[] = []

  // ── Deductions ──
  if (selenaMessages.length > 0 && /what(?:'s| is) your (?:first )?(?:and last )?name/i.test(selenaMessages[0])) {
    score -= 15
    issues.push('Asked name as first question')
  }

  if (/recurring|weekly|biweekly|bi-weekly|how often|monthly/i.test(allSelena) && convo.outcome !== 'recurring_set') {
    score -= 10
    issues.push('Mentioned recurring/frequency on a one-time booking')
  }

  // Invented totals (large numbers without /hr context)
  const priceMatches = allSelena.match(/\$\d{3,}/g) || []
  const validRates = (config.hourly_rates || [49, 59, 75, 100]).map(r => `$${r}`)
  const inventedPrices = priceMatches.filter(p => !validRates.includes(p))
  if (inventedPrices.length > 0) {
    score -= 10
    issues.push('Possibly invented total: ' + inventedPrices.slice(0, 3).join(', '))
  }

  // Banned phrases
  const banned = (config.banned_phrases || DEFAULT_BANNED).map(p => p.toLowerCase())
  for (const phrase of banned) {
    if (allSelena.toLowerCase().includes(phrase)) {
      score -= 5
      issues.push(`Banned phrase: "${phrase}"`)
    }
  }

  // Non-approved emoji
  const allowed = config.approved_emoji_only || ['😊']
  const emojiRegex = /\p{Emoji_Presentation}/gu
  const emojisUsed = (allSelena.match(emojiRegex) || []).filter(e => !allowed.includes(e))
  if (emojisUsed.length > 0) {
    score -= 5
    issues.push(`Used non-approved emoji: ${[...new Set(emojisUsed)].slice(0, 3).join('')}`)
  }

  // Client requested human (the conversation should have escalated)
  const clientAskedHuman = clientMessages.some(m => /talk to|speak to|call me|human|manager|transfer/i.test(m))
  if (clientAskedHuman) {
    score -= 10
    issues.push('Client requested human')
  }

  // Selena offered free redo or refund without manager
  if (/free.*redo|redo.*free|no charge|full refund|refund.*full/i.test(allSelena) && !/manager|review/i.test(allSelena)) {
    score -= 10
    issues.push('Offered refund/redo without manager approval')
  }

  // Caved to gaslighter
  if (/you'?re right.*shouldn'?t.*charged|if no one came/i.test(allSelena)) {
    score -= 20
    issues.push('Caved to dispute without checking GPS data')
  }

  // Inefficient booking
  if (convo.outcome === 'booked' && messages.length > 24) {
    score -= 5
    issues.push(`Too many messages (${messages.length}) to complete booking`)
  }

  if (convo.outcome === 'abandoned') {
    score -= 5
    issues.push('Conversation abandoned')
  }

  // ── Bonuses ──
  if (convo.outcome === 'booked') {
    score += 15
    strengths.push('Booking completed')
  }

  let questionAnswered = false
  for (let i = 0; i < clientMessages.length; i++) {
    if (/\?$|how much|do you|are you|what if|insured/i.test(clientMessages[i])) {
      const next = selenaMessages[i]
      if (next && !/what.*name|what.*address/i.test(next)) {
        questionAnswered = true
      }
    }
  }
  if (questionAnswered) {
    score += 5
    strengths.push('Answered question mid-flow')
  }

  if (/no cancellation.*first.time|first.time.*cannot cancel|no.cancel/i.test(allSelena)) {
    score += 5
    strengths.push('Included cancellation policy')
  }

  if (/portal/i.test(allSelena)) {
    score += 3
    strengths.push('Mentioned client portal')
  }

  const hasSpanish = clientMessages.some(m => /hola|necesito|limpieza|habitacion|baño|gracias/i.test(m))
  const selenaSpanish = selenaMessages.some(m => /perfecto|limpieza|habitacion|baño|programar/i.test(m))
  if (hasSpanish && selenaSpanish) {
    score += 5
    strengths.push('Handled Spanish')
  }

  if (convo.outcome === 'booked' && messages.length <= 16) {
    score += 5
    strengths.push(`Efficient booking (${messages.length} messages)`)
  }

  score = Math.max(0, Math.min(100, score))

  await supabaseAdmin
    .from('sms_conversations')
    .update({ quality_score: score, quality_issues: issues })
    .eq('id', conversationId)
    .then(() => {}, () => {})

  return { score, issues, strengths }
}

export async function selfReviewConversation(
  tenantId: string,
  conversationId: string
): Promise<{ review: string; score: number; improvements: string[] }> {
  const config = await getTenantScorerConfig(tenantId)

  const { data: messages } = await supabaseAdmin
    .from('sms_conversation_messages')
    .select('direction, message')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (!messages?.length) return { review: 'No messages to review', score: 0, improvements: [] }

  const transcript = messages.map(m => `${m.direction === 'inbound' ? 'CLIENT' : 'AGENT'}: ${m.message}`).join('\n')

  const { data: convo } = await supabaseAdmin
    .from('sms_conversations')
    .select('outcome, name, client_id')
    .eq('id', conversationId)
    .single()

  const tenantRules = config.rules_summary || `
- Do not ask name as the first question
- Use the tenant's hourly-rate options only — do not invent total prices
- Do not mention recurring/weekly/biweekly/monthly on first-time bookings
- Banned phrases: ${(config.banned_phrases || DEFAULT_BANNED).join(', ')}
- Only allowed emoji: ${(config.approved_emoji_only || ['😊']).join(' ')}
- For disputes: pull GPS check-in/out data and present the math; never cave or offer refunds without manager
- Speak as the business — say "we" and "our"
`.trim()

  try {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-6-20250912' as never,
      max_tokens: 500,
      system: `You are a brutally honest quality reviewer for a service business called "${config.business_name}". You are reviewing a conversation between a client and an AI agent.

Your job: tear it apart. Find every mistake, every missed opportunity, every moment the agent could have done better.

RULES THE AGENT MUST FOLLOW:
${tenantRules}

SCORE 0-100. Be harsh. Every violation is points off.

Respond in this exact format:
SCORE: [number]
REVIEW: [2-3 sentences]
MISTAKES: [bullet list, or "None"]
IMPROVEMENTS: [bullet list]`,
      messages: [{ role: 'user', content: `Outcome: ${convo?.outcome || 'unknown'}\n\n${transcript}` }],
    })

    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map(b => b.text).join('')

    const scoreMatch = text.match(/SCORE:\s*(\d+)/)
    const reviewMatch = text.match(/REVIEW:\s*([\s\S]+?)(?=MISTAKES:|$)/)
    const improvementsMatch = text.match(/IMPROVEMENTS:\s*([\s\S]+?)$/)

    const aiScore = scoreMatch ? parseInt(scoreMatch[1]) : 50
    const review = reviewMatch ? reviewMatch[1].trim() : text
    const improvements = improvementsMatch
      ? improvementsMatch[1].split(/[-•]\s*/).filter(s => s.trim().length > 3).map(s => s.trim())
      : []

    await supabaseAdmin.from('selena_memory').insert({
      tenant_id: tenantId,
      client_id: convo?.client_id || null,
      type: 'self_review',
      content: `Score: ${aiScore}/100. ${review}${improvements.length > 0 ? ' Improvements: ' + improvements.join('; ') : ''}`,
      source: 'selena',
    })

    await supabaseAdmin.from('sms_conversations')
      .update({ quality_score: aiScore })
      .eq('id', conversationId)

    return { review, score: aiScore, improvements }
  } catch (err) {
    console.error('[scorer] self-review failed:', err)
    return { review: 'Review failed', score: 0, improvements: [] }
  }
}

export async function scoreRecentConversations(tenantId: string): Promise<{ scored: number; avgScore: number }> {
  const { data: unscored } = await supabaseAdmin
    .from('sms_conversations')
    .select('id')
    .eq('tenant_id', tenantId)
    .is('quality_score', null)
    .not('outcome', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  let total = 0
  let count = 0

  for (const c of unscored || []) {
    const r = await scoreConversation(tenantId, c.id)
    total += r.score
    count++
  }

  return { scored: count, avgScore: count > 0 ? Math.round(total / count) : 0 }
}
