import mongoose from 'mongoose'

export const DEFAULT_LOW_STOCK_THRESHOLD = 5

// Admin-facing inventory rows are DERIVED from the authoritative source of
// truth — ProductVariant.stock — and only annotated with the Inventory
// collection's admin metadata (low-stock threshold, reserved quantity) and the
// newest ledger movement. This keeps the list correct even when the Inventory
// mirror drifts, and matches how order/payment flows mutate stock.
export type InventoryStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK'

export interface ResolvedInventoryItem {
  variantId: string
  quantity?: number
  reservedQuantity?: number
  lowStockThreshold?: number
  note?: string
}

export interface InventoryRowOptions {
  lowStockThreshold?: number | null
  reservedQuantity?: number | null
  lastMovement?: {
    createdAt?: string | Date
    reason?: string
    note?: string
  } | null
}

function asNumber(value: unknown): number {
  if (typeof value === 'string' && value.trim() === '') return NaN
  return Number(value)
}

// Validates and coerces the raw PUT /inventory payload into numbers before any
// database write. Pure and DB-free so the rules can be unit tested. Stock is an
// absolute SET (existing convention), never a delta.
export function validateInventoryItems(
  items: any
): { ok: true; resolved: ResolvedInventoryItem[] } | { ok: false; message: string } {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, message: 'Items array is required' }
  }
  for (const item of items) {
    if (!item || typeof item.variantId !== 'string' || !mongoose.Types.ObjectId.isValid(item.variantId)) {
      return { ok: false, message: 'variantId must be a valid id' }
    }
    const vid = item.variantId
    if (item.quantity !== undefined && (!Number.isFinite(asNumber(item.quantity)) || asNumber(item.quantity) < 0)) {
      return { ok: false, message: `quantity for ${vid} must be a non-negative number` }
    }
    if (item.reservedQuantity !== undefined && (!Number.isFinite(asNumber(item.reservedQuantity)) || asNumber(item.reservedQuantity) < 0)) {
      return { ok: false, message: `reservedQuantity for ${vid} must be a non-negative number` }
    }
    if (item.lowStockThreshold !== undefined && (!Number.isFinite(asNumber(item.lowStockThreshold)) || asNumber(item.lowStockThreshold) < 0)) {
      return { ok: false, message: `lowStockThreshold for ${vid} must be a non-negative number` }
    }
    if (item.quantity !== undefined && item.reservedQuantity !== undefined && asNumber(item.reservedQuantity) > asNumber(item.quantity)) {
      return { ok: false, message: `quantity for ${vid} cannot be lower than its reserved quantity` }
    }
  }
  const resolved: ResolvedInventoryItem[] = items.map((item: any) => ({
    variantId: item.variantId,
    quantity: item.quantity !== undefined ? Math.floor(asNumber(item.quantity)) : undefined,
    reservedQuantity: item.reservedQuantity !== undefined ? Math.floor(asNumber(item.reservedQuantity)) : undefined,
    lowStockThreshold: item.lowStockThreshold !== undefined ? Math.floor(asNumber(item.lowStockThreshold)) : undefined,
    note: typeof item.note === 'string' ? item.note.trim() : undefined,
  }))
  return { ok: true, resolved }
}

// Contextual validation against a real variant. A stock change must carry a
// free-text note (the ledger has no other business reason for a manual change)
// and must never fall below the variant's reserved quantity.
export function inventoryAdjustmentError(resolved: ResolvedInventoryItem, variant: any): string | null {
  const quantity = resolved.quantity
  const reservedQuantity = resolved.reservedQuantity ?? Number(variant?.reservedStock ?? 0)
  if (quantity !== undefined && quantity < reservedQuantity) {
    return `quantity for ${resolved.variantId} cannot be lower than its reserved quantity`
  }
  if (quantity !== undefined && (!resolved.note || resolved.note.length === 0)) {
    return 'note is required when adjusting stock'
  }
  return null
}

// Delta is computed against the AUTHORITATIVE variant stock — not the possibly
// stale Inventory mirror — so the ledger always reflects the real change.
export function inventoryDelta(previousStock: unknown, quantityValue: number): number {
  return quantityValue - (Number(previousStock) || 0)
}

export function inventoryStatus(quantity: number, lowStockThreshold: number | null | undefined): InventoryStatus {
  const stock = Number(quantity) || 0
  const threshold = lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD
  if (stock <= 0) return 'OUT_OF_STOCK'
  if (stock <= threshold) return 'LOW_STOCK'
  return 'IN_STOCK'
}

export function isLowStock(quantity: number, lowStockThreshold: number | null | undefined): boolean {
  return (Number(quantity) || 0) <= (lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD)
}

// Builds the admin inventory row used by GET /inventory and GET /inventory/:id.
// `variant` must already be a plain object with `_id`, variant fields and a
// populated `productId`.
export function buildInventoryRow(variant: any, opts: InventoryRowOptions = {}): any {
  const quantity = Number(variant.stock) || 0
  const lowStockThreshold = opts.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD
  const variantId = String(variant._id)
  return {
    id: variantId,
    variantId,
    quantity,
    reservedQuantity: opts.reservedQuantity ?? 0,
    lowStockThreshold,
    isActive: variant.isActive === true,
    sku: variant.sku ?? null,
    storage: variant.storage ?? null,
    ram: variant.ram ?? null,
    color: variant.color ?? null,
    condition: variant.condition ?? null,
    status: inventoryStatus(quantity, lowStockThreshold),
    lastAdjustedAt: opts.lastMovement?.createdAt ? new Date(opts.lastMovement.createdAt).toISOString() : null,
    lastReason: opts.lastMovement?.reason ?? null,
    lastNote: opts.lastMovement?.note ?? null,
    updatedAt: variant.updatedAt ? new Date(variant.updatedAt).toISOString() : null,
    variant: { ...variant, id: variantId },
  }
}