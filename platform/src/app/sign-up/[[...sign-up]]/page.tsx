import { redirect } from 'next/navigation'

// Clerk sign-up is retired (self-service signup disabled). Send to the PIN login.
export default function SignUpPage() {
  redirect('/admin-login')
}
