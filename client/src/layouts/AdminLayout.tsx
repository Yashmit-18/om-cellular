import { Outlet, Navigate, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminHeader from '../components/admin/AdminHeader'

function AdminAccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <ShieldAlert className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Admin access required</h1>
          <p className="mt-2 text-sm text-gray-500">
            Your account does not have administrator permissions. Contact the store if you believe this is a mistake.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/" className="btn-primary w-full">Back to Store</Link>
            <Link to="/account" className="btn-ghost w-full">Go to My Account</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const { user, loading, fetchUser } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (user.role !== 'ADMIN') {
    return <AdminAccessDenied />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}