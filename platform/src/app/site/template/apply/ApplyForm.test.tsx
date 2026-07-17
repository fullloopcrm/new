import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * BUG (fixed here): the "Questions? / ¿Preguntas?" footer line (shown on
 * both the main form and the post-submit confirmation screen) hardcoded the
 * literal placeholder phone number "(555) 555-5555" for every template
 * tenant's real job applicants, even though `businessName` was already
 * correctly threaded through from apply/page.tsx's getSiteConfig() call —
 * only the phone number was missed. Now both come from props.
 */

import ApplyForm from './ApplyForm'

describe('site/template apply form — per-tenant branding', () => {
  it('renders the real tenant name and phone, not the placeholders', () => {
    render(<ApplyForm businessName="Sparkle Cleaning Co" phone="(212) 555-0199" />)

    expect(screen.getAllByText('Sparkle Cleaning Co').length).toBeGreaterThan(0)
    expect(screen.getByText(/\(212\) 555-0199/)).toBeInTheDocument()
    expect(screen.queryByText('Your Business')).not.toBeInTheDocument()
    expect(screen.queryByText(/555-5555/)).not.toBeInTheDocument()
  })
})
