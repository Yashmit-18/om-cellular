import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/user.model'
import { Address } from '../models/address.model'
import { authenticate, generateTokens, setTokenCookies, clearTokenCookies } from '../middleware/auth'
import { AuthRequest } from '../types'
import { env } from '../config/env'
import { normalizePhone } from '../utils/helpers'

const router = Router()

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password } = req.body

    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Name, phone, and password are required' })
    }
    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' })
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
    }

    const normalizedPhone = normalizePhone(String(phone || ''))
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian phone number' })
    }

    let normalizedEmail: string | undefined
    if (email) {
      normalizedEmail = String(email).trim().toLowerCase()
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid email address' })
      }
    }

    const existingUser = await User.findOne({
      $or: [{ phone: normalizedPhone }, ...(normalizedEmail ? [{ email: normalizedEmail }] : [])],
    })
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.phone === normalizedPhone
          ? 'An account with this phone number already exists. Please sign in.'
          : 'An account with this email already exists',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail || undefined,
      phone: normalizedPhone,
      password: hashedPassword,
    })

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { id: user._id, name: user.name, email: user.email || null, phone: user.phone, role: user.role, image: user.image || null },
    })
  } catch (error: any) {
    console.error('Register error:', error)
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this phone number already exists' })
    }
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Phone or email and password are required' })
    }

    const identifierStr = String(identifier).trim()
    const normalizedPhone = normalizePhone(identifierStr)
    const lookup = normalizedPhone
      ? { phone: normalizedPhone }
      : { email: identifierStr.toLowerCase() }
    const user = await User.findOne(lookup).select('+password')

    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: 'Invalid phone, email, or password' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid phone, email, or password' })
    }

    const authUser = {
      id: user._id.toString(),
      name: user.name || null,
      email: user.email || null,
      phone: user.phone || null,
      role: user.role as 'ADMIN' | 'CUSTOMER',
    }
    const { accessToken, refreshToken } = generateTokens(authUser)
    setTokenCookies(res, accessToken, refreshToken)

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, image: user.image },
        accessToken,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/logout', (_req: Request, res: Response) => {
  clearTokenCookies(res)
  return res.json({ success: true, message: 'Logged out successfully' })
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
    const { name, email, alternatePhone } = req.body
    const user = await User.findById(req.user!.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    if (user.role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Profile updates are only available for customer accounts' })
    }

    if (name !== undefined && typeof name === 'string' && name.trim().length >= 2) {
      user.name = name.trim()
    }

    if (email !== undefined && email !== null) {
      const normalizedEmail = String(email).trim().toLowerCase()
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid email address' })
      }
      const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } })
      if (duplicate) {
        return res.status(409).json({ success: false, message: 'This email is already in use by another account' })
      }
      user.email = normalizedEmail
    } else if (email === null) {
      user.email = undefined
    }

    if (alternatePhone !== undefined) {
      if (alternatePhone === null || String(alternatePhone).trim() === '') {
        user.alternatePhone = undefined
      } else {
        const normalized = normalizePhone(String(alternatePhone))
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

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required' })
    }

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string }
    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' })
    }

    const authUser = { id: user._id.toString(), name: user.name || null, email: user.email || null, role: user.role as 'ADMIN' | 'CUSTOMER' }
    const tokens = generateTokens(authUser)
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken)

    return res.json({ success: true, data: { accessToken: tokens.accessToken } })
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' })
  }
})

export default router
