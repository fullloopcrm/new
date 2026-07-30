import { TenantTermsConditions } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Terms & Conditions | NYC Roadside Emergency Assistance' }

const identity = { name: 'NYC Roadside Emergency Assistance', url: 'https://nycroadsideemergencyassistance.com' }

export default function TermsPage() {
  return <TenantTermsConditions identity={identity} />
}
