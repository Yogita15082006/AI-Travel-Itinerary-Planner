import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, MapPin, Calendar, Users, DollarSign, Search,
  Filter, ArrowRight, Loader2, AlertCircle, SlidersHorizontal
} from 'lucide-react'
import { api, ApiClientError } from '../lib/api'
import type { TripSummary, TripStatus } from '../types'
import { format } from 'date-fns'
import AppLayout from '../components/layout/AppLayout'

const STATUS_OPTIONS: { value: TripStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Trips' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

const STYLE_EMOJIS: Record<string, string> = {
  budget: '💰', balanced: '⚖️', luxury: '💎',
  adventure: '🎒', relaxed: '🏖️', cultural: '🏛️', romantic: '💑',
}

function TripRow({ trip }: { trip: TripSummary }) {
  const statusClass: Record<string, string> = {
    active: 'badge-active',
    completed: 'badge-completed',
    draft: 'badge-draft',
    archived: 'badge-archived',
  }

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="glass-card-hover flex flex-col sm:flex-row sm:items-center gap-4 p-5 group"
    >
      {/* Emoji + destination */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-2xl flex-shrink-0">{STYLE_EMOJIS[trip.travel_style] || '✈️'}</span>
        <div className="min-w-0">
          <h3 className="font-semibold text-surface-100 group-hover:text-primary-300 transition-colors truncate">
            {trip.title}
          </h3>
          <div className="flex items-center gap-1 text-surface-500 text-xs">
            <MapPin className="w-3 h-3" /> {trip.destination}
          </div>
        </div>
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap text-xs text-surface-400">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-primary-400" />
          <span>{format(new Date(trip.start_date), 'MMM d')} – {format(new Date(trip.end_date), 'MMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-accent-400" />
          <span>{trip.travelers}p · {trip.num_days}d</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span>{trip.currency} {trip.total_budget.toLocaleString()}</span>
        </div>
        <span className={statusClass[trip.status] || 'badge-draft'}>{trip.status}</span>
        <ArrowRight className="w-4 h-4 text-surface-600 group-hover:text-primary-400 group-hover:translate-x-1 transition-all hidden sm:block" />
      </div>
    </Link>
  )
}

export default function TripsListPage() {
  const [trips, setTrips] = useState<TripSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TripStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 12

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await api.listTrips(page, PAGE_SIZE)
        setTrips(res.trips)
        setTotal(res.total)
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load trips')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [page])

  const filtered = trips.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    const matchesSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-surface-50">My Trips</h1>
            <p className="text-surface-400 mt-1">
              {total > 0 ? `${total} trip${total > 1 ? 's' : ''} planned` : 'Start planning your adventures'}
            </p>
          </div>
          <Link to="/trips/new" className="btn-primary shadow-glow">
            <Plus className="w-4 h-4" />
            New Trip
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by destination or title..."
              className="form-input pl-10"
            />
          </div>
          <div className="relative">
            <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as TripStatus | 'all')}
              className="form-input pl-10 pr-8 appearance-none cursor-pointer"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Trip list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card p-5 flex items-center gap-4">
                <div className="shimmer w-8 h-8 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer h-4 rounded w-2/5" />
                  <div className="shimmer h-3 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="glass-card p-10 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-surface-300 font-medium">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-5">
              <MapPin className="w-10 h-10 text-primary-400" />
            </div>
            <h3 className="font-display text-xl font-semibold text-surface-200 mb-2">
              {search || statusFilter !== 'all' ? 'No matching trips' : 'No trips yet'}
            </h3>
            <p className="text-surface-500 text-sm mb-6">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Create your first AI-powered itinerary.'}
            </p>
            {!search && statusFilter === 'all' && (
              <Link to="/trips/new" className="btn-primary inline-flex shadow-glow">
                <Plus className="w-4 h-4" /> Plan Your First Trip
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(trip => <TripRow key={trip.id} trip={trip} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-sm py-2 px-4 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-surface-400 text-sm px-3">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary text-sm py-2 px-4 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
