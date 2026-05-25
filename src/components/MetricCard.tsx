import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Minus, MoreVertical, Edit, Trash2, Target, TrendingUp, Flame, BarChart3 } from 'lucide-react'
import { ProgressBar } from './ProgressBar'
import { Modal, ConfirmModal } from './Modal'
import { MetricForm } from './forms/MetricForm'
import { MetricEntryModal } from './MetricEntryModal'
import { MetricAnalyticsModal } from './MetricAnalyticsModal'
import { useApiDataStore } from '@/stores/apiDataStore'
import useGamificationActions from '@/hooks/useGamificationActions'
import { cn, formatDate, calculateProgress } from '@/lib/utils'
import { getPeriodicityLabel, getInputModeLabel, type MetricWithStats } from '@/hooks/useMetrics'

interface MetricCardProps {
  metric: MetricWithStats
  className?: string
}

export function MetricCard({ metric, className }: MetricCardProps) {
  // ОТЛАДКА: Логирование типа метрики для диагностики проблем отображения
  console.log(`[MetricCard] ${metric.name}: type="${metric.type}", id=${metric.id}`)

  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [entryMode, setEntryMode] = useState<'add' | 'subtract'>('add')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Оптимистичное состояние для немедленного UI отклика
  const [optimisticMetric, setOptimisticMetric] = useState<MetricWithStats | null>(null)

  const deleteMetric = useApiDataStore((state) => state.deleteMetric)

  const { createMetricEntry } = useGamificationActions()

  const displayMetric = optimisticMetric || metric

  const handleQuickAction = useCallback(async (e: React.MouseEvent, mode: 'add' | 'subtract') => {
    e.stopPropagation()

    const inputMode = metric.inputMode || 'fixed_step'

    if (inputMode === 'manual') {
      setEntryMode(mode)
      setShowEntryModal(true)
      return
    }

    const stepValue = metric.stepValue ?? 1
    const entryValue = mode === 'add' ? stepValue : -stepValue

    const previousTotal = displayMetric.totalValue || 0
    const previousPeriodValue = displayMetric.periodValue ?? previousTotal
    const prevIsPeriodBased = displayMetric.isPeriodBased ?? false

    const newTotal = previousTotal + entryValue
    const newPeriodValue = previousPeriodValue + entryValue
    const newProgress = metric.targetValue && metric.targetValue > 0
      ? Math.min(100, Math.max(0, ((prevIsPeriodBased ? newPeriodValue : newTotal) / metric.targetValue) * 100))
      : 0

    setOptimisticMetric({
      ...displayMetric,
      totalValue: newTotal,
      periodValue: newPeriodValue,
      progress: Math.round(newProgress)
    })

    setIsPending(true)
    setError(null)

    try {
      await createMetricEntry(metric.id, entryValue)
      // Успех: снимаем оптимистичное состояние
      setOptimisticMetric(null)
    } catch (err) {
      console.error('Failed to create quick entry:', err)
      // ОШИБКА: откатываем оптимистичное обновление
      setOptimisticMetric(null)
      setError('Не удалось сохранить запись')
      setTimeout(() => {
        setError(null)
      }, 3000)
    } finally {
      setIsPending(false)
    }
  }, [metric, displayMetric, createMetricEntry])

  return (
    <>
      <div
        onClick={() => setShowAnalytics(true)}
        className={cn('card hover:shadow-md transition-shadow relative group text-left w-full cursor-pointer', className)}
      >
        <div
          className="absolute top-0 left-0 w-full h-1 rounded-t-xl"
          style={{ backgroundColor: displayMetric.color }}
        />

        <div className="pt-2">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{displayMetric.name}</h3>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        displayMetric.type === 'habit' || displayMetric.type === 'simple_habit'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      )}>
                        {displayMetric.type === 'habit' || displayMetric.type === 'simple_habit' ? 'Привычка' : 'Счётчик'}
                      </span>
                    </div>
                    {displayMetric.description && (
                      <p className="text-sm text-gray-500 mt-1">{displayMetric.description}</p>
                    )}
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(!showMenu)
                    }}
                    className="p-1 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    role="button"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

          {/* Error message */}
          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          {/* Menu */}
          {showMenu && (
            <div
              className="absolute right-4 top-12 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowMenu(false)
                  setShowEditModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
              >
                <Edit className="w-4 h-4" />
                Редактировать
              </button>
              <button
                onClick={() => {
                  setShowMenu(false)
                  setShowDeleteModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
              >
                <Trash2 className="w-4 h-4" />
                Удалить
              </button>
            </div>
          )}

          {/* Stats grid - different for different types */}
          {displayMetric.type === 'simple_habit' ? (
            <div className="mb-4">
              {/* Week dots */}
              <div className="flex items-center justify-center gap-1.5 mb-2">
                {(() => {
                  const dots: React.ReactNode[] = []
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const toLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                  for (let i = 9; i >= 0; i--) {
                    const day = new Date(today)
                    day.setDate(today.getDate() - i)
                    const dayStr = toLocalDate(day)
                    const hasEntry = displayMetric.entries.some(e => {
                      const d = e.entryDate instanceof Date ? e.entryDate : new Date(e.entryDate)
                      return toLocalDate(d) === dayStr
                    })
                    const isToday = i === 0
                    dots.push(
                      <div
                        key={i}
                        className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all',
                          hasEntry
                            ? 'bg-green-500 text-white border-green-500'
                            : 'bg-white text-gray-400 border-gray-300',
                          isToday && 'ring-2 ring-offset-1 ring-green-500'
                        )}
                        title={day.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' })}
                      >
                        {day.getDate()}
                      </div>
                    )
                  }
                  return dots
                })()}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {displayMetric.currentStreak > 0
                    ? `🔥 Серия ${displayMetric.currentStreak} дн`
                    : 'Нет активности'}
                </span>
                <span className="text-gray-400">
                  Рекорд: {displayMetric.maxStreak} дн
                </span>
              </div>
            </div>
          ) : (
            // Сложная привычка и счётчик - показ детальной статистики как у счётчика
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className={cn(
                "text-center p-2 rounded-lg transition-colors",
                isPending ? "bg-yellow-50" : "bg-gray-50"
              )}>
                <p className="text-xs text-gray-500">
                  {displayMetric.isPeriodBased ? 'За период' : 'Всего'}
                </p>
                <p className={cn(
                  "text-lg font-semibold",
                  isPending ? "text-yellow-700" : "text-gray-900"
                )}>
                  {displayMetric.isPeriodBased ? displayMetric.periodValue : displayMetric.totalValue}
                  <span className="text-xs text-gray-400 ml-0.5">{metric.customUnit || ''}</span>
                  {isPending && <span className="ml-1 animate-pulse">⌛</span>}
                </p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Серия</p>
                <p className="text-lg font-semibold text-gray-900 flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  {displayMetric.currentStreak}
                </p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Рекорд</p>
                <p className="text-lg font-semibold text-gray-900">{displayMetric.maxStreak}</p>
              </div>
            </div>
          )}

          {/* Progress - only for complex habits and counters */}
          {displayMetric.type !== 'simple_habit' && (
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Прогресс</span>
                <span className={cn(
                  "font-medium",
                  isPending ? "text-yellow-600" : "text-gray-900"
                )}>
                  {displayMetric.progress}%
                </span>
              </div>
              <ProgressBar progress={displayMetric.progress} size="sm" showLabel={false} color={displayMetric.color} />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>
                  {displayMetric.isPeriodBased ? displayMetric.periodValue : displayMetric.totalValue} {displayMetric.unit || ''}
                  {displayMetric.isPeriodBased && <span className="text-gray-400 ml-1">(всего: {displayMetric.totalValue})</span>}
                </span>
                <span>{displayMetric.targetValue} {displayMetric.unit || ''}</span>
              </div>
              {displayMetric.isPeriodBased && (() => {
                const now = new Date()
                const period = displayMetric.resetPeriodicity
                const customDays = displayMetric.resetCustomDays
                let endDate: Date
                if (period === 'daily') {
                  endDate = new Date(now); endDate.setHours(23, 59, 59, 999)
                } else if (period === 'weekly' || period === 'weekdays') {
                  const dayOfWeek = now.getDay() || 7
                  endDate = new Date(now); endDate.setDate(now.getDate() + (7 - dayOfWeek))
                  endDate.setHours(23, 59, 59, 999)
                } else if (period === 'monthly') {
                  endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
                } else if (period === 'yearly') {
                  endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
                } else if (period === 'every_n_days' && customDays) {
                  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
                  const periodIndex = Math.floor(dayOfYear / customDays)
                  endDate = new Date(now.getFullYear(), 0, (periodIndex + 1) * customDays)
                } else {
                  endDate = new Date(now)
                }
                const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000))
                return daysLeft > 0 ? (
                  <div className="text-xs text-gray-400 mt-0.5">
                    Осталось: {daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}
                  </div>
                ) : null
              })()}
            </div>
          )}

          {displayMetric.isPeriodBased && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
              <TrendingUp className="w-3 h-3" />
              {getPeriodicityLabel(
                displayMetric.resetPeriodicity || (displayMetric.type === 'simple_habit' ? 'daily' : undefined),
                displayMetric.resetCustomDays,
                displayMetric.resetWeekdays
              )}
            </div>
          )}
 
          <div className="flex gap-2 mt-3">
            <button
              onClick={(e) => handleQuickAction(e, 'subtract')}
              disabled={isPending}
              className="flex-1 btn-secondary py-1.5 text-sm disabled:opacity-50"
            >
              {isPending ? (
                <span className="animate-spin">⌛</span>
              ) : (
                <Minus className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={(e) => handleQuickAction(e, 'add')}
              disabled={isPending}
              className="flex-1 btn-primary py-1.5 text-sm disabled:opacity-50"
            >
              {isPending ? (
                <span className="animate-spin">⌛</span>
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setShowEntryModal(true)}
              className="flex-1 btn-secondary py-1.5 text-sm"
            >
              Запись
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Редактировать метрику"
      >
        <MetricForm
          initialData={metric}
          onSubmit={() => setShowEditModal(false)}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      {/* Entry Modal */}
      <MetricEntryModal
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        metric={metric}
        mode={entryMode === 'add' ? 'quick' : 'manual'}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => deleteMetric(metric.id)}
        title="Удалить метрику?"
        message={`Вы уверены, что хотите удалить метрику "${metric.name}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        variant="danger"
      />

      {/* Analytics Modal */}
      <MetricAnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        metric={metric}
      />
    </>
  )
}
