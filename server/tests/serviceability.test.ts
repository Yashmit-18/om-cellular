import { test } from 'node:test'
import assert from 'node:assert/strict'

import { evaluateServiceability, ServiceAreaMatchInput } from '../src/services/serviceabilityLogic'

const cityArea: ServiceAreaMatchInput = {
  city: 'Bengaluru',
  state: 'Karnataka',
  pinCodes: [' 560001 ', '560034'],
  services: { delivery: true, repair: false, pickupDrop: true, sell: true, exchange: false },
}

const otherArea: ServiceAreaMatchInput = {
  city: 'Mysuru',
  state: 'Karnataka',
  pinCodes: ['570001'],
  services: { delivery: true, sell: false, exchange: true },
}

test('serviceability: no enabled areas runs in legacy mode (everything serviceable)', () => {
  assert.deepEqual(evaluateServiceability([], '560001', 'delivery'), { configured: false, serviceable: true, areaCount: 0 })
  assert.deepEqual(evaluateServiceability([], '000000', 'repair'), { configured: false, serviceable: true, areaCount: 0 })
})

test('serviceability: service not offered by any configured area is refused', () => {
  const result = evaluateServiceability([cityArea], '560001', 'repair')
  assert.equal(result.configured, true)
  assert.equal(result.serviceable, false)
  assert.equal(result.areaCount, 1)
})

test('serviceability: matching pincode returns the area details', () => {
  const result = evaluateServiceability([cityArea], '560001', 'delivery')
  assert.deepEqual(result, { configured: true, serviceable: true, areaCount: 1, city: 'Bengaluru', state: 'Karnataka' })
})

test('serviceability: pincode whitespace is normalized before matching', () => {
  assert.equal(evaluateServiceability([cityArea], '  560001  ', 'delivery').serviceable, true)
  assert.equal(evaluateServiceability([cityArea], '560034', 'delivery').serviceable, true)
})

test('serviceability: pincode miss in a configured store is refused', () => {
  const result = evaluateServiceability([cityArea], '110001', 'delivery')
  assert.equal(result.serviceable, false)
  assert.equal(result.city, undefined)
  assert.equal(result.state, undefined)
})

test('serviceability: area counts and service gating work across multiple areas', () => {
  const twoAreas = [cityArea, otherArea]
  const sellOnly = evaluateServiceability(twoAreas, '570001', 'sell')
  assert.deepEqual(sellOnly, { configured: true, serviceable: false, areaCount: 1 })

  const exchangeSs = evaluateServiceability(twoAreas, '570001', 'exchange')
  assert.equal(exchangeSs.serviceable, true)
  assert.equal(exchangeSs.city, 'Mysuru')

  const deliveryAnywhere = evaluateServiceability(twoAreas, '560034', 'delivery')
  assert.equal(deliveryAnywhere.serviceable, true)
})

test('serviceability: empty or missing pincode never matches a configured store', () => {
  assert.equal(evaluateServiceability([cityArea], '', 'delivery').serviceable, false)
  assert.equal(evaluateServiceability([cityArea], undefined as unknown as string, 'delivery').serviceable, false)
})