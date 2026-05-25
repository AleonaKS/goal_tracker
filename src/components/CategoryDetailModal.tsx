import { useState, useMemo } from 'react'
import { X, ChevronDown, ChevronLeft, ChevronRight, Table2, BarChart3 } from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { CategoryAnalyticsTable } from './analytics'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

type ViewType = 'chart' | 'table'
type NumberFormat = 'full' | 'compact'

interface CategoryDetailModalProps {
  isOpen: boolean
  onClose: () => void
  initialCategory?: Category
}

export function CategoryDetailModal({ isOpen, onClose, initialCategory }: CategoryDetailModalProps) {
  const { categories, metrics, metricEntries } = useApiDataStore()
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(initialCategory || null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [view, setView] = useState<ViewType>('table')
  const [numberFormat, setNumberFormat] = useState<NumberFormat>(() => {
    return (localStorage.getItem('goaltracker_number_format') as NumberFormat) || 'full'
  })
  const [weekOffset, setWeekOffset] = useState<number | null>(null)

  const handleNumberFormat = (format: NumberFormat) => {
    setNumberFormat(format)
    localStorage.setItem('goaltracker_number_format', format)
  }

  const categoryMetrics = useMemo(() => {
    if (!selectedCategory) return []
    return metrics.filter(m => m.categoryId === selectedCategory.id)
  }, [metrics, selectedCategory])

  const categoryMetricIds = useMemo(() => {
    return categoryMetrics.map(m => m.id)
  }, [categoryMetrics])

  const categoryEntries = useMemo(() => {
    return metricEntries.filter(e => categoryMetricIds.includes(e.metricId))
  }, [metricEntries, categoryMetricIds])

  // Расчёт диапазона недели на основе смещения (null = всё время)
  const weekRange = useMemo(() => {
    if (weekOffset === null) return null
    const base = new Date()
    const start = startOfWeek(weekOffset >= 0 ? addWeeks(base, weekOffset) : subWeeks(base, Math.abs(weekOffset)), { locale: ru })
    const end = endOfWeek(start, { locale: ru })
    return { start, end }
  }, [weekOffset])

  // Фильтрация записей по выбранной неделе
  const filteredEntries = useMemo(() => {
    if (!weekRange) return categoryEntries
    return categoryEntries.filter(e => {
      const date = e.entryDate instanceof Date ? e.entryDate : new Date(e.entryDate)
      return date >= weekRange.start && date <= weekRange.end
    })
  }, [categoryEntries, weekRange])

  // Данные для столбчатой диаграммы - по дням недели
  const stackedBarData = useMemo(() => {
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    const data = dayNames.map((day, index) => {
      const dayData: Record<string, number | string> = { day }
      categoryMetrics.forEach(metric => {
        const metricEntriesForDay = filteredEntries.filter(e => {
          const entryDate = e.entryDate instanceof Date ? e.entryDate : new Date(e.entryDate)
          const dayOfWeek = entryDate.getDay()
          const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          return adjustedDay === index && e.metricId === metric.id
        })
        const total = metricEntriesForDay.reduce((sum, e) => sum + e.value, 0)
        dayData[metric.name] = total
      })
      return dayData
    })
    return data
  }, [categoryMetrics, filteredEntries])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-50 border-b p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">Детализация по категориям</h2>
            <div className="w-10" />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg text-left hover:border-gray-300 transition-colors"
            >
              {selectedCategory ? (
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: selectedCategory.color }}
                  >
                    {selectedCategory.name.charAt(0)}
                  </div>
                  <span className="font-medium text-gray-900">{selectedCategory.name}</span>
                </div>
              ) : (
                <span className="text-gray-500">Выберите категорию</span>
              )}
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category)
                      setShowDropdown(false)
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: category.color }}
                    >
                      {category.name.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900">{category.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* View Toggle */}
        {selectedCategory && (
          <div className="flex items-center gap-3 mx-6 mt-6">
            <div className="bg-gray-100 p-1 rounded-lg flex w-fit">
              {[
                { value: 'chart', label: 'График', icon: BarChart3 },
                { value: 'table', label: 'Таблица', icon: Table2 }
              ].map((v) => (
                <button
                  key={v.value}
                  onClick={() => setView(v.value as ViewType)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    view === v.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <v.icon className="w-4 h-4" />
                  {v.label}
                </button>
              ))}
            </div>
            {view === 'table' && (
              <div className="bg-gray-100 p-0.5 rounded-lg flex">
                <button
                  onClick={() => handleNumberFormat('full')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    numberFormat === 'full'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Полные значения"
                >
                  <span className="text-xs">▬</span> Значения
                </button>
                <button
                  onClick={() => handleNumberFormat('compact')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    numberFormat === 'compact'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Сокращённые значения (тысячи)"
                >
                  <span className="text-xs">≈</span> Сократить
                </button>
              </div>
            )}
          </div>
        )}

        {/* Week filter */}
        {selectedCategory && (
          <div className="flex items-center gap-2 mx-6 mt-3">
            <div className="bg-gray-100 p-0.5 rounded-lg flex">
              <button
                onClick={() => setWeekOffset(null)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  weekOffset === null
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                Всё время
              </button>
              <button
                onClick={() => setWeekOffset(weekOffset === null ? 0 : weekOffset)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  weekOffset !== null
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                Неделя
              </button>
            </div>
            {weekOffset !== null && weekRange && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWeekOffset(weekOffset - 1)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <span className="text-xs text-gray-600 font-medium min-w-[120px] text-center">
                  {format(weekRange.start, 'd MMM', { locale: ru })} — {format(weekRange.end, 'd MMM', { locale: ru })}
                </span>
                <button
                  onClick={() => setWeekOffset(weekOffset + 1)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedCategory ? (
            <>
              {view === 'chart' ? (
                // Stacked Bar Chart
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Активность по дням недели</h3>
                  {stackedBarData.length > 0 && categoryMetrics.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={stackedBarData}>
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => {
                          if (numberFormat === 'compact' && value >= 1000) {
                            const t = value / 1000
                            return [t >= 10 ? `${Math.round(t)}т` : `${t.toFixed(1)}т`]
                          }
                          return [value % 1 === 0 ? String(value) : value.toFixed(2)]
                        }} />
                        <Legend />
                        {categoryMetrics.map((metric) => (
                          <Bar
                            key={metric.id}
                            dataKey={metric.name}
                            stackId="a"
                            fill={metric.color}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                      <p>Нет данных для отображения</p>
                    </div>
                  )}
                </div>
              ) : (
                // Table View
                <CategoryAnalyticsTable
                  category={selectedCategory}
                  metrics={categoryMetrics}
                  entries={filteredEntries}
                  compact={numberFormat === 'compact'}
                />
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Выберите категорию для просмотра аналитики</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
