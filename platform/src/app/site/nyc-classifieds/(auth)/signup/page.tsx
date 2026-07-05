import type { Metadata } from 'next'
import SignupClient from './SignupClient'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create a verified NYC Classifieds account',
  robots: { index: false, follow: false },
}

export default function SignupPage() {
  return <SignupClient />
}
