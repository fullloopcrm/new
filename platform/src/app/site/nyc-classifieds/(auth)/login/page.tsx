import type { Metadata } from 'next'
import LoginClient from './LoginClient'

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Log in to NYC Classifieds',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return <LoginClient />
}
