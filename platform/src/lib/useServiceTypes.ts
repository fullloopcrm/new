'use client'
import { useState, useEffect } from 'react'

interface ServiceType {
  name: string
  default_hours: number
  active: boolean
}

export function useServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])

  useEffect(() => {
    fetch('/api/service-types')
      .then(r => r.json())
      .then(data => setServiceTypes(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  return serviceTypes
}
