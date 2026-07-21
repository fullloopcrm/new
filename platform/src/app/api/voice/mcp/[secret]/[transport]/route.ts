// MCP server for FullLoop's xAI Grok voice agent (prospect qualification line).
//
// Hand-rolled (not mcp-handler/SDK) — mirrors NYC Maid's nycmaid/src/app/api/voice/mcp
// implementation, which exists because xAI's Custom MCP connector probes with a plain
// POST and doesn't send the strict `Accept: application/json, text/event-stream` header
// the mcp-handler/SDK requires (it 406s), and its SSE path needs Redis we don't run.
// This endpoint speaks minimal MCP JSON-RPC over a single POST and always answers
// application/json, so the connector can reach it.
//
// AUTH: secret in the URL path (VOICE_MCP_TOKEN). xAI connects with NO auth to
//   https://<domain>/api/voice/mcp/<VOICE_MCP_TOKEN>/mcp
// Wrong/absent secret -> 404. Tools reuse the same createProspect() pipeline as
// the public /qualify form (src/lib/voice-agent/tools.ts).

import {
  getPricing,
  checkSlotAvailability,
  submitApplication,
  logCallNote,
  type SubmitApplicationArgs,
} from '@/lib/voice-agent/tools'

const SECRET = process.env.VOICE_MCP_TOKEN || ''
const PROTOCOL_VERSION = '2025-06-18'

type ToolDef = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  run: (args: Record<string, unknown>) => Promise<string>
}

const str = { type: 'string' }
const bool = { type: 'boolean' }

const TOOLS: ToolDef[] = [
  {
    name: 'get_pricing',
    description: 'Get Full Loop\'s real pricing (setup fee + per-seat monthly) to quote accurately. No args needed.',
    inputSchema: { type: 'object', properties: {} },
    run: () => getPricing(),
  },
  {
    name: 'check_territory_availability',
    description: 'Check whether a trade × ZIP territory is already taken by another Full Loop tenant.',
    inputSchema: {
      type: 'object',
      properties: { trade: str, zip: str },
      required: ['trade', 'zip'],
    },
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
        annual_revenue: str, // under_250k | 250k_1m | 1m_3m | 3m_plus
        revenue_trajectory: str, // up | flat | down
        growth_goal: str, // scale_2x | steady | maintain | none
        automation_comfort: str, // excited | open | cautious | skeptical
        lead_gen_spend: str, // none | lt500 | 500_2k | 2k_5k | 5k_plus
        pain_point: str, // admin | missing_leads | cant_scale | no_followup | booking_chaos | other
        timeline: str, // asap | 30 | 90 | exploring
        current_system: str, // nothing | spreadsheets | basic_crm | shopping
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
    inputSchema: {
      type: 'object',
      properties: { owner_phone: str, note: str },
      required: ['owner_phone', 'note'],
    },
    run: (a) => logCallNote(String(a.owner_phone ?? ''), String(a.note ?? '')),
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

async function handleRpc(msg: {
  id?: unknown
  method?: string
  params?: Record<string, unknown>
}): Promise<Response | null> {
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
        const text = await tool.run(args)
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

function checkSecret(secret: string): boolean {
  return !!SECRET && secret === SECRET
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ secret: string; transport: string }> },
): Promise<Response> {
  const { secret } = await ctx.params
  if (!checkSecret(secret)) return json({ error: 'not found' }, 404)

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
      const r = await handleRpc(m as never)
      if (r) out.push(await r.json())
    }
    return json(out)
  }
  const res = await handleRpc(body as never)
  return res ?? new Response(null, { status: 202 })
}

// Some clients GET the URL to check reachability or open a stream. Answer 200 so
// the connector's probe succeeds; we don't offer a server->client SSE stream.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ secret: string; transport: string }> },
): Promise<Response> {
  const { secret } = await ctx.params
  if (!checkSecret(secret)) return json({ error: 'not found' }, 404)
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
