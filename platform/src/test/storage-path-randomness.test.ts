// GUARD — storage object paths must use crypto-strength randomness, not
// Math.random().
//
// The `uploads` bucket (and `team-photos`, same shape) is a PUBLIC Supabase
// Storage bucket: anyone who knows/guesses an object's path can fetch it with
// no auth check. For routes where the path carries little or no other
// unguessable segment (e.g. admin/notes/upload's `notes/<rand>.<ext>` has NO
// tenant or entity id in it at all), the random suffix IS the entire access
// control for that object.
//
// Math.random() is a non-cryptographic PRNG (V8's xorshift128+). Its internal
// state has published recovery attacks from a handful of observed outputs,
// after which every future output — including other callers' path suffixes
// generated on the same warm process — becomes predictable. That defeats the
// "unguessable path" assumption these routes rely on.
//
// This test statically guards every route we fixed so a future edit can't
// silently reintroduce Math.random() as the source of a storage-path suffix.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROUTES = [
  'src/app/api/cleaners/upload/route.ts',
  'src/app/api/admin/notes/upload/route.ts',
  'src/app/api/uploads/route.ts',
  'src/app/api/booking-notes/upload/route.ts',
  'src/app/api/team-applications/upload/route.ts',
  'src/app/api/public-upload/route.ts',
  'src/app/api/team-portal/video-upload/route.ts',
]

describe('storage path randomness (CWE-330 guard)', () => {
  for (const relPath of ROUTES) {
    it(`${relPath} does not derive a storage path from Math.random()`, () => {
      const source = readFileSync(join(process.cwd(), relPath), 'utf8')
      expect(source).not.toMatch(/Math\.random\(\)/)
      expect(source).toMatch(/randomBytes\(/)
      expect(source).toMatch(/import\s*\{[^}]*randomBytes[^}]*\}\s*from\s*['"]crypto['"]/)
    })
  }
})
