import { Link } from 'react-router-dom'
import {
  MapPin, Calendar, Brain, Star, Zap, Shield,
  Globe, ArrowRight, CheckCircle, Sparkles, Clock, DollarSign
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Planning',
    description: 'Groq-powered AI creates personalized itineraries in seconds based on your unique preferences.',
    color: 'text-primary-400',
    bg: 'bg-primary-500/10',
    border: 'border-primary-500/20',
  },
  {
    icon: Calendar,
    title: 'Day-by-Day Itinerary',
    description: 'Get detailed hour-by-hour plans with activities, dining, accommodation, and transportation.',
    color: 'text-accent-400',
    bg: 'bg-accent-500/10',
    border: 'border-accent-500/20',
  },
  {
    icon: DollarSign,
    title: 'Budget Tracking',
    description: 'Real-time budget breakdown across activities, hotels, food, and transport.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: Zap,
    title: 'Instant Regeneration',
    description: 'Not happy with a day? Regenerate just that day while keeping the rest intact.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
  },
  {
    icon: Globe,
    title: 'Any Destination',
    description: 'Plan trips to anywhere in the world — cities, beaches, mountains, cultural heritage sites.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  {
    icon: Shield,
    title: 'Private & Secure',
    description: 'Your trips are private. Row-level security ensures only you can see your itineraries.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
]

const TRAVEL_STYLES = [
  { emoji: '🏖️', name: 'Beach & Relaxed' },
  { emoji: '🏛️', name: 'Cultural' },
  { emoji: '🎒', name: 'Adventure' },
  { emoji: '💎', name: 'Luxury' },
  { emoji: '💰', name: 'Budget' },
  { emoji: '💑', name: 'Romantic' },
]

const STATS = [
  { value: 'AI-Powered', label: 'Itinerary Generation' },
  { value: '100+', label: 'Destinations Supported' },
  { value: '7 Styles', label: 'Travel Preferences' },
  { value: 'Instant', label: 'Day Regeneration' },
]

export default function LandingPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-surface-950 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-950/80 backdrop-blur-md border-b border-surface-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-surface-50">Wandr AI</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary text-sm py-2 px-4">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm py-2 px-4">
                  Sign In
                </Link>
                <Link to="/signup" className="btn-primary text-sm py-2 px-4">
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-600/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-900/30 rounded-full blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-300 text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            Powered by Groq AI · Ultra-fast generation
          </div>

          {/* Main heading */}
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold text-surface-50 mb-6 animate-slide-up leading-tight">
            Your Perfect Trip,{' '}
            <span className="gradient-text">
              Planned by AI
            </span>
          </h1>

          <p className="text-xl text-surface-400 max-w-2xl mx-auto mb-10 animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
            Tell us where you want to go, your budget, and travel style.
            Get a complete day-by-day itinerary with activities, restaurants,
            accommodation, and transportation — instantly.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link to={isAuthenticated ? "/trips/new" : "/signup"} className="btn-primary text-lg py-4 px-8 shadow-glow">
              <Sparkles className="w-5 h-5" />
              Plan My Trip Now
            </Link>
            <Link to={isAuthenticated ? "/dashboard" : "/login"} className="btn-secondary text-lg py-4 px-8">
              {isAuthenticated ? 'View My Trips' : 'Sign In'}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
            {STATS.map((stat) => (
              <div key={stat.label} className="glass-card p-4 text-center">
                <div className="font-display font-bold text-xl text-primary-300 mb-1">{stat.value}</div>
                <div className="text-xs text-surface-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Travel Styles */}
      <section className="py-16 bg-surface-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-surface-50 mb-3">
              Any Travel Style, Any Budget
            </h2>
            <p className="text-surface-400">From backpacking to luxury, we plan it perfectly.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {TRAVEL_STYLES.map((style) => (
              <div key={style.name} className="glass-card-hover px-6 py-3 flex items-center gap-3 cursor-pointer">
                <span className="text-2xl">{style.emoji}</span>
                <span className="text-surface-200 font-medium">{style.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl font-bold text-surface-50 mb-4">
            Everything You Need to{' '}
            <span className="gradient-text">Travel Smarter</span>
          </h2>
          <p className="text-surface-400 text-lg max-w-2xl mx-auto">
            A complete travel planning platform powered by advanced AI,
            built for modern explorers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div key={feature.title} className={`glass-card-hover p-6 border ${feature.border}`}>
              <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="font-display font-semibold text-lg text-surface-50 mb-2">{feature.title}</h3>
              <p className="text-surface-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-surface-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-surface-50 mb-4">
              Plan Your Trip in 3 Steps
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: MapPin,
                title: 'Set Your Preferences',
                description: 'Enter destination, dates, budget, travel style, and interests. Our smart form adapts to your needs.',
              },
              {
                step: '02',
                icon: Brain,
                title: 'AI Generates Your Plan',
                description: 'Groq AI creates a complete day-by-day itinerary with activities, restaurants, and accommodation.',
              },
              {
                step: '03',
                icon: Star,
                title: 'Customize & Save',
                description: 'Edit any day, regenerate sections, track your budget, and save your perfect trip.',
              },
            ].map((step) => (
              <div key={step.step} className="text-center">
                <div className="relative inline-flex mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center shadow-glow">
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-surface-800 border border-surface-600 text-xs font-bold text-primary-400 flex items-center justify-center">
                    {step.step}
                  </span>
                </div>
                <h3 className="font-display font-semibold text-xl text-surface-50 mb-3">{step.title}</h3>
                <p className="text-surface-400 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 to-accent-600/10 pointer-events-none" />
          <div className="relative">
            <h2 className="font-display text-4xl font-bold text-surface-50 mb-4">
              Ready to Plan Your{' '}
              <span className="gradient-text">Dream Trip?</span>
            </h2>
            <p className="text-surface-400 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of travelers who plan smarter with AI.
              Free to start, no credit card required.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {['No credit card', 'Instant generation', 'Edit anytime', 'Secure & private'].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 text-surface-400 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  {benefit}
                </div>
              ))}
            </div>
            <Link to={isAuthenticated ? "/trips/new" : "/signup"} className="btn-primary text-lg py-4 px-10 shadow-glow inline-flex">
              <Sparkles className="w-5 h-5" />
              Start Planning Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <MapPin className="w-3 h-3 text-white" />
            </div>
            <span className="font-display font-bold text-surface-400">Wandr AI</span>
          </div>
          <p className="text-surface-600 text-sm">
            © 2024 Wandr AI · Personalized Travel Planning
          </p>
          <div className="flex items-center gap-1 text-surface-600 text-xs">
            <Clock className="w-3 h-3" />
            <span>AI estimates may vary</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
