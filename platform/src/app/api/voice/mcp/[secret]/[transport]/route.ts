// MCP server for xAI Grok voice agents — serves TWO distinct agents behind
// this one URL shape (unchanged so already-configured xAI assistants never
// need reconfiguring after a domain cutover):
//   1. FullLoop's own prospect-qualification line (global VOICE_MCP_TOKEN).
//   2. Any tenant's customer-facing voice agent (tenants.voice_agent_mcp_secret).
// The secret in the URL determines which. Wrong/unmatched secret -> 404.
//
// Hand-rolled (not mcp-handler/SDK) because xAI's Custom MCP connector probes
// with a plain POST and doesn't send the strict
// `Accept: application/json, text/event-stream` header the mcp-handler/SDK
// requires (it 406s), and its SSE path needs Redis we don't run. This
// endpoint speaks minimal MCP JSON-RPC over a single POST and always answers
// application/json, so the connector can reach it.

import { supabaseAdmin } from '@/lib/supabase'
import {
  getPricing,
  checkSlotAvailability,
  submitApplication,
  logCallNote,
  type SubmitApplicationArgs,
} from '@/lib/voice-agent/tools'
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

const SECRET = process.env.VOICE_MCP_TOKEN || ''
const PROTOCOL_VERSION = '2025-06-18'

type ToolDef = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  run: (args: Record<string, unknown>) => Promise<string>
}

const str = { type: 'string' }
const num = { type: 'number' }
const bool = { type: 'boolean' }

const PROSPECT_TOOLS: ToolDef[] = [
  {
    name: 'get_pricing',
    description: 'Get Full Loop\'s real pricing (setup fee + per-seat monthly) to quote accurately. No args needed.',
    inputSchema: { type: 'object', properties: {} },
    run: () => getPricing(),
  },
  {
    name: 'check_territory_availability',
    description: 'Check whether a trade × ZIP territory is already taken by another Full Loop tenant.',
    inputSchema: { type: 'object', properties: { trade: str, zip: str }, required: ['trade', 'zip'] },
    run: (a) => checkSlotAvailability(String(a.trade ?? ''), String(a.zip ?? '')),
  },
  {
    name: 'submit_application',
    description:
      'Submit the prospect\'s application once you have business name, owner name, email, and trade at minimum. Fill in as many of the other qualifying fields as you gathered during the call. Call this once, near the end of a qualified conversation.',
    inputSchema: {
      type: 'object',
      properties: {
        business_name: str,
        owner_name: str,
        owner_email: str,
        owner_phone: str,
        trade: str,
        primary_city: str,
        primary_state: str,
        primary_zip: str,
        annual_revenue: str,
        revenue_trajectory: str,
        growth_goal: str,
        automation_comfort: str,
        lead_gen_spend: str,
        pain_point: str,
        timeline: str,
        current_system: str,
        wants_automation: bool,
        wants_growth: bool,
        comparing_prices: bool,
        notes: str,
      },
      required: ['business_name', 'owner_name', 'owner_email', 'trade'],
    },
    run: (a) => submitApplication({ ...a, channel: 'voice_agent' } as unknown as SubmitApplicationArgs),
  },
  {
    name: 'log_call_note',
    description: 'Append a free-text note to an already-submitted application, keyed by the caller\'s phone number.',
    inputSchema: { type: 'object', properties: { owner_phone: str, note: str }, required: ['owner_phone', 'note'] },
    run: (a) => logCallNote(String(a.owner_phone ?? ''), String(a.note ?? '')),
  },
]

function customerTools(tenantId: string): ToolDef[] {
  return [
    {
      name: 'lookup_client',
      description: 'Look up the caller by phone number — account, past bookings, saved notes. Call first for a returning client.',
      inputSchema: { type: 'object', properties: { caller_phone: str }, required: ['caller_phone'] },
      run: (a) => voiceLookupClient(tenantId, String(a.caller_phone ?? '')),
    },
    {
      name: 'lookup_bookings',
      description: "Look up the caller's upcoming and recent bookings by phone number.",
      inputSchema: { type: 'object', properties: { caller_phone: str }, required: ['caller_phone'] },
      run: (a) => voiceLookupBookings(tenantId, String(a.caller_phone ?? '')),
    },
    {
      name: 'check_availability',
      description: 'Check REAL open slots for a date (YYYY-MM-DD). Use before telling a caller a time is open.',
      inputSchema: { type: 'object', properties: { date: str, duration_hours: num }, required: ['date'] },
      run: (a) => voiceCheckAvailability(tenantId, String(a.date ?? ''), Number(a.duration_hours) || 2),
    },
    {
      name: 'create_booking',
      description: 'Create a booking once you have service type, date, time, name, phone, and address.',
      inputSchema: {
        type: 'object',
        properties: {
          service_type: str, date: str, time: str, hourly_rate: num, hours: num,
          name: str, phone: str, address: str, email: str, notes: str,
        },
        required: ['date', 'time'],
      },
      run: (a) => voiceCreateBooking(tenantId, String(a.phone ?? ''), a),
    },
    {
      name: 'check_payment',
      description: "Check the caller's current payment/balance status by phone number.",
      inputSchema: { type: 'object', properties: { caller_phone: str }, required: ['caller_phone'] },
      run: (a) => voiceCheckPayment(tenantId, String(a.caller_phone ?? '')),
    },
    {
      name: 'log_escalation',
      description: 'Request a human callback/escalation for this caller.',
      inputSchema: { type: 'object', properties: { caller_phone: str, reason: str, details: str }, required: ['caller_phone', 'reason'] },
      run: (a) => voiceLogEscalation(tenantId, String(a.caller_phone ?? ''), a),
    },
    {
      name: 'get_quote',
      description: 'Get a price quote for a service type and duration.',
      inputSchema: { type: 'object', properties: { service_type: str, hours: num }, required: ['service_type'] },
      run: (a) => voiceGetQuote(a),
    },
    {
      name: 'save_note',
      description: 'Save a note on the caller\'s record (access instructions, gate code, allergies, preferences).',
      inputSchema: { type: 'object', properties: { caller_phone: str, note: str, type: str }, required: ['caller_phone', 'note'] },
      run: (a) => voiceSaveNote(tenantId, String(a.caller_phone ?? ''), String(a.note ?? ''), String(a.type || 'instruction')),
    },
    {
      name: 'save_caller',
      description: 'Save the caller as a lead/client once you have their name and phone number.',
      inputSchema: { type: 'object', properties: { caller_phone: str, name: str, email: str }, required: ['caller_phone', 'name'] },
      run: (a) => voiceSaveCaller(tenantId, String(a.caller_phone ?? ''), String(a.name ?? ''), a.email ? String(a.email) : undefined),
    },
    {
      name: 'send_booking_link',
      description: 'Text the caller a link to book online.',
      inputSchema: { type: 'object', properties: { caller_phone: str }, required: ['caller_phone'] },
      run: (a) => voiceSendBookingLink(tenantId, String(a.caller_phone ?? '')),
    },
  ]
}

type ResolvedContext = { kind: 'prospect' } | { kind: 'tenant'; tenantId: string } | null

async function resolveContext(secret: string): Promise<ResolvedContext> {
  if (!secret) return null
  if (SECRET && secret === SECRET) return { kind: 'prospect' }
  const { data } = await supabaseAdmin.from('tenants').select('id').eq('voice_agent_mcp_secret', secret).limit(2)
  if (data && data.length === 1) return { kind: 'tenant', tenantId: data[0].id }
  return null
}

function toolsFor(ctx: ResolvedContext): ToolDef[] {
  if (!ctx) return []
  return ctx.kind === 'prospect' ? PROSPECT_TOOLS : customerTools(ctx.tenantId)
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
  ctx: ResolvedContext,
  msg: { id?: unknown; method?: string; params?: Record<string, unknown> },
): Promise<Response | null> {
  const { id, method, params } = msg
  const tools = toolsFor(ctx)
  switch (method) {
    case 'initialize':
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'fullloop-voice', version: '1.0.0' },
      })
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, { tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) })
    case 'tools/call': {
      const name = params?.name as string
      const args = (params?.arguments as Record<string, unknown>) || {}
      const tool = tools.find((t) => t.name === name)
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${name}`)
      try {
        const text = await tool.run(args)
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
  const resolved = await resolveContext(secret)
  if (!resolved) return json({ error: 'not found' }, 404)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return rpcError(null, -32700, 'Parse error')
  }

  if (Array.isArray(body)) {
    const out: unknown[] = []
    for (const m of body) {
      const r = await handleRpc(resolved, m as never)
      if (r) out.push(await r.json())
    }
    return json(out)
  }
  const res = await handleRpc(resolved, body as never)
  return res ?? new Response(null, { status: 202 })
}

// Some clients GET the URL to check reachability or open a stream. Answer 200 so
// the connector's probe succeeds; we don't offer a server->client SSE stream.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ secret: string; transport: string }> },
): Promise<Response> {
  const { secret } = await ctx.params
  const resolved = await resolveContext(secret)
  if (!resolved) return json({ error: 'not found' }, 404)
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
