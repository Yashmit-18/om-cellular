import { AuditLog } from '../models/auditLog.model'

export interface AuditEntry {
  adminId?: string
  action: string
  entity: string
  entityId?: string
  oldValue?: string
  newValue?: string
  ipAddress?: string
}

// Best-effort audit writer. Never throws — audit failures must not break the
// business operation that triggered them.
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await AuditLog.create({
      adminId: entry.adminId || null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      ipAddress: entry.ipAddress,
    })
  } catch (error) {
    console.error('Audit write failed:', (error as Error)?.message || error)
  }
}

// Serializes a value for audit storage, guarding against accidentally logging
// secrets or huge objects.
export function serializeAuditValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value.length > 4000 ? value.slice(0, 4000) : value
  try {
    return JSON.stringify(value)?.slice(0, 4000)
  } catch {
    return String(value)
  }
}