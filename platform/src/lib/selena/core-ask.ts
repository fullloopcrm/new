import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveAnthropic } from '@/lib/anthropic-client'
import { yinezError, NYCMAID_TENANT_ID, EMPTY_CHECKLIST, type BookingChecklist, type YinezResult } from './core-types'
import { detectIntent, getNextStep, loadChecklist, updateChecklist } from './core-intent'
import { extractAndSave, buildStepPrompt, YINEZ_PERSONALITY, type ExtractionResult } from './core-extraction'
import { getToolsForIntent, handleCreateBooking } from './core-tools-booking'
import { handleBookingDetails, handleTool } from './core-tools-schedule'
import { getClientProfile, buildCalendarContext } from './core-profile'
import { generateNonBookingResponse, generateBookingResponse } from './core-responses'

export function buildMessages(transcript: Array<{ role: 'user' | 'assistant'; content: string }>, newMessage: string) {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
  const recent = transcript.slice(-20)
  for (const msg of recent) {
    if (messages.length > 0 && messages[messages.length - 1].role === msg.role) {
      messages[messages.length - 1].content += '\n' + msg.content
      continue
    }
    messages.push({ role: msg.role, content: msg.content })
  }
  if (messages.length > 0 && messages[0].role === 'assistant') messages.shift()
  if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
    messages[messages.length - 1].content += '\n' + newMessage
  } else {
    messages.push({ role: 'user', content: newMessage })
  }
  return messages
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════

export async function askSelena(
  channel: 'sms' | 'web' | 'email',
  message: string,
  conversationId: string,
  phone?: string,
): Promise<YinezResult> {
  const result: YinezResult = { text: '', checklist: EMPTY_CHECKLIST }

  try {
    // ── STEP 0: Load state + detect returning client ──
    let checklist = await loadChecklist(conversationId)

    // Resolve tenant for this conversation (needed for all downstream queries).
    const { data: convoTenantRow } = await supabaseAdmin.from('sms_conversations').select('tenant_id').eq('id', conversationId).single()
    const tid = (convoTenantRow as { tenant_id?: string } | null)?.tenant_id || NYCMAID_TENANT_ID

    // Per-tenant Anthropic client (tenant key if set, platform key otherwise).
    const anthropic = await resolveAnthropic(tid)

    // Determine if returning client.
    // - SMS: convo.phone is a real phone → use it directly.
    // - Email: convo.phone is 'email-{uuid}', not a real phone. Look up the
    //   client's real phone via client_id and use THAT. If they have no real
    //   phone (new email lead), skip profile lookup.
    // - Web: phone is passed in as arg (may be null for anonymous sessions).
    let lookupPhone: string | null = null
    if (channel === 'sms') {
      const { data } = await supabaseAdmin.from('sms_conversations').select('phone').eq('id', conversationId).single()
      lookupPhone = data?.phone || null
    } else if (channel === 'email') {
      const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id').eq('id', conversationId).single()
      if (convo?.client_id) {
        const { data: c } = await supabaseAdmin.from('clients').select('phone').eq('id', convo.client_id).eq('tenant_id', tid).single()
        if (c?.phone && !c.phone.startsWith('email-') && !c.phone.startsWith('web-') && /\d{7,}/.test(c.phone)) {
          lookupPhone = c.phone
        }
      }
    } else {
      lookupPhone = phone || null
    }

    let clientContext = ''
    let isReturning = false
    if (lookupPhone && !lookupPhone.startsWith('web-') && !lookupPhone.startsWith('email-')) {
      const profile = await getClientProfile(lookupPhone, tid)
      if (!profile.includes('"error"')) {
        clientContext = `\n\nCLIENT PROFILE:\n${profile}`
        isReturning = true
      }
    }

    // ── STEP 1: Detect intent ──
    const intent = detectIntent(message, checklist, isReturning)
    result.intent = intent

    // ── STEP 2: Transition from greeting if needed ──
    if (checklist.status === 'greeting' && (intent === 'booking' || intent === 'rebook' || intent === 'emergency')) {
      checklist = await updateChecklist(conversationId, { status: 'collecting' })
    }

    // For returning clients starting a booking, pre-fill from profile
    if (isReturning && checklist.status === 'collecting' && intent === 'booking') {
      try {
        const profile = JSON.parse(clientContext.replace('\n\nCLIENT PROFILE:\n', ''))
        const prefill: Partial<BookingChecklist> = {}
        if (profile.name && !checklist.name) prefill.name = profile.name
        if (profile.address && !checklist.address) prefill.address = profile.address
        if (profile.email && !checklist.email) prefill.email = profile.email
        if (profile.last_rate && !checklist.rate) prefill.rate = profile.last_rate
        if (lookupPhone && !checklist.phone) prefill.phone = lookupPhone.replace(/\D/g, '').slice(-10)
        if (Object.keys(prefill).length > 0) {
          checklist = await updateChecklist(conversationId, prefill)
        }
      } catch {}
    }

    // ── DETERMINISTIC NON-BOOKING RESPONSES (zero Claude needed) ──
    const deterministic = generateNonBookingResponse(intent, message, checklist)
    if (deterministic) {
      result.text = deterministic
      result.checklist = checklist
      return result
    }

    // Post-confirmation — booking already created. Short acknowledgments or
    // rebook-intent replies should not loop back through Claude and hit the
    // error fallback.
    if (checklist.status === 'confirmed' && intent === 'booking') {
      result.text = `You're all set${checklist.name ? ', ' + checklist.name.split(' ')[0] : ''}! Our team will confirm shortly. Text or call (212) 202-8400 if you need anything 😊`
      result.checklist = checklist
      return result
    }

    const preStep = getNextStep(checklist, isReturning)

    // ── LAYER 1: Deterministic extraction (booking intents only) ──
    let extraction: ExtractionResult = { extracted: {}, clientCreated: false }
    if (['booking', 'rebook', 'emergency', 'greeting'].includes(intent)) {
      extraction = await extractAndSave(message, checklist, conversationId, preStep.field)
      if (extraction.clientCreated) result.clientCreated = true
    }

    // Reload checklist
    checklist = await loadChecklist(conversationId)
    const nextStep = getNextStep(checklist, isReturning)

    // ── FAST PATH: Deterministic response for simple booking steps ──
    const extractedKeys = Object.keys(extraction.extracted)
    const isBookingIntent = ['booking', 'greeting', 'emergency'].includes(intent)
    const inFlow = ['collecting', 'greeting', 'recap'].includes(checklist.status)

    // Confirmation at recap → fire create_booking deterministically.
    // Tight: only exact affirmatives. No 30-char trailing slop — that matched
    // "yes wait actually change the time" and created the wrong booking.
    const lowerMsg = message.trim().toLowerCase().replace(/[.!,?]+$/g, '').trim()
    const hasChangeWord = /\b(wait|actually|but|change|different|instead|no,|nope|hold|cancel|switch|move|earlier|later|not sure|except|hmm|hmmm|oh wait)\b/i.test(message)
    const hasQuestion = /\?/.test(message)
    const hasAffirmative = /\b(?:yes|yeah|yep|yup|yessir|ya|yea|correct|confirmed?|confirm|book it|booking it|looks good|looks great|sounds good|sounds great|good|great|perfect|locked in|let'?s do it|lets do it|do it|ok|okay|all good|thats? right|that'?s right|go ahead|go for it|lgtm|approved|si|sí|book her|lock it in|we'?re good|all set)\b/i.test(lowerMsg)
    const isShortAffirmative = /^[y]+$|^(k|kk|ok|okay|yes|yeah|yep|yup|correct|great|perfect|good|done|locked|confirm|confirmed|approved|ya|ye|ok 👍|👍|🙏|✅|si|sí)$/i.test(lowerMsg)
    const wordCount = lowerMsg.split(/\s+/).filter(Boolean).length
    const isConfirmation = !hasChangeWord && !hasQuestion && (isShortAffirmative || (hasAffirmative && wordCount <= 6))

    if (isBookingIntent && checklist.status === 'recap' && isConfirmation && checklist.service_type && checklist.day && checklist.time && checklist.rate) {
      // Fire create_booking directly
      const sizeEstimates: Record<string, number> = {
        'regular-0-1': 2.5, 'regular-1-1': 2.5, 'regular-2-1': 3, 'regular-2-2': 3.5, 'regular-3-2': 4,
        'deep-0-1': 4, 'deep-1-1': 4, 'deep-2-1': 4, 'deep-2-2': 5, 'deep-3-2': 5.5,
        'move_in_out-0-1': 4, 'move_in_out-1-1': 4, 'move_in_out-2-1': 4, 'move_in_out-2-2': 5, 'move_in_out-3-2': 6,
      }
      const est = sizeEstimates[`${checklist.service_type}-${checklist.bedrooms}-${checklist.bathrooms}`] || 3
      try {
        await handleCreateBooking({
          date: checklist.date || '',
          time: checklist.time,
          service_type: checklist.service_type,
          hourly_rate: checklist.rate,
          estimated_hours: est,
          recurring_type: 'one_time',
        }, conversationId, result)

        // Only confirm to client if booking actually hit the DB.
        if (!result.bookingCreated) {
          result.text = `We hit a snag confirming your booking — one of our team will reach out within a few minutes to lock it in. Sorry for the hiccup! 😊`
          result.checklist = await loadChecklist(conversationId)
          return result
        }

        // Get PIN if available
        let pinLine = ''
        try {
          const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
          if (convo?.client_id) {
            let pinQuery = supabaseAdmin.from('clients').select('pin').eq('id', convo.client_id)
            const convoTid = (convo as { tenant_id?: string }).tenant_id
            if (convoTid) pinQuery = pinQuery.eq('tenant_id', convoTid)
            const { data: c } = await pinQuery.single()
            if (c?.pin) pinLine = ` Your portal PIN is ${c.pin} — log in at thenycmaid.com/portal to view your booking and add notes.`
          }
        } catch {}
        result.text = `Thank you so much${checklist.name ? ' ' + checklist.name.split(' ')[0] : ''}! We really appreciate you and look forward to working with you 😊 Your booking is pending and will be confirmed by our team shortly.${pinLine} If you need anything, text or call us at (212) 202-8400.`
        result.checklist = await loadChecklist(conversationId)
        return result
      } catch (err) {
        await yinezError('fast_path_create_booking', err, conversationId)
        // Fall through to Claude
      }
    }

    // Fast path: ALWAYS fire when in booking flow with a known step.
    // This means even if the user sends garbage that doesn't extract,
    // we re-ask the current question deterministically (no Claude needed).
    const fastPathEligible = isBookingIntent
      && (nextStep.field !== null || checklist.status === 'recap')
      && inFlow

    if (fastPathEligible) {
      const fastResponse = generateBookingResponse(checklist, nextStep, extraction.extracted)
      if (fastResponse) {
        if (checklist.status === 'greeting') {
          checklist = await updateChecklist(conversationId, { status: 'collecting' })
        }
        result.text = fastResponse
        result.checklist = checklist
        return result
      }
    }

    // ── Build context ──
    const calendar = buildCalendarContext()

    let extractionContext = ''
    if (extractedKeys.length > 0) {
      const items = extractedKeys.map(k => `${k}: ${extraction.extracted[k as keyof BookingChecklist]}`).join(', ')
      extractionContext = `\nJust captured from their message: ${items}. Acknowledge naturally.`
    }

    // For disputes, pre-fetch booking data so Claude doesn't have to call the tool
    let disputeData = ''
    if (intent === 'dispute') {
      const details = await handleBookingDetails({}, conversationId)
      if (!details.includes('"error"')) {
        disputeData = '\n\nBOOKING DATA (already retrieved — use this to respond):\n' + details
      }
    }

    // Step instruction FIRST — most important, must not be overridden
    const stepPrompt = buildStepPrompt(intent, checklist, nextStep, isReturning)
    const systemPrompt = 'YOUR TASK: ' + stepPrompt + '\n\n' + YINEZ_PERSONALITY + calendar + clientContext + extractionContext + disputeData

    // ── Select tools for this intent ──
    const activeTools = getToolsForIntent(intent)

    // ── Load transcript ──
    const { data: msgs } = await supabaseAdmin
      .from('sms_conversation_messages')
      .select('direction, message')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20)

    const transcript = (msgs || []).map(m => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.message,
    }))

    const messages = buildMessages(transcript, message)

    // ── LAYER 2: Claude ──
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)

    try {
      let currentMessages: Array<{ role: 'user' | 'assistant'; content: string | Anthropic.Messages.ContentBlockParam[] }> = [...messages]

      for (let i = 0; i < 4; i++) {
        const response = await anthropic.messages.create(
          { model: 'claude-sonnet-4-6', max_tokens: 700, system: systemPrompt, messages: currentMessages, tools: activeTools.length > 0 ? activeTools : undefined },
          { signal: controller.signal }
        )

        const toolBlocks = response.content.filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')
        const textBlocks = response.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')

        if (textBlocks.length > 0) {
          const text = textBlocks.map(b => b.text).join(' ').trim()
          if (text) result.text = text
        }

        if (toolBlocks.length === 0) break

        currentMessages.push({ role: 'assistant', content: response.content as Anthropic.Messages.ContentBlockParam[] })
        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []

        for (const tool of toolBlocks) {
          let toolResult: string
          try {
            toolResult = await handleTool(tool.name, tool.input as Record<string, unknown>, conversationId, result)
          } catch (toolErr) {
            await yinezError(`tool:${tool.name}`, toolErr, conversationId)
            toolResult = JSON.stringify({ success: true })
          }
          toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: toolResult, ...(toolResult.includes('"error"') ? { is_error: true } : {}) })
        }

        currentMessages.push({ role: 'user', content: toolResults })
      }

      // Retry once on empty response
      if (!result.text) {
        const fallback = await anthropic.messages.create(
          { model: 'claude-sonnet-4-6', max_tokens: 700, system: systemPrompt, messages: currentMessages },
          { signal: controller.signal }
        )
        const fallbackText = fallback.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        if (fallbackText.length > 0) result.text = fallbackText.map(b => b.text).join(' ').trim()
      }
    } finally {
      clearTimeout(timeout)
    }

    // ── Final checks ──
    if (!result.text) {
      await yinezError('empty_response', new Error('No text'), conversationId)
      result.text = "Sorry about that! Could you resend? 😊"
    }
    if (result.text.length > 600) result.text = result.text.slice(0, 597) + '...'

    result.checklist = await loadChecklist(conversationId)
    return result
  } catch (err) {
    await yinezError('askSelena_main', err, conversationId)
    // No canned fallback — surface the error to admin and return empty so the
    // caller can route to Yinez/retry instead of dead-ending the conversation.
    result.text = ''
    return result
  }
}
