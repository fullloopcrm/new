import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * BUG (fixed here): the form header and submit-confirmation copy hardcoded
 * "Your Business" for every template tenant's real reviewers. Now takes a
 * `businessName` prop (reviews/submit/page.tsx already resolves the real
 * tenant via getSiteConfig()/buildBusiness()).
 */

import ReviewForm from './ReviewForm'

describe('site/template ReviewForm — per-tenant branding', () => {
  it('renders the real tenant name in the header and confirmation copy, not the placeholder', () => {
    render(<ReviewForm businessName="Sparkle Cleaning Co" />)

    expect(screen.getByText('Sparkle Cleaning Co')).toBeInTheDocument()
    expect(screen.getByText(/real experience with Sparkle Cleaning Co/)).toBeInTheDocument()
    expect(screen.queryByText('Your Business')).not.toBeInTheDocument()
    expect(screen.queryByText(/real experience with Your Business/)).not.toBeInTheDocument()
  })
})
