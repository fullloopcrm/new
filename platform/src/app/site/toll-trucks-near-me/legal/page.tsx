import { TenantLegalHub } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Legal | Toll Trucks Near Me' }

const identity = { name: 'Toll Trucks Near Me', url: '' }

export default function LegalPage() {
  return <TenantLegalHub identity={identity} />
}
