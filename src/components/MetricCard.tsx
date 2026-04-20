import { useState } from 'react'
import { Plus, Minus, MoreVertical, Edit, Trash2, Target, TrendingUp, Flame, BarChart3 } from 'lucide-react'
import { ProgressBar } from './ProgressBar'
import { Modal, ConfirmModal } from './Modal'
import { MetricForm } from './forms/MetricForm'
import { MetricEntryModal } from './MetricEntryModal'
import { MetricAnalyticsModal } from './MetricAnalyticsModal'
import { useApiDataStore } from '@/stores/apiDataStore'
import { cn, formatDate, calculateProgress } from '@/lib/utils'
import { getPeriodicityLabel, getInputModeLabel, type MetricWithStats } from '@/hooks/useMetrics'

interface MetricCardProps {
  metric: MetricWithStats
  className?: string
}

export function MetricCard({ metric, className }: MetricCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [entryMode, setEntryMode] = useState<'add' | 'subtract'>('add')
  const deleteMetric = useApiDataStore((state) => state.deleteMetric)

  const [quickEntryLoading, setQuickEntryLoading] = useState(false)
  const createMetricEntry = useApiDataStore((state) => state.createMetricEntry)

  const handleQuickAction = async (e: React.MouseEvent, mode: 'add' | 'subtract') => {
    e.stopPropagation()
    
    // Check metric input mode - if 'fixed_step', auto-add/subtract step
    // If 'manual', open entry modal
    const inputMode = metric.inputMode || 'fixed_step'
    
    if (inputMode === 'manual') {
      // Manual mode - open entry modal
      setEntryMode(mode)
      setShowEntryModal(true)
    } else {
      // Fixed step mode - directly add/subtract step value
      const stepValue = metric.stepValue || 1
      const entryValue = mode === 'add' ? stepValue : -stepValue
      const currentTotal = metric.totalValue || metric.startValue || 0
      const finalValue = currentTotal + entryValue
      
      setQuickEntryLoading(true)
      try {
        await createMetricEntry({
          metricId: metric.id,
          entryDate: new Date(),
          value: entryValue,
          finalValue: finalValue,
          isAddition: mode === 'add',
          isOverachievement: finalValue > metric.targetValue,
          overachievementValue: Math.max(0, finalValue - metric.targetValue)
        })
      } catch (error) {
        console.error('Failed to create quick entry:', error)
      } finally {
        setQuickEntryLoading(false)
      }
    }
  }

  return (
    <>
      <div
        onClick={() => setShowAnalytics(true)}
        className={cn('card hover:shadow-md transition-shadow relative group text-left w-full cursor-pointer', className)}
      >
        {/* Color indicator */}
        <div
          className="absolute top-0 left-0 w-full h-1 rounded-t-xl"
          style={{ backgroundColor: metric.color }}
        />

        <div className="pt-2">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 truncate">{metric.name}</h3>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  metric.type === 'habit' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                )}>
                  {metric.type === 'habit' ? 'Привычка' : 'Счётчик'}
                </span>
              </div>
              {metric.description && (
                <p className="text-sm text-gray-500 mt-1">{metric.description}</p>
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

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Всего</p>
              <p className="text-lg font-semibold text-gray-900">{metric.totalValue}</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Серия</p>
              <p className="text-lg font-semibold text-gray-900 flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 text-orange-500" />
                {metric.currentStreak}
              </p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Рекорд</p>
              <p className="text-lg font-semibold text-gray-900">{metric.maxStreak}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Прогресс</span>
              <span className="font-medium text-gray-900">{metric.progress}%</span>
            </div>
            <ProgressBar progress={metric.progress} size="sm" showLabel={false} color={metric.color} />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{metric.totalValue} {metric.unitId || ''}</span>
              <span>{metric.targetValue} {metric.unitId || ''}</span>
            </div>
          </div>

          {/* Periodicity */}
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
            <TrendingUp className="w-3 h-3" />
            {getPeriodicityLabel(
              'periodicity' in metric ? metric.periodicity : undefined,
              'nDays' in metric ? metric.nDays : undefined,
              'weekdays' in metric ? metric.weekdays : undefined
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={(e) => handleQuickAction(e, 'subtract')}
              disabled={quickEntryLoading}
              className="flex-1 btn-secondary py-1.5 text-sm disabled:opacity-50"
            >
              {quickEntryLoading ? (
                <span className="animate-spin">⌛</span>
              ) : (
                <Minus className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={(e) => handleQuickAction(e, 'add')}
              disabled={quickEntryLoading}
              className="flex-1 btn-primary py-1.5 text-sm disabled:opacity-50"
            >
              {quickEntryLoading ? (
                <span className="animate-spin">⌛</span>
              ) : (
                <Plus className="w-4 h-4" />
              )}
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
        metricId={metric.id}
      />
    </>
  )
}
