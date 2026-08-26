import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/user.model'
import { authenticate, generateTokens, setTokenCookies, clearTokenCookies } from '../middleware/auth'
import { AuthRequest } from '../types'
import { env } from '../config/env'

const router = Router()

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' })
    }
    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' })
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' })
    }
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian phone number' })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || undefined,
      password: hashedPassword,
    })

    const userObj = user.toObject()
    const { password: _, ...userWithoutPassword } = userObj

    return res.status(201).json({ success: true, message: 'Account created successfully', data: userWithoutPassword })
  } catch (error) {
    console.error('Register error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password')
    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const authUser = { id: user._id.toString(), name: user.name || null, email: user.email || null, role: user.role as 'ADMIN' | 'CUSTOMER' }
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
    return res.json({ success: true, data: user })
  } catch (error) {
    console.error('Get me error:', error)
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
