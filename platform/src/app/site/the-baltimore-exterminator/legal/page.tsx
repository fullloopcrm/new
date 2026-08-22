import { TenantLegalHub } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Legal | The Baltimore Exterminator' }

const identity = { name: 'The Baltimore Exterminator', url: 'https://thebaltimoreexterminator.com', email: 'hello@thebaltimoreexterminator.com', phone: '(410) 844-6060' }

export default function LegalPage() {
  return <TenantLegalHub identity={identity} />
}
