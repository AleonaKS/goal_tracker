import { useState } from 'react'
import { Edit, Trash2, Target, Plus, BarChart3, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { Modal, ConfirmModal } from './Modal'
import { EditModal } from './EditModal'
import { MetricEntryModal } from './MetricEntryModal'
import { MetricAnalyticsModal } from './MetricAnalyticsModal'
import { TaskForm } from './forms/TaskForm'
import { MetricForm } from './forms/MetricForm'
import { useApiDataStore } from '@/stores/apiDataStore'
import { ProgressBar } from './ProgressBar'
import { StatusBadge, PriorityBadge } from './StatusBadge'
import { cn, formatDate } from '@/lib/utils'
import type { Goal, Task, Metric, Category } from '@/types'

interface UniversalDetailModalProps {
  isOpen: boolean
  onClose: () => void
  entity: Goal | Task | Metric
  entityType: 'goal' | 'task' | 'metric'
  category?: Category
}

export function UniversalDetailModal({ isOpen, onClose, entity, entityType, category }: UniversalDetailModalProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showMetricModal, setShowMetricModal] = useState(false)
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)

  const { deleteGoal, deleteTask, deleteMetric, createTask, createMetric } = useApiDataStore()

  const handleDelete = () => {
    switch (entityType) {
      case 'goal':
        deleteGoal(entity.id)
        break
      case 'task':
        deleteTask(entity.id)
        break
      case 'metric':
        deleteMetric(entity.id)
        break
    }
    onClose()
  }

  const handleCreateTask = () => {
    // TaskForm handles data internally via useForm and createTask
    setShowTaskModal(false)
  }

  const handleCreateMetric = () => {
    // MetricForm handles data internally via useForm and createMetric
    setShowMetricModal(false)
  }

  const renderGoalContent = (goal: Goal) => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{goal.name}</h2>
          {category && (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-sm text-gray-600">{category.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={goal.status} />
          <PriorityBadge priority={goal.priority} />
        </div>
      </div>

      {/* Description */}
      {goal.description && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
          <p className="text-gray-600">{goal.description}</p>
        </div>
      )}

      {/* Progress */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Progress</h3>
        <ProgressBar progress={goal.progress} size="lg" />
        <div className="flex justify-between text-sm text-gray-500 mt-2">
          <span>{goal.progress}% Complete</span>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        {goal.startDate && (
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Start Date</h4>
            <p className="text-gray-600">{formatDate(goal.startDate)}</p>
          </div>
        )}
        {goal.dueDate && (
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Due Date</h4>
            <p className="text-gray-600">{formatDate(goal.dueDate)}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={() => setShowTaskModal(true)}
          className="flex-1 flex items-center justify-center gap-2 p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
        <button
          onClick={() => setShowMetricModal(true)}
          className="flex-1 flex items-center justify-center gap-2 p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
        >
          <Target className="w-4 h-4" />
          Add Metric
        </button>
      </div>
    </div>
  )

  const renderTaskContent = (task: Task) => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{task.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority} />
          {task.completed && (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">Completed</span>
          )}
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
          <p className="text-gray-600">{task.description}</p>
        </div>
      )}

      {/* Progress */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Progress</h3>
        <ProgressBar progress={task.progress} size="lg" />
        <div className="flex justify-between text-sm text-gray-500 mt-2">
          <span>{task.progress}% Complete</span>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        {task.startDate && (
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Start Date</h4>
            <p className="text-gray-600">{formatDate(task.startDate)}</p>
          </div>
        )}
        {task.dueDate && (
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Due Date</h4>
            <p className="text-gray-600">{formatDate(task.dueDate)}</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderMetricContent = (metric: Metric) => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{metric.name}</h2>
          {metric.description && (
            <p className="text-sm text-gray-600">{metric.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'px-2 py-1 rounded-full text-sm',
            metric.type === 'habit' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
          )}>
            {metric.type === 'habit' ? 'Habit' : 'Counter'}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Progress</h3>
        <ProgressBar progress={metric.progress || 0} size="lg" color={metric.color} />
        <div className="flex justify-between text-sm text-gray-500 mt-2">
          <span>{metric.totalValue || 0} of {metric.targetValue}</span>
          <span>{metric.progress || 0}%</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="text-lg font-semibold text-gray-900">{metric.totalEntries || 0}</div>
          <div className="text-xs text-gray-500">Entries</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="text-lg font-semibold text-gray-900">{metric.currentStreak || 0}</div>
          <div className="text-xs text-gray-500">Streak</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="text-lg font-semibold text-gray-900">{metric.recordValue || 0}</div>
          <div className="text-xs text-gray-500">Record</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setShowEntryModal(true)
            onClose()
          }}
          className="flex-1 flex items-center justify-center gap-2 p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
        <button
          onClick={() => {
            setShowAnalytics(true)
            onClose()
          }}
          className="flex-1 flex items-center justify-center gap-2 p-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </button>
      </div>
    </div>
  )

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title=""
        size="large"
      >
        <div className="relative">
          {/* Action Buttons */}
          <div className="absolute top-0 right-0 flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Edit className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-5 h-5 text-red-600" />
            </button>
          </div>

          {/* Content */}
          <div className="pr-16">
            {entityType === 'goal' && renderGoalContent(entity as Goal)}
            {entityType === 'task' && renderTaskContent(entity as Task)}
            {entityType === 'metric' && renderMetricContent(entity as Metric)}
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <EditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        entity={entity}
        entityType={entityType}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={`Delete ${entityType}?`}
        message={`Are you sure you want to delete this ${entityType}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Task Creation Modal */}
      {entityType === 'goal' && (
        <>
          <Modal
            isOpen={showTaskModal}
            onClose={() => setShowTaskModal(false)}
            title="Create Task"
            size="large"
          >
            <TaskForm
              goalId={entity.id}
              onSubmit={handleCreateTask}
              onCancel={() => setShowTaskModal(false)}
            />
          </Modal>

          <Modal
            isOpen={showMetricModal}
            onClose={() => setShowMetricModal(false)}
            title="Create Metric"
            size="large"
          >
            <MetricForm
              goalId={entity.id}
              onSubmit={handleCreateMetric}
              onCancel={() => setShowMetricModal(false)}
            />
          </Modal>
        </>
      )}

      {/* Metric Entry Modal */}
      {entityType === 'metric' && (
        <MetricEntryModal
          isOpen={showEntryModal}
          onClose={() => setShowEntryModal(false)}
          metric={entity as Metric}
          mode="quick"
        />
      )}

      {/* Analytics Modal */}
      {entityType === 'metric' && (
        <MetricAnalyticsModal
          isOpen={showAnalytics}
          onClose={() => setShowAnalytics(false)}
          metricId={entity.id}
        />
      )}
    </>
  )
}
