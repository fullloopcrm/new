import { TenantLegalHub } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Legal | The NYC Mobile Salon' }

const identity = { name: 'The NYC Mobile Salon', url: 'https://thenycmobilesalon.com', email: 'thenycmobilesalon@gmail.com' }

export default function LegalPage() {
  return <TenantLegalHub identity={identity} />
}
