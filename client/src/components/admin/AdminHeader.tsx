import { useAuthStore } from '../../stores/authStore'
import { LogOut, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AdminHeader() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <h2 className="text-sm font-medium text-gray-500">Welcome back,</h2>
        <p className="text-sm font-semibold text-gray-900">{user?.name || 'Admin'}</p>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-400 hover:text-gray-600">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
        </button>
        <button
          onClick={() => { logout(); navigate('/admin/login') }}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  )
}
