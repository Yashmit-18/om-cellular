import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

export async function POST() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  return NextResponse.json(
    { error: 'Seed endpoint is disabled in production. Use the admin panel to manage data.' },
    { status: 403 }
  )
}
