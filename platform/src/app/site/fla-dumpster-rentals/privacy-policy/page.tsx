import { TenantPrivacyPolicy } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Privacy Policy | FLA Dumpster Rentals' }

const identity = { name: 'FLA Dumpster Rentals', url: 'https://fladumpsterrentals.com' }

export default function PrivacyPolicyPage() {
  return <TenantPrivacyPolicy identity={identity} />
}
