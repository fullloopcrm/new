/**
 * public-upload/route.ts — storage-key injection via the file extension and
 * the client-supplied 'folder' field.
 *
 * Both were built by splitting the client-controlled `file.name` on '.' and
 * taking the last segment (or the raw 'folder' formData field) straight into
 * the Supabase Storage object key with zero character allowlist -- unlike
 * every sibling upload route (apply/signed-url, lead-media/signed-url,
 * finance/upload, team-portal/video-upload, management-applications/upload,
 * cleaners/upload, admin/notes/upload), which all strip to [a-z0-9]. A
 * crafted filename like 'a.jpg/../../../evil' (whose LAST '.'-split segment
 * is 'jpg/../../../evil') or folder='../other-tenant' injected extra path
 * segments / '..' into the object key instead of a clean extension. This is
 * a public, unauthenticated endpoint (tenant resolved from a signed header,
 * not a session), so the attack surface is any anonymous site visitor.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1' })),
}))

const uploadCalls: Array<{ path: string }> = []
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: (path: string) => {
          uploadCalls.push({ path })
          return Promise.resolve({ data: { path }, error: null })
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example.com/${path}` } }),
      }),
    },
  },
}))

import { POST } from './route'

// A minimal stand-in for File — jsdom's real File/FormData webidl checks don't
// interoperate cleanly with Next's Request in this test environment, and the
// route only ever touches .name/.size/.type/.arrayBuffer() on the value it
// pulls out of formData.get('file').
function fakeFile(name: string, type = 'image/jpeg', size = 200) {
  return { name, type, size, arrayBuffer: async () => new ArrayBuffer(size) }
}

function uploadReq(fileName: string, folder?: string): NextRequest {
  const fields = new Map<string, unknown>([['file', fakeFile(fileName)]])
  if (folder !== undefined) fields.set('folder', folder)
  return { formData: async () => ({ get: (k: string) => fields.get(k) ?? null }) } as unknown as NextRequest
}

beforeEach(() => {
  uploadCalls.length = 0
})

describe('POST /api/public-upload — storage key sanitization', () => {
  it('strips a path-traversal payload smuggled through the file extension', async () => {
    const res = await POST(uploadReq('a.jpg/../../../evil'))
    expect(res.status).toBe(200)
    const path = uploadCalls[0].path
    expect(path).not.toContain('..')
    expect(path.split('/')).toHaveLength(3) // tenantId/folder/filename — no injected segments
    expect(path).toMatch(/\.[a-z0-9]{1,8}$/) // extension survives only the [a-z0-9] allowlist
  })

  it('strips a path-traversal payload smuggled through the folder field', async () => {
    const res = await POST(uploadReq('photo.png', '../../other-tenant/secrets'))
    expect(res.status).toBe(200)
    const path = uploadCalls[0].path
    expect(path).not.toContain('..')
    expect(path.split('/')).toHaveLength(3)
  })

  it('still produces a normal, valid path for a legitimate upload', async () => {
    const res = await POST(uploadReq('photo.jpeg', 'lead-media'))
    expect(res.status).toBe(200)
    const path = uploadCalls[0].path
    expect(path).toMatch(/^tenant-1\/lead-media\/\d+-[a-z0-9]+\.jpeg$/)
  })
})
