import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  MapPin, LayoutDashboard, Plus, List, User,
  LogOut, Menu, X, ChevronRight
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: List, label: 'My Trips', href: '/trips' },
  { icon: Plus, label: 'New Trip', href: '/trips/new' },
  { icon: User, label: 'Profile', href: '/profile' },
]

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const isActive = (href: string) => location.pathname === href ||
    (href !== '/dashboard' && location.pathname.startsWith(href))

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface-900 border-r border-surface-800 fixed top-0 left-0 bottom-0 z-40">
        {/* Logo */}
        <div className="p-6 border-b border-surface-800">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-surface-50">Wandr AI</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive(item.href)
                  ? 'bg-primary-500/15 text-primary-300 border border-primary-500/20'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive(item.href) ? 'text-primary-400' : ''}`} />
              {item.label}
              {isActive(item.href) && <ChevronRight className="w-3 h-3 ml-auto text-primary-400" />}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-surface-800">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-200 truncate">
                {user?.user_metadata?.full_name || 'Traveler'}
              </p>
              <p className="text-xs text-surface-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-surface-400 hover:text-red-400 hover:bg-red-500/10 w-full transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-surface-900/90 backdrop-blur-md border-b border-surface-800 h-14 flex items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-display font-bold text-surface-50">Wandr AI</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-surface-950/95 backdrop-blur-md pt-14">
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  isActive(item.href)
                    ? 'bg-primary-500/15 text-primary-300'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-base text-surface-400 hover:text-red-400 w-full"
            >
              <LogOut className="w-5 h-5" />
              Sign out
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
