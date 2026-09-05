import { Router, Request, Response } from 'express'
import { Inventory } from '../models/inventory.model'
import { ProductVariant } from '../models/productVariant.model'
import { InventoryLedgerEntry, recordInventoryMovement } from '../models/inventoryLedger.model'
import { requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { paginate } from '../utils/helpers'

const router = Router()

router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', lowStock } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))

    const where: any = {}
    if (lowStock === 'true') {
      const inventory = await Inventory.find({}).select('variantId lowStockThreshold quantity')
      const lowStockVariantIds = inventory
        .filter((entry) => entry.quantity <= entry.lowStockThreshold)
        .map((entry) => entry.variantId)
      where.variantId = { $in: lowStockVariantIds }
    }

    const [items, total] = await Promise.all([
      Inventory.find(where).populate({ path: 'variantId', populate: { path: 'productId', select: 'name slug' } }).sort({ updatedAt: -1 }).skip(skip).limit(safeLimit),
      Inventory.countDocuments(where),
    ])

    return res.json({ success: true, data: items, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Recent stock movements (ledger) for a variant — used by admin to audit how
// stock changed over time.
router.get('/ledger', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { variantId, page = '1', limit = '20' } = req.query
    const where: any = {}
    if (variantId) where.variantId = variantId
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))

    const [entries, total] = await Promise.all([
      InventoryLedgerEntry.find(where).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      InventoryLedgerEntry.countDocuments(where),
    ])
    return res.json({ success: true, data: entries, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const item = await Inventory.findById(req.params.id).populate({ path: 'variantId', populate: { path: 'productId', select: 'name slug' } })
    if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found' })
    return res.json({ success: true, data: item })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body
    if (!items || !Array.isArray(items)) return res.status(400).json({ success: false, message: 'Items array is required' })

    const results = []
    for (const item of items) {
      if (!item.variantId) continue
      const previous = await Inventory.findOne({ variantId: item.variantId })
      const updated = await Inventory.findOneAndUpdate(
        { variantId: item.variantId },
        {
          variantId: item.variantId,
          quantity: item.quantity,
          reservedQuantity: item.reservedQuantity,
          lowStockThreshold: item.lowStockThreshold,
        },
        { upsert: true, new: true }
      )

      if (item.quantity !== undefined) {
        await ProductVariant.findByIdAndUpdate(item.variantId, { stock: item.quantity })
      }

      const delta = previous ? item.quantity - (previous.quantity ?? 0) : item.quantity
      if (delta !== 0) {
        await recordInventoryMovement({
          variantId: item.variantId,
          productId: (updated.toObject() as any).productId,
          delta,
          reason: 'MANUAL_ADJUSTMENT',
          quantityAfter: item.quantity,
          adminId: req.user?.id as any,
          note: item.note,
        }).catch(() => {})
      }

      results.push(updated)
    }

    return res.json({ success: true, message: 'Inventory updated', data: results })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
