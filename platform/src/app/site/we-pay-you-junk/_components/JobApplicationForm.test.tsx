import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'

/**
 * Live-bug regression: the photo input previously POSTed to `/api/upload`,
 * a route that does not exist (the real route is `/api/uploads`, and it
 * requires an authenticated dashboard session — unusable from this public
 * apply page anyway). Since a photo is REQUIRED before the form can submit,
 * every applicant was blocked from applying. The fix switches to the public
 * `/api/apply/signed-url` + Supabase `uploadToSignedUrl` flow already used
 * by other tenant application forms.
 */

const uploadToSignedUrl = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: () => ({ uploadToSignedUrl }),
    },
  })),
}))

import { JobApplicationForm } from './JobApplicationForm'

function getFileInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]')
  if (!input) throw new Error('file input not found')
  return input as HTMLInputElement
}

describe('we-pay-you-junk JobApplicationForm photo upload', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    uploadToSignedUrl.mockReset()
  })

  it('uploads via /api/apply/signed-url (not the missing /api/upload route) and shows success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        path: 'tenant-1/applications/photos/123-abc.jpg',
        token: 'signed-token',
        publicUrl: 'https://storage.example.com/tenant-1/applications/photos/123-abc.jpg',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    uploadToSignedUrl.mockResolvedValue({ error: null })

    render(<JobApplicationForm city="Brooklyn" state="NY" />)

    const file = new File(['fake-image-bytes'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(getFileInput(), { target: { files: [file] } })

    await waitFor(() => expect(screen.getByText(/photo\.jpg/)).toBeInTheDocument())

    // Regression assertion: the broken endpoint must never be called again.
    const calledUrls = fetchMock.mock.calls.map((call) => call[0])
    expect(calledUrls).not.toContain('/api/upload')
    expect(calledUrls).toContain('/api/apply/signed-url')

    // signed-url request carries the correct upload type + file metadata.
    const [, requestInit] = fetchMock.mock.calls[0]
    expect(JSON.parse(requestInit.body)).toMatchObject({
      type: 'photo',
      filename: 'photo.jpg',
      contentType: 'image/jpeg',
    })

    // uploadToSignedUrl actually receives the path/token returned by the server.
    expect(uploadToSignedUrl).toHaveBeenCalledWith(
      'tenant-1/applications/photos/123-abc.jpg',
      'signed-token',
      file,
      { contentType: 'image/jpeg' }
    )

    expect(screen.queryByText(/photo upload failed/i)).not.toBeInTheDocument()
  })

  it('rejects an unsupported image type (e.g. iPhone HEIC) before hitting the network', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<JobApplicationForm city="Brooklyn" state="NY" />)

    const file = new File(['heic-bytes'], 'photo.heic', { type: 'image/heic' })
    fireEvent.change(getFileInput(), { target: { files: [file] } })

    expect(await screen.findByText(/must be a jpg, png, or webp image/i)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(uploadToSignedUrl).not.toHaveBeenCalled()
  })

  it('surfaces a clear error when the signed-url request fails, and does not mark the photo uploaded', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Too many requests. Try again later.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<JobApplicationForm city="Brooklyn" state="NY" />)

    const file = new File(['fake-image-bytes'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(getFileInput(), { target: { files: [file] } })

    expect(await screen.findByText(/too many requests/i)).toBeInTheDocument()
    expect(uploadToSignedUrl).not.toHaveBeenCalled()
    expect(screen.queryByText(/photo\.jpg/)).not.toBeInTheDocument()
  })
})
