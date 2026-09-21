import { Router, Request, Response } from 'express'
import mongoose from 'mongoose'
import { Inventory } from '../models/inventory.model'
import { ProductVariant } from '../models/productVariant.model'
import { InventoryLedgerEntry, recordInventoryMovement } from '../models/inventoryLedger.model'
import { requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { paginate } from '../utils/helpers'
import {
  buildInventoryRow,
  inventoryAdjustmentError,
  inventoryDelta,
  isLowStock,
  validateInventoryItems,
} from '../services/inventory.service'

const router = Router()

// Admin inventory list. Rows are DERIVED from ProductVariant (the authoritative
// stock source) so the screen stays correct even when the Inventory mirror
// drifts (e.g. variant stock edited via the variant-management flow), and every
// variant is visible — including deactivated ones and new variants that have no
// Inventory document yet. Thresholds/reserved come from the Inventory
// collection (default low-stock threshold 5); newest ledger movement annotates
// each row.
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', lowStock } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))

    const [variants, total] = await Promise.all([
      ProductVariant.find({})
        .populate('productId', 'name slug isActive')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      ProductVariant.countDocuments({}),
    ])

    const ids = variants.map((v: any) => v._id)
    const [thresholds, movements] = await Promise.all([
      Inventory.find({ variantId: { $in: ids } })
        .select('variantId reservedQuantity lowStockThreshold')
        .lean(),
      InventoryLedgerEntry.aggregate([
        { $match: { variantId: { $in: ids } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$variantId', createdAt: { $first: '$createdAt' }, reason: { $first: '$reason' }, note: { $first: '$note' } } },
      ]),
    ])
    const thresholdMap = new Map(thresholds.map((t: any) => [String(t.variantId), t]))
    const movementMap = new Map(movements.map((m: any) => [String(m._id), m]))

    let rows = variants.map((v: any) => {
      const threshold: any = thresholdMap.get(String(v._id))
      return buildInventoryRow(v, {
        lowStockThreshold: threshold?.lowStockThreshold,
        reservedQuantity: threshold?.reservedQuantity,
        lastMovement: movementMap.get(String(v._id)),
      })
    })

    if (lowStock === 'true') {
      rows = rows.filter((r: any) => isLowStock(r.quantity, r.lowStockThreshold))
    }

    return res.json({ success: true, data: rows, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
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
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid variant id' })
    }
    const variant: any = await ProductVariant.findById(id).populate('productId', 'name slug isActive').lean()
    if (!variant) return res.status(404).json({ success: false, message: 'Inventory item not found' })
    const [threshold, lastMovement] = await Promise.all([
      Inventory.findOne({ variantId: id }).select('reservedQuantity lowStockThreshold').lean(),
      InventoryLedgerEntry.findOne({ variantId: id }).sort({ createdAt: -1 }).lean(),
    ])
    return res.json({
      success: true,
      data: buildInventoryRow(variant, {
        lowStockThreshold: (threshold as any)?.lowStockThreshold,
        reservedQuantity: (threshold as any)?.reservedQuantity,
        lastMovement,
      }),
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Absolute stock SET (existing convention). The whole payload is validated and
// every variant existence-checked BEFORE any write, so an invalid item leaves
// no partial writes, ghost Inventory rows or bogus ledger entries behind.
router.put('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body
    const input = validateInventoryItems(items)
    if (!input.ok) return res.status(400).json({ success: false, message: input.message })

    const variants = await ProductVariant.find({ _id: { $in: input.resolved.map((i) => i.variantId) } }).lean()
    const variantMap = new Map(variants.map((v: any) => [String(v._id), v]))
    for (const item of input.resolved) {
      const variant: any = variantMap.get(item.variantId)
      if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' })
      const error = inventoryAdjustmentError(item, variant)
      if (error) return res.status(400).json({ success: false, message: error })
    }

    const results = []
    for (const item of input.resolved) {
      const variant: any = variantMap.get(item.variantId)
      const previous = await Inventory.findOne({ variantId: item.variantId })

      const quantityValue = item.quantity !== undefined ? item.quantity : Number(previous?.quantity ?? 0)
      const reservedValue = item.reservedQuantity !== undefined ? item.reservedQuantity : Number(previous?.reservedQuantity ?? 0)
      const thresholdValue = item.lowStockThreshold !== undefined ? item.lowStockThreshold : previous?.lowStockThreshold

      const updated = await Inventory.findOneAndUpdate(
        { variantId: item.variantId },
        {
          variantId: item.variantId,
          quantity: quantityValue,
          reservedQuantity: reservedValue,
          lowStockThreshold: thresholdValue,
        },
        { upsert: true, new: true }
      )

      if (item.quantity !== undefined) {
        await ProductVariant.findByIdAndUpdate(item.variantId, { stock: quantityValue })
      }

      const delta = item.quantity !== undefined ? inventoryDelta(variant.stock, item.quantity) : 0
      if (delta !== 0) {
        await recordInventoryMovement({
          variantId: item.variantId,
          productId: variant.productId,
          delta,
          reason: 'MANUAL_ADJUSTMENT',
          quantityAfter: quantityValue,
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
