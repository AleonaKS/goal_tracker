import { useMemo, useState } from 'react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { ChevronLeft, ChevronRight, TrendingUp, Target, BarChart3, PieChart, Table2 } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import type { Category, Metric, MetricEntry } from '@/types'

interface CategoryAnalyticsProps {
  category: Category
  metrics: Metric[]
  entries: MetricEntry[]
}

// Названия дней
const dayNames = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
const fullDayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

type PeriodType = 'day' | 'week' | 'month' | 'year' | 'full'
type ViewType = 'chart' | 'pie' | 'table'

export function CategoryAnalytics({ category, metrics, entries }: CategoryAnalyticsProps) {
  const [period, setPeriod] = useState<PeriodType>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewType>('table')

  // Получение диапазона дат на основе периода
  const getDateRange = () => {
    const end = new Date(currentDate)
    const start = new Date(currentDate)
    
    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'week':
        const dayOfWeek = start.getDay()
        const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
        start.setDate(diff)
        start.setHours(0, 0, 0, 0)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      case 'month':
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(end.getMonth() + 1, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'year':
        start.setMonth(0, 1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(11, 31)
        end.setHours(23, 59, 59, 999)
        break
      case 'full':
        start.setFullYear(2000, 0, 1)
        end.setFullYear(2100, 11, 31)
        break
    }
    
    return { start, end }
  }

  const { start: periodStart, end: periodEnd } = getDateRange()

  // Фильтрация записей за текущий период
  const periodEntries = useMemo(() => {
    return entries.filter(entry => {
      const entryDate = entry.entryDate instanceof Date 
        ? entry.entryDate 
        : new Date(entry.entryDate)
      return entryDate >= periodStart && entryDate <= periodEnd
    })
  }, [entries, periodStart, periodEnd])

  // Расчёт статистики
  const stats = useMemo(() => {
    let total = 0
    let max = 0
    let min = Infinity
    const metricStats = new Map<string, { total: number; max: number; min: number; entries: number }>()

    // Инициализация статистики для каждой метрики
    metrics.forEach(m => metricStats.set(m.id, { total: 0, max: 0, min: Infinity, entries: 0 }))

    // Расчёт ежедневных итогов
    const dailyTotals = new Map<number, number>() // day of week (0-6) -> total

    periodEntries.forEach(entry => {
      const entryDate = entry.entryDate instanceof Date
        ? entry.entryDate
        : new Date(entry.entryDate)
      const dayOfWeek = entryDate.getDay()
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Make Monday = 0

      const metricStat = metricStats.get(entry.metricId)
      if (metricStat) {
        metricStat.total += entry.value
        metricStat.entries++
        metricStat.max = Math.max(metricStat.max, entry.value)
        metricStat.min = Math.min(metricStat.min, entry.value)
      }

      dailyTotals.set(adjustedDay, (dailyTotals.get(adjustedDay) || 0) + entry.value)

      total += entry.value
      max = Math.max(max, entry.value)
      min = Math.min(min, entry.value)
    })

    // Поиск названий метрик для максимума/минимума
    let maxMetricName = ''
    let minMetricName = ''
    let maxValue = 0
    let minValue = Infinity

    periodEntries.forEach(entry => {
      if (entry.value > maxValue) {
        maxValue = entry.value
        const metric = metrics.find(m => m.id === entry.metricId)
        maxMetricName = metric?.name || ''
      }
      if (entry.value < minValue && entry.value > 0) {
        minValue = entry.value
        const metric = metrics.find(m => m.id === entry.metricId)
        minMetricName = metric?.name || ''
      }
    })

    return {
      total,
      max,
      min: min === Infinity ? 0 : min,
      average: periodEntries.length > 0 ? total / periodEntries.length : 0,
      dailyTotals,
      metricStats,
      maxMetricName: maxMetricName.slice(0, 15) + (maxMetricName.length > 15 ? '...' : ''),
      minMetricName: minMetricName.slice(0, 15) + (minMetricName.length > 15 ? '...' : '')
    }
  }, [periodEntries, metrics])

  // Данные кольцевой диаграммы
  const pieChartData = useMemo(() => {
    return metrics.map(metric => {
      const metricEntries = periodEntries.filter(e => e.metricId === metric.id)
      const total = metricEntries.reduce((sum, e) => sum + e.value, 0)
      return {
        name: metric.name,
        value: total,
        color: metric.color
      }
    }).filter(d => d.value > 0)
  }, [metrics, periodEntries])

  // Функции навигации
  const navigatePrev = () => {
    const newDate = new Date(currentDate)
    switch (period) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1)
        break
      case 'week':
        newDate.setDate(newDate.getDate() - 7)
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1)
        break
      case 'year':
        newDate.setFullYear(newDate.getFullYear() - 1)
        break
    }
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    switch (period) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1)
        break
      case 'week':
        newDate.setDate(newDate.getDate() + 7)
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1)
        break
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + 1)
        break
    }
    setCurrentDate(newDate)
  }

  // Форматирование диапазона дат для отображения
  const formatDateRange = () => {
    switch (period) {
      case 'day':
        return currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
      case 'week':
        const weekEnd = new Date(periodEnd)
        return `${periodStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} - ${weekEnd.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`
      case 'month':
        return currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
      case 'year':
        return `${currentDate.getFullYear()} г.`
      case 'full':
        return 'Весь период'
      default:
        return ''
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${category.color}20` }}
          >
            <span className="text-xl">{category.icon}</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{category.name}</h3>
            <p className="text-sm text-gray-500">{metrics.length} метрик</p>
          </div>
        </div>

        {/* Period Tabs */}
        <div className="bg-gray-100 rounded-lg p-1 flex">
          {[
            { value: 'day', label: 'День' },
            { value: 'week', label: 'Чжоу' },
            { value: 'month', label: 'месяц' },
            { value: 'year', label: 'год' },
            { value: 'full', label: 'полный' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value as PeriodType)}
              className={cn(
                'flex-1 px-2 py-1.5 text-sm rounded-md transition-colors',
                period === p.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Navigation */}
        {period !== 'full' && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <button 
              onClick={navigatePrev}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm text-gray-700 font-medium min-w-[200px] text-center">
              {formatDateRange()}
            </span>
            <button 
              onClick={navigateNext}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        )}

        {/* View Toggle */}
        <div className="bg-gray-100 rounded-lg p-1 flex mt-3">
          {[
            { value: 'chart', label: 'Диаграмма', icon: BarChart3 },
            { value: 'pie', label: 'Круговая диаг.', icon: PieChart },
            { value: 'table', label: 'Таблица', icon: Table2 },
          ].map((v) => (
            <button
              key={v.value}
              onClick={() => setView(v.value as ViewType)}
              className={cn(
                'flex-1 px-2 py-1.5 text-sm rounded-md transition-colors flex items-center justify-center gap-1',
                view === v.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <v.icon className="w-4 h-4" />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">в целом</p>
          <p className="text-3xl font-bold text-gray-900">{Math.round(stats.total)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">средний</p>
          <p className="text-3xl font-bold text-gray-900">{stats.average.toFixed(2)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Максимум</p>
          <p className="text-2xl font-bold text-gray-900">{stats.max}</p>
          {stats.maxMetricName && (
            <p className="text-xs text-gray-500 truncate mt-1" title={stats.maxMetricName}>
              {stats.maxMetricName}
            </p>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Минимум</p>
          <p className="text-2xl font-bold text-gray-900">{stats.min}</p>
          {stats.minMetricName && (
            <p className="text-xs text-gray-500 truncate mt-1" title={stats.minMetricName}>
              {stats.minMetricName}
            </p>
          )}
        </div>
      </div>

      {/* Donut Chart */}
      {view === 'pie' && pieChartData.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
            const metricEntries = periodEntries.filter(e => e.metricId === metric.id)
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
