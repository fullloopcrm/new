// MCP server for the xAI Grok voice agent (Yinez/Selena on the phone).
// Tenant-scoped port of nycmaid's src/app/api/voice/mcp/[secret]/
// [transport]/route.ts (commits f02c3fe4, b9a87f1b, d95d9d0d, 4fd2fb64).
//
// Hand-rolled (not mcp-handler) because xAI's Custom MCP connector probes
// with a plain POST and doesn't send the strict
// `Accept: application/json, text/event-stream` header the mcp-handler/SDK
// requires (it 406s), and its SSE path needs Redis we don't run. This
// endpoint speaks minimal MCP JSON-RPC over a single POST and always
// answers application/json, so the connector can reach it.
//
// AUTH + TENANT RESOLUTION: nycmaid gated a single global secret
// (VOICE_MCP_TOKEN env var) since it only ever served one tenant. Here each
// tenant configures its OWN xAI Custom MCP connector pointed at its own
// secret (tenants.voice_mcp_token, migrations/2026_07_18_voice_agent.sql),
// so the URL-path secret both authenticates the request AND resolves which
// tenant's data every tool call is scoped to:
//   https://<host>/api/voice/mcp/<tenant's voice_mcp_token>/mcp
// Wrong/absent/suspended-tenant secret -> 404.
import {
  voiceLookupClient,
  voiceLookupBookings,
  voiceCheckAvailability,
  voiceCreateBooking,
  voiceCheckPayment,
  voiceLogEscalation,
  voiceGetQuote,
  voiceSaveNote,
  voiceSaveCaller,
  voiceSendBookingLink,
} from '@/lib/voice/mcp-tools'
import { resolveTenantByVoiceMcpToken } from '@/lib/voice/xai-voice-config'

const PROTOCOL_VERSION = '2025-06-18'

type ToolDef = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  run: (tenantId: string, args: Record<string, unknown>) => Promise<string>
}

const str = { type: 'string' }
const num = { type: 'number' }

const TOOLS: ToolDef[] = [
  {
    name: 'lookup_client',
    description:
      "Look up the caller by phone number — account, past bookings, saved notes. Call first for a returning client.",
    inputSchema: { type: 'object', properties: { caller_phone: str }, required: ['caller_phone'] },
    run: (tid, a) => voiceLookupClient(tid, String(a.caller_phone ?? '')),
  },
  {
    name: 'lookup_bookings',
    description: "Look up the caller's upcoming and recent bookings by phone number.",
    inputSchema: { type: 'object', properties: { caller_phone: str }, required: ['caller_phone'] },
    run: (tid, a) => voiceLookupBookings(tid, String(a.caller_phone ?? '')),
  },
  {
    name: 'check_availability',
    description:
      "Check REAL open slots for a date (YYYY-MM-DD). Use before telling a caller a time is open.",
    inputSchema: {
      type: 'object',
      properties: { date: str, duration_hours: num },
      required: ['date'],
    },
    run: (tid, a) => voiceCheckAvailability(tid, String(a.date ?? ''), Number(a.duration_hours ?? 2)),
  },
  {
    name: 'create_booking',
    description:
      "Create a PENDING booking. The team confirms/locks the exact slot afterward — never promise a specific time. Read details back first.",
    inputSchema: {
      type: 'object',
      properties: {
        caller_phone: str,
        client_name: str,
        service_type: str,
        hourly_rate: num,
        date: str,
        time: str,
        estimated_hours: num,
        client_email: str,
        client_address: str,
      },
      required: ['caller_phone', 'client_name', 'service_type', 'hourly_rate', 'date', 'time'],
    },
    run: (tid, a) => voiceCreateBooking(tid, String(a.caller_phone ?? ''), a),
  },
  {
    name: 'check_payment',
    description: "Check the caller's outstanding balance / payment status by phone number.",
    inputSchema: { type: 'object', properties: { caller_phone: str }, required: ['caller_phone'] },
    run: (tid, a) => voiceCheckPayment(tid, String(a.caller_phone ?? '')),
  },
  {
    name: 'log_escalation',
    description:
      "Escalate to the manager and log it (refund, damage, theft, complaint, no-show, legal, big-commercial). Notifies the team.",
    inputSchema: {
      type: 'object',
      properties: { caller_phone: str, reason: str, details: str },
      required: ['caller_phone', 'reason'],
    },
    run: (tid, a) =>
      voiceLogEscalation(tid, String(a.caller_phone ?? ''), { reason: a.reason, details: a.details }),
  },
  {
    name: 'save_note',
    description:
      "Save a note to the caller's record — access instructions, gate codes, allergies, pets, preferences. Surfaces on future contacts.",
    inputSchema: {
      type: 'object',
      properties: { caller_phone: str, note: str },
      required: ['caller_phone', 'note'],
    },
    run: (tid, a) => voiceSaveNote(tid, String(a.caller_phone ?? ''), String(a.note ?? '')),
  },
  {
    name: 'get_quote',
    description: 'Explain our rates for a service. No phone number needed.',
    inputSchema: { type: 'object', properties: { service_type: str } },
    run: (tid, a) => voiceGetQuote(tid, { service_type: a.service_type }),
  },
  {
    name: 'send_booking_link',
    description:
      "Actually text the caller our booking link. Call this whenever you offer to text the link — it sends the SMS to their number now.",
    inputSchema: { type: 'object', properties: { caller_phone: str }, required: ['caller_phone'] },
    run: (tid, a) => voiceSendBookingLink(tid, String(a.caller_phone ?? '')),
  },
  {
    name: 'save_caller',
    description:
      "Save the caller as a lead as soon as you have their name — even if they don't book. Creates/updates their record in the client list so we can follow up. Call this early in the call.",
    inputSchema: {
      type: 'object',
      properties: { caller_phone: str, name: str, email: str },
      required: ['caller_phone', 'name'],
    },
    run: (tid, a) =>
      voiceSaveCaller(tid, String(a.caller_phone ?? ''), String(a.name ?? ''), a.email as string | undefined),
  },
]

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  })
}

function rpcResult(id: unknown, result: unknown): Response {
  return json({ jsonrpc: '2.0', id: id ?? null, result })
}

function rpcError(id: unknown, code: number, message: string): Response {
  return json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })
}

async function handleRpc(
  tenantId: string,
  msg: { id?: unknown; method?: string; params?: Record<string, unknown> },
): Promise<Response | null> {
  const { id, method, params } = msg
  switch (method) {
    case 'initialize':
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'fullloop-voice', version: '1.0.0' },
      })
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null // notification: no response body
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      })
    case 'tools/call': {
      const name = params?.name as string
      const args = (params?.arguments as Record<string, unknown>) || {}
      const tool = TOOLS.find((t) => t.name === name)
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${name}`)
      try {
        const text = await tool.run(tenantId, args)
        return rpcResult(id, { content: [{ type: 'text', text }], isError: false })
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err)
        return rpcResult(id, { content: [{ type: 'text', text: `Error: ${m}` }], isError: true })
      }
    }
    default:
      if (id === undefined) return null // unknown notification
      return rpcError(id, -32601, `Method not found: ${method}`)
  }
}

async function resolveTenantOr404(secret: string): Promise<string | null> {
  const tenant = await resolveTenantByVoiceMcpToken(secret)
  return tenant?.id ?? null
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ secret: string; transport: string }> },
): Promise<Response> {
  const { secret } = await ctx.params
  const tenantId = await resolveTenantOr404(secret)
  if (!tenantId) return json({ error: 'not found' }, 404)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return rpcError(null, -32700, 'Parse error')
  }

  // Support JSON-RPC batches and single messages.
  if (Array.isArray(body)) {
    const out: unknown[] = []
    for (const m of body) {
      const r = await handleRpc(tenantId, m as never)
      if (r) out.push(await r.json())
    }
    return json(out)
  }
  const res = await handleRpc(tenantId, body as never)
  return res ?? new Response(null, { status: 202 })
}

// Some clients GET the URL to check reachability or open a stream. Answer
// 200 so the connector's probe succeeds; we don't offer a server->client
// SSE stream.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ secret: string; transport: string }> },
): Promise<Response> {
  const { secret } = await ctx.params
  const tenantId = await resolveTenantOr404(secret)
  if (!tenantId) return json({ error: 'not found' }, 404)
  return json({ status: 'ok', server: 'fullloop-voice', protocolVersion: PROTOCOL_VERSION })
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization, accept',
    },
  })
}
