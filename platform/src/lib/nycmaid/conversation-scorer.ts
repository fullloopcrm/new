import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveAnthropic } from '@/lib/anthropic-client'

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

  // Asking for name as the FIRST question is mandated, correct behavior under
  // the current self-book-only strategy (nycmaid.ts: "NEVER skip the name ask
  // on the first turn") — not a defect. Previously docked -15 here, directly
  // contradicting the system prompt's own hard rule (nycmaid cc92e0e6 parity).

  // Pushed recurring/frequency unprompted on what looks like a first-time
  // booking flow (-10). NOT a blanket ding on the word appearing anywhere —
  // a returning client asking about their own existing weekly schedule is a
  // legitimate, necessary use of "weekly" and must not be penalized.
  const clientRaisedFrequency = clientMessages.some(m => /recurring|weekly|biweekly|bi-weekly|how often|monthly/i.test(m))
  if (!clientRaisedFrequency && /recurring|weekly|biweekly|bi-weekly|monthly/i.test(allYinez)) {
    score -= 10
    issues.push('Raised recurring/frequency unprompted')
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
  // Rare under self-book-only (booking happens on the web form, not in chat)
  // — kept for the occasional case where outcome IS 'booked' (owner channel,
  // create_manual_booking), but no longer the primary efficiency signal.
  if (convo.outcome === 'booked' && messages.length > 24) {
    score -= 5
    issues.push('Too many messages (' + messages.length + ') to complete booking')
  }

  // Client abandoned (-5)
  if (convo.outcome === 'abandoned') {
    score -= 5
    issues.push('Conversation abandoned')
  }

  // Booking-shaped conversation (client asked about pricing/availability/
  // "how do I book") that never got the self-book link (-10) — the real
  // dead-end under the current strategy, where every booking-shaped
  // conversation should end with the link, not a chat-completed booking.
  const clientSoundedReadyToBook = clientMessages.some(m => /how (?:much|do i book)|book|available|schedule|price|quote/i.test(m))
  const sentSelfBookLink = /thenycmaid\.com\/book\/new/i.test(allYinez)
  if (clientSoundedReadyToBook && !sentSelfBookLink) {
    score -= 10
    issues.push('Booking-shaped conversation never got the self-book link')
  }

  // ── BONUSES ──

  // Booking completed (+15) — rare under self-book-only, kept for owner-side bookings.
  if (convo.outcome === 'booked') {
    score += 15
    strengths.push('Booking completed')
  }

  // Sent the self-book link on a booking-shaped conversation (+10) — the
  // primary positive signal now that booking itself happens on the web form.
  if (clientSoundedReadyToBook && sentSelfBookLink) {
    score += 10
    strengths.push('Sent self-book link')
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

RULES YINEZ MUST FOLLOW (current strategy — self-book only, effective now; do not score against any older "collect details and book her in chat" flow):
- MUST ask for the client's name as the very first question on a new conversation, then send the self-book link — this is correct, mandated behavior, not a mistake. Do NOT dock points for asking name first.
- MUST NEVER create or confirm a booking herself on a client channel (SMS/web) — she always redirects to the self-book form for the client to book themselves. Calling/attempting create_booking on a client channel, or saying a booking is confirmed without the client having self-booked, is a real violation. She CAN call score_cleaners to give a real yes/no on a specific date before sending the link — that's correct, not a mistake.
- MUST NEVER move or cancel a booking herself when a client asks — reschedule_booking/cancel_booking flag the request for owner approval; she must tell the client it's pending, not done.
- Pricing: $79/hr (company brings supplies) or $59/hr (client provides), $99/hr same-day. NEVER confuse which is which
- Never push recurring discounts during first-time booking flow (only mention if asked)
- Never invent total prices — only quote hourly rates
- Never say: "certainly" "absolutely" "great question" "happy to help" "I'd love to help"
- Only use 😊 emoji, sparingly.
- Must include no-cancellation policy before a client books.
- Must mention client portal (thenycmaid.com/portal) when relevant to account help.
- For disputes: must pull GPS check-in/out data and show the math. Never cave or offer refunds without manager
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

    // Save the self-review to yinez_memory
    const { data: convoData } = await supabaseAdmin.from('sms_conversations').select('client_id').eq('id', conversationId).single()
    const { error: memErr } = await supabaseAdmin.from('yinez_memory').insert({
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
 * Score all unscored, settled conversations.
 * Called by cron or manually.
 *
 * "Settled" = no new message in 2+ hours, NOT outcome IS NOT NULL — outcome
 * only gets set by the booking-created path in src/app/api/yinez/route.ts
 * (`if (result.bookingCreated) { scoreConversation(...) }`), which almost
 * never fires for a client SMS/web conversation now that create_booking is
 * owner-only (self-book-only enforcement, see selena/tools.ts). Gating on
 * outcome would leave nearly every real conversation permanently unscored
 * (nycmaid cc92e0e6 parity — same silent-dead-scoring bug).
 *
 * sms_conversations.updated_at is never bumped on new messages (checked --
 * no per-message write touches it, no DB trigger exists), so "settled" is
 * derived from the latest sms_conversation_messages row per conversation
 * instead of that column.
 */
export async function scoreRecentConversations(): Promise<{ scored: number; avgScore: number }> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const { data: candidates } = await supabaseAdmin
    .from('sms_conversations')  // tenant-scope-ok: nycmaid-legacy helper; retires with the standalone cutover
    .select('id')
    .is('quality_score', null)
    .order('created_at', { ascending: false })
    .limit(100)

  const candidateIds = (candidates || []).map(c => c.id)
  if (candidateIds.length === 0) return { scored: 0, avgScore: 0 }

  // Latest message per conversation, newest first — first occurrence of each
  // conversation_id in this order IS its latest message.
  const { data: recentMessages } = await supabaseAdmin
    .from('sms_conversation_messages')
    .select('conversation_id, created_at')
    .in('conversation_id', candidateIds)
    .order('created_at', { ascending: false })
    .limit(2000)

  const lastMessageAt = new Map<string, string>()
  for (const m of recentMessages || []) {
    if (!lastMessageAt.has(m.conversation_id as string)) lastMessageAt.set(m.conversation_id as string, m.created_at as string)
  }

  const settledIds = candidateIds
    .filter(id => {
      const last = lastMessageAt.get(id)
      return !last || last < twoHoursAgo // no messages at all, or none recent
    })
    .slice(0, 50)

  let totalScore = 0
  let count = 0

  for (const id of settledIds) {
    const result = await scoreConversation(id)
    totalScore += result.score
    count++
  }

  return { scored: count, avgScore: count > 0 ? Math.round(totalScore / count) : 0 }
}
