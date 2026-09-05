import { Request } from 'express'

export interface AuthUser {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  role: 'ADMIN' | 'CUSTOMER'
  tokenVersion: number
}

export interface AuthRequest extends Request {
  user?: AuthUser
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  errors?: unknown
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
