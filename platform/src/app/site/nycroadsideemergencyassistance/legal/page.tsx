import { TenantLegalHub } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Legal | NYC Roadside Emergency Assistance' }

const identity = { name: 'NYC Roadside Emergency Assistance', url: 'https://nycroadsideemergencyassistance.com' }

export default function LegalPage() {
  return <TenantLegalHub identity={identity} />
}
