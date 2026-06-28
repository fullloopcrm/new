// Jefe — the agent. Full Loop's platform GM, talking to Jeff (the owner).
// Jefe is NOT a tenant's assistant. Jefe watches the PLATFORM: product growth,
// security, stability, and tenant problems we should fix before the tenant
// notices. Read-only for now (tools that act on tenants come next).
import Anthropic from '@anthropic-ai/sdk'
import { getPlatformHealth } from '@/lib/jefe/health'

export interface JefeResult {
  text: string
  toolsCalled: string[]
}

let _anthropic: Anthropic | null = null
function getClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

export const JEFE_PROMPT = `You are Jefe — the general manager of Full Loop, the home-services CRM platform. You report to Jeff, the founder. You are talking to Jeff right now.

WHAT YOU CARE ABOUT (and ONLY this):
- Full Loop's GROWTH — the product's own sales pipeline: new inquiries and prospects who want to become tenants.
- SECURITY — security events across the platform.
- STABILITY — errors, failed communications, broken integrations, anything degrading.
- GETTING AHEAD OF TENANT PROBLEMS — you watch every tenant's health signals so you can flag an issue BEFORE the tenant notices, and tell Jeff to reach out and fix it.

WHAT YOU DO NOT CARE ABOUT:
- Any individual tenant's revenue, client counts, or day-to-day operations. That's their Yinez-style agent's job, not yours. Never report a tenant's revenue or client numbers as if they matter to Jeff — they don't.

VOICE: Terse, direct, founder-to-operator. Real numbers from tools only — never guess a count, never invent an issue. If a tool returned nothing, say it's quiet. No corporate filler, no "certainly", no emojis unless Jeff uses them.

HARD RULE — ZERO HALLUCINATION: You never state a number, tenant name, issue, or status unless it came from a tool call you made this turn. If you don't have it, call the tool. If asked something you have no tool for, say so plainly.

WHEN JEFF OPENS WITH A VAGUE MESSAGE ("hey", "status", "what's up", "how are we"): call get_platform_health and lead with what matters — any tenants with issues first, then security/stability, then new FL sales. If everything's clean, say so in one line.

WHEN THERE ARE TENANT ISSUES: name the tenant, the problem, and recommend reaching out. You exist to catch these before the tenant does.`

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_platform_health',
    description:
      "Full Loop platform health snapshot: FL sales pipeline (inquiries/prospects), security events (24h), stability (error/comms-fail counts), and the list of tenants currently showing problems (errors, comms failures, schedule issues, security) so you can flag them before the tenant notices. Call this for any 'how are we / status / any issues / any new leads' question.",
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
]

async function runTool(name: string): Promise<string> {
  if (name === 'get_platform_health') {
    const h = await getPlatformHealth()
    return JSON.stringify(h)
  }
  return JSON.stringify({ error: `unknown tool ${name}` })
}

export async function askJefe(message: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): Promise<JefeResult> {
  const result: JefeResult = { text: '', toolsCalled: [] }
  const messages: Array<{ role: 'user' | 'assistant'; content: string | Anthropic.Messages.ContentBlockParam[] }> = [
    ...history,
    { role: 'user', content: message },
  ]

  try {
    for (let i = 0; i < 4; i++) {
      const response = await getClient().messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: JEFE_PROMPT,
        messages,
        tools: TOOLS,
      })
      const textBlocks = response.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      const toolBlocks = response.content.filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')
      if (textBlocks.length > 0) result.text = textBlocks.map((b) => b.text).join(' ').trim()
      if (toolBlocks.length === 0) break

      messages.push({ role: 'assistant', content: response.content as Anthropic.Messages.ContentBlockParam[] })
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
      for (const tool of toolBlocks) {
        result.toolsCalled.push(tool.name)
        let out: string
        try {
          out = await runTool(tool.name)
        } catch (err) {
          out = JSON.stringify({ error: (err as Error).message })
        }
        toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: out })
      }
      messages.push({ role: 'user', content: toolResults })
    }
  } catch (err) {
    console.error('[Jefe]', err)
    result.text = ''
  }
  return result
}
