import { TenantPrivacyPolicy } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Privacy Policy | The DC Exterminator' }

const identity = { name: 'The DC Exterminator', url: 'https://thedcexterminator.com', email: 'hello@thedcexterminator.com', phone: '(202) 918-1200' }

export default function PrivacyPolicyPage() {
  return <TenantPrivacyPolicy identity={identity} />
}
