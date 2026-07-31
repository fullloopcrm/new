import { TenantLegalHub } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Legal | The Roadside Helper' }

const identity = { name: 'The Roadside Helper', url: 'https://theroadsidehelper.com' }

export default function LegalPage() {
  return <TenantLegalHub identity={identity} />
}
