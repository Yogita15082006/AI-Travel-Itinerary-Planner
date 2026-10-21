import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  MapPin, Calendar, Users, DollarSign, ArrowLeft,
  ChevronDown, ChevronUp, RefreshCw, Edit2, Trash2,
  Clock, Info, AlertCircle, Loader2, Sparkles, Tag,
  Utensils, Bus, Home, CheckCircle2, XCircle
} from 'lucide-react'
import { api, ApiClientError } from '../lib/api'
import type { Trip, ItineraryDay, Activity, RegenerateDayRequest } from '../types'
import { format } from 'date-fns'
import AppLayout from '../components/layout/AppLayout'
import BudgetPanel from '../components/trip/BudgetPanel'

const CATEGORY_ICONS: Record<string, string> = {
  sightseeing: '🗽', food: '🍜', nature: '🌿', history: '🏛️',
  shopping: '🛍️', nightlife: '🎉', adventure: '⛺', beach: '🏖️',
  culture: '🎭', transport: '🚌', accommodation: '🏨', other: '📍',
}

function ActivityCard({ activity, currency }: { activity: Activity; currency: string }) {
  const [expanded, setExpanded] = useState(false)
  const catClass = `cat-${activity.category}`

  return (
    <div className="bg-surface-800/50 rounded-xl border border-surface-700/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-surface-800/80 transition-colors"
      >
        {/* Time column */}
        <div className="flex-shrink-0 w-20 text-right">
          {activity.suggested_start_time && (
            <span className="text-xs font-mono text-surface-400">{activity.suggested_start_time}</span>
          )}
          {activity.suggested_end_time && (
            <div className="text-xs font-mono text-surface-600">{activity.suggested_end_time}</div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg">{CATEGORY_ICONS[activity.category] || '📍'}</span>
              <h4 className="font-medium text-surface-100 text-sm">{activity.name}</h4>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${catClass}`}>
                {activity.category}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {activity.estimated_cost !== null && activity.estimated_cost !== undefined ? (
                <span className="text-xs font-medium text-emerald-400">
                  ~{currency} {activity.estimated_cost.toFixed(0)}/person
                </span>
              ) : (
                <span className="text-xs text-surface-600">Cost varies</span>
              )}
              {expanded
                ? <ChevronUp className="w-4 h-4 text-surface-500" />
                : <ChevronDown className="w-4 h-4 text-surface-500" />}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-surface-700/50 pt-3 animate-fade-in">
          <p className="text-surface-400 text-sm leading-relaxed">{activity.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activity.location_name && (
              <div className="flex items-start gap-2 text-xs">
                <MapPin className="w-3.5 h-3.5 text-surface-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-surface-500 block">Location</span>
                  <span className="text-surface-300">{activity.location_name}</span>
                  {activity.address && (
                    <div className="text-surface-500">{activity.address}</div>
                  )}
                </div>
              </div>
            )}
            {activity.transportation_to_next && (
              <div className="flex items-start gap-2 text-xs">
                <Bus className="w-3.5 h-3.5 text-surface-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-surface-500 block">Getting there</span>
                  <span className="text-surface-300">{activity.transportation_to_next}</span>
                </div>
              </div>
            )}
          </div>

          {activity.practical_tips && (
            <div className="flex items-start gap-2 p-3 bg-primary-500/5 rounded-lg border border-primary-500/20">
              <Info className="w-3.5 h-3.5 text-primary-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-surface-400">{activity.practical_tips}</p>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-surface-600">
            <AlertCircle className="w-3 h-3" />
            Costs are estimates only — verify before booking
          </div>
        </div>
      )}
    </div>
  )
}

interface DayCardProps {
  day: ItineraryDay
  currency: string
  tripId: string
  onRegenerate: (dayId: string) => void
  isRegenerating: boolean
}

function DayCard({ day, currency, tripId, onRegenerate, isRegenerating }: DayCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [showRegenModal, setShowRegenModal] = useState(false)
  const [regenInstructions, setRegenInstructions] = useState('')

  const handleRegen = () => {
    setShowRegenModal(false)
    onRegenerate(day.id)
  }

  return (
    <div id={`day-${day.day_number}`} className="glass-card overflow-hidden">
      {/* Day Header */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-white">{day.day_number}</span>
          </div>
          <div>
            <h3 className="font-display font-semibold text-surface-100">{day.title}</h3>
            <div className="flex items-center gap-3 text-xs text-surface-500 mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(day.date + 'T00:00:00'), 'EEE, MMM d')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {day.activities.length} activities
              </span>
              {day.estimated_day_cost != null && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <DollarSign className="w-3 h-3" />
                  ~{currency} {day.estimated_day_cost.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowRegenModal(true)}
            disabled={isRegenerating}
            title="Regenerate this day"
            className="p-2 rounded-lg text-surface-400 hover:text-primary-300 hover:bg-primary-500/10 transition-all disabled:opacity-50"
          >
            {isRegenerating
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
          </button>
          <Link
            to={`/trips/${tripId}/days/${day.id}/edit`}
            title="Edit this day"
            className="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-all"
          >
            <Edit2 className="w-4 h-4" />
          </Link>
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-surface-500" />
            : <ChevronUp className="w-4 h-4 text-surface-500" />}
        </div>
      </div>

      {/* Day Body */}
      {!collapsed && (
        <div className="border-t border-surface-800 p-5 space-y-5">
          {/* Summary */}
          <p className="text-surface-400 text-sm leading-relaxed">{day.summary}</p>

          {/* Accommodation */}
          {day.accommodation_suggestion && (
            <div className="flex items-start gap-3 p-3 bg-surface-800/50 rounded-xl">
              <Home className="w-4 h-4 text-accent-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium text-surface-400 uppercase tracking-wide">Accommodation</span>
                <p className="text-sm text-surface-300 mt-0.5">{day.accommodation_suggestion}</p>
              </div>
            </div>
          )}

          {/* Activities */}
          {day.activities.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-3">Activities</h4>
              <div className="space-y-2">
                {day.activities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} currency={currency} />
                ))}
              </div>
            </div>
          )}

          {/* Dining */}
          {day.dining_recommendations && day.dining_recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2 flex items-center gap-1.5">
                <Utensils className="w-3 h-3" />
                Dining Recommendations
              </h4>
              <div className="flex flex-wrap gap-2">
                {day.dining_recommendations.map((r, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-300 border border-orange-500/20 text-xs">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Transport */}
          {day.transportation_notes && (
            <div className="flex items-start gap-3 p-3 bg-surface-800/50 rounded-xl">
              <Bus className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium text-surface-400 uppercase tracking-wide">Transportation</span>
                <p className="text-sm text-surface-300 mt-0.5">{day.transportation_notes}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Regenerate Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 bg-surface-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-display font-bold text-surface-50 text-lg mb-2">
              Regenerate Day {day.day_number}
            </h3>
            <p className="text-surface-400 text-sm mb-4">
              This will replace the current day's activities with a fresh AI-generated plan.
              All other days will remain unchanged.
            </p>
            <div className="mb-4">
              <label className="form-label">Additional instructions (optional)</label>
              <textarea
                value={regenInstructions}
                onChange={e => setRegenInstructions(e.target.value)}
                className="form-input resize-none text-sm"
                rows={3}
                placeholder="e.g. More outdoor activities, avoid tourist traps, include local markets..."
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRegenModal(false)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button onClick={handleRegen} className="btn-primary flex-1 justify-center">
                <Sparkles className="w-4 h-4" />
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regeneratingDay, setRegeneratingDay] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'itinerary' | 'budget'>('itinerary')

  useEffect(() => {
    if (!tripId) return
    const load = async () => {
      try {
        const t = await api.getTrip(tripId)
        setTrip(t)
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load trip')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tripId])

  const handleRegenerateDay = async (dayId: string) => {
    if (!trip) return
    setRegeneratingDay(dayId)
    try {
      const request: RegenerateDayRequest = { keep_accommodation: true }
      const updated = await api.regenerateDay(trip.id, dayId, request)
      setTrip(updated)
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : 'Failed to regenerate day')
    } finally {
      setRegeneratingDay(null)
    }
  }

  const handleDelete = async () => {
    if (!trip) return
    setDeleting(true)
    try {
      await api.deleteTrip(trip.id)
      navigate('/trips')
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : 'Failed to delete trip')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        </div>
      </AppLayout>
    )
  }

  if (error || !trip) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="font-display text-xl font-bold text-surface-200 mb-2">Trip not found</h2>
          <p className="text-surface-500 mb-6">{error || 'This trip does not exist or you do not have access.'}</p>
          <Link to="/trips" className="btn-secondary inline-flex">
            <ArrowLeft className="w-4 h-4" />
            Back to trips
          </Link>
        </div>
      </AppLayout>
    )
  }

  const numDays = (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000 + 1

  const statusClass = {
    active: 'badge-active',
    completed: 'badge-completed',
    draft: 'badge-draft',
    archived: 'badge-archived',
  }[trip.status] || 'badge-draft'

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <Link to="/trips" className="inline-flex items-center gap-2 text-surface-400 hover:text-surface-200 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            My Trips
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to={`/trips/${trip.id}/edit`}
              className="btn-secondary text-sm py-2 px-4"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-danger"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>

        {/* Trip Header */}
        <div className="glass-card p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={statusClass}>{trip.status}</span>
                  <span className="tag">{trip.travel_style}</span>
                </div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold text-surface-50">{trip.title}</h1>
                <div className="flex items-center gap-1.5 text-surface-400 mt-1">
                  <MapPin className="w-4 h-4 text-primary-400" />
                  <span>{trip.destination}</span>
                  {trip.departure_city && <span className="text-surface-600">from {trip.departure_city}</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Calendar, label: 'Dates', value: `${format(new Date(trip.start_date), 'MMM d')} – ${format(new Date(trip.end_date), 'MMM d, yyyy')}`, color: 'text-primary-400' },
                { icon: Clock, label: 'Duration', value: `${Math.round(numDays)} days`, color: 'text-accent-400' },
                { icon: Users, label: 'Travelers', value: `${trip.travelers} person${trip.travelers > 1 ? 's' : ''}`, color: 'text-yellow-400' },
                { icon: DollarSign, label: 'Budget', value: `${trip.currency} ${trip.total_budget.toLocaleString()}`, color: 'text-emerald-400' },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface-800/50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                    <span className="text-xs text-surface-500">{stat.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-surface-200">{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Budget quick bar */}
            {trip.estimated_total_cost != null && trip.total_budget > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-surface-500">Estimated cost</span>
                  <span className={trip.estimated_total_cost > trip.total_budget ? 'text-red-400' : 'text-emerald-400'}>
                    {trip.currency} {trip.estimated_total_cost.toLocaleString()} / {trip.total_budget.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${trip.estimated_total_cost > trip.total_budget ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (trip.estimated_total_cost / trip.total_budget) * 100)}%` }}
                  />
                </div>
                {trip.estimated_total_cost > trip.total_budget && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Estimated cost exceeds budget by {trip.currency} {(trip.estimated_total_cost - trip.total_budget).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-900 p-1 rounded-xl w-fit">
          {(['itinerary', 'budget'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? 'bg-surface-800 text-surface-100 shadow'
                  : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Itinerary Tab */}
        {activeTab === 'itinerary' && (
          <div className="space-y-4">
            {trip.days.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <p className="text-surface-400">No itinerary days found.</p>
              </div>
            ) : (
              trip.days.map((day) => (
                <DayCard
                  key={day.id}
                  day={day}
                  currency={trip.currency}
                  tripId={trip.id}
                  onRegenerate={handleRegenerateDay}
                  isRegenerating={regeneratingDay === day.id}
                />
              ))
            )}
          </div>
        )}

        {/* Budget Tab */}
        {activeTab === 'budget' && (
          <BudgetPanel trip={trip} />
        )}

        {/* AI Disclaimer */}
        <div className="flex items-start gap-3 p-4 glass-card text-xs text-surface-500">
          <Info className="w-4 h-4 text-surface-400 flex-shrink-0 mt-0.5" />
          <p>
            All itinerary content, cost estimates, activity descriptions, and recommendations
            are AI-generated and may be inaccurate. Please verify opening hours, prices,
            and availability before making bookings. Costs are approximate estimates only.
          </p>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-surface-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-sm w-full">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-display font-bold text-surface-50 text-lg mb-2">Delete Trip?</h3>
            <p className="text-surface-400 text-sm mb-6">
              Are you sure you want to delete "<strong className="text-surface-200">{trip.title}</strong>"?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerating overlay */}
      {regeneratingDay && (
        <div className="fixed inset-0 bg-surface-950/60 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="glass-card p-6 text-center">
            <Sparkles className="w-8 h-8 text-primary-400 animate-pulse mx-auto mb-3" />
            <p className="text-surface-200 font-medium">Regenerating day...</p>
            <p className="text-surface-500 text-sm mt-1">This may take a moment</p>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
