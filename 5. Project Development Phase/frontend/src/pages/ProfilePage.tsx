import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Calendar, LogOut, Trash2,
  Shield, Info, AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import AppLayout from '../components/layout/AppLayout'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Traveler'
  const joinedDate = user?.created_at
    ? format(new Date(user.created_at), 'MMMM d, yyyy')
    : 'Unknown'

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-surface-50">Profile</h1>
          <p className="text-surface-400 mt-1">Manage your account settings</p>
        </div>

        {/* Avatar + name */}
        <div className="glass-card p-6 mb-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-surface-50">{displayName}</h2>
            <p className="text-surface-400 text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="badge-active">Active Account</span>
            </div>
          </div>
        </div>

        {/* Account info */}
        <div className="glass-card p-6 mb-6 space-y-4">
          <h3 className="font-display font-semibold text-surface-100 mb-4">Account Details</h3>

          <div className="flex items-center gap-3 py-3 border-b border-surface-800">
            <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center">
              <User className="w-4 h-4 text-surface-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Full Name</p>
              <p className="text-sm text-surface-200">{displayName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-3 border-b border-surface-800">
            <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center">
              <Mail className="w-4 h-4 text-surface-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Email Address</p>
              <p className="text-sm text-surface-200">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-3 border-b border-surface-800">
            <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-surface-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Member Since</p>
              <p className="text-sm text-surface-200">{joinedDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center">
              <Shield className="w-4 h-4 text-surface-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500">User ID</p>
              <p className="text-sm text-surface-500 font-mono truncate">{user?.id}</p>
            </div>
          </div>
        </div>

        {/* Security info */}
        <div className="glass-card p-5 mb-6 border border-primary-500/20 bg-primary-500/5">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-surface-200 mb-1">Data Privacy</p>
              <p className="text-surface-400">
                Your trip data is stored securely in Supabase with row-level security.
                Only you can access your itineraries. Passwords are managed by Supabase Auth
                and never stored in plain text.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="glass-card p-6 space-y-3">
          <h3 className="font-display font-semibold text-surface-100 mb-4">Account Actions</h3>

          <button
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-surface-700 text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>

          <div className="p-3 rounded-xl border border-surface-800 bg-surface-900/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-surface-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-surface-600">
                To change your email or password, or to delete your account,
                please manage your account directly in the Supabase Auth dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sign out confirm */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-surface-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-sm w-full">
            <h3 className="font-display font-bold text-surface-50 text-lg mb-2">Sign Out?</h3>
            <p className="text-surface-400 text-sm mb-6">
              You'll need to sign in again to access your trips.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowSignOutConfirm(false)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button
                id="confirm-signout"
                onClick={handleSignOut}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
