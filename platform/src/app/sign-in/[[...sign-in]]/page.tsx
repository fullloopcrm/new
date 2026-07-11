import { redirect } from 'next/navigation'

// Clerk sign-in is retired. Real auth is the admin PIN login.
export default function SignInPage() {
  redirect('/admin-login')
}
