import { test } from 'node:test'
import assert from 'node:assert/strict'

import { applyValuationRules, DEFAULT_VALUATION_ENGINE } from '../src/services/valuation.service'
import { isValidImei, normalizeImei, normalizePhone, paginate } from '../src/utils/helpers'

test('valuations multiplier is applied and never goes negative', () => {
  const result = applyValuationRules({ baseValue: 30000, condition: 'NEW' })
  assert.ok(result <= 29200)
  assert.ok(result >= 0)
  const good = applyValuationRules({ baseValue: 10000, condition: 'GOOD' })
  assert.equal(good, Math.max(0, Math.round(10000 * (DEFAULT_VALUATION_ENGINE.conditionMultiplier.GOOD ?? 1) - 800)))
  const negligible = applyValuationRules({ baseValue: 1, displayCondition: 'cracked', bodyCondition: 'heavily_damaged' })
  assert.ok(negligible >= 0)
})

test('missing accessory/box flags conservatively reduce the estimate', () => {
  const withAccessories = applyValuationRules({ baseValue: 30000, condition: 'NEW', accessoriesAvailable: true, originalBill: true, originalBox: true })
  const withoutAccessories = applyValuationRules({ baseValue: 30000, condition: 'NEW' })
  assert.equal(withAccessories, Math.round(30000 * 1))
  assert.equal(withAccessories - withoutAccessories, DEFAULT_VALUATION_ENGINE.accessoryDeduction + DEFAULT_VALUATION_ENGINE.boxDeduction)
})

test('condition multiplier is applied', () => {
  const good = applyValuationRules({ baseValue: 10000, condition: 'GOOD', accessoriesAvailable: true, originalBill: true, originalBox: true })
  assert.equal(good, Math.round(10000 * (DEFAULT_VALUATION_ENGINE.conditionMultiplier.GOOD ?? 1)))
})

test('storage adjustments apply case/whitespace-insensitively', () => {
  const price = applyValuationRules({ baseValue: 10000, storage: '256 GB', storageAdjustment: { '256GB': 1000 }, accessoriesAvailable: true, originalBill: true, originalBox: true })
  assert.equal(price, 11000)
})

test('IMEI validation uses 15-digit Luhn', () => {
  // A known-valid 15-digit IMEI (Luhn-checked).
  const valid = '490154203237518'
  assert.ok(isValidImei(valid))
  assert.equal(normalizeImei(valid), valid)
  assert.ok(!isValidImei('490154203237519'))
  assert.ok(!isValidImei('49015420323751'))
  assert.ok(!isValidImei('4901542032375180'))
  assert.ok(!isValidImei('abcd154203237518'))
  assert.equal(normalizeImei(' 490154203237518 '), valid)
  assert.equal(normalizeImei('12345'), null)
})

test('phone normalization accepts Indian mobiles only', () => {
  assert.equal(normalizePhone('9876543210'), '+919876543210')
  assert.equal(normalizePhone('+91 98765 43210'), '+919876543210')
  assert.equal(normalizePhone('12345'), null)
  assert.equal(normalizePhone(''), null)
})

test('paginate clamps page and limit', () => {
  assert.deepEqual(paginate(1, 20), { skip: 0, limit: 20, page: 1 })
  assert.deepEqual(paginate(0, 0), { skip: 0, limit: 1, page: 1 })
  assert.deepEqual(paginate(3, 1000), { skip: 200, limit: 100, page: 3 })
  assert.deepEqual(paginate(NaN, NaN), { skip: 0, limit: 20, page: 1 })
})