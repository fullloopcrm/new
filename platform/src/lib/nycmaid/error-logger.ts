import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/nycmaid/notify'

interface ErrorContext {
  route?: string
  method?: string
  payload?: unknown
  source?: string
}

// Patterns that we know are noise (auto-suppress, don't notify)
// Each entry: { test: regex against message, reason: human label }
const SUPPRESSION_PATTERNS = [
  {
    test: /Object Not Found Matching Id:\d+, MethodName:update, ParamCount:\d+/i,
    reason: 'Microsoft Outlook SafeLinks scanner probe',
  },
] as const

function trimPayload(p: unknown): unknown {
  if (p == null) return null
  try {
    const json = JSON.stringify(p)
    if (json.length > 4000) return JSON.parse(json.slice(0, 4000) + '"}')
    return JSON.parse(json)
  } catch {
    return { _serialize_failed: true, type: typeof p }
  }
}

export async function logError(err: unknown, ctx: ErrorContext = {}): Promise<void> {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined

  const matched = SUPPRESSION_PATTERNS.find(p => p.test.test(message))

  try {
    await supabaseAdmin.from('error_logs').insert({
      route: ctx.route || null,
      method: ctx.method || null,
      message: message.slice(0, 2000),
      stack: stack?.slice(0, 8000) || null,
      payload_sample: trimPayload(ctx.payload),
      source: ctx.source || 'route_handler',
      suppressed: !!matched,
      suppress_reason: matched?.reason || null,
    })
  } catch {
    // Last-ditch: never let the logger itself blow up the request
  }

  if (!matched) {
    // Surface real errors to admin via existing notify pipeline
    notify({
      type: 'error',
      title: 'Runtime Error',
      message: `${ctx.route || 'unknown route'}: ${message.slice(0, 200)}`,
    }).catch(() => {})
  }
}
