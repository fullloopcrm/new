import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'

/**
 * BUG (fixed here): document.title hardcoded "Leave Feedback | Your
 * Business" for every template tenant. Now resolved client-side from
 * GET /api/tenant/public (same fix already applied to the sibling
 * site/feedback/page.tsx, ported here).
 */

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

import FeedbackPage from './page'

describe('site/template feedback page — per-tenant document.title', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sets document.title to the real tenant name from /api/tenant/public', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'Sparkle Cleaning Co' }),
    }))

    render(<FeedbackPage />)

    await waitFor(() => expect(document.title).toBe('Leave Feedback | Sparkle Cleaning Co'))
  })

  it('falls back to a neutral title (not "Your Business") when the tenant fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    render(<FeedbackPage />)

    await waitFor(() => expect(document.title).toBe('Leave Feedback | Our Business'))
    expect(document.title).not.toContain('Your Business')
  })
})
