import { TenantLegalHub } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Legal | NYC Tow' }

const identity = { name: 'NYC Tow', url: 'https://thenyctowingservice.com' }

export default function LegalPage() {
  return <TenantLegalHub identity={identity} />
}
