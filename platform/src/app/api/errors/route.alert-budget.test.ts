/**
 * errors/route.ts POST — Telegram alert-bombing via caller-controlled cooldown key.
 *
 * Public, unauthenticated client-error-reporting endpoint. trackError()'s own
 * Telegram alert cooldown is keyed by `source:message` — both are caller-
 * supplied body fields on this route — so an attacker can vary either field
 * per request to mint a fresh cooldown key every time, spamming the owner's
 * Telegram with fabricated "HIGH Error" alerts (up to the general 30/min
 * accept-rate) and burying real incident alerts. A second, coarser per-IP
 * budget (ignoring message content) gates alert-eligibility: once spent,
 * reports still get logged (severity 'medium') but stop paging the owner.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rateLimitDb = vi.hoisted(() => vi.fn())
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const trackError = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/error-tracking', () => ({ trackError }))

vi.mock('@/lib/tenant-header-sig', () => ({ verifyTenantHeaderSig: () => false }))

import type { NextRequest } from 'next/server'
import { POST } from './route'

function errorReq(message: string, source = 'client'): NextRequest {
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9' }),
    json: async () => ({ message, source }),
  } as unknown as NextRequest
}

describe('POST /api/errors — Telegram alert-bombing budget', () => {
  beforeEach(() => {
    rateLimitDb.mockReset()
    trackError.mockClear()
  })

  it('passes severity high while the per-IP alert budget is unspent', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 29 }) // accept-rate
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 2 }) // alert budget
    await POST(errorReq('unique error #1'))
    expect(trackError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ severity: 'high' }),
    )
    expect(rateLimitDb).toHaveBeenNthCalledWith(2, 'errors-alert:203.0.113.9', 3, 10 * 60 * 1000)
  })

  it('downgrades to medium (no Telegram alert) once the alert budget is spent, even with a fresh message', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 29 }) // accept-rate
    rateLimitDb.mockResolvedValueOnce({ allowed: false, remaining: 0 }) // alert budget exhausted
    await POST(errorReq('a totally different message chosen to dodge a content-keyed cooldown'))
    expect(trackError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ severity: 'medium' }),
    )
  })
})
