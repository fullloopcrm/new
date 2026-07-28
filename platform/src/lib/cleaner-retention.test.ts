import { describe, expect, test } from 'vitest'
import { computeCleanerRetention } from './cleaner-retention'
import type { ClientChurnFacts } from './client-churn-facts'

const active: ClientChurnFacts = { completedCount: 3, lastServiceDate: Date.now(), hasUpcoming: true, scheduleCount: 1, hasActiveSchedule: true }
const churnedOnetime: ClientChurnFacts = { completedCount: 1, lastServiceDate: Date.now() - 100 * 86400000, hasUpcoming: false, scheduleCount: 0, hasActiveSchedule: false }
const churnedLapsed: ClientChurnFacts = { completedCount: 5, lastServiceDate: Date.now() - 100 * 86400000, hasUpcoming: false, scheduleCount: 1, hasActiveSchedule: false }

describe('computeCleanerRetention', () => {
  test('retention rate is retained/served among a cleaners distinct completed-booking clients', () => {
    const bookings = [
      { client_id: 'c1', team_member_id: 'tm1', status: 'completed' },
      { client_id: 'c2', team_member_id: 'tm1', status: 'completed' },
      { client_id: 'c3', team_member_id: 'tm1', status: 'completed' },
    ]
    const facts = new Map([
      ['c1', active],
      ['c2', active],
      ['c3', churnedOnetime],
    ])

    const [result] = computeCleanerRetention(bookings, facts)
    expect(result.teamMemberId).toBe('tm1')
    expect(result.clientsServed).toBe(3)
    expect(result.clientsRetained).toBe(2)
    expect(result.retentionRate).toBeCloseTo(66.67, 1)
  })

  test('a client served twice by the same cleaner only counts once', () => {
    const bookings = [
      { client_id: 'c1', team_member_id: 'tm1', status: 'completed' },
      { client_id: 'c1', team_member_id: 'tm1', status: 'completed' },
    ]
    const facts = new Map([['c1', active]])

    const [result] = computeCleanerRetention(bookings, facts)
    expect(result.clientsServed).toBe(1)
  })

  test('non-completed bookings and bookings with no assigned tech are excluded', () => {
    const bookings = [
      { client_id: 'c1', team_member_id: 'tm1', status: 'scheduled' },
      { client_id: 'c2', team_member_id: null, status: 'completed' },
    ]
    const results = computeCleanerRetention(bookings, new Map([['c1', active], ['c2', active]]))
    expect(results).toHaveLength(0)
  })

  test('a cleaner whose clients all churned scores 0%, not null', () => {
    const bookings = [{ client_id: 'c1', team_member_id: 'tm1', status: 'completed' }]
    const [result] = computeCleanerRetention(bookings, new Map([['c1', churnedLapsed]]))
    expect(result.retentionRate).toBe(0)
  })
})
