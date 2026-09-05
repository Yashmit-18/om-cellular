import type { ISellPayout } from '../models/sellRequest.model'
import type { IExchangePayout } from '../models/exchangeRequest.model'

const CHECKLIST_ALLOWED = ['PASS', 'FAIL', 'N/A']
const PAYOUT_MODES = ['UPI', 'BANK_TRANSFER', 'CASH', 'PAYTM_QR', 'STORE_CREDIT']

export type ChecklistResult =
  | { ok: true; value: Record<string, 'PASS' | 'FAIL' | 'N/A'> | undefined }
  | { ok: false; message: string }

export function normalizeInspectionChecklist(value: unknown): ChecklistResult {
  if (value === undefined || value === null) return { ok: true, value: undefined }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, message: 'inspectionChecklist must be an object of key: PASS/FAIL/N/A entries' }
  }
  const clean: Record<string, 'PASS' | 'FAIL' | 'N/A'> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (!CHECKLIST_ALLOWED.includes(entry as string)) {
      return { ok: false, message: `Inspection entry "${key}" must be PASS, FAIL, or N/A` }
    }
    clean[key] = entry as 'PASS' | 'FAIL' | 'N/A'
  }
  return { ok: true, value: Object.keys(clean).length ? clean : undefined }
}

export type PayoutResult =
  | { ok: true; value: ISellPayout | IExchangePayout }
  | { ok: false; message: string }

export function normalizePayout(value: unknown, current?: { paidAt?: Date } | null): PayoutResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, message: 'payout must be an object with amount and optional mode/reference/status' }
  }
  const body = value as Record<string, unknown>
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, message: 'Payout amount must be a non-negative number' }
  }
  const mode = typeof body.mode === 'string' ? body.mode : ''
  if (mode && !PAYOUT_MODES.includes(mode)) {
    return { ok: false, message: `Payout mode must be one of: ${PAYOUT_MODES.join(', ')}` }
  }
  const status: 'PENDING' | 'PAID' = body.status === 'PAID' ? 'PAID' : 'PENDING'
  return {
    ok: true,
    value: {
      amount,
      mode: mode || undefined,
      reference: typeof body.reference === 'string' ? body.reference : undefined,
      status,
      paidAt: status === 'PAID' ? new Date() : current?.paidAt || undefined,
    },
  }
}

export function autoPayoutForSell(finalOfferedPrice?: number, estimatedPrice?: number): ISellPayout {
  return { amount: finalOfferedPrice ?? estimatedPrice ?? 0, status: 'PENDING' }
}

export function autoPayoutForExchange(finalExchangeValue?: number, estimatedExchangeValue?: number): IExchangePayout {
  return { amount: finalExchangeValue ?? estimatedExchangeValue ?? 0, status: 'PENDING' }
}