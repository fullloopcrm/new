import type { Metadata } from 'next'
import ForgotPinClient from './ForgotPinClient'

export const metadata: Metadata = {
  title: 'Reset PIN',
  description: 'Reset your NYC Classifieds PIN via email verification',
  robots: { index: false, follow: false },
}

export default function ForgotPinPage() {
  return <ForgotPinClient />
}
