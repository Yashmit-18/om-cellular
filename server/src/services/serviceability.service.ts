import { ServiceArea } from '../models/serviceArea.model'
import { RequestedService } from '../models/serviceabilityRequest.model'

export interface ServiceabilityResult {
  configured: boolean
  serviceable: boolean
  areaCount: number
  city?: string
  state?: string
}

// Resolves whether a given service (delivery, repair, pickupDrop, sell,
// exchange) is available for a pincode. If no enabled service areas are
// configured at all, the store runs in legacy mode and everything is treated
// as serviceable (backwards compatible).
export async function checkServiceability(
  pincode: string,
  service: RequestedService
): Promise<ServiceabilityResult> {
  const pin = String(pincode || '').trim()

  const enabledAreas = await ServiceArea.find({ isEnabled: true })

  if (!enabledAreas.length) {
    return { configured: false, serviceable: true, areaCount: 0 }
  }

  // The store has configured service areas, so gating is active. A pincode is
  // only serviceable for a given service when it belongs to an area that
  // enables that service.
  const areas = enabledAreas.filter((a) => !!a.services[service])
  if (!areas.length) {
    return { configured: true, serviceable: false, areaCount: enabledAreas.length }
  }

  const normalized = areas.map((a) => a.pinCodes.map((p) => p.trim())).flat()
  const matchIndex = normalized.indexOf(pin)
  const matchedArea = matchIndex >= 0 ? areas.find((a) => a.pinCodes.includes(pin)) : undefined

  return {
    configured: true,
    serviceable: matchIndex >= 0,
    areaCount: areas.length,
    city: matchedArea ? matchedArea.city : undefined,
    state: matchedArea ? matchedArea.state : undefined,
  }
}