import { describe, it, expect } from 'vitest'
import { computeDueFollowups, type StaleLeadInput } from './lead-followup'

const NOW = new Date('2026-08-20T12:00:00Z').getTime()
const DAY = 86_400_000

function lead(overrides: Partial<StaleLeadInput> = {}): StaleLeadInput {
  return {
    id: 'lead-1',
    business_name: 'Acme Co',
    contact_name: 'Jane Doe',
    email: 'jane@acme.com',
    phone: '555-1234',
    last_contacted_at: new Date(NOW).toISOString(),
    notified_7d_at: null,
    notified_14d_at: null,
    notified_30d_at: null,
    ...overrides,
  }
}

describe('computeDueFollowups', () => {
  it('skips a lead contacted recently (no threshold crossed)', () => {
    const due = computeDueFollowups([lead({ last_contacted_at: new Date(NOW - 3 * DAY).toISOString() })], NOW)
    expect(due).toHaveLength(0)
  })

  it('flags a lead exactly 7 days stale', () => {
    const due = computeDueFollowups([lead({ last_contacted_at: new Date(NOW - 7 * DAY).toISOString() })], NOW)
    expect(due).toHaveLength(1)
    expect(due[0].thresholdDays).toBe(7)
    expect(due[0].fieldsToStamp).toEqual(['notified_7d_at'])
  })

  it('reports only the highest crossed threshold, but stamps every crossed field', () => {
    // 40 days stale and never notified — 7/14/30 are all newly crossed at once
    // (e.g. cron was down). Must report ONCE at 30d, not three separate entries.
    const due = computeDueFollowups([lead({ last_contacted_at: new Date(NOW - 40 * DAY).toISOString() })], NOW)
    expect(due).toHaveLength(1)
    expect(due[0].thresholdDays).toBe(30)
    expect(due[0].fieldsToStamp).toEqual(['notified_7d_at', 'notified_14d_at', 'notified_30d_at'])
  })

  it('does not re-flag a threshold already notified', () => {
    const due = computeDueFollowups(
      [lead({ last_contacted_at: new Date(NOW - 7 * DAY).toISOString(), notified_7d_at: new Date(NOW).toISOString() })],
      NOW,
    )
    expect(due).toHaveLength(0)
  })

  it('flags the next threshold once it is newly crossed, ignoring an already-notified lower one', () => {
    const due = computeDueFollowups(
      [
        lead({
          last_contacted_at: new Date(NOW - 14 * DAY).toISOString(),
          notified_7d_at: new Date(NOW - 7 * DAY).toISOString(),
        }),
      ],
      NOW,
    )
    expect(due).toHaveLength(1)
    expect(due[0].thresholdDays).toBe(14)
    expect(due[0].fieldsToStamp).toEqual(['notified_14d_at'])
  })

  it('skips a lead with an invalid last_contacted_at instead of throwing', () => {
    const due = computeDueFollowups([lead({ last_contacted_at: 'not-a-date' })], NOW)
    expect(due).toHaveLength(0)
  })

  it('batches multiple due leads into one digest, not one per lead', () => {
    const due = computeDueFollowups(
      [
        lead({ id: 'a', last_contacted_at: new Date(NOW - 7 * DAY).toISOString() }),
        lead({ id: 'b', last_contacted_at: new Date(NOW - 30 * DAY).toISOString() }),
        lead({ id: 'c', last_contacted_at: new Date(NOW - 2 * DAY).toISOString() }),
      ],
      NOW,
    )
    expect(due.map((d) => d.lead.id)).toEqual(['a', 'b'])
  })
})
