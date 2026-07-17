import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveAnthropic } from '@/lib/anthropic-client'
import { NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'

/**
 * Post-conversation quality scorer.
 * Two layers: rule-based (instant, free) + AI self-review (honest, costs tokens).
 * Rule-based — no AI cost. Runs after conversation ends.
 */

interface ScoreResult {
  score: number        // 0-100
  issues: string[]     // list of problems found
  strengths: string[]  // what went well
}

export async function scoreConversation(conversationId: string): Promise<ScoreResult> {
  // Load conversation + messages
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

  const yinezMessages = messages.filter(m => m.direction === 'outbound').map(m => m.message)
  const clientMessages = messages.filter(m => m.direction === 'inbound').map(m => m.message)
  const allYinez = yinezMessages.join(' ')
  const checklist = convo.booking_checklist || {}

  let score = 70 // start at 70, deduct/add from there
  const issues: string[] = []
  const strengths: string[] = []

  // ── DEDUCTIONS ──

  // Asked for name as first question (-15)
  if (yinezMessages.length > 0 && /what(?:'s| is) your (?:first )?(?:and last )?name/i.test(yinezMessages[0])) {
    score -= 15
    issues.push('Asked name as first question')
  }

  // Mentioned recurring/weekly/biweekly (-10)
  if (/recurring|weekly|biweekly|bi-weekly|how often|monthly/i.test(allYinez)) {
    score -= 10
    issues.push('Mentioned recurring/frequency')
  }

  // Invented a total price (not hourly) (-10)
  const priceMatches = allYinez.match(/\$\d{3,}/g) || []
  const inventedPrices = priceMatches.filter(p => !['$100', '$99'].includes(p) && !/\/hr/i.test(allYinez.substring(allYinez.indexOf(p) - 5, allYinez.indexOf(p) + p.length + 5)))
  if (inventedPrices.length > 0) {
    score -= 10
    issues.push('Invented total price: ' + inventedPrices.join(', '))
  }

  // Used banned phrases (-5 each)
  const banned = ['great question', 'happy to help', "I'd love to help", "I'd be happy", 'certainly', 'absolutely']
  for (const phrase of banned) {
    if (allYinez.toLowerCase().includes(phrase)) {
      score -= 5
      issues.push('Banned phrase: "' + phrase + '"')
    }
  }

  // Used wrong emojis (-5)
  if (/📅|🏠|💰|📧|✅|🎉|✨|🧹|🏡|💪|🎊/.test(allYinez)) {
    score -= 5
    issues.push('Used non-approved emoji')
  }

  // Mixed up pricing ($59=we bring or $79=you provide) (-15)
  if (/\$59.*we bring|\$59.*we supply|\$79.*you provide|\$79.*your supplies|\$79.*you supply|\$75.*you provide|\$75.*your supplies|\$75.*you supply/i.test(allYinez)) {
    // Check more carefully — need $79/$75 and "you provide" to be in same sentence
    const sentences = allYinez.split(/[.!?\n]/)
    for (const s of sentences) {
      if (/\$(?:79|75)/i.test(s) && /you provide|your (?:own )?supplies/i.test(s) && !/we/i.test(s)) {
        score -= 15
        issues.push('Mixed up pricing — said $79 is client supplies')
        break
      }
      if (/\$59/i.test(s) && /we (?:bring|supply|provide)/i.test(s) && !/you/i.test(s)) {
        score -= 15
        issues.push('Mixed up pricing — said $59 is we supply')
        break
      }
    }
  }

  // Client asked for human/escalated (-10)
  const clientAskedHuman = clientMessages.some(m => /talk to|speak to|call me|human|manager|transfer/i.test(m))
  if (clientAskedHuman) {
    score -= 10
    issues.push('Client requested human')
  }

  // Yinez offered free redo or refund without manager (-10)
  if (/free.*redo|redo.*free|no charge|full refund|refund.*full/i.test(allYinez) && !/manager|review/i.test(allYinez)) {
    score -= 10
    issues.push('Offered refund/redo without manager approval')
  }

  // Caved to gaslighter — agreed cleaner wasn't there when data shows otherwise (-20)
  if (/you.re right.*shouldn.t.*charged|if no one came/i.test(allYinez)) {
    score -= 20
    issues.push('Caved to gaslighter')
  }

  // Too many messages to reach booking (>12 = inefficient) (-5)
  if (convo.outcome === 'booked' && messages.length > 24) {
    score -= 5
    issues.push('Too many messages (' + messages.length + ') to complete booking')
  }

  // Client abandoned (-5)
  if (convo.outcome === 'abandoned') {
    score -= 5
    issues.push('Conversation abandoned')
  }

  // ── BONUSES ──

  // Booking completed (+15)
  if (convo.outcome === 'booked') {
    score += 15
    strengths.push('Booking completed')
  }

  // Answered question mid-flow without breaking flow (+5)
  let questionAnswered = false
  for (let i = 0; i < clientMessages.length; i++) {
    if (/\?$|how much|do you|are you|what if|insured/i.test(clientMessages[i])) {
      const nextYinez = yinezMessages[i]
      if (nextYinez && !/what.*name|what.*address/i.test(nextYinez)) {
        questionAnswered = true
      }
    }
  }
  if (questionAnswered) {
    score += 5
    strengths.push('Answered question mid-flow')
  }

  // Correct cancellation policy in recap (+5)
  if (/no cancellation.*first.time|first.time.*cannot cancel/i.test(allYinez)) {
    score += 5
    strengths.push('Included cancellation policy in recap')
  }

  // Mentioned portal (+3)
  if (/portal|thenycmaid\.com\/portal/i.test(allYinez)) {
    score += 3
    strengths.push('Mentioned client portal')
  }

  // Handled Spanish (+5)
  const hasSpanish = clientMessages.some(m => /hola|necesito|limpieza|habitacion|baño|gracias/i.test(m))
  const yinezSpanish = yinezMessages.some(m => /perfecto|limpieza|habitacion|baño|programar/i.test(m))
  if (hasSpanish && yinezSpanish) {
    score += 5
    strengths.push('Handled Spanish conversation')
  }

  // Fast response (few messages to booking) (+5)
  if (convo.outcome === 'booked' && messages.length <= 16) {
    score += 5
    strengths.push('Efficient booking (' + messages.length + ' messages)')
  }

  // Cap at 0-100
  score = Math.max(0, Math.min(100, score))

  // Save to conversation
  await supabaseAdmin
    .from('sms_conversations')
    .update({ quality_score: score, quality_issues: issues })
    .eq('id', conversationId)
    .then(() => {}, () => {})

  return { score, issues, strengths }
}

/**
 * AI Self-Review — Yinez critiques her own conversation.
 * She doesn't know it's her. She's reviewing "an agent named Yinez."
 * Brutally honest. No ego. Saves the review to yinez_memory as type 'self_review'.
 */
export async function selfReviewConversation(conversationId: string): Promise<{ review: string; score: number; improvements: string[] }> {
  const { data: messages } = await supabaseAdmin
    .from('sms_conversation_messages')
    .select('direction, message')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (!messages?.length) return { review: 'No messages to review', score: 0, improvements: [] }

  const transcript = messages.map(m =>
    `${m.direction === 'inbound' ? 'CLIENT' : 'AGENT'}: ${m.message}`
  ).join('\n')

  const { data: convo } = await supabaseAdmin
    .from('sms_conversations')
    .select('outcome, name, tenant_id')
    .eq('id', conversationId)
    .single()

  // Tenant's own Anthropic key if set, platform key otherwise. Derive the
  // tenant from the conversation (this scorer takes no tenantId directly).
  const anthropic = await resolveAnthropic((convo?.tenant_id as string) || '')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `You are a brutally honest quality reviewer for a cleaning service called The NYC Maid. You are reviewing a conversation between a client and an AI agent named "Yinez."

Your job: tear it apart. Find every mistake, every missed opportunity, every moment she could have done better.

RULES SELENA MUST FOLLOW:
- Never ask for name as the first question
- Pricing: $79/hr (company brings supplies) or $59/hr (client provides), $99/hr same-day. NEVER confuse which is which
- Never push recurring discounts during first-time booking flow (only mention if asked)
- Never invent total prices — only quote hourly rates
- Never say: "certainly" "absolutely" "great question" "happy to help" "I'd love to help"
- Only use 😊 emoji
- Must include no-cancellation policy in recap for first-time clients
- Must mention client portal (thenycmaid.com/portal)
- Must call create_booking tool (not just say "confirmed")
- For disputes: must pull GPS check-in/out data and show the math. Never cave or offer refunds without manager
- All bookings are one-time. Never ask about recurring frequency
- She IS the business — should say "we" and "our", not "the system" or "the company"

SCORE 0-100. Be harsh. Every violation is points off.

Respond in this exact format:
SCORE: [number]
REVIEW: [2-3 sentences of honest assessment]
MISTAKES: [bullet list of specific errors, or "None" if perfect]
IMPROVEMENTS: [bullet list of specific suggestions]`,
      messages: [{
        role: 'user',
        content: `Review this conversation. Outcome: ${convo?.outcome || 'unknown'}.\n\n${transcript}`,
      }],
    })

    const text = response.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text').map(b => b.text).join('')

    // Parse the response
    const scoreMatch = text.match(/SCORE:\s*(\d+)/)
    const reviewMatch = text.match(/REVIEW:\s*([\s\S]+?)(?=MISTAKES:|$)/)
    const improvementsMatch = text.match(/IMPROVEMENTS:\s*([\s\S]+?)$/)

    const aiScore = scoreMatch ? parseInt(scoreMatch[1]) : 50
    const review = reviewMatch ? reviewMatch[1].trim() : text
    const improvements = improvementsMatch
      ? improvementsMatch[1].split(/[-•]\s*/).filter(s => s.trim().length > 3).map(s => s.trim())
      : []

    // Save the self-review to yinez_memory. tenant_id stamped explicitly
    // (from the convo row already loaded above, falling back to nycmaid for
    // legacy null rows) — an unstamped insert falls back to yinez_memory's
    // column DEFAULT ('nycmaid', the same rollout safety net from
    // 2026_05_09_tenant_id_core.sql as sms_conversation_messages), mis-tagging
    // every OTHER tenant's self-review as nycmaid's and hiding it from that
    // tenant's own tenant-scoped yinez_memory reads (selena/agent.ts,
    // selena/tools.ts recall). Same P2 write-side-siblings class fixed on the
    // sms_conversation_messages inserts across chat/yinez/admin-chat/selena/
    // sms/webhooks (deploy-prep/idor-remediation-status.md).
    const { data: convoData } = await supabaseAdmin.from('sms_conversations').select('client_id').eq('id', conversationId).single()
    const { error: memErr } = await supabaseAdmin.from('yinez_memory').insert({
      tenant_id: (convo?.tenant_id as string) || NYCMAID_TENANT_ID,
      client_id: convoData?.client_id || null,
      type: 'self_review',
      content: `Score: ${aiScore}/100. ${review}${improvements.length > 0 ? ' Improvements: ' + improvements.join('; ') : ''}`,
      source: 'yinez',
    })
    if (memErr) console.error('Self-review memory save failed:', memErr)

    // Update conversation with AI score
    const { error: updateErr } = await supabaseAdmin.from('sms_conversations')
      .update({ quality_score: aiScore })
      .eq('id', conversationId)
    if (updateErr) console.error('Score update failed:', updateErr)

    return { review, score: aiScore, improvements }
  } catch (err) {
    console.error('Self-review failed:', err)
    return { review: 'Review failed', score: 0, improvements: [] }
  }
}

/**
 * Score all unscored conversations.
 * Called by cron or manually.
 */
export async function scoreRecentConversations(): Promise<{ scored: number; avgScore: number }> {
  const { data: unscored } = await supabaseAdmin
    .from('sms_conversations')  // tenant-scope-ok: nycmaid-legacy helper; retires with the standalone cutover
    .select('id')
    .is('quality_score', null)
    .not('outcome', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  let totalScore = 0
  let count = 0

  for (const convo of unscored || []) {
    const result = await scoreConversation(convo.id)
    totalScore += result.score
    count++
  }

  return { scored: count, avgScore: count > 0 ? Math.round(totalScore / count) : 0 }
}
