import { Link } from 'react-router-dom'
import { MapPin, Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-accent-600/10 rounded-full blur-3xl" />
      </div>
      <div className="relative text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600/20 to-accent-600/20 border border-primary-500/20 flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-10 h-10 text-primary-400" />
        </div>
        <h1 className="font-display text-7xl font-bold text-surface-800 mb-2">404</h1>
        <h2 className="font-display text-2xl font-bold text-surface-200 mb-3">Page Not Found</h2>
        <p className="text-surface-500 mb-8 max-w-sm">
          Looks like this destination doesn't exist on our map.
          Let's get you back on track.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link to="/" className="btn-secondary">
            <Home className="w-4 h-4" /> Home
          </Link>
          <Link to="/dashboard" className="btn-primary">
            <ArrowLeft className="w-4 h-4" /> Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
