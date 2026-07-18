// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * createSignedUploadUrl has no size parameter — the client PUTs bytes
 * straight to Supabase Storage and the app never sees them, so a declared
 * `maxSize` next to a signed-url route's ALLOWED_TYPES is enforced nowhere
 * unless something checks the landed object afterward. This is that check.
 */

let listResult: { data: unknown; error: unknown } = { data: [], error: null }
let removedPaths: string[][] = []

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        list: async () => listResult,
        remove: async (paths: string[]) => {
          removedPaths.push(paths)
          return { data: null, error: null }
        },
      }),
    },
  },
}))

import { verifyUploadedObjectSize } from './storage-size-guard'

beforeEach(() => {
  listResult = { data: [], error: null }
  removedPaths = []
})

describe('verifyUploadedObjectSize', () => {
  it('returns true when the landed object is within the cap', async () => {
    listResult = { data: [{ metadata: { size: 500 } }], error: null }
    const ok = await verifyUploadedObjectSize('uploads', 'tenant/resumes/x.pdf', 1000)
    expect(ok).toBe(true)
    expect(removedPaths).toHaveLength(0)
  })

  it('returns false and deletes the object when it exceeds the cap', async () => {
    listResult = { data: [{ metadata: { size: 5000 } }], error: null }
    const ok = await verifyUploadedObjectSize('uploads', 'tenant/resumes/x.pdf', 1000)
    expect(ok).toBe(false)
    expect(removedPaths).toEqual([['tenant/resumes/x.pdf']])
  })

  it('returns false when the object was never actually uploaded (list returns empty)', async () => {
    listResult = { data: [], error: null }
    const ok = await verifyUploadedObjectSize('uploads', 'tenant/resumes/x.pdf', 1000)
    expect(ok).toBe(false)
  })

  it('returns false when storage.list errors', async () => {
    listResult = { data: null, error: { message: 'boom' } }
    const ok = await verifyUploadedObjectSize('uploads', 'tenant/resumes/x.pdf', 1000)
    expect(ok).toBe(false)
  })

  it('returns false for a path with no filename segment', async () => {
    const ok = await verifyUploadedObjectSize('uploads', 'tenant/resumes/', 1000)
    expect(ok).toBe(false)
  })
})
