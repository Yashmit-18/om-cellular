import { Router, Response } from 'express'
import { Address } from '../models/address.model'
import { authenticate } from '../middleware/auth'
import { AuthRequest } from '../types'
import { normalizePhone } from '../utils/helpers'

const router = Router()

export function validateAddressFields(body: any): string | null {
  if (!body.name || !String(body.name).trim()) return 'Recipient name is required'
  if (!body.phone || !String(body.phone).trim()) return 'Recipient phone is required'
  if (normalizePhone(String(body.phone)) === null) return 'Please enter a valid 10-digit Indian phone number'
  if (body.alternatePhone && normalizePhone(String(body.alternatePhone)) === null) return 'Alternate phone must be a valid 10-digit Indian phone number'
  if (!body.addressLine1 || !String(body.addressLine1).trim()) return 'Address line 1 is required'
  if (!body.city || !String(body.city).trim()) return 'City is required'
  if (!body.state || !String(body.state).trim()) return 'State is required'
  if (!body.pincode || !/^\d{6}$/.test(String(body.pincode).trim())) return 'Please enter a valid 6-digit PIN code'
  return null
}

function normalizeAddressInput(body: any) {
  return {
    name: String(body.name || '').trim(),
    phone: normalizePhone(String(body.phone || '')),
    alternatePhone: body.alternatePhone ? normalizePhone(String(body.alternatePhone)) : undefined,
    landmark: body.landmark ? String(body.landmark).trim() : undefined,
    addressLine1: String(body.addressLine1 || '').trim(),
    addressLine2: body.addressLine2 ? String(body.addressLine2 || '').trim() : undefined,
    city: String(body.city || '').trim(),
    state: String(body.state || '').trim(),
    pincode: String(body.pincode || '').trim(),
    country: body.country || 'IN',
    isDefault: !!body.isDefault,
  }
}

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const addresses = await Address.find({ userId: req.user!.id }).sort({ isDefault: -1, createdAt: -1 })
    return res.json({ success: true, data: addresses })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const validationError = validateAddressFields(req.body)
    if (validationError) return res.status(400).json({ success: false, message: validationError })

    const input = normalizeAddressInput(req.body)

    if (input.isDefault) {
      await Address.updateMany({ userId: req.user!.id }, { isDefault: false })
    }

    const address = await Address.create({ ...input, userId: req.user!.id })
    return res.status(201).json({ success: true, message: 'Address added', data: address })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const validationError = validateAddressFields(req.body)
    if (validationError) return res.status(400).json({ success: false, message: validationError })

    const address = await Address.findOne({ _id: req.params.id, userId: req.user!.id })
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' })

    const input = normalizeAddressInput(req.body)
    Object.assign(address, input)

    if (input.isDefault) {
      await Address.updateMany({ userId: req.user!.id, _id: { $ne: address._id } }, { isDefault: false })
    }

    await address.save()
    return res.json({ success: true, message: 'Address updated', data: address })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.patch('/:id/default', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user!.id })
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' })

    await Address.updateMany({ userId: req.user!.id }, { isDefault: false })
    address.isDefault = true
    await address.save()
    return res.json({ success: true, message: 'Default address updated', data: address })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const address = await Address.findOneAndDelete({ _id: req.params.id, userId: req.user!.id })
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' })
    return res.json({ success: true, message: 'Address deleted', data: { id: address._id } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router