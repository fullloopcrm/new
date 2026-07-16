/**
 * verifySignedUpload — closes the signed-upload content/size bypass.
 *
 * createSignedUploadUrl() only authorizes a PUT to a specific storage path;
 * it does not constrain the Content-Type or body size the client actually
 * sends. Every consumer of this helper previously (or, before this fix,
 * would have) checked only that a submitted URL's prefix matched the
 * tenant's own folder — which an attacker satisfies trivially by requesting
 * a legitimately-signed URL for an allowed type, then PUTting a different,
 * larger, or differently-typed file straight to that URL, bypassing the
 * app's own ALLOWED_TYPES check entirely.
 */
import { describe, it, expect, vi } from 'vitest'

const removeCalls: string[][] = []
vi.mock('./supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example/public/uploads/${path}` } }),
        info: (path: string) => {
          if (path.includes('missing')) return Promise.resolve({ data: null, error: { message: 'not found' } })
          if (path.includes('oversized')) return Promise.resolve({ data: { size: 999_999_999, contentType: 'image/jpeg' }, error: null })
          if (path.includes('wrongtype')) return Promise.resolve({ data: { size: 1024, contentType: 'text/html' }, error: null })
          return Promise.resolve({ data: { size: 1024, contentType: 'image/jpeg' }, error: null })
        },
        remove: (paths: string[]) => {
          removeCalls.push(paths)
          return Promise.resolve({ data: null, error: null })
        },
      }),
    },
  },
}))

import { verifySignedUpload } from './verify-signed-upload'

const CONFIG = { mimes: ['image/jpeg', 'image/png'], maxSize: 10 * 1024 * 1024 }
const PREFIX = 'tenant-1/applications/photos'
const url = (name: string) => `https://storage.example/public/uploads/${PREFIX}/${name}`

describe('verifySignedUpload', () => {
  it('accepts a genuine upload whose real content-type/size matches the declared allow-list', async () => {
    const result = await verifySignedUpload('uploads', PREFIX, url('ok.jpg'), CONFIG)
    expect(result.ok).toBe(true)
  })

  it('rejects a URL outside the expected tenant/folder prefix', async () => {
    const result = await verifySignedUpload('uploads', PREFIX, 'https://evil.example/x.jpg', CONFIG)
    expect(result.ok).toBe(false)
  })

  it('rejects when no object was actually uploaded to the claimed path', async () => {
    const result = await verifySignedUpload('uploads', PREFIX, url('missing.jpg'), CONFIG)
    expect(result.ok).toBe(false)
  })

  it('rejects and deletes an object PUT with a larger body than the declared type allows', async () => {
    const result = await verifySignedUpload('uploads', PREFIX, url('oversized.jpg'), CONFIG)
    expect(result.ok).toBe(false)
    expect(removeCalls).toContainEqual([`${PREFIX}/oversized.jpg`])
  })

  it('rejects and deletes an object PUT with a different actual content-type than declared', async () => {
    const result = await verifySignedUpload('uploads', PREFIX, url('wrongtype.jpg'), CONFIG)
    expect(result.ok).toBe(false)
    expect(removeCalls).toContainEqual([`${PREFIX}/wrongtype.jpg`])
  })
})
