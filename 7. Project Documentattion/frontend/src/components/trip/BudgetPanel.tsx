import { DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Info } from 'lucide-react'
import type { Trip } from '../../types'

interface BudgetPanelProps {
  trip: Trip
}

function BudgetBar({ label, amount, total, color }: {
  label: string
  amount: number | null | undefined
  total: number
  color: string
}) {
  if (amount == null) return null
  const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-surface-400">{label}</span>
        <span className="text-surface-300 font-medium">{amount.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function BudgetPanel({ trip }: BudgetPanelProps) {
  const budget = trip.budget_breakdown
  const currency = trip.currency

  if (!budget) {
    return (
      <div className="glass-card p-10 text-center">
        <Info className="w-10 h-10 text-surface-500 mx-auto mb-3" />
        <p className="text-surface-400 font-medium">Budget breakdown not available</p>
        <p className="text-surface-600 text-sm mt-1">
          Generate a trip to see the detailed budget analysis.
        </p>
      </div>
    )
  }

  const isOverBudget = budget.is_within_budget === false
  const utilization = budget.budget_utilization_percent ?? 0

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary card */}
      <div className={`glass-card p-6 border ${isOverBudget ? 'border-red-500/30' : 'border-emerald-500/30'}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-surface-400 text-sm">Budget Status</p>
            <div className="flex items-center gap-2 mt-1">
              {isOverBudget ? (
                <>
                  <TrendingUp className="w-5 h-5 text-red-400" />
                  <span className="font-display font-bold text-xl text-red-300">Over Budget</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="font-display font-bold text-xl text-emerald-300">Within Budget</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-surface-500">Estimated / Budget</p>
            <p className="text-sm font-semibold text-surface-200 mt-0.5">
              {currency} {(budget.estimated_total_cost ?? 0).toLocaleString()} / {budget.total_budget.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Main progress bar */}
        <div className="h-3 bg-surface-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${isOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, utilization)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1.5">
          <span className="text-surface-600">0</span>
          <span className={isOverBudget ? 'text-red-400' : 'text-emerald-400'}>
            {utilization.toFixed(0)}% used
          </span>
          <span className="text-surface-600">{currency} {budget.total_budget.toLocaleString()}</span>
        </div>

        {budget.missing_cost_estimates > 0 && (
          <div className="flex items-center gap-2 mt-3 text-xs text-yellow-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{budget.missing_cost_estimates} activities have no cost estimate — actual cost may be higher</span>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      <div className="glass-card p-6">
        <h3 className="font-display font-semibold text-surface-100 mb-5">Cost by Category</h3>
        <div className="space-y-4">
          <BudgetBar label={`Activities (${currency})`} amount={budget.activity_total} total={budget.total_budget} color="bg-primary-500" />
          <BudgetBar label={`Accommodation (${currency})`} amount={budget.accommodation_total} total={budget.total_budget} color="bg-accent-500" />
          <BudgetBar label={`Dining (${currency})`} amount={budget.dining_total} total={budget.total_budget} color="bg-orange-500" />
          <BudgetBar label={`Transportation (${currency})`} amount={budget.transportation_total} total={budget.total_budget} color="bg-blue-500" />
          <BudgetBar label={`Miscellaneous (${currency})`} amount={budget.miscellaneous_total} total={budget.total_budget} color="bg-surface-500" />
        </div>
      </div>

      {/* Day-by-day */}
      {budget.estimated_daily_costs.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-display font-semibold text-surface-100 mb-4">Daily Cost Breakdown</h3>
          <div className="space-y-3">
            {budget.estimated_daily_costs.map((day) => {
              const dayBudget = budget.total_budget / budget.estimated_daily_costs.length
              const over = day.estimated_cost != null && day.estimated_cost > dayBudget
              return (
                <div key={day.day_number} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-surface-300">{day.day_number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-surface-400 truncate">{day.title}</span>
                      <span className={`text-xs font-medium flex-shrink-0 ml-2 ${over ? 'text-red-400' : 'text-surface-300'}`}>
                        {day.estimated_cost != null
                          ? `${currency} ${day.estimated_cost.toLocaleString()}`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-primary-500'}`}
                        style={{
                          width: day.estimated_cost != null && dayBudget > 0
                            ? `${Math.min(100, (day.estimated_cost / dayBudget) * 100)}%`
                            : '0%'
                        }}
                      />
                    </div>
                    {day.missing_estimates > 0 && (
                      <p className="text-xs text-yellow-600 mt-0.5">{day.missing_estimates} estimate{day.missing_estimates > 1 ? 's' : ''} missing</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      {budget.notes.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-surface-200 text-sm mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-surface-400" /> Budget Notes
          </h3>
          <ul className="space-y-2">
            {budget.notes.map((note, i) => (
              <li key={i} className="text-xs text-surface-400 flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-surface-600 text-center">
        All cost estimates are AI-generated approximations and may differ significantly from actual prices.
        Verify costs locally before booking.
      </p>
    </div>
  )
}
