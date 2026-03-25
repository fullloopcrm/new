'use client'

import WebChat from '@/components/WebChat'

export default function HeroChat({
  tenantId,
  accentColor,
}: {
  tenantId: string
  accentColor: string
}) {
  return <WebChat tenantId={tenantId} accentColor={accentColor} />
}
