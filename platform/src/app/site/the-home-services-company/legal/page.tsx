import { TenantLegalHub } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Legal | The Home Services Company' }

const identity = { name: 'The Home Services Company', url: 'https://thehomeservicescompany.com' }

export default function LegalPage() {
  return <TenantLegalHub identity={identity} />
}
