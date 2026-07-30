import { TenantLegalHub } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Legal | The NYC Exterminator' }

const identity = { name: 'The NYC Exterminator', url: 'https://thenycexterminator.com', email: 'hello@thenycexterminator.com', phone: '212-202-8545' }

export default function LegalPage() {
  return <TenantLegalHub identity={identity} />
}
