import { TenantLegalHub } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Legal | The DC Exterminator' }

const identity = { name: 'The DC Exterminator', url: 'https://thedcexterminator.com', email: 'hello@thedcexterminator.com', phone: '(202) 918-1200' }

export default function LegalPage() {
  return <TenantLegalHub identity={identity} />
}
