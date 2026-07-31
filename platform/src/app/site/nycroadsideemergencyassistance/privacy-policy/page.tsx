import { TenantPrivacyPolicy } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Privacy Policy | NYC Roadside Emergency Assistance' }

const identity = { name: 'NYC Roadside Emergency Assistance', url: 'https://nycroadsideemergencyassistance.com' }

export default function PrivacyPolicyPage() {
  return <TenantPrivacyPolicy identity={identity} />
}
