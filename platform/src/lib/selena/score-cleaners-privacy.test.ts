import { it, expect, vi } from 'vitest'

/**
 * score_cleaners is a CLIENT_LOCAL_TOOL (tools.ts CLIENT_LOCAL_TOOLS) —
 * reachable by any ordinary client texting the tenant's SMS assistant, it
 * bypasses the owner-only gate BY DESIGN so Yinez can quote availability on
 * client channels. The handler forwarded scoreCleanersForBooking's raw
 * `conflict` string and `day_jobs` array verbatim: `conflict` can embed
 * ANOTHER client's name ("Conflict: 2:00 PM (Sarah J)") and `day_jobs` is
 * that other client's full day schedule (name + address + time) on the
 * scored cleaner. The sibling PUBLIC /api/client/smart-schedule GET route
 * already strips this exact data for this exact reason (see its own
 * "PRIVACY" comment) — this tool did not, so any client could ask "who's
 * free at 2pm" and have another client's name/address relayed back to them.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const LEAKED_NAME = 'Sarah J'
const LEAKED_ADDRESS = '123 Victim St, Apt 4B'

vi.mock('@/lib/nycmaid/smart-schedule', () => ({
  scoreCleanersForBooking: async () => [
    {
      id: 'cleaner-1',
      name: 'Maria',
      score: -1,
      available: false,
      conflict: `Conflict: 2:00 PM (${LEAKED_NAME})`,
      home_by: '18:00',
      zone_match: false,
      has_car: true,
      is_preferred: false,
      day_jobs: [{ time: '2:00 PM', client: LEAKED_NAME, address: LEAKED_ADDRESS }],
      reason: 'conflict',
    },
  ],
}))

import { runTool } from '@/lib/selena/tools'
import type { YinezResult } from '@/lib/selena/agent'

function freshResult(): YinezResult {
  return { text: '', toolsCalled: [] }
}

it("does not leak another client's name or address through score_cleaners' conflict/day_jobs", async () => {
  const raw = await runTool(
    'score_cleaners',
    { date: '2026-08-01', time: '14:00', duration_hours: 2 },
    'convo-1',
    '+12125550100',
    freshResult(),
    'tenant-1',
  )

  expect(raw).not.toContain(LEAKED_ADDRESS)
  expect(raw).not.toContain(LEAKED_NAME)
  const parsed = JSON.parse(raw)
  expect(parsed.cleaners[0].day_jobs).toBeUndefined()
  expect(parsed.cleaners[0].conflict).toBe('Conflict: 2:00 PM')
})
