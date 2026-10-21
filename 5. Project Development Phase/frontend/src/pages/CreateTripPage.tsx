import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  MapPin, Calendar, Users, DollarSign, Sparkles,
  AlertCircle, Loader2, ChevronRight, ChevronLeft,
  Info, Check
} from 'lucide-react'
import { api, ApiClientError } from '../lib/api'
import type { TravelStyle, DailyPace } from '../types'
import AppLayout from '../components/layout/AppLayout'

// ── Validation Schema ────────────────────────────────────────

const tripSchema = z.object({
  destination: z.string().min(2, 'Destination is required (min 2 characters)').max(200),
  departure_city: z.string().max(200).optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  travelers: z.number({ invalid_type_error: 'Number of travelers required' }).int().min(1).max(50),
  total_budget: z.number({ invalid_type_error: 'Budget is required' }).positive('Budget must be positive'),
  currency: z.string().default('USD'),
  travel_style: z.enum(['budget', 'balanced', 'luxury', 'adventure', 'relaxed', 'cultural', 'romantic']),
  interests: z.array(z.string()).min(1, 'Select at least one interest'),
  accommodation_preference: z.string().max(200).optional(),
  dietary_preferences: z.string().max(500).optional(),
  accessibility_requirements: z.string().max(500).optional(),
  daily_pace: z.enum(['slow', 'moderate', 'fast']),
  additional_instructions: z.string().max(1000).optional(),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date)
  }
  return true
}, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
})

type TripFormData = z.infer<typeof tripSchema>

// ── Options ──────────────────────────────────────────────────

const TRAVEL_STYLES: { value: TravelStyle; label: string; emoji: string; desc: string }[] = [
  { value: 'budget', label: 'Budget', emoji: '💰', desc: 'Save money, hostel stays, local food' },
  { value: 'balanced', label: 'Balanced', emoji: '⚖️', desc: 'Mix of comfort and savings' },
  { value: 'luxury', label: 'Luxury', emoji: '💎', desc: '5-star hotels, fine dining' },
  { value: 'adventure', label: 'Adventure', emoji: '🎒', desc: 'Outdoor activities, hiking, thrills' },
  { value: 'relaxed', label: 'Relaxed', emoji: '🏖️', desc: 'Slow pace, beaches, wellness' },
  { value: 'cultural', label: 'Cultural', emoji: '🏛️', desc: 'Museums, history, local experiences' },
  { value: 'romantic', label: 'Romantic', emoji: '💑', desc: 'Couples experiences, intimate settings' },
]

const INTERESTS = [
  { value: 'food', emoji: '🍜', label: 'Food & Cuisine' },
  { value: 'sightseeing', emoji: '🗽', label: 'Sightseeing' },
  { value: 'nature', emoji: '🌿', label: 'Nature' },
  { value: 'history', emoji: '🏛️', label: 'History' },
  { value: 'shopping', emoji: '🛍️', label: 'Shopping' },
  { value: 'nightlife', emoji: '🎉', label: 'Nightlife' },
  { value: 'adventure', emoji: '⛺', label: 'Adventure' },
  { value: 'beaches', emoji: '🏖️', label: 'Beaches' },
  { value: 'culture', emoji: '🎭', label: 'Arts & Culture' },
  { value: 'art', emoji: '🎨', label: 'Art' },
  { value: 'wellness', emoji: '🧘', label: 'Wellness & Spa' },
  { value: 'photography', emoji: '📷', label: 'Photography' },
  { value: 'architecture', emoji: '🏗️', label: 'Architecture' },
  { value: 'music', emoji: '🎵', label: 'Music & Events' },
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'SGD', 'AED', 'THB']

const PACES: { value: DailyPace; label: string; desc: string }[] = [
  { value: 'slow', label: 'Slow', desc: '2–3 activities/day, long breaks' },
  { value: 'moderate', label: 'Moderate', desc: '3–4 activities/day, balanced' },
  { value: 'fast', label: 'Fast', desc: '5+ activities/day, packed schedule' },
]

const STEPS = ['Destination', 'Preferences', 'Details']

// ── Form Steps ────────────────────────────────────────────────

function StepOne({ register, errors, control, watch }: any) {
  const interests: string[] = watch('interests') || []

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="destination" className="form-label">
            Destination <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              id="destination"
              {...register('destination')}
              className="form-input pl-10"
              placeholder="e.g. Tokyo, Japan"
            />
          </div>
          {errors.destination && <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.destination.message}</p>}
        </div>

        <div>
          <label htmlFor="departure_city" className="form-label">
            Departure City <span className="text-surface-600 text-xs font-normal">(optional)</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              id="departure_city"
              {...register('departure_city')}
              className="form-input pl-10"
              placeholder="e.g. New York, USA"
            />
          </div>
        </div>

        <div>
          <label htmlFor="start_date" className="form-label">
            Start Date <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              id="start_date"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              {...register('start_date')}
              className="form-input pl-10"
            />
          </div>
          {errors.start_date && <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.start_date.message}</p>}
        </div>

        <div>
          <label htmlFor="end_date" className="form-label">
            End Date <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              id="end_date"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              {...register('end_date')}
              className="form-input pl-10"
            />
          </div>
          {errors.end_date && <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.end_date.message}</p>}
        </div>

        <div>
          <label htmlFor="travelers" className="form-label">
            Number of Travelers <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              id="travelers"
              type="number"
              min="1"
              max="50"
              {...register('travelers', { valueAsNumber: true })}
              className="form-input pl-10"
              placeholder="2"
            />
          </div>
          {errors.travelers && <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.travelers.message}</p>}
        </div>

        <div>
          <label className="form-label">
            Total Budget <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <select {...field} className="form-input w-24 flex-shrink-0">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            />
            <div className="relative flex-1">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
              <input
                id="total_budget"
                type="number"
                min="0"
                step="100"
                {...register('total_budget', { valueAsNumber: true })}
                className="form-input pl-10 w-full"
                placeholder="3000"
              />
            </div>
          </div>
          {errors.total_budget && <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.total_budget.message}</p>}
          <p className="text-xs text-surface-600 mt-1">Total budget for all travelers</p>
        </div>
      </div>
    </div>
  )
}

function StepTwo({ register, errors, control, watch }: any) {
  const selectedStyle: TravelStyle = watch('travel_style')
  const selectedInterests: string[] = watch('interests') || []

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Travel Style */}
      <div>
        <label className="form-label mb-3">
          Travel Style <span className="text-red-400">*</span>
        </label>
        <Controller
          name="travel_style"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TRAVEL_STYLES.map((style) => (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => field.onChange(style.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    field.value === style.value
                      ? 'border-primary-500 bg-primary-500/15 text-primary-200'
                      : 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600'
                  }`}
                >
                  <span className="text-xl block mb-1">{style.emoji}</span>
                  <span className="text-sm font-medium block">{style.label}</span>
                  <span className="text-xs text-surface-500 block">{style.desc}</span>
                </button>
              ))}
            </div>
          )}
        />
        {errors.travel_style && <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.travel_style.message}</p>}
      </div>

      {/* Interests */}
      <div>
        <label className="form-label mb-3">
          Interests <span className="text-red-400">*</span>
          <span className="text-surface-600 font-normal ml-2">(select all that apply)</span>
        </label>
        <Controller
          name="interests"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => {
                const selected = (field.value || []).includes(interest.value)
                return (
                  <button
                    key={interest.value}
                    type="button"
                    onClick={() => {
                      const current = field.value || []
                      if (selected) {
                        field.onChange(current.filter((v: string) => v !== interest.value))
                      } else {
                        field.onChange([...current, interest.value])
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all ${
                      selected
                        ? 'border-primary-500 bg-primary-500/15 text-primary-200'
                        : 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600'
                    }`}
                  >
                    <span>{interest.emoji}</span>
                    {selected && <Check className="w-3 h-3" />}
                    {interest.label}
                  </button>
                )
              })}
            </div>
          )}
        />
        {errors.interests && <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.interests.message}</p>}
      </div>

      {/* Daily Pace */}
      <div>
        <label className="form-label mb-3">Daily Pace</label>
        <Controller
          name="daily_pace"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-3">
              {PACES.map((pace) => (
                <button
                  key={pace.value}
                  type="button"
                  onClick={() => field.onChange(pace.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    field.value === pace.value
                      ? 'border-primary-500 bg-primary-500/15 text-primary-200'
                      : 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600'
                  }`}
                >
                  <span className="text-sm font-semibold block mb-0.5">{pace.label}</span>
                  <span className="text-xs text-surface-500">{pace.desc}</span>
                </button>
              ))}
            </div>
          )}
        />
      </div>
    </div>
  )
}

function StepThree({ register, errors }: any) {
  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <label htmlFor="accommodation_preference" className="form-label">
          Accommodation Preference
          <span className="text-surface-600 text-xs font-normal ml-2">(optional)</span>
        </label>
        <input
          id="accommodation_preference"
          {...register('accommodation_preference')}
          className="form-input"
          placeholder="e.g. Budget hostel, Mid-range hotel, Airbnb, 5-star resort..."
        />
      </div>

      <div>
        <label htmlFor="dietary_preferences" className="form-label">
          Dietary Preferences
          <span className="text-surface-600 text-xs font-normal ml-2">(optional)</span>
        </label>
        <input
          id="dietary_preferences"
          {...register('dietary_preferences')}
          className="form-input"
          placeholder="e.g. Vegetarian, Vegan, Halal, Gluten-free, No restrictions..."
        />
      </div>

      <div>
        <label htmlFor="accessibility_requirements" className="form-label">
          Accessibility Requirements
          <span className="text-surface-600 text-xs font-normal ml-2">(optional)</span>
        </label>
        <input
          id="accessibility_requirements"
          {...register('accessibility_requirements')}
          className="form-input"
          placeholder="e.g. Wheelchair accessible, No stairs, Limited walking..."
        />
      </div>

      <div>
        <label htmlFor="additional_instructions" className="form-label">
          Additional Instructions
          <span className="text-surface-600 text-xs font-normal ml-2">(optional)</span>
        </label>
        <textarea
          id="additional_instructions"
          {...register('additional_instructions')}
          rows={4}
          className="form-input resize-none"
          placeholder="Any specific requests, must-see places, things to avoid, special occasions..."
        />
        {errors.additional_instructions && (
          <p className="form-error"><AlertCircle className="w-3 h-3" />{errors.additional_instructions.message}</p>
        )}
      </div>

      <div className="glass-card p-4 border border-primary-500/20 bg-primary-500/5">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-surface-400">
            <p className="font-medium text-surface-300 mb-1">About AI-generated itineraries</p>
            <p>Cost estimates are approximate and labeled as estimates. Opening hours, prices, and availability should be verified before booking. AI-generated booking links are not included for accuracy.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────

export default function CreateTripPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const {
    register,
    control,
    watch,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      currency: 'USD',
      travel_style: 'balanced',
      daily_pace: 'moderate',
      interests: [],
      travelers: 2,
    },
  })

  const STEP_FIELDS: (keyof TripFormData)[][] = [
    ['destination', 'start_date', 'end_date', 'travelers', 'total_budget'],
    ['travel_style', 'interests', 'daily_pace'],
    [],
  ]

  const nextStep = async () => {
    const valid = await trigger(STEP_FIELDS[step] as any)
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const prevStep = () => setStep((s) => Math.max(s - 1, 0))

  const onSubmit = async (data: TripFormData) => {
    setServerError(null)
    setIsGenerating(true)
    try {
      const trip = await api.generateTrip({
        ...data,
        departure_city: data.departure_city || undefined,
        accommodation_preference: data.accommodation_preference || undefined,
        dietary_preferences: data.dietary_preferences || undefined,
        accessibility_requirements: data.accessibility_requirements || undefined,
        additional_instructions: data.additional_instructions || undefined,
      })
      navigate(`/trips/${trip.id}`)
    } catch (err) {
      if (err instanceof ApiClientError) {
        setServerError(err.message)
      } else {
        setServerError('Something went wrong. Please try again.')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // Calculate trip preview
  const startDate = watch('start_date')
  const endDate = watch('end_date')
  const numDays = startDate && endDate
    ? Math.max(0, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : null

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-surface-50 mb-1">
            Plan Your Trip
          </h1>
          <p className="text-surface-400">Tell us about your trip and our AI will create the perfect itinerary.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${
                i < step
                  ? 'bg-emerald-500 text-white'
                  : i === step
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-800 text-surface-500'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${
                i === step ? 'text-surface-200' : 'text-surface-600'
              }`}>{s}</span>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 mx-1 transition-all ${i < step ? 'bg-emerald-500' : 'bg-surface-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Trip preview pill */}
        {numDays && numDays > 0 && (
          <div className="mb-6 flex items-center gap-2 flex-wrap">
            {watch('destination') && (
              <span className="tag">
                <MapPin className="w-3 h-3" />
                {watch('destination')}
              </span>
            )}
            <span className="tag">
              <Calendar className="w-3 h-3" />
              {numDays} {numDays === 1 ? 'day' : 'days'}
            </span>
            {watch('travelers') > 0 && (
              <span className="tag">
                <Users className="w-3 h-3" />
                {watch('travelers')} {watch('travelers') === 1 ? 'traveler' : 'travelers'}
              </span>
            )}
          </div>
        )}

        {/* Form */}
        <div className="glass-card p-6 lg:p-8">
          {serverError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 text-sm font-medium">Generation failed</p>
                <p className="text-red-400 text-sm mt-0.5">{serverError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            {step === 0 && <StepOne register={register} errors={errors} control={control} watch={watch} />}
            {step === 1 && <StepTwo register={register} errors={errors} control={control} watch={watch} />}
            {step === 2 && <StepThree register={register} errors={errors} />}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-surface-800">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 0}
                className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  id={`next-step-${step}`}
                  onClick={nextStep}
                  className="btn-primary"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  id="generate-trip-submit"
                  type="submit"
                  disabled={isGenerating}
                  className="btn-accent px-8"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating your trip...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Itinerary
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Generation loading overlay */}
        {isGenerating && (
          <div className="fixed inset-0 bg-surface-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="glass-card p-8 text-center max-w-sm mx-4">
              <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary-400 animate-pulse" />
              </div>
              <h3 className="font-display text-xl font-bold text-surface-50 mb-2">
                Crafting your itinerary
              </h3>
              <p className="text-surface-400 text-sm mb-4">
                Our AI is building a personalized {numDays}-day adventure for you...
              </p>
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
