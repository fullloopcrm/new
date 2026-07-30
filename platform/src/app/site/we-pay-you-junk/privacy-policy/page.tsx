import { TenantPrivacyPolicy } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Privacy Policy | We Pay You Junk' }

const identity = { name: 'We Pay You Junk', url: 'https://wepayyoujunkremoval.com', email: 'wepayyoujunk@gmail.com' }

export default function PrivacyPolicyPage() {
  return <TenantPrivacyPolicy identity={identity} />
}
