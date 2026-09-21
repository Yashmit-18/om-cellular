import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  buildInventoryRow,
  inventoryAdjustmentError,
  inventoryDelta,
  inventoryStatus,
  isLowStock,
  validateInventoryItems,
} from '../src/services/inventory.service'
import { publicVariantProject } from '../src/services/productVariant.service'

const OBJ_ID = '64f0b1c2d3e4f5a6b7c8d9e0'

test('adjustment payload must be a non-empty array', () => {
  assert.deepEqual(validateInventoryItems(undefined), { ok: false, message: 'Items array is required' })
  assert.deepEqual(validateInventoryItems(null), { ok: false, message: 'Items array is required' })
  assert.deepEqual(validateInventoryItems('[]'), { ok: false, message: 'Items array is required' })
  assert.deepEqual(validateInventoryItems([]), { ok: false, message: 'Items array is required' })
})

test('adjustment payload rejects malformed or missing variantId', () => {
  assert.deepEqual(validateInventoryItems([{ quantity: 5 }]), { ok: false, message: 'variantId must be a valid id' })
  assert.deepEqual(validateInventoryItems([{ variantId: 'not-an-objectid', quantity: 5 }]), { ok: false, message: 'variantId must be a valid id' })
  assert.deepEqual(validateInventoryItems([{ variantId: '', quantity: 5 }]), { ok: false, message: 'variantId must be a valid id' })
})

test('adjustment payload rejects negative or non-numeric stock values', () => {
  assert.deepEqual(validateInventoryItems([{ variantId: OBJ_ID, quantity: -1 }]), { ok: false, message: `quantity for ${OBJ_ID} must be a non-negative number` })
  assert.deepEqual(validateInventoryItems([{ variantId: OBJ_ID, quantity: 'abc' }]), { ok: false, message: `quantity for ${OBJ_ID} must be a non-negative number` })
  assert.deepEqual(validateInventoryItems([{ variantId: OBJ_ID, quantity: '   ' }]), { ok: false, message: `quantity for ${OBJ_ID} must be a non-negative number` })
  assert.deepEqual(validateInventoryItems([{ variantId: OBJ_ID, reservedQuantity: -2 }]), { ok: false, message: `reservedQuantity for ${OBJ_ID} must be a non-negative number` })
  assert.deepEqual(validateInventoryItems([{ variantId: OBJ_ID, lowStockThreshold: -1 }]), { ok: false, message: `lowStockThreshold for ${OBJ_ID} must be a non-negative number` })
})

test('adjustment payload rejects resolved quantity below reserved quantity', () => {
  const result = validateInventoryItems([{ variantId: OBJ_ID, quantity: 3, reservedQuantity: 4 }])
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.message, `quantity for ${OBJ_ID} cannot be lower than its reserved quantity`)
})

test('adjustment payload coerces numeric strings and trims note', () => {
  const result: any = validateInventoryItems([{ variantId: OBJ_ID, quantity: '7', lowStockThreshold: '3', note: '  received stock  ' }])
  assert.equal(result.ok, true)
  assert.deepEqual(result.resolved[0], {
    variantId: OBJ_ID,
    quantity: 7,
    reservedQuantity: undefined,
    lowStockThreshold: 3,
    note: 'received stock',
  })
})

test('note is required whenever stock is being changed', () => {
  const variant = { _id: OBJ_ID, stock: 10, reservedStock: 0 }
  const item = { variantId: OBJ_ID, quantity: 12, note: '' }
  assert.equal(inventoryAdjustmentError(item, variant), 'note is required when adjusting stock')
  // Leading/trailing whitespace is trimmed by the payload validator, so a
  // whitespace-only note collapses to the required-note error in the pipeline.
  const resolved: any = validateInventoryItems([{ variantId: OBJ_ID, quantity: 12, note: '   ' }])
  assert.ok(resolved.ok && resolved.resolved.length === 1)
  assert.equal(inventoryAdjustmentError(resolved.resolved[0], variant), 'note is required when adjusting stock')
  assert.equal(inventoryAdjustmentError({ ...item, note: 'restock' }, variant), null)
  // Threshold-only changes do not need a note — no stock movement happens.
  assert.equal(inventoryAdjustmentError({ variantId: OBJ_ID, lowStockThreshold: 8 }, variant), null)
})

test('stock cannot be set below reserved quantity', () => {
  const variant = { _id: OBJ_ID, stock: 5, reservedStock: 2 }
  assert.equal(inventoryAdjustmentError({ variantId: OBJ_ID, quantity: 1, note: 'x' }, variant), `quantity for ${OBJ_ID} cannot be lower than its reserved quantity`)
  assert.equal(inventoryAdjustmentError({ variantId: OBJ_ID, quantity: 2, note: 'x' }, variant), null)
})

test('manual adjustment delta is computed from authoritative variant stock', () => {
  assert.equal(inventoryDelta(10, 15), 5)
  assert.equal(inventoryDelta(10, 8), -2)
  assert.equal(inventoryDelta(10, 10), 0)
  assert.equal(inventoryDelta('10', 15), 5)
  // Variants without a stock record default to 0 for the delta base.
  assert.equal(inventoryDelta(undefined, 15), 15)
  assert.equal(inventoryDelta(0, 15), 15)
})

test('stock status boundaries respect threshold and default threshold', () => {
  assert.equal(inventoryStatus(0, 5), 'OUT_OF_STOCK')
  assert.equal(inventoryStatus(-2, 5), 'OUT_OF_STOCK')
  assert.equal(inventoryStatus(3, 5), 'LOW_STOCK')
  assert.equal(inventoryStatus(5, 5), 'LOW_STOCK')
  assert.equal(inventoryStatus(6, 5), 'IN_STOCK')
  assert.equal(inventoryStatus(5, null), 'LOW_STOCK')
  assert.equal(inventoryStatus(6, null), 'IN_STOCK')
  assert.equal(DEFAULT_LOW_STOCK_THRESHOLD, 5)
})

test('low-stock predicate matches <= threshold semantics with default', () => {
  assert.equal(isLowStock(0, 5), true)
  assert.equal(isLowStock(5, 5), true)
  assert.equal(isLowStock(6, 5), false)
  assert.equal(isLowStock(6, null), false)
  assert.equal(isLowStock(5, null), true)
})

test('admin inventory row is derived from variant stock and annotates metadata', () => {
  const variant = {
    _id: OBJ_ID,
    productId: { _id: 'p1', name: 'iPhone 13', slug: 'iphone-13' },
    name: 'iPhone 13 128GB Black',
    sku: 'SKU-1',
    stock: 3,
    storage: '128GB',
    ram: '4GB',
    color: 'Black',
    condition: 'Excellent',
    isActive: true,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }
  const row: any = buildInventoryRow(variant, {
    lowStockThreshold: 5,
    reservedQuantity: 1,
    lastMovement: { createdAt: new Date('2026-01-02T00:00:00Z'), reason: 'MANUAL_ADJUSTMENT', note: 'restock' },
  })
  assert.equal(row.id, OBJ_ID)
  assert.equal(row.variantId, OBJ_ID)
  assert.equal(row.quantity, 3)
  assert.equal(row.reservedQuantity, 1)
  assert.equal(row.lowStockThreshold, 5)
  assert.equal(row.isActive, true)
  assert.equal(row.sku, 'SKU-1')
  assert.equal(row.status, 'LOW_STOCK')
  assert.equal(row.lastAdjustedAt, '2026-01-02T00:00:00.000Z')
  assert.equal(row.lastReason, 'MANUAL_ADJUSTMENT')
  assert.equal(row.lastNote, 'restock')
  assert.equal(row.variant.id, OBJ_ID)
  assert.equal(row.variant.productId.name, 'iPhone 13')
  // Row quantity is authoritative variant stock even when no Inventory doc exists.
  assert.equal(buildInventoryRow({ _id: OBJ_ID, stock: 0, isActive: false }).lowStockThreshold, DEFAULT_LOW_STOCK_THRESHOLD)
  assert.equal(buildInventoryRow({ _id: OBJ_ID, stock: 0, isActive: false }).status, 'OUT_OF_STOCK')
})

test('admin inventory rows never carry internal ledger fields into the public projection contract', () => {
  const projected: any = publicVariantProject({
    _id: OBJ_ID,
    id: OBJ_ID,
    productId: 'p1',
    name: 'V',
    sku: 'SKU-1',
    price: 100,
    stock: 3,
    reservedStock: 1,
    soldCount: 7,
    __v: 0,
  })
  assert.equal('reservedStock' in projected, false)
  assert.equal('soldCount' in projected, false)
  assert.equal('__v' in projected, false)
  assert.equal(projected.stock, 3)
})