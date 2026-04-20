import { useState, useMemo } from 'react'
import { 
  Plus, Minus, FileText, Edit3, History, ChevronLeft, ChevronRight, 
  HelpCircle, ArrowUpRight, ArrowDownRight, Trash2, MoreVertical 
} from 'lucide-react'
import { Modal } from './Modal'
import { ActivityHeatmap } from './ActivityHeatmap'
import { QuickEntryForm } from './forms/QuickEntryForm'
import { MetricForm } from './forms/MetricForm'
import { useApiDataStore } from '@/stores/apiDataStore'
import { cn, formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { Metric, MetricEntry } from '@/types'

type PeriodType = 'week' | 'month' | 'year'
type ViewType = 'chart' | 'calendar' | 'history'

interface MetricAnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
  metric: Metric
  onEdit?: (metric: Metric) => void
  onDelete?: (metricId: string) => void
}

// Helper function to format number with spaces
const formatNumber = (num: number): string => {
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// Helper to get week day name
const getWeekDayName = (index: number): string => {
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  return days[index]
}

// Helper to get month name (genitive case for date ranges)
const getMonthNameGenitive = (monthIndex: number): string => {
  const months = ['янв.', 'февр.', 'марта', 'апр.', 'мая', 'июня', 'июля', 'авг.', 'сен.', 'окт.', 'нояб.', 'дек.']
  return months[monthIndex]
}

// Helper to get month name (nominative for titles)
const getMonthNameNominative = (monthIndex: number): string => {
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  return months[monthIndex]
}

// Helper to format date as short string (DD.MM.YYYY)
const formatDateShort = (date: Date): string => {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
}

export function MetricAnalyticsModal({ isOpen, onClose, metric, onEdit, onDelete }: MetricAnalyticsModalProps) {
  const { metricEntries, deleteMetric, categories, createMetricEntry } = useApiDataStore()
  const entries = metricEntries.filter(e => e.metricId === metric.id)
  const category = metric?.categoryId ? categories.find(c => c.id === metric.categoryId) : null
  
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [viewType, setViewType] = useState<ViewType>('chart')
  const [showMenu, setShowMenu] = useState(false)
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [entryMode, setEntryMode] = useState<'add' | 'subtract'>('add')

  // Calculate all statistics
  const stats = useMemo(() => {
    const totalValue = entries.reduce((sum, e) => sum + (e.isAddition !== false ? e.value : -e.value), 0)
    
    // Daily totals for record calculations
    const dailyTotals = new Map<string, number>()
    entries.forEach(e => {
      const dateStr = new Date(e.entryDate).toISOString().split('T')[0]
      dailyTotals.set(dateStr, (dailyTotals.get(dateStr) || 0) + e.value)
    })
    
    // Find max day value and record days count
    let maxDayValue = 0
    let recordDays = 0
    dailyTotals.forEach((value) => {
      if (value > maxDayValue) {
        maxDayValue = value
        recordDays = 1
      } else if (value === maxDayValue && value > 0) {
        recordDays++
      }
    })

    // Average interval calculation
    const sortedDates = [...entries]
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())
      .map(e => new Date(e.entryDate))
    
    let totalInterval = 0
    let intervalCount = 0
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60)
      if (diff > 0) {
        totalInterval += diff
        intervalCount++
      }
    }
    const avgInterval = intervalCount > 0 ? Math.round(totalInterval / intervalCount) : 0

    // Streak calculation
    const uniqueDates = Array.from(dailyTotals.keys()).sort()
    let currentStreak = 0
    let maxStreak = 0
    let tempStreak = 0
    let lastDate: Date | null = null

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const dateStr = uniqueDates[i]
      if (lastDate) {
        const diffDays = Math.floor((new Date(dateStr).getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays <= 1) {
          tempStreak++
        } else {
          maxStreak = Math.max(maxStreak, tempStreak)
          tempStreak = 1
        }
      } else {
        tempStreak = 1
      }
      lastDate = new Date(dateStr)
    }
    maxStreak = Math.max(maxStreak, tempStreak)
    
    // Check if streak is current (last entry was today or yesterday)
    if (uniqueDates.length > 0) {
      const lastEntryDate = uniqueDates[uniqueDates.length - 1]
      if (lastEntryDate === today || lastEntryDate === yesterday) {
        currentStreak = tempStreak
      } else {
        currentStreak = 0
      }
    }

    return {
      totalValue,
      recordDays,
      maxDayValue,
      avgInterval,
      currentStreak,
      maxStreak,
      totalEntries: entries.length
    }
  }, [entries])

  // Calculate progress
  const progress = useMemo(() => {
    const current = stats.totalValue + (metric.startValue || 0)
    const target = metric.targetValue || 100
    const percent = Math.min(Math.round((current / target) * 100), 999)
    const remaining = Math.max(0, target - current)
    
    // Calculate expected progress based on reset periodicity
    const now = new Date()
    let daysInPeriod = 7 // default weekly
    let daysElapsed = now.getDay() || 7
    
    if (metric.resetPeriodicity === 'monthly') {
      daysInPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      daysElapsed = now.getDate()
    } else if (metric.resetPeriodicity === 'yearly') {
      daysInPeriod = 365
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      daysElapsed = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
    }
    
    const expectedProgress = Math.round((daysElapsed / daysInPeriod) * 100)
    const aheadBy = Math.max(0, percent - expectedProgress)
    const daysRemaining = Math.max(0, daysInPeriod - daysElapsed)
    
    // Calculate period start and end dates
    let startDate = new Date()
    let endDate = new Date()
    
    if (metric.resetPeriodicity === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    } else if (metric.resetPeriodicity === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now.getFullYear(), 11, 31)
    } else {
      // Weekly (default)
      const dayOfWeek = now.getDay() || 7
      startDate = new Date(now)
      startDate.setDate(now.getDate() - dayOfWeek + 1)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
    }
    
    return { 
      current, 
      target, 
      percent, 
      remaining, 
      expectedProgress, 
      aheadBy, 
      daysRemaining,
      daysInPeriod,
      daysElapsed,
      startDate,
      endDate
    }
  }, [stats, metric])

  // Get date range for chart
  const getDateRange = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    switch (selectedPeriod) {
      case 'week': {
        // Get week view (current week)
        const dayOfWeek = currentDate.getDay() || 7
        const start = new Date(currentDate)
        start.setDate(currentDate.getDate() - dayOfWeek + 1)
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        return { start, end }
      }
      case 'month': {
        const start = new Date(year, month, 1, 0, 0, 0, 0)
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
        return { start, end }
      }
      case 'year': {
        const start = new Date(year, 0, 1, 0, 0, 0, 0)
        const end = new Date(year, 11, 31, 23, 59, 59, 999)
        return { start, end }
      }
      default: {
        const start = new Date(year, month, 1)
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
        return { start, end }
      }
    }
  }

  const { start: periodStart, end: periodEnd } = getDateRange()

  // Chart data generation
  const chartData = useMemo(() => {
    const dailyTotals = new Map<string, number>()
    entries.forEach(e => {
      const dateStr = new Date(e.entryDate).toISOString().split('T')[0]
      dailyTotals.set(dateStr, (dailyTotals.get(dateStr) || 0) + e.value)
    })

    if (selectedPeriod === 'week') {
      // Week view: day by day for current week
      const data = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(periodStart)
        date.setDate(periodStart.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        const value = dailyTotals.get(dateStr) || 0
        data.push({
          label: getWeekDayName(i),
          value,
          date: dateStr
        })
      }
      return data
    } else if (selectedPeriod === 'month') {
      // Month view: day by day with proper labels
      const data = []
      for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        const value = dailyTotals.get(dateStr) || 0
        data.push({
          label: `${d.getDate()}`,
          value,
          date: dateStr,
          sortKey: d.getTime()
        })
      }
      // Sort chronologically
      return data.sort((a, b) => a.sortKey - b.sortKey)
    } else {
      // Year view: aggregate by month
      const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
      const data = []
      const year = periodStart.getFullYear()
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(year, month, 1)
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
        let monthTotal = 0
        for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]
          monthTotal += dailyTotals.get(dateStr) || 0
        }
        data.push({
          label: monthNames[month],
          value: monthTotal,
          date: `${year}-${String(month + 1).padStart(2, '0')}`,
          sortKey: month
        })
      }
      // Sort chronologically
      return data.sort((a, b) => a.sortKey - b.sortKey)
    }
  }, [entries, periodStart, periodEnd, selectedPeriod])

  // Calculate chart statistics
  const chartStats = useMemo(() => {
    const values = chartData.map(d => d.value)
    const total = values.reduce((sum, v) => sum + v, 0)
    const activeDays = values.filter(v => v > 0).length
    const average = activeDays > 0 ? (total / activeDays).toFixed(2).replace('.', ',') : '0'
    
    // Calculate trend (compare with previous period)
    const { start: prevStart, end: prevEnd } = getPreviousPeriodRange()
    const prevDailyTotals = new Map<string, number>()
    entries.forEach(e => {
      const entryDate = new Date(e.entryDate)
      if (entryDate >= prevStart && entryDate <= prevEnd) {
        const dateStr = entryDate.toISOString().split('T')[0]
        prevDailyTotals.set(dateStr, (prevDailyTotals.get(dateStr) || 0) + e.value)
      }
    })
    const prevTotal = Array.from(prevDailyTotals.values()).reduce((sum, v) => sum + v, 0)
    const prevActiveDays = Array.from(prevDailyTotals.values()).filter(v => v > 0).length
    const prevAverage = prevActiveDays > 0 ? prevTotal / prevActiveDays : 0
    const currentAvg = activeDays > 0 ? total / activeDays : 0
    
    let trendPercent = 0
    let trendDirection: 'up' | 'down' | 'neutral' = 'neutral'
    if (prevAverage > 0) {
      trendPercent = ((currentAvg - prevAverage) / prevAverage) * 100
      trendDirection = trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'neutral'
    }

    return { total, activeDays, average, trendPercent: Math.abs(trendPercent).toFixed(2).replace('.', ','), trendDirection }
  }, [chartData, entries, selectedPeriod, currentDate])

  // Helper to get previous period range for trend calculation
  function getPreviousPeriodRange() {
    const duration = periodEnd.getTime() - periodStart.getTime()
    const prevEnd = new Date(periodStart.getTime() - 1)
    const prevStart = new Date(prevEnd.getTime() - duration)
    return { start: prevStart, end: prevEnd }
  }

  // Calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startWeekday = firstDay.getDay() || 7 // 1=Monday, 7=Sunday

    const days: Array<{ date: number; value: number; hasEntry: boolean; isToday: boolean } | null> = []
    
    // Empty cells before first day (Monday start)
    for (let i = 1; i < startWeekday; i++) {
      days.push(null)
    }

    // Calculate daily values
    const dailyTotals = new Map<number, number>()
    entries.forEach(e => {
      const d = new Date(e.entryDate)
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate()
        dailyTotals.set(day, (dailyTotals.get(day) || 0) + e.value)
      }
    })

    const today = new Date()
    
    for (let i = 1; i <= daysInMonth; i++) {
      const value = dailyTotals.get(i) || 0
      days.push({
        date: i,
        value,
        hasEntry: value > 0,
        isToday: today.getDate() === i && today.getMonth() === month && today.getFullYear() === year
      })
    }

    // Calculate monthly stats
    const monthTotal = Array.from(dailyTotals.values()).reduce((sum, v) => sum + v, 0)
    const goalAchievedDays = Array.from(dailyTotals.values()).filter(v => v >= (metric.targetValue || 1)).length

    return { days, monthTotal, goalAchievedDays }
  }, [entries, currentDate, metric.targetValue])

  // Navigate periods
  const navigatePeriod = (direction: number) => {
    const newDate = new Date(currentDate)
    if (selectedPeriod === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7)
    } else if (selectedPeriod === 'month') {
      newDate.setMonth(newDate.getMonth() + direction)
    } else if (selectedPeriod === 'year') {
      newDate.setFullYear(newDate.getFullYear() + direction)
    }
    setCurrentDate(newDate)
  }

  // Format date range for display
  const formatDateRange = () => {
    if (selectedPeriod === 'week') {
      const end = new Date(periodStart)
      end.setDate(periodStart.getDate() + 6)
      return `${periodStart.getDate()} ${getMonthNameGenitive(periodStart.getMonth())}. ${periodStart.getFullYear()} г. - ${end.getDate()} ${getMonthNameGenitive(end.getMonth())}. ${end.getFullYear()} г.`
    } else if (selectedPeriod === 'month') {
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
      return `1 ${getMonthNameGenitive(currentDate.getMonth())}. ${currentDate.getFullYear()} г. - ${lastDay} ${getMonthNameGenitive(currentDate.getMonth())}. ${currentDate.getFullYear()}г.`
    } else if (selectedPeriod === 'year') {
      return `${currentDate.getFullYear()} г.`
    }
    return ''
  }

  // Handle add entry
  const handleAddEntry = () => {
    setEntryMode('add')
    setShowEntryModal(true)
  }

  const handleSubtractEntry = () => {
    setEntryMode('subtract')
    setShowEntryModal(true)
  }

  // Handle quick add/subtract with fixed value
  const handleQuickAdd = async () => {
    const stepValue = metric.stepValue || 1
    const entries = metricEntries.filter(e => e.metricId === metric.id)
    const currentTotal = entries.reduce((sum, e) => sum + (e.isAddition !== false ? e.value : -e.value), 0)
    const newTotal = currentTotal + stepValue
    
    await createMetricEntry({
      metricId: metric.id,
      value: stepValue,
      finalValue: newTotal,
      entryDate: new Date(),
      isAddition: true,
      note: 'Быстрое добавление'
    })
  }

  const handleQuickSubtract = async () => {
    const stepValue = metric.stepValue || 1
    const entries = metricEntries.filter(e => e.metricId === metric.id)
    const currentTotal = entries.reduce((sum, e) => sum + (e.isAddition !== false ? e.value : -e.value), 0)
    const newTotal = Math.max(0, currentTotal - stepValue)
    
    await createMetricEntry({
      metricId: metric.id,
      value: stepValue,
      finalValue: newTotal,
      entryDate: new Date(),
      isAddition: false,
      note: 'Быстрое уменьшение'
    })
  }

  // Top action buttons
  const actionButtons = [
    { id: 'plus', icon: Plus, label: `${metric.stepValue || 1}`, onClick: handleQuickAdd, color: 'text-blue-600' },
    { id: 'minus', icon: Minus, label: `${metric.stepValue || 1}`, onClick: handleQuickSubtract, color: 'text-gray-600' },
    { id: 'record', icon: FileText, label: 'Запись', onClick: () => setShowEntryModal(true), color: 'text-gray-600' },
    { id: 'editor', icon: Edit3, label: 'Редактировать', onClick: () => setShowEditModal(true), color: 'text-gray-600' },
    { id: 'history', icon: History, label: 'История', onClick: () => setViewType('history'), color: 'text-gray-600' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modern Light Header */}
        <div className="bg-gray-50 border-b p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center flex-1 px-4">
              <h2 className="text-lg font-semibold text-gray-900 truncate">{metric.name}</h2>
              {category && (
                <span className="text-xs text-gray-500">{category.name}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  if (confirm('Вы уверены, что хотите удалить эту метрику?')) {
                    onDelete ? onDelete(metric.id) : deleteMetric(metric.id)
                    onClose()
                  }
                }}
                className="p-2 hover:bg-red-100 rounded-lg transition-colors text-gray-600 hover:text-red-600"
                title="Удалить"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action Buttons Row - Modern Style */}
          <div className="flex justify-center gap-3 mt-4">
            {actionButtons.map(btn => (
              <button
                key={btn.id}
                onClick={btn.onClick}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                <btn.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50" style={{ maxHeight: 'calc(90vh - 140px)' }}>
        {/* Data Analysis Section - Compact */}
        <div className="bg-white rounded-xl p-3 mb-3 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Анализ данных</h3>
          
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <span>Общее число</span>
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </div>
              <span className="text-blue-600 font-semibold">
                {formatNumber(stats.totalValue)}{metric.customUnit || 'шт'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Рекордные дни</span>
              <span className="text-blue-600 font-semibold">{stats.recordDays} дня</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Средний интервал</span>
              <span className="text-blue-600 font-semibold">{stats.avgInterval} ч</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Текущая серия</span>
              <span className="text-blue-600 font-semibold">{stats.currentStreak} дней</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Самая длинная серия</span>
              <span className="text-blue-600 font-semibold">{stats.maxStreak} дней</span>
            </div>
          </div>
        </div>

        {/* Target Progress - Clean Design */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Целевой прогресс</h3>
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
              {progress.aheadBy > 0 ? `+${progress.aheadBy}%` : 'в плане'}
            </span>
          </div>
          
          {/* Progress Stats */}
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">
              {formatNumber(stats.totalValue + (metric.startValue || 0))} 
              <span className="text-gray-400"> / {formatNumber(metric.targetValue || 0)} {metric.customUnit || 'шт'}</span>
            </span>
            <span className="text-gray-900 font-bold">{progress.percent}%</span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all"
              style={{ width: `${Math.min(progress.percent, 100)}%` }}
            />
          </div>
          
          {/* Period Info */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatDateShort(progress.startDate)} — {formatDateShort(progress.endDate)}</span>
            <span>Осталось: {progress.daysRemaining} дн.</span>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Активность</h3>
            <button className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-xs">
              подробнее <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {entries.length > 0 ? (
            <ActivityHeatmap
              data={entries.map(e => ({
                date: new Date(e.entryDate),
                value: e.value
              }))}
              size="small"
              showTitle={false}
              className="bg-transparent"
            />
          ) : (
            <div className="h-24 flex items-center justify-center text-gray-400 text-sm">
              <p>Нет данных для отображения</p>
            </div>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setViewType('chart')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              viewType === 'chart' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            )}
          >
            График
          </button>
          <button
            onClick={() => setViewType('calendar')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              viewType === 'calendar' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            )}
          >
            Календарь
          </button>
          <button
            onClick={() => setViewType('history')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              viewType === 'history' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            )}
          >
            История
          </button>
        </div>

        {viewType === 'chart' ? (
          <>
            {/* Period Tabs */}
            <div className="bg-gray-100 rounded-lg p-1 mb-4">
              <div className="flex">
                {[
                  { id: 'week', label: 'Неделя' },
                  { id: 'month', label: 'Месяц' },
                  { id: 'year', label: 'Год' },
                ].map(period => (
                  <button
                    key={period.id}
                    onClick={() => setSelectedPeriod(period.id as PeriodType)}
                    className={cn(
                      'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
                      selectedPeriod === period.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <button 
                onClick={() => navigatePeriod(-1)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {formatDateRange()}
              </span>
              <button 
                onClick={() => navigatePeriod(1)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Bar Chart */}
            <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              {chartData.length > 0 ? (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <XAxis 
                          dataKey="label" 
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value: number) => [`${value} ${metric.customUnit || ''}`, 'Значение']}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="#3b82f6" 
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Chart Stats */}
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mt-4 pt-4 border-t">
                    <span>
                      в целом: <strong className="text-blue-600">{chartStats.total}</strong> ({chartStats.activeDays} d) |
                    </span>
                    <span className="flex items-center gap-1">
                      Среднее: <strong className="text-blue-600">{chartStats.average}</strong>
                      {chartStats.trendDirection === 'up' && (
                        <span className="text-green-600 flex items-center">
                          <ArrowUpRight className="w-4 h-4" />{chartStats.trendPercent}%
                        </span>
                      )}
                      {chartStats.trendDirection === 'down' && (
                        <span className="text-red-600 flex items-center">
                          <ArrowDownRight className="w-4 h-4" />{chartStats.trendPercent}%
                        </span>
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  <p>Нет данных для отображения</p>
                </div>
              )}
            </div>
          </>
        ) : viewType === 'calendar' ? (
          /* Calendar View */
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => navigatePeriod(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h3 className="text-lg font-semibold text-gray-900">
                {getMonthNameNominative(currentDate.getMonth())} {currentDate.getFullYear()}
              </h3>
              <button 
                onClick={() => navigatePeriod(1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(day => (
                <div key={day} className="text-center text-xs text-gray-400 font-medium py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarData.days.map((day, i) => (
                <div key={i} className="aspect-square flex flex-col items-center justify-center p-1">
                  {day ? (
                    <div className={cn(
                      'w-10 h-10 rounded-full flex flex-col items-center justify-center text-sm relative',
                      day.hasEntry ? 'bg-blue-100 text-blue-900' : 'text-gray-700',
                      day.isToday && 'ring-2 ring-blue-500'
                    )}>
                      <span className={cn(
                        'font-medium',
                        day.hasEntry && 'text-blue-900'
                      )}>{day.date}</span>
                    </div>
                  ) : (
                    <div className="w-10 h-10" />
                  )}
                  {day && day.value > 0 && (
                    <span className="text-xs text-blue-600 mt-1 font-medium">+{day.value}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Calendar Stats */}
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Цели достигнуты в этом месяце</span>
                <span className="text-blue-600 font-semibold">{calendarData.goalAchievedDays} дня</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">Итого за месяц:</span>
                <div className="flex items-center gap-4">
                  <span className="text-blue-600 font-bold text-lg">{calendarData.monthTotal}</span>
                  <button 
                    onClick={() => setShowEntryModal(true)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Добавить запись <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* History View */
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">История записей</h3>
            {entries.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Нет записей</p>
            ) : (
              <div className="space-y-2">
                {[...entries]
                  .sort((a, b) => {
                    const aTime = a.entryDate instanceof Date ? a.entryDate.getTime() : new Date(a.entryDate).getTime()
                    const bTime = b.entryDate instanceof Date ? b.entryDate.getTime() : new Date(b.entryDate).getTime()
                    return bTime - aTime
                  })
                  .map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">
                          {entry.isAddition ? '+' : '-'}{entry.value} {metric.customUnit || ''}
                        </p>
                        {entry.note && <p className="text-sm text-gray-500">{entry.note}</p>}
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatDate(entry.entryDate)}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Entry Modal - Quick Entry Form */}
      <QuickEntryForm
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        metric={metric}
        entries={entries}
        mode={entryMode}
        onSave={async (data) => {
          try {
            await createMetricEntry({
              metricId: metric.id,
              value: data.value,
              finalValue: data.finalValue,
              note: data.note,
              entryDate: data.entryDate,
              isAddition: data.isAddition
            })
            setShowEntryModal(false)
          } catch (err) {
            console.error('Failed to save entry:', err)
            alert('Ошибка при сохранении записи: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка'))
          }
        }}
      />

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Редактировать метрику"
        size="large"
      >
        <MetricForm
          initialData={metric}
          onSubmit={() => {
            setShowEditModal(false)
            onEdit?.(metric)
          }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
      </div>
    </div>
  )
}
