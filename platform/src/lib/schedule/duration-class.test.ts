import { describe, it, expect } from 'vitest'
import { deriveDurationClass, spanDays } from './duration-class'

describe('duration-class deriver', () => {
  it('classifies a 2hr maid job (nycmaid) as slot', () => {
    expect(deriveDurationClass({ start_time: '2026-07-05T09:00:00', end_time: '2026-07-05T11:00:00' })).toBe('slot')
  })

  it('classifies an 8hr same-day deep clean as slot', () => {
    expect(deriveDurationClass({ start_time: '2026-07-05T08:00:00', end_time: '2026-07-05T16:00:00' })).toBe('slot')
  })

  it('classifies a 3-day dumpster rental as multiday', () => {
    expect(deriveDurationClass({ start_time: '2026-07-05T09:00:00', end_time: '2026-07-08T09:00:00' })).toBe('multiday')
  })

  it('classifies a 30-day span as project', () => {
    expect(deriveDurationClass({ start_time: '2026-07-05T09:00:00', end_time: '2026-08-04T09:00:00' })).toBe('project')
  })

  it('classifies any project-linked booking as project regardless of length', () => {
    expect(deriveDurationClass({ start_time: '2026-07-05T09:00:00', end_time: '2026-07-05T10:00:00', project_id: 'p1' })).toBe('project')
  })

  it('honors an explicit stored override', () => {
    expect(deriveDurationClass({ start_time: '2026-07-05T09:00:00', end_time: '2026-07-05T10:00:00', duration_class: 'project' })).toBe('project')
  })

  it('defaults to slot when end_time is missing', () => {
    expect(deriveDurationClass({ start_time: '2026-07-05T09:00:00', end_time: null })).toBe('slot')
  })

  it('is timezone-stable: exactly 14 days is multiday, 15 is project', () => {
    expect(deriveDurationClass({ start_time: '2026-07-05T09:00:00', end_time: '2026-07-19T09:00:00' })).toBe('multiday')
    expect(deriveDurationClass({ start_time: '2026-07-05T09:00:00', end_time: '2026-07-20T09:00:00' })).toBe('project')
  })

  it('spanDays computes whole-day spans across month + DST boundaries', () => {
    expect(spanDays('2026-07-05T09:00:00', '2026-07-05T23:00:00')).toBe(0)
    expect(spanDays('2026-03-01T00:00:00', '2026-03-31T00:00:00')).toBe(30) // DST starts 2026-03-08 ET
  })
})
