import { TenantPrivacyPolicy } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Privacy Policy | NYC Tow' }

const identity = { name: 'NYC Tow', url: 'https://thenyctowingservice.com' }

export default function PrivacyPolicyPage() {
  return <TenantPrivacyPolicy identity={identity} />
}
