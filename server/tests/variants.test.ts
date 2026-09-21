import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  validateVariantPayload,
  isDuplicateKeyError,
  variantListMatchesRole,
  publicVariantProject,
} from '../src/services/productVariant.service'

test('create validation requires name and price', () => {
  assert.equal(validateVariantPayload({}, { create: true }), 'Name and price are required')
  assert.equal(validateVariantPayload({ name: '128GB Black' }, { create: true }), 'Name and price are required')
  assert.equal(validateVariantPayload({ name: '128GB Black', price: undefined }, { create: true }), 'Name and price are required')
  assert.equal(validateVariantPayload({ name: '128GB Black', price: null }, { create: true }), 'Name and price are required')
  assert.equal(validateVariantPayload({ name: '128GB Black', price: '' }, { create: true }), 'Name and price are required')
  assert.equal(validateVariantPayload({ name: '', price: 100 }, { create: true }), 'Name and price are required')
})

test('create validation rejects non-numeric or negative price', () => {
  assert.equal(validateVariantPayload({ name: 'V', price: -1 }, { create: true }), 'Price must be >= 0')
  assert.equal(validateVariantPayload({ name: 'V', price: 'abc' }, { create: true }), 'Price must be >= 0')
  assert.equal(validateVariantPayload({ name: 'V', price: 0 }, { create: true }), null)
})

test('create validation rejects negative discountPrice and negative/non-numeric stock', () => {
  assert.equal(validateVariantPayload({ name: 'V', price: 10, discountPrice: -1 }, { create: true }), 'discountPrice must be a non-negative number')
  assert.equal(validateVariantPayload({ name: 'V', price: 10, discountPrice: 'cheap' }, { create: true }), 'discountPrice must be a non-negative number')
  assert.equal(validateVariantPayload({ name: 'V', price: 10, stock: -2 }, { create: true }), 'stock must be a non-negative number')
  assert.equal(validateVariantPayload({ name: 'V', price: 10, stock: 'many' }, { create: true }), 'stock must be a non-negative number')
})

test('create validation rejects non-array collection fields and blank sku', () => {
  assert.equal(validateVariantPayload({ name: 'V', price: 10, images: 'http://x' }, { create: true }), 'images must be an array')
  assert.equal(validateVariantPayload({ name: 'V', price: 10, specifications: {} }, { create: true }), 'specifications must be an array')
  assert.equal(validateVariantPayload({ name: 'V', price: 10, whatsIncluded: 'box' }, { create: true }), 'whatsIncluded must be an array')
  assert.equal(validateVariantPayload({ name: 'V', price: 10, sku: '   ' }, { create: true }), 'sku must be a non-empty string')
})

test('create validation accepts a well-formed variant payload', () => {
  const payload = {
    name: 'iPhone 13 128GB Black',
    sku: 'SKU-IP13-128-BLK',
    price: 54999,
    discountPrice: 49999,
    stock: 4,
    storage: '128GB',
    ram: '4GB',
    color: 'Black',
    condition: 'Excellent',
    images: ['https://example.com/a.jpg'],
    specifications: [{ key: 'Display', value: '6.1"' }],
    whatsIncluded: [{ key: 'Charger', value: 'Yes' }],
  }
  assert.equal(validateVariantPayload(payload, { create: true }), null)
})

test('update validation allows partial payloads and numeric coercion', () => {
  assert.equal(validateVariantPayload({}, { create: false }), null)
  assert.equal(validateVariantPayload({ isActive: false }, { create: false }), null)
  assert.equal(validateVariantPayload({ stock: 0 }, { create: false }), null)
  assert.equal(validateVariantPayload({ price: '10' }, { create: false }), null)
  assert.equal(validateVariantPayload({ discountPrice: null }, { create: false }), null)
  assert.equal(validateVariantPayload({ name: '' }, { create: false }), null)
})

test('update validation rejects invalid numbers and arrays', () => {
  assert.equal(validateVariantPayload({ stock: -1 }, { create: false }), 'stock must be a non-negative number')
  assert.equal(validateVariantPayload({ price: -5 }, { create: false }), 'Price must be >= 0')
  assert.equal(validateVariantPayload({ discountPrice: -1 }, { create: false }), 'discountPrice must be a non-negative number')
  assert.equal(validateVariantPayload({ images: 'nope' }, { create: false }), 'images must be an array')
  assert.equal(validateVariantPayload({ sku: '' }, { create: false }), 'sku must be a non-empty string')
})

test('duplicate key detection recognises Mongo E11000 only', () => {
  assert.equal(isDuplicateKeyError({ code: 11000 }), true)
  assert.equal(isDuplicateKeyError({ codeName: 'DuplicateKey' }), true)
  assert.equal(isDuplicateKeyError(new Error('boom')), false)
  assert.equal(isDuplicateKeyError({ code: 99999 }), false)
  assert.equal(isDuplicateKeyError(null), false)
  assert.equal(isDuplicateKeyError(undefined), false)
})

test('variant list gating mirrors products includeAll rule', () => {
  assert.equal(variantListMatchesRole('ADMIN', 'true'), true)
  assert.equal(variantListMatchesRole('ADMIN', 'false'), false)
  assert.equal(variantListMatchesRole('ADMIN', undefined), false)
  assert.equal(variantListMatchesRole('CUSTOMER', 'true'), false)
  assert.equal(variantListMatchesRole(undefined, 'true'), false)
})

test('public variant projection strips internal ledger fields only', () => {
  const variant = {
    _id: 'abc',
    id: 'abc',
    productId: 'p1',
    name: 'V',
    sku: 'SKU-1',
    price: 100,
    discountPrice: 90,
    stock: 3,
    reservedStock: 1,
    soldCount: 7,
    __v: 0,
    storage: '128GB',
    ram: '4GB',
    color: 'Black',
    condition: 'Good',
    batteryHealth: 92,
    images: ['https://example.com/a.jpg'],
    specifications: [],
    whatsIncluded: [],
    isRefurbished: true,
    featured: true,
    badge: 'Hot',
    isActive: true,
  }
  const projected: any = publicVariantProject(variant)
  assert.equal('reservedStock' in projected, false)
  assert.equal('soldCount' in projected, false)
  assert.equal('__v' in projected, false)
  assert.equal(projected._id, 'abc')
  assert.equal(projected.id, 'abc')
  assert.equal(projected.sku, 'SKU-1')
  assert.equal(projected.price, 100)
  assert.equal(projected.discountPrice, 90)
  assert.equal(projected.stock, 3)
  assert.equal(projected.storage, '128GB')
  assert.equal(projected.condition, 'Good')
  assert.equal(projected.batteryHealth, 92)
  assert.equal(projected.isActive, true)
  assert.equal(projected.featured, true)
})

test('public variant projection tolerates non-object input', () => {
  assert.equal(publicVariantProject(null), null)
  assert.equal(publicVariantProject(undefined), undefined)
  assert.equal(publicVariantProject('SKU-1'), 'SKU-1')
})