import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * BUG (fixed here): the widget header hardcoded "Your Business Reviews" for
 * every template tenant — both call sites in reviews/page.tsx render this
 * with no per-tenant identity at all. Now takes a `businessName` prop.
 */

import ReviewsList from './ReviewsList'

describe('site/template ReviewsList — per-tenant branding', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ reviews: [], totalReviews: 0, avgRating: 5.0 }),
    }))
  })

  it('renders the real tenant name in the widget header, not the placeholder', async () => {
    render(<ReviewsList businessName="Sparkle Cleaning Co" />)

    expect(await screen.findByText('Sparkle Cleaning Co Reviews')).toBeInTheDocument()
    expect(screen.queryByText('Your Business Reviews')).not.toBeInTheDocument()
  })
})
