'use client'
import { useState, useEffect } from 'react'

interface ServiceType {
  name: string
  default_hours: number
  default_hourly_rate: number | null
  active: boolean
}

let cached: ServiceType[] | null = null

export function useServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>(cached || [])

  useEffect(() => {
    if (cached) return
    fetch('/api/service-types')
      .then(r => r.json())
      .then(data => {
        cached = data
        setServiceTypes(data)
      })
      .catch(() => {})
  }, [])

  return serviceTypes
}
