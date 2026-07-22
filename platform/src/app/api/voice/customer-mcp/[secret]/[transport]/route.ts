// MCP server for a tenant's CUSTOMER-facing xAI Grok voice agent (Yinez on
// the phone). Global route — tenant resolved by matching the URL secret
// against tenants.voice_agent_mcp_secret, NOT hardcoded to any one tenant.
// Only tenants with that column populated (today: none automatically —
// set per tenant in xAI's console + this DB column) actually work; every
// other tenant 404s the same as an unconfigured secret.
//
// Hand-rolled (not mcp-handler/SDK) — mirrors src/app/api/voice/mcp/[secret]/
// [transport]/route.ts (FullLoop's own prospect-line agent): xAI's Custom MCP
// connector probes with a plain POST and doesn't send the strict
// `Accept: application/json, text/event-stream` header the mcp-handler/SDK
// requires (it 406s), and its SSE path needs Redis we don't run. This
// endpoint speaks minimal MCP JSON-RPC over a single POST and always answers
// application/json, so the connector can reach it.
//
// AUTH: secret in the URL path, resolved to a tenant via
//   tenants.voice_agent_mcp_secret. Wrong/absent/unmatched secret -> 404.

import { supabaseAdmin } from '@/lib/supabase'
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
} from '@/lib/voice-agent/customer-tools'

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
      'Look up the caller by phone number — account, past bookings, saved notes. Call first for a returning client.',
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
    description: 'Check REAL open slots for a date (YYYY-MM-DD). Use before telling a caller a time is open.',
    inputSchema: {
      type: 'object',
      properties: { date: str, duration_hours: num },
      required: ['date'],
    },
    run: (tid, a) => voiceCheckAvailability(tid, String(a.date ?? ''), Number(a.duration_hours) || 2),
  },
  {
    name: 'create_booking',
    description: 'Create a booking once you have service type, date, time, name, phone, and address.',
    inputSchema: {
      type: 'object',
      properties: {
        service_type: str,
        date: str,
        time: str,
        hourly_rate: num,
        hours: num,
        name: str,
        phone: str,
        address: str,
        email: str,
        notes: str,
      },
      required: ['date', 'time'],
    },
    run: (tid, a) => voiceCreateBooking(tid, String(a.phone ?? ''), a),
  },
  {
    name: 'check_payment',
    description: "Check the caller's current payment/balance status by phone number.",
    inputSchema: { type: 'object', properties: { caller_phone: str }, required: ['caller_phone'] },
    run: (tid, a) => voiceCheckPayment(tid, String(a.caller_phone ?? '')),
  },
  {
    name: 'log_escalation',
    description: 'Request a human callback/escalation for this caller.',
    inputSchema: {
      type: 'object',
      properties: { caller_phone: str, reason: str, details: str },
      required: ['caller_phone', 'reason'],
    },
    run: (tid, a) => voiceLogEscalation(tid, String(a.caller_phone ?? ''), a),
  },
  {
    name: 'get_quote',
    description: 'Get a price quote for a service type and duration.',
    inputSchema: {
      type: 'object',
      properties: { service_type: str, hours: num },
      required: ['service_type'],
    },
    run: (_tid, a) => voiceGetQuote(a),
  },
  {
    name: 'save_note',
    description: 'Save a note on the caller\'s record (access instructions, gate code, allergies, preferences).',
    inputSchema: {
      type: 'object',
      properties: { caller_phone: str, note: str, type: str },
      required: ['caller_phone', 'note'],
    },
    run: (tid, a) => voiceSaveNote(tid, String(a.caller_phone ?? ''), String(a.note ?? ''), String(a.type || 'instruction')),
  },
  {
    name: 'save_caller',
    description: 'Save the caller as a lead/client once you have their name and phone number.',
    inputSchema: {
      type: 'object',
      properties: { caller_phone: str, name: str, email: str },
      required: ['caller_phone', 'name'],
    },
    run: (tid, a) => voiceSaveCaller(tid, String(a.caller_phone ?? ''), String(a.name ?? ''), a.email ? String(a.email) : undefined),
  },
  {
    name: 'send_booking_link',
    description: 'Text the caller a link to book online.',
    inputSchema: { type: 'object', properties: { caller_phone: str }, required: ['caller_phone'] },
    run: (tid, a) => voiceSendBookingLink(tid, String(a.caller_phone ?? '')),
  },
]

async function resolveTenantBySecret(secret: string): Promise<string | null> {
  if (!secret) return null
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('voice_agent_mcp_secret', secret)
    .limit(2)
  if (!data || data.length !== 1) return null
  return data[0].id
}

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
        serverInfo: { name: 'fullloop-customer-voice', version: '1.0.0' },
      })
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, {
        tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
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
      if (id === undefined) return null
      return rpcError(id, -32601, `Method not found: ${method}`)
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ secret: string; transport: string }> },
): Promise<Response> {
  const { secret } = await ctx.params
  const tenantId = await resolveTenantBySecret(secret)
  if (!tenantId) return json({ error: 'not found' }, 404)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return rpcError(null, -32700, 'Parse error')
  }

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

// Some clients GET the URL to check reachability. Answer 200 so the
// connector's probe succeeds; we don't offer a server->client SSE stream.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ secret: string; transport: string }> },
): Promise<Response> {
  const { secret } = await ctx.params
  const tenantId = await resolveTenantBySecret(secret)
  if (!tenantId) return json({ error: 'not found' }, 404)
  return json({ status: 'ok', server: 'fullloop-customer-voice', protocolVersion: PROTOCOL_VERSION })
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
