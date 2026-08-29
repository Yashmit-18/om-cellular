import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AuthRequest, AuthUser } from '../types'

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser

    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin access required' })
    }

    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '')

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser
      req.user = decoded
    }
  } catch {
    // ignore invalid token for optional auth
  }
  next()
}

export function generateTokens(user: AuthUser) {
  const accessToken = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  const refreshToken = jwt.sign(
    { id: user.id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  )

  return { accessToken, refreshToken }
}

export function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProduction = env.NODE_ENV === 'production'
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' as const : 'lax' as const,
    path: '/',
  }

  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 })
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 })
}

export function clearTokenCookies(res: Response) {
  const isProduction = env.NODE_ENV === 'production'
  res.cookie('accessToken', '', { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax', maxAge: 0, path: '/' })
  res.cookie('refreshToken', '', { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax', maxAge: 0, path: '/' })
}
