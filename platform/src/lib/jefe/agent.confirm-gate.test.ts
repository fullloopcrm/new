import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Jefe's confirm-gated tools (notify_tenant_owner, rerun_cron,
 * send_tenant_message) were only gated by a system-prompt instruction
 * telling the model to wait for Jeff to reply "yes" in a NEW message before
 * calling confirm=true. Nothing in code stopped the model from calling
 * confirm=false and then confirm=true back-to-back inside the SAME
 * askJefe() turn — a real risk given read_tenant_thread pulls tenant-owner
 * -authored (untrusted) text into that same reasoning context, which could
 * talk the model into self-confirming.
 *
 * This locks in the code-level fix: the turn hard-stops (tool_choice:
 * 'none' wrap-up, no further tool calls possible) the moment any
 * confirm-gated tool is invoked, so a confirm=true execution can only ever
 * come from a fresh incoming Telegram message.
 */

const anthropicCalls: Array<{ toolChoice: unknown }> = []
const createMock = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: createMock }
  },
}))

vi.mock('@/lib/jefe/health', () => ({ getPlatformHealth: vi.fn(async () => ({ ok: true })) }))

const notifyTenantOwnerMock = vi.fn(async (_tenant: string, _message: string, _confirm: boolean) => ({
  ok: true,
  preview: true,
  tenant: 't',
  channel: 'sms',
  to: 'x',
  draft: 'd',
}))
vi.mock('@/lib/jefe/actions', () => ({
  provisionChecklist: vi.fn(),
  notifyTenantOwner: (tenant: string, message: string, confirm: boolean) => notifyTenantOwnerMock(tenant, message, confirm),
  rerunCron: vi.fn(),
  ackIssue: vi.fn(),
  createTask: vi.fn(async () => ({ ok: true, created: true, id: '1' })),
  listTasks: vi.fn(async () => ({ ok: true, open_tasks: [] })),
  retryFailedNotifications: vi.fn(),
  readTenantThread: vi.fn(async () => ({ ok: true, messages: [] })),
  sendTenantMessage: vi.fn(),
}))

import { askJefe } from './agent'

function textBlock(text: string) {
  return { type: 'text' as const, text }
}
function toolUseBlock(id: string, name: string, input: Record<string, unknown>) {
  return { type: 'tool_use' as const, id, name, input }
}

beforeEach(() => {
  anthropicCalls.length = 0
  createMock.mockReset()
  notifyTenantOwnerMock.mockClear()
})

describe('askJefe confirm-gate', () => {
  it('never executes confirm=true in the same turn as confirm=false, even if the model tries', async () => {
    createMock.mockImplementation(async (params: { tool_choice?: { type: string } }) => {
      anthropicCalls.push({ toolChoice: params.tool_choice })
      if (params.tool_choice?.type === 'none') {
        // Forced wrap-up call — must not (and per the API contract, cannot)
        // contain a tool_use block.
        return { content: [textBlock('Previewed. Reply yes to send.')] }
      }
      if (createMock.mock.calls.length === 1) {
        // First turn: model previews the send.
        return { content: [toolUseBlock('t1', 'notify_tenant_owner', { tenant: 'acme', message: 'hi', confirm: false })] }
      }
      // Attack simulation: if the loop let it, the model (e.g. talked into
      // it by injected tool-result content) tries to immediately execute.
      return { content: [toolUseBlock('t2', 'notify_tenant_owner', { tenant: 'acme', message: 'hi', confirm: true })] }
    })

    await askJefe('message acme owner that we fixed their SMS')

    expect(notifyTenantOwnerMock).toHaveBeenCalledTimes(1)
    expect(notifyTenantOwnerMock).toHaveBeenCalledWith('acme', 'hi', false)
    // The follow-up call must have been forced tool-less.
    expect(anthropicCalls.some((c) => (c.toolChoice as { type?: string } | undefined)?.type === 'none')).toBe(true)
  })

  it('does not cut short a benign read-only multi-tool turn', async () => {
    createMock.mockImplementation(async () => {
      if (createMock.mock.calls.length === 1) {
        return { content: [toolUseBlock('h1', 'get_platform_health', {})] }
      }
      if (createMock.mock.calls.length === 2) {
        return { content: [toolUseBlock('h2', 'create_task', { title: 'follow up' })] }
      }
      return { content: [textBlock('Done — logged a task.')] }
    })

    const result = await askJefe('status check, and log a task to follow up')

    expect(result.toolsCalled).toEqual(['get_platform_health', 'create_task'])
    expect(result.text).toBe('Done — logged a task.')
  })
})
