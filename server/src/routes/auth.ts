import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { User } from '../models/user.model'
import { Address } from '../models/address.model'
import { authenticate, generateTokens, setTokenCookies, clearTokenCookies, verifyRefreshToken, TokenUser } from '../middleware/auth'
import { AuthRequest } from '../types'
import { env } from '../config/env'
import { normalizePhone } from '../utils/helpers'
import { isLoginLocked, recordLoginFailure, resetLoginFailures } from '../services/bruteForce.service'

const router = Router()

const phoneSchema = z.string().transform((v) => {
  const normalized = normalizePhone(String(v || '').trim())
  if (!normalized) throw new Error('Please enter a valid 10-digit Indian phone number')
  return normalized
})

const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    phone: phoneSchema,
    email: z.union([z.literal(''), z.string().trim().email('Please enter a valid email address').toLowerCase()]).optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  }),
})

const loginSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(1, 'Phone, email, or password is required'),
    password: z.string().min(1, 'Phone, email, or password is required').max(128),
  }),
})

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required').max(128),
    newPassword: z.string().min(6, 'New password must be at least 6 characters').max(128),
  }),
})

const requestResetSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(1, 'Phone or email is required'),
  }),
})

const completeResetSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters').max(128),
  }),
})

const changePhoneSchema = z.object({
  body: z.object({
    newPhone: phoneSchema,
    currentPassword: z.string().min(1, 'Current password is required').max(128),
  }),
})

const profileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    email: z.union([z.literal(''), z.string().trim().email().toLowerCase()]).nullable().optional(),
    alternatePhone: z.union([z.literal(''), phoneSchema]).nullable().optional(),
  }),
})

function toSafeUser(user: any) {
  return { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, image: user.image }
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
})

async function resolveUserForIdentifier(identifier: string) {
  const normalizedPhone = normalizePhone(identifier)
  const lookup = normalizedPhone
    ? { phone: normalizedPhone }
    : { email: identifier.toLowerCase() }
  return User.findOne(lookup).select('+password')
}

// Helper so both register and login share cookie issuing.
async function issueSession(res: Response, user: any) {
  const tokenUser: TokenUser = {
    id: user._id.toString(),
    name: user.name || null,
    email: user.email || null,
    phone: user.phone || null,
    role: user.role as 'ADMIN' | 'CUSTOMER',
    tokenVersion: user.tokenVersion ?? 0,
  }
  const { accessToken, refreshToken } = generateTokens(tokenUser)
  setTokenCookies(res, accessToken, refreshToken)
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse({ body: req.body })
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.errors[0]?.message || 'Validation error',
        errors: parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      })
    }

    const { name, phone, password } = parsed.data.body
    const email = parsed.data.body.email && String(parsed.data.body.email).trim() !== ''
      ? String(parsed.data.body.email).trim().toLowerCase()
      : undefined

    const existingUser = await User.findOne({
      $or: [{ phone }, ...(email ? [{ email }] : [])],
    })
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.phone === phone
          ? 'An account with this phone number already exists. Please sign in.'
          : 'An account with this email already exists',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
    })

    // The client signs in separately; cookies are not set here so registration
    // stays a pure account-creation step.
    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: toSafeUser(user),
    })
  } catch (error: any) {
    console.error('Register error:', error)
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this phone number already exists' })
    }
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse({ body: req.body })
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.errors[0]?.message || 'Validation error' })
    }

    const identifier = parsed.data.body.identifier
    const normalizedPhone = normalizePhone(identifier)
    const lookupKey = normalizedPhone || identifier.toLowerCase()
    const ip = req.ip || req.socket?.remoteAddress || ''

    const lock = isLoginLocked(lookupKey, ip)
    if (lock.locked) {
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${lock.retryAfterSeconds} seconds.`,
      })
    }

    const user = await resolveUserForIdentifier(identifier)
    if (!user || !user.password) {
      recordLoginFailure(lookupKey, ip)
      return res.status(401).json({ success: false, message: 'Invalid phone, email, or password' })
    }

    const isMatch = await bcrypt.compare(parsed.data.body.password, user.password)
    if (!isMatch) {
      recordLoginFailure(lookupKey, ip)
      return res.status(401).json({ success: false, message: 'Invalid phone, email, or password' })
    }

    resetLoginFailures(lookupKey, ip)
    await issueSession(res, user)

    return res.json({
      success: true,
      message: 'Login successful',
      data: { user: toSafeUser(user) },
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Bump the token version so every outstanding refresh token is revoked.
    await User.findByIdAndUpdate(req.user!.id, { $inc: { tokenVersion: 1 } })
  } catch (error) {
    console.error('Logout tokenVersion error:', error)
  }
  clearTokenCookies(res)
  return res.json({ success: true, message: 'Logged out successfully' })
})

router.post('/logout-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.user!.id, { $inc: { tokenVersion: 1 } })
  } catch (error) {
    console.error('Logout-all tokenVersion error:', error)
  }
  clearTokenCookies(res)
  return res.json({ success: true, message: 'Logged out from all devices' })
})

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id).select('-password')
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    const addresses = await Address.find({ userId: user._id }).sort({ isDefault: -1, createdAt: -1 })
    return res.json({ success: true, data: { ...user.toObject(), addresses } })
  } catch (error) {
    console.error('Get me error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = profileSchema.safeParse({ body: req.body })
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.errors[0]?.message || 'Validation error' })
    }

    const user = await User.findById(req.user!.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    if (user.role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Profile updates are only available for customer accounts' })
    }

    const { name, email, alternatePhone } = parsed.data.body

    if (name !== undefined) user.name = name.trim()
    if (email !== undefined) {
      const normalizedEmail = email === null || String(email).trim() === '' ? undefined : String(email).trim().toLowerCase()
      if (normalizedEmail) {
        const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } })
        if (duplicate) {
          return res.status(409).json({ success: false, message: 'This email is already in use by another account' })
        }
      }
      user.email = normalizedEmail
    }
    if (alternatePhone !== undefined) {
      if (alternatePhone === null || String(alternatePhone).trim() === '') {
        user.alternatePhone = undefined
      } else {
        const normalized = normalizePhone(String(alternatePhone).trim())
        if (!normalized) {
          return res.status(400).json({ success: false, message: 'Alternate phone must be a valid 10-digit Indian phone number' })
        }
        if (normalized === user.phone) {
          return res.status(400).json({ success: false, message: 'Alternate phone must be different from your primary phone' })
        }
        user.alternatePhone = normalized
      }
    }

    try {
      await user.save()
    } catch (error: any) {
      if (error?.code === 11000) {
        return res.status(409).json({ success: false, message: 'This email is already in use by another account' })
      }
      throw error
    }

    const updated = user.toObject() as any
    delete updated.password
    return res.json({ success: true, message: 'Profile updated', data: updated })
  } catch (error) {
    console.error('Update me error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = changePasswordSchema.safeParse({ body: req.body })
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.errors[0]?.message || 'Validation error' })
    }

    const user = await User.findById(req.user!.id).select('+password')
    if (!user || !user.password) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const isMatch = await bcrypt.compare(parsed.data.body.currentPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' })
    }

    const hashed = await bcrypt.hash(parsed.data.body.newPassword, 12)
    user.password = hashed
    user.tokenVersion = (user.tokenVersion || 0) + 1
    await user.save()

    // Revoked the session that just changed the password — force re-login.
    clearTokenCookies(res)
    return res.json({ success: true, message: 'Password changed. Please sign in again.' })
  } catch (error) {
    console.error('Change password error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/change-phone', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = changePhoneSchema.safeParse({ body: req.body })
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.errors[0]?.message || 'Validation error' })
    }

    const user = await User.findById(req.user!.id).select('+password')
    if (!user || !user.password) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const isMatch = await bcrypt.compare(parsed.data.body.currentPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' })
    }

    const newPhone = parsed.data.body.newPhone
    const existing = await User.findOne({ phone: newPhone, _id: { $ne: user._id } })
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this phone number already exists' })
    }

    user.phone = newPhone
    user.tokenVersion = (user.tokenVersion || 0) + 1
    await user.save()
    clearTokenCookies(res)
    return res.json({ success: true, message: 'Phone number updated. Please sign in again.' })
  } catch (error) {
    console.error('Change phone error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/request-password-reset', async (req: Request, res: Response) => {
  try {
    const parsed = requestResetSchema.safeParse({ body: req.body })
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.errors[0]?.message || 'Validation error' })
    }

    const identifier = parsed.data.body.identifier
    const user = await resolveUserForIdentifier(identifier)
    // Always respond the same way to avoid user enumeration.
    if (!user) {
      return res.json({ success: true, message: 'If that phone number or email belongs to an account, a reset link will be sent.' })
    }

    const resetToken = crypto.randomBytes(24).toString('hex')
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000)
    await user.save()

    // NOTE: provider abstraction for email/SMS delivery is implemented in
    // services/notifier; until credentials are configured nothing is sent.
    // The hashed token is the credential a real provider would carry.
    return res.json({
      success: true,
      message: 'If that phone number or email belongs to an account, a reset link will be sent.',
      ...(env.isProduction ? {} : { devResetToken: resetToken }),
    })
  } catch (error) {
    console.error('Request password reset error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/complete-password-reset', async (req: Request, res: Response) => {
  try {
    const parsed = completeResetSchema.safeParse({ body: req.body })
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.errors[0]?.message || 'Validation error' })
    }

    const tokenHash = crypto.createHash('sha256').update(parsed.data.body.token).digest('hex')
    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    })

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link' })
    }

    const hashed = await bcrypt.hash(parsed.data.body.newPassword, 12)
    user.password = hashed
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    user.tokenVersion = (user.tokenVersion || 0) + 1
    await user.save()

    return res.json({ success: true, message: 'Password reset successful. Please sign in.' })
  } catch (error) {
    console.error('Complete password reset error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required' })
    }

    const decoded = verifyRefreshToken(refreshToken)
    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' })
    }

    // Reject refresh tokens issued before the token was revoked (logout,
    // logout-all, password/phone change).
    if (decoded.tokenVersion !== (user.tokenVersion ?? 0)) {
      clearTokenCookies(res)
      return res.status(401).json({ success: false, message: 'Session revoked. Please sign in again.' })
    }

    const tokenUser: TokenUser = {
      id: user._id.toString(),
      name: user.name || null,
      email: user.email || null,
      phone: user.phone || null,
      role: user.role as 'ADMIN' | 'CUSTOMER',
      tokenVersion: user.tokenVersion ?? 0,
    }
    const tokens = generateTokens(tokenUser)
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken)

    return res.json({ success: true })
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' })
  }
})

export default router