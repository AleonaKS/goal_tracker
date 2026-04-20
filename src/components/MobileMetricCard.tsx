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

interface MobileMetricCardProps {
  metric: MetricWithStats
  className?: string
}

export function MobileMetricCard({ metric, className }: MobileMetricCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [entryMode, setEntryMode] = useState<'add' | 'subtract'>('add')
  const deleteMetric = useApiDataStore((state) => state.deleteMetric)

  const handleQuickAction = (e: React.MouseEvent, mode: 'add' | 'subtract') => {
    e.stopPropagation()
    setEntryMode(mode)
    setShowEntryModal(true)
  }

  return (
    <>
      <div
        onClick={() => setShowAnalytics(true)}
        className={cn('bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow', className)}
      >
        {/* Header with color indicator */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: metric.color }}
              />
              <h3 className="font-semibold text-gray-900 text-lg">{metric.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-xs px-2 py-1 rounded-full font-medium',
                metric.type === 'habit' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              )}>
                {metric.type === 'habit' ? 'Habit' : 'Counter'}
              </span>
              {metric.customUnit && (
                <span className="text-xs text-gray-500">{metric.customUnit}</span>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm font-medium text-gray-900">{metric.progress}%</span>
          </div>
          <ProgressBar progress={metric.progress} size="sm" showLabel={false} color={metric.color} />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{metric.totalValue || 0}</span>
            <span>{metric.targetValue}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-gray-900">{metric.totalEntries || 0}</div>
            <div className="text-xs text-gray-500">Entries</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-gray-900">{metric.currentStreak || 0}</div>
            <div className="text-xs text-gray-500">Streak</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-gray-900">{metric.recordValue || 0}</div>
            <div className="text-xs text-gray-500">Record</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={(e) => handleQuickAction(e, 'subtract')}
            className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Minus className="w-4 h-4" />
            <span className="text-sm font-medium">-</span>
          </button>
          <button
            onClick={(e) => handleQuickAction(e, 'add')}
            className="flex-1 flex items-center justify-center gap-2 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">+</span>
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute top-2 right-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowEditModal(true)
              setShowMenu(false)
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteModal(true)
              setShowMenu(false)
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Metric"
        size="large"
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
        title="Delete Metric?"
        message={`Are you sure you want to delete "${metric.name}"? This action cannot be undone.`}
        confirmText="Delete"
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
