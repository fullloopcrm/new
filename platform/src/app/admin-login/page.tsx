import { Suspense } from 'react'
import LoginForm from '../fullloop/LoginForm'

/**
 * Platform-level admin login (main host only -- see middleware.ts's /admin
 * rewrite). Previously a standalone duplicate of fullloop/LoginForm.tsx with
 * its own copy of the PIN-submit logic; that duplication meant this page --
 * the actual redirect target from admin/layout.tsx for an unauthenticated
 * visitor -- never got the ?pin=/?next= deep-link handling added to
 * LoginForm. Reusing the same component keeps both entry points in sync.
 */
export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm businessName="Full Loop" />
    </Suspense>
  )
}
