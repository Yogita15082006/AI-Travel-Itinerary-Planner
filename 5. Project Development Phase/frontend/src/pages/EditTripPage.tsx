import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Loader2, AlertCircle, Save, MapPin,
  Calendar, Users, DollarSign
} from 'lucide-react'
import { api, ApiClientError } from '../lib/api'
import type { Trip, TripStatus } from '../types'
import AppLayout from '../components/layout/AppLayout'

const editSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(300),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
  accommodation_preference: z.string().max(200).optional(),
  dietary_preferences: z.string().max(500).optional(),
  accessibility_requirements: z.string().max(500).optional(),
  additional_instructions: z.string().max(1000).optional(),
})

type EditFormData = z.infer<typeof editSchema>

const STATUS_OPTIONS: { value: TripStatus; label: string; desc: string }[] = [
  { value: 'draft', label: 'Draft', desc: 'Work in progress' },
  { value: 'active', label: 'Active', desc: 'Currently planning' },
  { value: 'completed', label: 'Completed', desc: 'Trip done' },
  { value: 'archived', label: 'Archived', desc: 'No longer active' },
]

export default function EditTripPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditFormData>({ resolver: zodResolver(editSchema) })

  useEffect(() => {
    if (!tripId) return
    const load = async () => {
      try {
        const t = await api.getTrip(tripId)
        setTrip(t)
        reset({
          title: t.title,
          status: t.status,
          accommodation_preference: t.accommodation_preference || '',
          dietary_preferences: t.dietary_preferences || '',
          accessibility_requirements: t.accessibility_requirements || '',
          additional_instructions: t.additional_instructions || '',
        })
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load trip')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tripId, reset])

  const onSubmit = async (data: EditFormData) => {
    if (!trip) return
    setServerError(null)
    try {
      await api.updateTrip(trip.id, {
        title: data.title,
        status: data.status,
        accommodation_preference: data.accommodation_preference || undefined,
        dietary_preferences: data.dietary_preferences || undefined,
        accessibility_requirements: data.accessibility_requirements || undefined,
        additional_instructions: data.additional_instructions || undefined,
      })
      setSuccess(true)
      setTimeout(() => navigate(`/trips/${trip.id}`), 1200)
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : 'Failed to update trip')
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-64">
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
          <p className="text-surface-300 mb-4">{error || 'Trip not found'}</p>
          <Link to="/trips" className="btn-secondary inline-flex">
            <ArrowLeft className="w-4 h-4" /> Back to trips
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <Link to={`/trips/${trip.id}`} className="inline-flex items-center gap-2 text-surface-400 hover:text-surface-200 text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to trip
          </Link>
          <h1 className="font-display text-3xl font-bold text-surface-50">Edit Trip</h1>
        </div>

        {/* Trip meta (read-only) */}
        <div className="glass-card p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              { icon: MapPin, label: trip.destination, color: 'text-primary-400' },
              { icon: Calendar, label: `${trip.start_date} → ${trip.end_date}`, color: 'text-accent-400' },
              { icon: Users, label: `${trip.travelers} traveler${trip.travelers > 1 ? 's' : ''}`, color: 'text-yellow-400' },
              { icon: DollarSign, label: `${trip.currency} ${trip.total_budget.toLocaleString()}`, color: 'text-emerald-400' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-surface-400">
                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-surface-600 mt-3">
            Destination, dates, travelers, and budget cannot be changed after generation.
            Regenerate individual days instead if needed.
          </p>
        </div>

        {/* Form */}
        <div className="glass-card p-6 lg:p-8">
          {serverError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{serverError}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <Save className="w-5 h-5 text-emerald-400" />
              <p className="text-emerald-300 text-sm font-medium">Trip updated! Redirecting...</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Title */}
            <div>
              <label htmlFor="edit-title" className="form-label">Trip Title</label>
              <input
                id="edit-title"
                {...register('title')}
                className="form-input"
                placeholder="Give your trip a memorable name"
              />
              {errors.title && <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.title.message}</p>}
            </div>

            {/* Status */}
            <div>
              <label className="form-label">Status</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue('status', opt.value, { shouldDirty: true })}
                    className={`p-3 rounded-xl border text-left text-sm transition-all ${
                      watch('status') === opt.value
                        ? 'border-primary-500 bg-primary-500/15 text-primary-200'
                        : 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600'
                    }`}
                  >
                    <span className="font-medium block">{opt.label}</span>
                    <span className="text-xs text-surface-500">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accommodation */}
            <div>
              <label htmlFor="edit-accommodation" className="form-label">
                Accommodation Preference
                <span className="text-surface-600 text-xs font-normal ml-2">(optional)</span>
              </label>
              <input
                id="edit-accommodation"
                {...register('accommodation_preference')}
                className="form-input"
                placeholder="e.g. Mid-range hotels, Airbnb"
              />
            </div>

            {/* Dietary */}
            <div>
              <label htmlFor="edit-dietary" className="form-label">
                Dietary Preferences
                <span className="text-surface-600 text-xs font-normal ml-2">(optional)</span>
              </label>
              <input
                id="edit-dietary"
                {...register('dietary_preferences')}
                className="form-input"
                placeholder="e.g. Vegetarian, Halal"
              />
            </div>

            {/* Accessibility */}
            <div>
              <label htmlFor="edit-accessibility" className="form-label">
                Accessibility Requirements
                <span className="text-surface-600 text-xs font-normal ml-2">(optional)</span>
              </label>
              <input
                id="edit-accessibility"
                {...register('accessibility_requirements')}
                className="form-input"
                placeholder="e.g. Wheelchair accessible venues"
              />
            </div>

            {/* Additional instructions */}
            <div>
              <label htmlFor="edit-instructions" className="form-label">
                Additional Instructions
                <span className="text-surface-600 text-xs font-normal ml-2">(optional)</span>
              </label>
              <textarea
                id="edit-instructions"
                {...register('additional_instructions')}
                rows={3}
                className="form-input resize-none"
                placeholder="Notes for future AI regenerations..."
              />
              {errors.additional_instructions && (
                <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.additional_instructions.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Link to={`/trips/${trip.id}`} className="btn-secondary flex-1 justify-center">
                Cancel
              </Link>
              <button
                id="save-trip-edit"
                type="submit"
                disabled={isSubmitting || !isDirty || success}
                className="btn-primary flex-1 justify-center"
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                  : <><Save className="w-4 h-4" />Save Changes</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
