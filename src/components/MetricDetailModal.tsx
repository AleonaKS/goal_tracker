import { useState, useMemo } from 'react'
import { X, ChevronLeft, ChevronRight, BarChart3, History, StickyNote, Settings, TrendingUp, Target, Flame, Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
import { Modal } from './Modal'
import { ProgressBar } from './ProgressBar'
import { ActivityHeatmap } from './ActivityHeatmap'
import type { Metric, MetricEntry } from '@/types'
import { cn, formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface MetricDetailModalProps {
  isOpen: boolean
  onClose: () => void
  metric: Metric
  entries: MetricEntry[]
  onAddEntry: () => void
  onEdit: () => void
}

type TabType = 'charts' | 'history' | 'notes'
type PeriodType = 'week' | 'month' | 'year' | 'full'

export function MetricDetailModal({ isOpen, onClose, metric, entries, onAddEntry, onEdit }: MetricDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('charts')
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Calculate statistics
  const stats = useMemo(() => {
    const totalValue = entries.reduce((sum, e) => sum + (e.isAddition ? e.value : -e.value), 0)
    const recordEntry = entries.reduce((max, e) => e.value > max.value ? e : max, entries[0] || { value: 0, entryDate: new Date() })
    const recordDays = entries.filter(e => e.value === recordEntry.value).length

    // Calculate streaks
    const sortedEntries = [...entries].sort((a, b) => {
      const aTime = a.entryDate instanceof Date ? a.entryDate.getTime() : new Date(a.entryDate).getTime()
      const bTime = b.entryDate instanceof Date ? b.entryDate.getTime() : new Date(b.entryDate).getTime()
      return bTime - aTime
    })

    let currentStreak = 0
    let maxStreak = 0
    let streakCount = 0
    let lastDate: Date | null = null

    for (const entry of sortedEntries) {
      const entryDate = entry.entryDate instanceof Date ? entry.entryDate : new Date(entry.entryDate)
      
      if (lastDate) {
        const diffDays = Math.floor((lastDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays <= 1) {
          streakCount++
        } else {
          maxStreak = Math.max(maxStreak, streakCount)
          streakCount = 1
        }
      } else {
        streakCount = 1
        currentStreak = 1
      }
      lastDate = entryDate
    }
    maxStreak = Math.max(maxStreak, streakCount)
    currentStreak = streakCount

    // Average interval
    const dates = sortedEntries.map(e => e.entryDate instanceof Date ? e.entryDate : new Date(e.entryDate))
    let totalInterval = 0
    for (let i = 1; i < dates.length; i++) {
      totalInterval += dates[i - 1].getTime() - dates[i].getTime()
    }
    const avgInterval = dates.length > 1 ? Math.round(totalInterval / (dates.length - 1) / (1000 * 60 * 60)) : 0

    return {
      totalValue,
      recordDays,
      avgInterval,
      currentStreak,
      maxStreak,
      recordEntry
    }
  }, [entries])

  // Progress calculation
  const progress = useMemo(() => {
    const startValue = metric.startValue || 0
    const targetValue = metric.targetValue || 100
    const currentValue = startValue + stats.totalValue
    const progressValue = Math.min(100, Math.max(0, ((currentValue - startValue) / (targetValue - startValue)) * 100))
    return {
      current: currentValue,
      target: targetValue,
      percent: Math.round(progressValue),
      remaining: Math.max(0, targetValue - currentValue)
    }
  }, [metric, stats])

  // Chart data
  const chartData = useMemo(() => {
    const filtered = entries.filter(e => {
      const entryDate = e.entryDate instanceof Date ? e.entryDate : new Date(e.entryDate)
      const now = new Date()
      switch (selectedPeriod) {
        case 'week':
          return entryDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        case 'month':
          return entryDate.getMonth() === currentDate.getMonth() && entryDate.getFullYear() === currentDate.getFullYear()
        case 'year':
          return entryDate.getFullYear() === currentDate.getFullYear()
        default:
          return true
      }
    })

    const grouped = new Map<string, number>()
    filtered.forEach(e => {
      const date = e.entryDate instanceof Date ? e.entryDate : new Date(e.entryDate)
      const key = `${date.getDate()}`
      grouped.set(key, (grouped.get(key) || 0) + e.value)
    })

    return Array.from(grouped.entries())
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([date, value]) => ({ date, value }))
  }, [entries, selectedPeriod, currentDate])

  // Calendar data
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startWeekday = firstDay.getDay()

    const days: Array<{ date: number; value: number; isMax: boolean } | null> = []
    
    // Empty cells before first day
    for (let i = 0; i < (startWeekday === 0 ? 6 : startWeekday - 1); i++) {
      days.push(null)
    }

    // Find max value for the month
    const monthEntries = entries.filter(e => {
      const d = e.entryDate instanceof Date ? e.entryDate : new Date(e.entryDate)
      return d.getMonth() === month && d.getFullYear() === year
    })
    const maxValue = monthEntries.length > 0 ? Math.max(...monthEntries.map(e => e.value)) : 0

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      const dayEntries = entries.filter(e => {
        const d = e.entryDate instanceof Date ? e.entryDate : new Date(e.entryDate)
        return d.getDate() === i && d.getMonth() === month && d.getFullYear() === year
      })
      const dayValue = dayEntries.reduce((sum, e) => sum + e.value, 0)
      days.push({
        date: i,
        value: dayValue,
        isMax: dayValue > 0 && dayValue === maxValue
      })
    }

    return days
  }, [entries, currentDate])

  // Heatmap data
  const heatmapData = useMemo(() => {
    const year = currentDate.getFullYear()
    const weeks: Array<Array<{ date: Date; value: number }>> = []
    let currentWeek: Array<{ date: Date; value: number }> = []

    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day)
        const entry = entries.find(e => {
          const d = e.entryDate instanceof Date ? e.entryDate : new Date(e.entryDate)
          return d.toDateString() === date.toDateString()
        })
        currentWeek.push({
          date,
          value: entry?.value || 0
        })
        if (currentWeek.length === 7) {
          weeks.push(currentWeek)
          currentWeek = []
        }
      }
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return weeks
  }, [entries, currentDate])

  const maxHeatmapValue = useMemo(() => {
    return Math.max(...heatmapData.flat().map(d => d.value), 1)
  }, [heatmapData])

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
  }

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" className="max-w-4xl h-[90vh] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold">{metric.name}</h2>
            <p className="text-sm text-gray-500">
              {progress.current.toFixed(1)} к цели {progress.target} {metric.customUnit || ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAddEntry} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            + Добавить запись
          </button>
          <button onClick={onEdit} className="p-2 hover:bg-gray-100 rounded-lg">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {[
          { id: 'charts', label: 'Диаграммы', icon: BarChart3 },
          { id: 'history', label: 'История', icon: History },
          { id: 'notes', label: 'Заметки', icon: StickyNote },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'charts' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Target className="w-4 h-4" />
                  <span className="text-sm">Общее число</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.totalValue.toFixed(0)} {metric.customUnit || ''}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <CalendarIcon className="w-4 h-4" />
                  <span className="text-sm">Рекордные дни</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.recordDays} дней
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Средний интервал</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.avgInterval} ч
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Flame className="w-4 h-4" />
                  <span className="text-sm">Текущая серия</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.currentStreak} дня
                </p>
              </div>
            </div>

            {/* Target Progress */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Целевой прогресс</h3>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-2xl font-bold">{progress.current.toFixed(0)} / {progress.target}</span>
                <span className="text-green-600 font-medium">{progress.percent}%</span>
              </div>
              <ProgressBar progress={progress.percent} color={metric.color} />
              <p className="text-sm text-gray-500 mt-2">
                Период сброса: {metric.resetPeriodicity || 'еженедельно'}, 
                нормальный прогресс: {Math.round(progress.percent * 0.8)}%, 
                опережение на {Math.max(0, progress.percent - 14)}%, 
                дней осталось в этом периоде: {Math.max(0, 7 - new Date().getDay())}
              </p>
            </div>

            {/* Period Selector */}
            <div className="flex items-center justify-between">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { id: 'week', label: 'Неделя' },
                  { id: 'month', label: 'Месяц' },
                  { id: 'year', label: 'Год' },
                  { id: 'full', label: 'Полный' },
                ].map(period => (
                  <button
                    key={period.id}
                    onClick={() => setSelectedPeriod(period.id as PeriodType)}
                    className={cn(
                      'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                      selectedPeriod === period.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigateMonth(-1)} className="p-1 hover:bg-gray-100 rounded">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium min-w-[140px] text-center">
                  1 {monthNames[currentDate.getMonth()].toLowerCase()}. {currentDate.getFullYear()} г. - {new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()} {monthNames[currentDate.getMonth()].toLowerCase()}. {currentDate.getFullYear()}г.
                </span>
                <button onClick={() => navigateMonth(1)} className="p-1 hover:bg-gray-100 rounded">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Bar Chart */}
            {chartData.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Активность</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill={metric.color} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-sm text-gray-500 mt-4">
                  <span>
                    в целом: <strong className="text-green-600">{stats.totalValue.toFixed(0)}</strong> ({entries.length} д) |
                  </span>
                  <span>
                    Среднее: <strong className="text-green-600">{(stats.totalValue / (entries.length || 1)).toFixed(2)}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Calendar */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{monthNames[currentDate.getMonth()].toLowerCase()} {currentDate.getFullYear()}</h3>
                <div className="flex gap-2">
                  <button onClick={() => navigateMonth(-1)} className="p-1 hover:bg-gray-100 rounded">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => navigateMonth(1)} className="p-1 hover:bg-gray-100 rounded">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center">
                {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(day => (
                  <div key={day} className="text-xs text-gray-500 py-2">{day}</div>
                ))}
                {calendarDays.map((day, i) => (
                  <div
                    key={i}
                    className={cn(
                      'aspect-square flex flex-col items-center justify-center rounded-full text-sm',
                      day?.value > 0 && 'bg-green-100',
                      day?.isMax && 'bg-green-500 text-white'
                    )}
                  >
                    {day && (
                      <>
                        <span className={cn(day.isMax && 'font-bold')}>{day.date}</span>
                        {day.value > 0 && (
                          <span className={cn('text-xs', day.isMax ? 'text-white' : 'text-green-600')}>
                            +{day.value}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Итого за месяц: <strong className="text-green-600 text-lg">{calendarDays.filter(d => d?.value > 0).reduce((sum, d) => sum + (d?.value || 0), 0)}</strong>
                </p>
                <button onClick={onAddEntry} className="flex items-center gap-1 text-green-600 hover:text-green-700">
                  Добавить запись <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Heatmap */}
            <ActivityHeatmap
              data={heatmapData.flat().map(day => ({ date: day.date, value: day.value }))}
              size="medium"
              showTitle={true}
              title="Activity Chart"
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">История записей</h3>
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

        {activeTab === 'notes' && (
          <div className="space-y-4"> 
            <p className="text-gray-500">Функция заметок в разработке</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
