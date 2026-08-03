import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import SectionVisibility from './SectionVisibility'

describe('SectionVisibility', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders its children and hides the row when initially hidden', () => {
    render(
      <SectionVisibility section="sales" label="Sales" initialHidden={false}>
        <div>Total Leads</div>
      </SectionVisibility>,
    )
    expect(screen.getByText('Total Leads')).toBeInTheDocument()

    render(
      <SectionVisibility section="kpis" label="KPIs" initialHidden={true}>
        <div>AR Outstanding</div>
      </SectionVisibility>,
    )
    expect(screen.queryByText('AR Outstanding')).not.toBeInTheDocument()
    expect(screen.getByText('KPIs · hidden')).toBeInTheDocument()
  })

  it('clicking the switch hides the content immediately and PUTs the new state in the background', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ hidden: ['sales'] }) })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <SectionVisibility section="sales" label="Sales" initialHidden={false}>
        <div>Total Leads</div>
      </SectionVisibility>,
    )

    fireEvent.click(screen.getByRole('switch'))

    // Instant local flip — no need to await the network call.
    expect(screen.queryByText('Total Leads')).not.toBeInTheDocument()
    expect(screen.getByText('Sales · hidden')).toBeInTheDocument()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/dashboard/section-visibility',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ section: 'sales', hidden: true }),
      }),
    )
  })

  it('clicking again on an already-hidden section shows the content and PUTs hidden:false', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ hidden: [] }) })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <SectionVisibility section="jobs" label="Jobs" initialHidden={true}>
        <div>Jobs · Week</div>
      </SectionVisibility>,
    )

    fireEvent.click(screen.getByRole('switch'))

    expect(screen.getByText('Jobs · Week')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/dashboard/section-visibility',
      expect.objectContaining({ body: JSON.stringify({ section: 'jobs', hidden: false }) }),
    )
  })

  it('a rejected background PUT does not throw or revert the local toggle', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    render(
      <SectionVisibility section="revenue" label="Revenue" initialHidden={false}>
        <div>Today</div>
      </SectionVisibility>,
    )

    expect(() => fireEvent.click(screen.getByRole('switch'))).not.toThrow()
    expect(screen.queryByText('Today')).not.toBeInTheDocument()
  })
})
