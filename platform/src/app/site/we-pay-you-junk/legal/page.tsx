import { TenantLegalHub } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Legal | We Pay You Junk' }

const identity = { name: 'We Pay You Junk', url: 'https://wepayyoujunkremoval.com', email: 'wepayyoujunk@gmail.com' }

export default function LegalPage() {
  return <TenantLegalHub identity={identity} />
}
