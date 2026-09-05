import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeInspectionChecklist,
  normalizePayout,
  autoPayoutForSell,
  autoPayoutForExchange,
} from '../src/utils/requestValidation'

test('normalizeInspectionChecklist rejects non-objects', () => {
  assert.equal(normalizeInspectionChecklist('PASS').ok, false)
  assert.equal(normalizeInspectionChecklist(['PASS']).ok, false)
  assert.equal(normalizeInspectionChecklist(null).ok, true)
  assert.equal(normalizeInspectionChecklist(undefined).ok, true)
})

test('normalizeInspectionChecklist only accepts PASS/FAIL/N/A entries', () => {
  assert.equal(normalizeInspectionChecklist({ display: 'BROKEN' }).ok, false)
  const ok = normalizeInspectionChecklist({ display: 'PASS', battery: 'FAIL', network: 'N/A' })
  assert.equal(ok.ok, true)
  if (ok.ok) assert.deepEqual(ok.value, { display: 'PASS', battery: 'FAIL', network: 'N/A' })
})

test('normalizeInspectionChecklist clears an empty checklist', () => {
  const ok = normalizeInspectionChecklist({})
  assert.equal(ok.ok, true)
  if (ok.ok) assert.equal(ok.value, undefined)
})

test('normalizePayout requires a non-negative numeric amount', () => {
  assert.equal(normalizePayout(null).ok, false)
  assert.equal(normalizePayout({ amount: -5 }).ok, false)
  assert.equal(normalizePayout({ amount: 'abc' }).ok, false)
  assert.equal(normalizePayout({ amount: 0 }).ok, true)
})

test('normalizePayout validates mode against the allowed set', () => {
  assert.equal(normalizePayout({ amount: 100, mode: 'CRYPTO' }).ok, false)
  const ok = normalizePayout({ amount: 100, mode: 'UPI', reference: 'TXN-1', status: 'PAID' })
  assert.equal(ok.ok, true)
  if (ok.ok) {
    assert.equal(ok.value.mode, 'UPI')
    assert.equal(ok.value.status, 'PAID')
    assert.ok(ok.value.paidAt instanceof Date)
  }
})

test('normalizePayout keeps existing paidAt when staying PENDING', () => {
  const past = new Date('2026-01-01')
  const ok = normalizePayout({ amount: 50, status: 'PENDING' }, { paidAt: past })
  assert.equal(ok.ok, true)
  if (ok.ok) assert.equal(ok.value.paidAt, past)
})

test('auto-payout helpers default to estimate and never spill undefined amounts', () => {
  assert.deepEqual(autoPayoutForSell(10000, 9000), { amount: 10000, status: 'PENDING' })
  assert.deepEqual(autoPayoutForSell(undefined, 9000), { amount: 9000, status: 'PENDING' })
  assert.deepEqual(autoPayoutForSell(undefined, undefined), { amount: 0, status: 'PENDING' })
  assert.deepEqual(autoPayoutForExchange(5000, 4500), { amount: 5000, status: 'PENDING' })
  assert.deepEqual(autoPayoutForExchange(undefined, 4500), { amount: 4500, status: 'PENDING' })
})