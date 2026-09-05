import { RequestedService } from '../models/serviceabilityRequest.model'

export interface ServiceAreaMatchInput {
  city?: string
  state?: string
  pinCodes: string[]
  services: Partial<Record<RequestedService, boolean>>
}

export interface ServiceabilityMatch {
  configured: boolean
  serviceable: boolean
  areaCount: number
  city?: string
  state?: string
}

// Pure decision logic for pincode serviceability. Kept free of database calls
// so it can be unit tested directly; checkServiceability feeds it live data.
//
// - No enabled areas at all => legacy mode: everything is serviceable.
// - Enabled areas but none offering the requested service => not serviceable.
// - Otherwise a pincode is served when it belongs to an area that offers the
//   service (pin codes are matched whitespace-insensitively).
export function evaluateServiceability(
  enabledAreas: ServiceAreaMatchInput[],
  pincode: string,
  service: RequestedService
): ServiceabilityMatch {
  const pin = String(pincode || '').trim()

  if (!enabledAreas.length) {
    return { configured: false, serviceable: true, areaCount: 0 }
  }

  const areas = enabledAreas.filter((a) => !!a.services[service])
  if (!areas.length) {
    return { configured: true, serviceable: false, areaCount: enabledAreas.length }
  }

  for (const area of areas) {
    const matchIndex = area.pinCodes.map((p) => p.trim()).indexOf(pin)
    if (matchIndex >= 0) {
      return { configured: true, serviceable: true, areaCount: areas.length, city: area.city, state: area.state }
    }
  }

  return { configured: true, serviceable: false, areaCount: areas.length }
}