import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, MapPin, Calendar, Users, DollarSign,
  ArrowRight, TrendingUp, Plane, Loader2, AlertCircle
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api, ApiClientError } from '../lib/api'
import type { TripSummary } from '../types'
import { format } from 'date-fns'
import AppLayout from '../components/layout/AppLayout'

function TripCard({ trip }: { trip: TripSummary }) {
  const statusClass = {
    active: 'badge-active',
    completed: 'badge-completed',
    draft: 'badge-draft',
    archived: 'badge-archived',
  }[trip.status] || 'badge-draft'

  const styleEmoji: Record<string, string> = {
    budget: '💰', balanced: '⚖️', luxury: '💎',
    adventure: '🎒', relaxed: '🏖️', cultural: '🏛️', romantic: '💑',
  }

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="glass-card-hover p-5 block group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{styleEmoji[trip.travel_style] || '✈️'}</span>
          <div>
            <h3 className="font-semibold text-surface-100 group-hover:text-primary-300 transition-colors line-clamp-1">
              {trip.title}
            </h3>
            <div className="flex items-center gap-1 text-surface-400 text-xs mt-0.5">
              <MapPin className="w-3 h-3" />
              {trip.destination}
            </div>
          </div>
        </div>
        <span className={statusClass}>{trip.status}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="flex items-center gap-1.5 text-surface-400 text-xs">
          <Calendar className="w-3 h-3 text-primary-400" />
          <span>{trip.num_days}d</span>
        </div>
        <div className="flex items-center gap-1.5 text-surface-400 text-xs">
          <Users className="w-3 h-3 text-accent-400" />
          <span>{trip.travelers} pax</span>
        </div>
        <div className="flex items-center gap-1.5 text-surface-400 text-xs">
          <DollarSign className="w-3 h-3 text-emerald-400" />
          <span>{trip.currency} {trip.total_budget.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-800">
        <span className="text-xs text-surface-600">
          {format(new Date(trip.start_date), 'MMM d')} – {format(new Date(trip.end_date), 'MMM d, yyyy')}
        </span>
        <ArrowRight className="w-4 h-4 text-surface-600 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [trips, setTrips] = useState<TripSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] || 'Traveler'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    const loadTrips = async () => {
      try {
        setError(null)
        const response = await api.listTrips(1, 6)
        setTrips(response.trips)
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message)
        } else {
          setError('Failed to load trips. Is the backend running?')
        }
      } finally {
        setLoading(false)
      }
    }
    loadTrips()
  }, [])

  const activeTrips = trips.filter(t => t.status === 'active').length
  const totalBudget = trips.reduce((sum, t) => sum + t.total_budget, 0)
  const totalDays = trips.reduce((sum, t) => sum + t.num_days, 0)

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden glass-card p-6 lg:p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 via-accent-600/5 to-transparent pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-surface-400 text-sm font-medium mb-1">{greeting} 👋</p>
              <h1 className="font-display text-3xl font-bold text-surface-50">
                {displayName}
              </h1>
              <p className="text-surface-400 mt-1">
                {trips.length === 0
                  ? 'Ready to plan your first adventure?'
                  : `You have ${trips.length} trip${trips.length > 1 ? 's' : ''} planned.`}
              </p>
            </div>
            <Link to="/trips/new" id="dashboard-new-trip" className="btn-primary shadow-glow flex-shrink-0">
              <Plus className="w-4 h-4" />
              New Trip
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        {trips.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Plane, label: 'Total Trips', value: trips.length, color: 'text-primary-400', bg: 'bg-primary-500/10' },
              { icon: TrendingUp, label: 'Active Trips', value: activeTrips, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { icon: Calendar, label: 'Total Days', value: totalDays, color: 'text-accent-400', bg: 'bg-accent-500/10' },
              {
                icon: DollarSign,
                label: 'Total Budget',
                value: totalBudget > 10000 ? `$${(totalBudget / 1000).toFixed(0)}k` : `$${totalBudget.toFixed(0)}`,
                color: 'text-yellow-400',
                bg: 'bg-yellow-500/10'
              },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-surface-50">{stat.value}</p>
                  <p className="text-xs text-surface-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Trips */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recent Trips</h2>
            {trips.length > 0 && (
              <Link to="/trips" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-5 space-y-3">
                  <div className="shimmer h-4 rounded w-3/4" />
                  <div className="shimmer h-3 rounded w-1/2" />
                  <div className="shimmer h-3 rounded w-full mt-4" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="glass-card p-8 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-surface-300 font-medium mb-1">Failed to load trips</p>
              <p className="text-surface-500 text-sm">{error}</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-10 h-10 text-primary-400" />
              </div>
              <h3 className="font-display text-xl font-semibold text-surface-200 mb-2">
                No trips yet
              </h3>
              <p className="text-surface-500 text-sm mb-6 max-w-sm mx-auto">
                Create your first AI-powered travel itinerary. Tell us where you want to go
                and we'll plan the perfect trip for you.
              </p>
              <Link to="/trips/new" className="btn-primary inline-flex shadow-glow">
                <Plus className="w-4 h-4" />
                Plan Your First Trip
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </div>

        {/* Quick tip */}
        {trips.length === 0 && !loading && !error && (
          <div className="glass-card p-5 border border-primary-500/20 bg-primary-500/5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-surface-100 mb-1">Tip: Plan smarter with AI</h3>
                <p className="text-surface-400 text-sm">
                  Our AI reads your preferences — travel style, budget, interests, and pace —
                  and builds a complete day-by-day itinerary. You can edit or regenerate any day.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
