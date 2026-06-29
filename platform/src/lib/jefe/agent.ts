// Jefe — the agent. Full Loop's platform GM, talking to Jeff (the owner).
// Jefe is NOT a tenant's assistant. Jefe watches the PLATFORM: product growth,
// security, stability, and tenant problems we should fix before the tenant
// notices. Read-only for now (tools that act on tenants come next).
import Anthropic from '@anthropic-ai/sdk'
import { getPlatformHealth } from '@/lib/jefe/health'
import {
  provisionChecklist,
  notifyTenantOwner,
  rerunCron,
  ackIssue,
  createTask,
  listTasks,
  retryFailedNotifications,
} from '@/lib/jefe/actions'

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
- STABILITY — real app errors, failed communications, silent crons, broken integrations, anything degrading.
- EVERY TENANT'S ABILITY TO OPERATE — you watch whether each tenant can actually run: are they provisioned to text/email/charge, are their comms landing, are their payments clearing. You have each tenant's back: catch the break BEFORE the tenant feels it and tell Jeff to reach out.

WHAT YOU DO NOT CARE ABOUT:
- Any individual tenant's revenue, client counts, or day-to-day operations. That's their own agent's job, not yours. You protect a tenant's ABILITY to operate; you never run their operation or report their revenue/client numbers as if they matter to Jeff — they don't.

THE SIGNALS YOU TRACK (all from get_platform_health):
- provisioning: tenants that can't text (no SMS), can't email, or can't charge (no payments) — they're "live" but non-operational. THIS IS THE BIGGEST HOLE; lead with it when bad.
- comms: outbound notification success rate over 24h. A low success_rate means messages aren't reaching people — a silent emergency. Lead with it when bad.
- crons: background jobs that have gone silent past their expected cadence.
- errors: real app error counts (1h / 24h / 7d) with trend.
- payments: completed jobs still unpaid >24h (a stuck-money signal, NOT revenue).
- lifecycle: new tenant signups (7d) and tenants going quiet (no activity 14d+).
- plus the existing FL sales pipeline, security events, and per-tenant issue feed.

VOICE: Terse, direct, founder-to-operator. Real numbers from tools only — never guess a count, never invent an issue. If a tool returned nothing, say it's quiet. No corporate filler, no "certainly", no emojis unless Jeff uses them.

HARD RULE — ZERO HALLUCINATION: You never state a number, tenant name, issue, or status unless it came from a tool call you made this turn. If you don't have it, call the tool. If asked something you have no tool for, say so plainly.

WHEN JEFF OPENS WITH A VAGUE MESSAGE ("hey", "status", "what's up", "how are we"): call get_platform_health and lead with what's worst, in this order — (1) provisioning gaps if any tenant can't operate, (2) comms deliverability if success_rate is low, (3) silent crons / error spikes, (4) tenants with active issues, (5) then security and FL sales. If everything's clean, say so in one line. Don't dump every number — surface what needs action.

WHEN THERE ARE TENANT PROBLEMS: name the tenant, the problem, and recommend reaching out. You exist to catch these before the tenant does.

YOU CAN ACT — not just report. Your action tools: provision_checklist (read-only — what a tenant is missing), notify_tenant_owner (message a tenant's owner), rerun_cron (re-fire a silent job), ack_issue (silence a handled issue), create_task / list_tasks (Jeff's to-dos), retry_failed_notifications (preview only).

CONFIRM BEFORE ACTING — HARD RULE: For anything that sends a message, fires a cron, or changes state (notify_tenant_owner, rerun_cron), you ALWAYS go two steps:
1. First call the tool with confirm=false (or just describe what you'll do) and show Jeff the exact preview — who you'll message, on what channel, the exact draft. Then STOP and ask "Confirm?".
2. ONLY after Jeff replies yes in the conversation do you call again with confirm=true to actually execute.
Never execute an outbound or state-changing action in the same turn you propose it. Read-only tools (get_platform_health, provision_checklist, list_tasks, retry_failed_notifications) run immediately — no confirmation needed.

You only ever contact a tenant's OWNER, never their clients. You never run a tenant's day-to-day operations — you protect their ability to operate and flag what needs Jeff.`

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_platform_health',
    description:
      "Full Loop platform health snapshot. Returns: provisioning (tenants that can't text/email/charge), comms (24h notification send success_rate + worst tenants), crons (silent background jobs), errors (1h/24h/7d real app errors), payments (jobs completed but unpaid >24h), lifecycle (new signups + tenants going inactive), plus FL sales pipeline, security events (24h), and the per-tenant issue feed. Call this for any 'how are we / status / any issues / who can't operate / any new leads' question.",
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'provision_checklist',
    description:
      "READ-ONLY. For one tenant, list exactly which operating keys are missing (SMS/Telnyx, email/Resend, payments/Stripe, agent name, Telegram) plus the owner's contact info, so Jeff can finish setup. Use when Jeff asks what a tenant needs or why a tenant can't operate. Runs immediately, no confirmation.",
    input_schema: {
      type: 'object' as const,
      properties: { tenant: { type: 'string', description: 'tenant slug or name' } },
      required: ['tenant'],
    },
  },
  {
    name: 'notify_tenant_owner',
    description:
      "Send a message to a tenant's OWNER (never their clients) via that tenant's own SMS or email channel. CONFIRM-GATED: call with confirm=false first to get a preview (channel, recipient, draft), show it to Jeff, and only call again with confirm=true after Jeff explicitly says yes. If the tenant has no channel, it returns the owner's contact for manual reach-out.",
    input_schema: {
      type: 'object' as const,
      properties: {
        tenant: { type: 'string', description: 'tenant slug or name' },
        message: { type: 'string', description: 'the message to the owner' },
        confirm: { type: 'boolean', description: 'false = preview only; true = actually send (only after Jeff says yes)' },
      },
      required: ['tenant', 'message', 'confirm'],
    },
  },
  {
    name: 'rerun_cron',
    description:
      'Manually re-fire a background cron job (e.g. to clear a silent-job alert). CONFIRM-GATED: confirm=false returns a preview; confirm=true fires it (only after Jeff says yes).',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'cron name, e.g. comms-monitor, health-monitor, email-monitor' },
        confirm: { type: 'boolean' },
      },
      required: ['name', 'confirm'],
    },
  },
  {
    name: 'ack_issue',
    description: 'Acknowledge a surfaced issue by its id so it stops nagging. Use when Jeff says he has handled or is aware of something.',
    input_schema: {
      type: 'object' as const,
      properties: {
        issue_id: { type: 'string' },
        kind: { type: 'string', description: 'optional: notification | security_event | error' },
      },
      required: ['issue_id'],
    },
  },
  {
    name: 'create_task',
    description: "Save a to-do for Jeff in Jefe's own task list (e.g. 'reach out to the-florida-maid about Stripe') so it doesn't get lost.",
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        detail: { type: 'string' },
        tenant: { type: 'string', description: 'optional tenant slug or name to attach' },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_tasks',
    description: "List Jefe's open to-do items for Jeff.",
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'retry_failed_notifications',
    description:
      'PREVIEW ONLY (auto-resend not yet enabled). Show how many failed notifications exist and their channel breakdown, optionally scoped to one tenant, so Jeff can decide. Does NOT re-send.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tenant: { type: 'string', description: 'optional tenant slug or name' },
        since_hours: { type: 'number', description: 'lookback window, default 24' },
      },
      required: [],
    },
  },
]

type ToolInput = Record<string, unknown>
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const bool = (v: unknown): boolean => v === true

async function runTool(name: string, input: ToolInput = {}): Promise<string> {
  let out: unknown
  switch (name) {
    case 'get_platform_health':
      out = await getPlatformHealth()
      break
    case 'provision_checklist':
      out = await provisionChecklist(str(input.tenant))
      break
    case 'notify_tenant_owner':
      out = await notifyTenantOwner(str(input.tenant), str(input.message), bool(input.confirm))
      break
    case 'rerun_cron':
      out = await rerunCron(str(input.name), bool(input.confirm))
      break
    case 'ack_issue':
      out = await ackIssue(str(input.issue_id), str(input.kind) || undefined)
      break
    case 'create_task':
      out = await createTask(str(input.title), str(input.detail) || undefined, str(input.tenant) || undefined)
      break
    case 'list_tasks':
      out = await listTasks()
      break
    case 'retry_failed_notifications':
      out = await retryFailedNotifications(str(input.tenant) || undefined, typeof input.since_hours === 'number' ? input.since_hours : 24)
      break
    default:
      out = { error: `unknown tool ${name}` }
  }
  return JSON.stringify(out)
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
          out = await runTool(tool.name, (tool.input as ToolInput) || {})
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
