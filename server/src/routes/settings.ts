import { Router, Request, Response } from 'express'
import { Setting } from '../models/setting.model'
import { requireAdmin } from '../middleware/auth'

const router = Router()

const PUBLIC_PREFIXES = ['business_', 'social_', 'store_', 'whatsapp_', 'google_maps_', 'opening_hours_', 'footer_', 'upi_', 'repair_']
const PUBLIC_KEYS = ['store_name', 'store_email', 'store_phone', 'store_address', 'tax_rate', 'free_shipping_threshold', 'standard_shipping_price']

router.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = await Setting.find({
      $or: [
        { key: { $regex: `^(${PUBLIC_PREFIXES.join('|')})` } },
        { key: { $in: PUBLIC_KEYS } },
      ],
    })
    const data = settings.map((s) => ({ key: s.key, value: s.value || '' }))
    return res.json({ success: true, data })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/all', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await Setting.find().sort({ key: 1 })
    return res.json({ success: true, data: settings })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { settings } = req.body
    if (!settings || !Array.isArray(settings)) return res.status(400).json({ success: false, message: 'Settings array is required' })

    const results = []
    for (const item of settings) {
      if (!item.key) continue
      const updated = await Setting.findOneAndUpdate(
        { key: item.key },
        { key: item.key, value: item.value, group: item.group },
        { upsert: true, new: true }
      )
      results.push(updated)
    }

    return res.json({ success: true, message: 'Settings updated', data: results })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
