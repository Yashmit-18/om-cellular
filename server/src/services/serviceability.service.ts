import { ServiceArea } from '../models/serviceArea.model'
import { RequestedService } from '../models/serviceabilityRequest.model'
import { evaluateServiceability, ServiceabilityMatch as Match } from './serviceabilityLogic'

export type { ServiceabilityMatch } from './serviceabilityLogic'
export type ServiceabilityResult = Match

// Resolves whether a given service (delivery, repair, pickupDrop, sell,
// exchange) is available for a pincode. The boolean decision itself lives in
// evaluateServiceability (pure, unit tested); this only loads the data.
export async function checkServiceability(
  pincode: string,
  service: RequestedService
): Promise<ServiceabilityResult> {
  const enabledAreas = await ServiceArea.find({ isEnabled: true })
  return evaluateServiceability(enabledAreas, pincode, service)
}