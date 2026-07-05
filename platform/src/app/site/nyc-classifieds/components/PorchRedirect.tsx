'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PorchRedirect() {
  const router = useRouter()

  useEffect(() => {
    const home = localStorage.getItem('home')
    if (home) router.replace(`/porch/${home}`)
  }, [router])

  return null
}
