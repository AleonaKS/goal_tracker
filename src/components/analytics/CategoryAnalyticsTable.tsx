import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { Category, Metric, MetricEntry } from '@/types'

interface CategoryAnalyticsTableProps {
  category: Category
  metrics: Metric[]
  entries: MetricEntry[]
  compact?: boolean
}

const dayNames = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
const fullDayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

function formatValue(n: number, compact: boolean): string {
  if (n === 0) return ''
  if (compact && n >= 1000) {
    const thousands = n / 1000
    return thousands >= 10 ? `${Math.round(thousands)}т` : `${thousands.toFixed(1)}т`
  }
  return n % 1 === 0 ? String(n) : n.toFixed(2)
}

export function CategoryAnalyticsTable({ category, metrics, entries, compact = false }: CategoryAnalyticsTableProps) {
  // Расчёт статистики
  const stats = useMemo(() => {
    let total = 0
    const dailyTotals = new Map<number, number>()

    entries.forEach(entry => {
      const entryDate = entry.entryDate instanceof Date
        ? entry.entryDate
        : new Date(entry.entryDate)
      const dayOfWeek = entryDate.getDay()
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1

      dailyTotals.set(adjustedDay, (dailyTotals.get(adjustedDay) || 0) + entry.value)
      total += entry.value
    })

    return {
      total,
      dailyTotals
    }
  }, [entries])

  const cellWidth = compact ? 'minmax(36px,1fr)' : 'minmax(56px,1fr)'
  const totalWidth = compact ? '44px' : '70px'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Metrics Table by Week Days */}
      <div className="px-4 pb-4">
        <div className="bg-gray-50 rounded-lg overflow-hidden">
          {/* Header Row */}
          <div className="grid gap-1 p-2 border-b border-gray-200" style={{
            gridTemplateColumns: `1fr repeat(7,${cellWidth}) ${totalWidth}`
          }}>
            <div className="text-xs text-gray-500 font-medium">Метрика</div>
            {dayNames.map((day, i) => (
              <div key={i} className="text-xs text-gray-500 font-medium text-center">
                {day}
              </div>
            ))}
            <div className="text-xs text-gray-500 font-medium text-center"></div>
          </div>

          {/* Metrics Rows */}
          {metrics.map(metric => {
            const metricEntries = entries.filter(e => e.metricId === metric.id)
            const dayValues = new Map<number, number>()

            metricEntries.forEach(entry => {
              const entryDate = entry.entryDate instanceof Date
                ? entry.entryDate
                : new Date(entry.entryDate)
              const dayOfWeek = entryDate.getDay()
              const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1
              dayValues.set(adjustedDay, (dayValues.get(adjustedDay) || 0) + entry.value)
            })

            const metricTotal = Array.from(dayValues.values()).reduce((a, b) => a + b, 0)

            return (
              <div
                key={metric.id}
                className="grid gap-1 p-2 border-b border-gray-100 last:border-0 hover:bg-white transition-colors items-center"
                style={{
                  gridTemplateColumns: `1fr repeat(7,${cellWidth}) ${totalWidth}`
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: metric.color }}
                  />
                  <span className="text-sm text-gray-700 truncate" title={metric.name}>
                    {metric.name}
                  </span>
                </div>
                {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                  const value = dayValues.get(dayIndex) || 0
                  const hasValue = value !== 0
                  const absValue = Math.abs(value)
                  const maxAbs = Math.max(...Array.from(dayValues.values()).map(Math.abs), 1)
                  const intensity = hasValue ? Math.max(0.2, absValue / maxAbs) : 0

                  return (
                    <div
                      key={dayIndex}
                      className={cn(
                        "flex items-center justify-center text-xs rounded-md h-8 mx-auto transition-all",
                        !hasValue && "text-gray-300 bg-gray-100",
                        hasValue && value > 0 && "font-semibold text-white shadow-sm",
                        hasValue && value < 0 && "font-medium text-gray-500"
                      )}
                      style={hasValue ? {
                        backgroundColor: value > 0
                          ? `${metric.color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`
                          : `rgba(107,114,128,0.15)`,
                        opacity: value > 0 ? 0.8 + (intensity * 0.2) : 1,
                        width: compact ? '36px' : '56px',
                      } : {
                        width: compact ? '36px' : '56px',
                      }}
                      title={`${fullDayNames[dayIndex]}: ${value}`}
                    >
                      {hasValue ? formatValue(value, compact) : ''}
                    </div>
                  )
                })}
                {/* Total column */}
                <div
                  className={cn("text-xs font-semibold text-center", compact ? '' : 'text-sm')}
                  style={{ color: metric.color }}
                >
                  {metricTotal !== 0 ? formatValue(metricTotal, compact) : ''}
                </div>
              </div>
            )
          })}

          {/* Total Row */}
          <div className="grid gap-1 p-2 bg-gray-100 border-t border-gray-200 items-center" style={{
            gridTemplateColumns: `1fr repeat(7,${cellWidth}) ${totalWidth}`
          }}>
            <div className="text-sm font-semibold text-gray-700">в целом</div>
            {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
              const value = stats.dailyTotals.get(dayIndex) || 0
              return (
                <div
                  key={dayIndex}
                  className={cn(
                    "text-sm text-center font-medium h-8 flex items-center justify-center",
                    value > 0 ? "text-gray-900" : value < 0 ? "text-red-500" : "text-gray-400"
                  )}
                >
                  {value !== 0 ? formatValue(value, compact) : ''}
                </div>
              )
            })}
            <div className="text-sm font-bold text-center text-gray-900">
              {stats.total !== 0 ? formatValue(stats.total, compact) : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
