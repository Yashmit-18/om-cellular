import mongoose, { Schema, Document } from 'mongoose'

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId
  adminId?: mongoose.Types.ObjectId
  action: string
  entity: string
  entityId?: string
  oldValue?: string
  newValue?: string
  ipAddress?: string
  createdAt: Date
}

const auditLogSchema = new Schema<IAuditLog>({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String },
  oldValue: { type: String },
  newValue: { type: String },
  ipAddress: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } })

auditLogSchema.index({ adminId: 1 })
auditLogSchema.index({ entity: 1 })
auditLogSchema.index({ createdAt: -1 })

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema)
