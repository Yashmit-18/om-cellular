import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'

export interface SessionUser {
  id: string
  email?: string | null
  name?: string | null
  role: string
}

export async function getSession() {
  const session = await getServerSession(authOptions)
  return session as unknown as { user: SessionUser } | null
}

export async function requireAuth(): Promise<
  { user: SessionUser } | { error: NextResponse }
> {
  const session = await getSession()
  if (!session?.user) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    }
  }
  return session
}

export async function requireAdmin(): Promise<
  { user: SessionUser } | { error: NextResponse }
> {
  const session = await getSession()
  if (!session?.user) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    }
  }
  if (session.user.role !== 'ADMIN') {
    return {
      error: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      ),
    }
  }
  return session
}
