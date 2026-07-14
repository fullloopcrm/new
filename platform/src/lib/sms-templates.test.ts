import { describe, it, expect } from 'vitest'
import {
  smsVerificationCode,
  smsBilingual,
  smsNewClient,
  smsNewApplication,
  smsThankYou,
  smsDailySummary,
  smsUrgentBroadcast,
  smsRunningLateClient,
  smsPaymentDueES,
} from './sms-templates'

// Opt-out footers are a TCPA compliance contract — reverting them must fail a test.
const STOP_EN = '\nReply STOP to opt out.'
const STOP_ES = '\nResponde STOP para cancelar.'

describe('sms-templates (deterministic, timezone-independent parts)', () => {
  it('formats the verification code and omits the opt-out footer', () => {
    const msg = smsVerificationCode('Acme', '123456')
    expect(msg).toBe('Acme: Your code is 123456. Expires in 10 min.')
    expect(msg).not.toContain('STOP')
  })

  it('joins bilingual messages with the --- separator', () => {
    expect(smsBilingual('Hello', 'Hola')).toBe('Hello\n---\nHola')
  })

  it('formats simple admin notices with the business-name prefix', () => {
    expect(smsNewClient('Acme', 'Jane Doe')).toBe('Acme: New client — Jane Doe')
    expect(smsNewApplication('Acme', 'Bob Roe')).toBe('Acme: New team application — Bob Roe')
  })

  it('uses the first name for thank-you, falling back to "there"', () => {
    const named = smsThankYou('Acme', 'John Smith')
    expect(named).toContain('Thanks John!')
    expect(named.endsWith(STOP_EN)).toBe(true)
    expect(smsThankYou('Acme', '')).toContain('Thanks there!')
  })

  it('pluralizes the daily-summary job count in both languages', () => {
    const one = smsDailySummary('Acme', 'Maria Lopez', 1)
    expect(one).toContain('you have 1 job in the next 3 days')
    expect(one).not.toContain('1 jobs')
    expect(one).toContain('tienes 1 trabajo en los proximos 3 dias')

    const many = smsDailySummary('Acme', 'Maria Lopez', 3)
    expect(many).toContain('you have 3 jobs in the next 3 days')
    expect(many).toContain('tienes 3 trabajos en los proximos 3 dias')
    expect(many.endsWith(STOP_EN)).toBe(true)
  })

  it('defaults the urgent-broadcast pay rate to $40/hr and honors an override', () => {
    const def = smsUrgentBroadcast('Acme', { start_time: '2026-04-19T15:00:00Z' })
    expect(def).toContain('$40/hr')
    const override = smsUrgentBroadcast('Acme', { start_time: '2026-04-19T15:00:00Z', team_pay_rate: 55 })
    expect(override).toContain('$55/hr')
    expect(override).not.toContain('$40/hr')
  })

  it('includes an ETA phrase only when eta is provided', () => {
    const withEta = smsRunningLateClient('Acme', 'Carlos Ruiz', 15)
    expect(withEta).toContain('approximately 15 minutes')
    const withoutEta = smsRunningLateClient('Acme', 'Carlos Ruiz')
    expect(withoutEta).toContain('running a few minutes behind schedule')
    expect(withoutEta).not.toContain('approximately')
  })

  it('formats the Spanish payment-due notice with the Spanish opt-out footer', () => {
    const msg = smsPaymentDueES('Acme', '50')
    expect(msg).toContain('Pago de $50 pendiente')
    expect(msg.endsWith(STOP_ES)).toBe(true)
  })
})
