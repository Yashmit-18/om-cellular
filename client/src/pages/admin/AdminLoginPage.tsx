import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck, Phone, Lock, Eye, EyeOff, ArrowLeft, Store } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user, login } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from || '/admin/dashboard'

  useEffect(() => {
    if (user?.role === 'ADMIN') navigate(from, { replace: true })
  }, [user, from, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!identifier || !password) {
      setError('Please enter your phone or email and password')
      return
    }
    setLoading(true)
    try {
      await login(identifier, password)
      const logged = useAuthStore.getState().user
      if (logged?.role === 'ADMIN') {
        navigate(from, { replace: true })
      } else {
        setError('This account does not have admin access. Please use an admin account or continue shopping as a customer.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid phone, email, or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-stretch">
      <div className="hidden flex-1 items-center justify-center bg-slate-900 lg:flex">
        <div className="max-w-md px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
              <Store className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">OM Cellular</p>
              <p className="text-sm text-slate-400">Authorized store partner</p>
            </div>
          </div>
          <p className="mt-8 text-slate-300">
            Manage products, orders, repairs, phone catalog, customers, promotions, and store settings from a secure
            admin workspace.
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back to store
          </Link>
          <div className="card mt-4 p-8">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900">
                <ShieldCheck className="h-7 w-7 text-white" />
              </div>
              <h1 className="mt-4 text-xl font-bold text-gray-900">Admin Portal</h1>
              <p className="mt-1 text-sm text-gray-500">Restricted access. Sign in with an admin account.</p>
            </div>
            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone or Email</label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="input !pl-10"
                    placeholder="+91 98765 43210 or you@example.com"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input !pl-10 !pr-10"
                    placeholder="Enter password"
                    required
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Signing in...' : 'Sign In to Admin'}
              </button>
            </form>
            <p className="mt-6 text-center text-xs text-gray-400">
              Only authorized administrators can access this portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}