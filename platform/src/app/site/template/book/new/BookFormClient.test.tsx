import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

/**
 * BUG (fixed here): the primary booking form — the highest-traffic page on
 * every template tenant's site — hardcoded "Your Business" (document.title,
 * self-booking badge) and the literal placeholder phone "(555) 555-5555" /
 * "sms:5555555555" across five separate error/help messages, shown to real
 * customers of every template tenant regardless of which business they were
 * actually booking with. `businessName` was already threaded through from
 * book/new/page.tsx's getSiteConfig() call and used correctly in the SMS
 * consent copy — these were missed spots. `phone`/`phoneDigits` are new
 * props (page.tsx now passes config.contact.phone/phoneDigits).
 */

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

import BookFormClient from './BookFormClient'

const SERVICES = [
  { value: 'Standard Cleaning', label: 'Standard', hours: 2 },
  { value: 'Same-Day Emergency', label: 'Same-Day', hours: 2, emergency: true },
]

describe('site/template BookFormClient — per-tenant branding', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // The cleaner-availability effect fires unconditionally on mount; stub
    // fetch so it resolves harmlessly instead of hitting the network.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
  })

  it('renders the real tenant name and phone, not the placeholders', async () => {
    render(
      <BookFormClient
        services={SERVICES}
        businessName="Sparkle Cleaning Co"
        phone="(212) 555-0199"
        phoneDigits="2125550199"
      />
    )

    await waitFor(() => expect(document.title).toBe('Book a Service | Sparkle Cleaning Co'))
    expect(screen.getByText('Sparkle Cleaning Co Self-Booking System')).toBeInTheDocument()

    const smsLink = screen.getByRole('link', { name: '(212) 555-0199' })
    expect(smsLink).toHaveAttribute('href', 'sms:2125550199')

    expect(screen.queryByText('Your Business Self-Booking System')).not.toBeInTheDocument()
    expect(screen.queryByText(/555-5555/)).not.toBeInTheDocument()
    expect(screen.queryByText(/sms:5555555555/)).not.toBeInTheDocument()
  })
})
