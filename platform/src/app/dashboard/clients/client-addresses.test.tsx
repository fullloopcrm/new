import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Feature (2026-07-30, Jeff): a client had two near-duplicate saved
 * addresses that only differed in formatting, and there was no way to tell
 * them apart at booking time. client_properties.label / addProperty /
 * updateProperty already supported a nickname end-to-end -- no UI anywhere
 * ever let anyone set one. This adds the missing input on the admin side.
 */

vi.mock('@/components/AddressAutocomplete', () => ({
  default: ({ value, onChange, onSelect, placeholder }: { value?: string; onChange?: (v: string) => void; onSelect?: () => void; placeholder?: string }) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => { onChange?.(e.target.value); onSelect?.() }}
    />
  ),
}))

import ClientAddresses from './client-addresses'

function mockFetch() {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/properties') && (!init || init.method === undefined)) {
      return { ok: true, json: async () => ({ properties: [] }) }
    }
    return { ok: true, json: async () => ({ property: { id: 'p-new' } }) }
  })
}

describe('ClientAddresses — nickname input', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends the nickname when adding a new address', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)

    render(<ClientAddresses clientId="client-1" />)

    fireEvent.click(await screen.findByText('+ Add address'))
    fireEvent.change(screen.getByPlaceholderText("Home, Mom's, Office…"), { target: { value: "Mom's house" } })
    fireEvent.change(screen.getByPlaceholderText('Street, city, state, ZIP'), { target: { value: '123 Main St, Brooklyn, NY 11201' } })
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST')
      expect(postCall).toBeTruthy()
      const body = JSON.parse((postCall![1] as RequestInit).body as string)
      expect(body.label).toBe("Mom's house")
      expect(body.address).toBe('123 Main St, Brooklyn, NY 11201')
    })
  })
})
