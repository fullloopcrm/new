import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Live-bug regression: openJobPlan() (the "Convert to Job (project)" modal
 * prefill) hardcoded a blind 50/50 deposit/final split regardless of the
 * deposit terms the operator already configured on the quote itself
 * (deposit_type/deposit_value -> resolved deposit_cents). It also ignored
 * deposit_paid_cents entirely, so a deposit already collected via Stripe on
 * the public quote page would be presented as still-owed in this modal.
 * Fixed to prefill from the quote's own deposit_cents (and mark a collected
 * deposit as already-paid) instead of making the operator re-decide a split
 * they already specified once.
 */

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: 'quote-1' }),
}))

import QuoteDetailPage from './page'

const baseQuote = {
  id: 'quote-1',
  quote_number: 'Q-1001',
  status: 'accepted',
  title: 'Kitchen remodel',
  description: null,
  contact_name: 'Marcus Webb',
  contact_email: 'marcus@example.com',
  contact_phone: null,
  service_address: '123 Main St',
  line_items: [],
  subtotal_cents: 1000000,
  tax_rate_bps: 0,
  tax_cents: 0,
  discount_cents: 0,
  total_cents: 1000000,
  deposit_type: 'none' as const,
  deposit_value: 0,
  deposit_cents: 0,
  deposit_paid_cents: 0,
  terms: null,
  notes: null,
  valid_until: null,
  public_token: null,
  sent_at: null,
  sent_via: null,
  first_viewed_at: null,
  last_viewed_at: null,
  view_count: 0,
  accepted_at: new Date().toISOString(),
  declined_at: null,
  declined_reason: null,
  signature_name: null,
  signature_png: null,
  signature_ip: null,
  signature_user_agent: null,
  converted_booking_id: null,
  converted_job_id: null,
  converted_at: null,
  clients: null,
  created_at: new Date().toISOString(),
}

function mockFetchWithQuote(quote: Record<string, unknown>) {
  global.fetch = vi.fn((url: string) => {
    if (url.includes('/convert-to-job')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ already_converted: false, job_id: 'job-1' }),
      } as Response)
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ quote, activity: [] }),
    } as Response)
  }) as unknown as typeof fetch
}

async function openPlanModal() {
  render(<QuoteDetailPage />)
  await waitFor(() => screen.getByText('Convert to Job (project)'))
  fireEvent.click(screen.getByText('Convert to Job (project)'))
}

describe('QuoteDetailPage payment-plan prefill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefills a single Final payment for the full total when the quote has no deposit configured', async () => {
    mockFetchWithQuote(baseQuote)
    await openPlanModal()

    const amounts = screen.getAllByPlaceholderText('0.00')
    expect(amounts).toHaveLength(1)
    expect((amounts[0] as HTMLInputElement).value).toBe('10000.00')
  })

  it('prefills the deposit/final split from the quote\'s own configured deposit_cents, not a blind 50/50 split', async () => {
    mockFetchWithQuote({ ...baseQuote, deposit_type: 'percent', deposit_value: 2500, deposit_cents: 250000 })
    await openPlanModal()

    const amounts = screen.getAllByPlaceholderText('0.00') as HTMLInputElement[]
    expect(amounts).toHaveLength(2)
    // 25% deposit ($2,500), not a blind half ($5,000).
    expect(amounts[0].value).toBe('2500.00')
    expect(amounts[1].value).toBe('7500.00')
  })

  it('reflects a deposit already collected via Stripe as paid, not owed again', async () => {
    mockFetchWithQuote({ ...baseQuote, deposit_type: 'flat', deposit_value: 300000, deposit_cents: 300000, deposit_paid_cents: 300000 })
    await openPlanModal()

    expect(screen.getByDisplayValue('Deposit (already paid)')).toBeTruthy()
    const amounts = screen.getAllByPlaceholderText('0.00') as HTMLInputElement[]
    expect(amounts[0].value).toBe('3000.00')
    expect(amounts[1].value).toBe('7000.00')

    fireEvent.click(screen.getByText('Create Job'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/convert-to-job'),
      expect.objectContaining({ method: 'POST' }),
    ))
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(c => String(c[0]).includes('/convert-to-job'))
    const body = JSON.parse((call?.[1] as RequestInit).body as string)
    expect(body.payments[0]).toMatchObject({ label: 'Deposit (already paid)', already_paid: true, amount_cents: 300000 })
    expect(body.payments[1]).toMatchObject({ label: 'Final', amount_cents: 700000 })
    expect(body.payments[1].already_paid).toBeUndefined()
  })
})
