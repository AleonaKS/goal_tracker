import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { Category, Metric, MetricEntry } from '@/types'

interface CategoryAnalyticsTableProps {
  category: Category
  metrics: Metric[]
  entries: MetricEntry[]
}

const dayNames = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
const fullDayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

export function CategoryAnalyticsTable({ category, metrics, entries }: CategoryAnalyticsTableProps) {
  // Calculate statistics
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Metrics Table by Week Days */}
      <div className="px-4 pb-4">
        <div className="bg-gray-50 rounded-lg overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-[1fr_repeat(7,minmax(32px,1fr))_50px] gap-1 p-2 border-b border-gray-200">
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
            const maxDayValue = Math.max(...Array.from(dayValues.values()), 1)

            return (
              <div
                key={metric.id}
                className="grid grid-cols-[1fr_repeat(7,minmax(32px,1fr))_50px] gap-1 p-2 border-b border-gray-100 last:border-0 hover:bg-white transition-colors items-center"
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
                  const hasValue = value > 0
                  const intensity = hasValue ? Math.max(0.2, value / maxDayValue) : 0

                  return (
                    <div
                      key={dayIndex}
                      className={cn(
                        "flex items-center justify-center text-sm rounded-md h-8 w-8 mx-auto transition-all",
                        hasValue
                          ? "font-semibold text-white shadow-sm"
                          : "text-gray-300 bg-gray-100"
                      )}
                      style={{
                        backgroundColor: hasValue
                          ? `${metric.color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`
                          : undefined,
                        opacity: hasValue ? 0.8 + (intensity * 0.2) : 1
                      }}
                      title={`${fullDayNames[dayIndex]}: ${value}`}
                    >
                      {hasValue ? value : ''}
                    </div>
                  )
                })}
                {/* Total column */}
                <div
                  className="text-sm font-semibold text-center"
                  style={{ color: metric.color }}
                >
                  {metricTotal > 0 ? metricTotal : ''}
                </div>
              </div>
            )
          })}

          {/* Total Row */}
          <div className="grid grid-cols-[1fr_repeat(7,minmax(32px,1fr))_50px] gap-1 p-2 bg-gray-100 border-t border-gray-200 items-center">
            <div className="text-sm font-semibold text-gray-700">в целом</div>
            {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
              const value = stats.dailyTotals.get(dayIndex) || 0
              return (
                <div
                  key={dayIndex}
                  className={cn(
                    "text-sm text-center font-medium h-8 flex items-center justify-center",
                    value > 0 ? "text-gray-900" : "text-gray-400"
                  )}
                >
                  {value > 0 ? value : ''}
                </div>
              )
            })}
            <div className="text-sm font-bold text-center text-gray-900">
              {Math.round(stats.total)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
