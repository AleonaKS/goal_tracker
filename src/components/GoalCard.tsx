import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, Edit, Trash2 } from 'lucide-react'
import { ProgressBar } from './ProgressBar'
import { StatusBadge, PriorityBadge } from './StatusBadge'
import { Modal, ConfirmModal } from './Modal'
import { GoalForm } from './forms/GoalForm'
import { useApiDataStore } from '@/stores/apiDataStore'
import { cn, formatDate } from '@/lib/utils'
import type { Category, Goal } from '@/types'

interface GoalCardProps {
  goal: Goal
  category?: Category
  className?: string
}

export function GoalCard({ goal, category, className }: GoalCardProps) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const { deleteGoal, tasks, stages, metrics, metricEntries } = useApiDataStore()

  // Расчёт прогресса - включая задачи через этапы или по метрике
  const { progress, completedTasks, totalTasks, calculatedStatus } = useMemo(() => {
    let progress = 0
    let completedTasks = 0
    let totalTasks = 0

    if (goal.progressCalculation === 'by_metric' && goal.progressMetricId) {
      // Расчёт прогресса по метрике
      const metric = metrics.find(m => m.id === goal.progressMetricId)
      if (metric) {
        const entries = metricEntries.filter(e => e.metricId === metric.id)
        const entriesSum = entries.reduce((sum, e) => sum + (e.isAddition !== false ? e.value : -e.value), 0)
        const currentValue = (metric.initialValue || 0) + entriesSum
        const targetValue = metric.targetValue || 100
        progress = targetValue > 0 ? Math.round((currentValue / targetValue) * 100) : 0
        // Ограничение прогресса до 100% для отображения
        progress = Math.min(progress, 100)
      }
    } else {
      // Расчёт прогресса по задачам
      const goalStageIds = stages.filter(s => s.goalId === goal.id).map(s => s.id)
      const goalTasks = tasks.filter(t =>
        t.goalId === goal.id || (t.stageId && goalStageIds.includes(t.stageId))
      )
      completedTasks = goalTasks.filter(t => t.completed).length
      totalTasks = goalTasks.length
      progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      // Ограничение прогресса до 100% для отображения
      progress = Math.min(progress, 100)
    }

    // Расчёт статуса на основе дедлайна
    let status = goal.status
    if (goal.deadlineValue && status !== 'completed') {
      const deadline = new Date(goal.deadlineValue)
      if (deadline < new Date()) {
        status = 'overdue'
      }
    }

    return { progress, completedTasks, totalTasks, calculatedStatus: status }
  }, [tasks, stages, metrics, metricEntries, goal])

  const progressText = goal.progressCalculation === 'by_tasks'
    ? `${completedTasks} из ${totalTasks} задач`
    : `${progress}%`
  
  const deadlineDate = goal.deadlineValue ? new Date(goal.deadlineValue) : null

  return (
    <>
      <div
        className={cn(
          'card hover:shadow-md transition-shadow cursor-pointer relative group',
          className
        )}
        onClick={() => navigate(`/goals/${goal.id}`)}
      >
        {/* Category indicator */}
        {category && (
          <div
            className="absolute top-0 left-0 w-full h-1 rounded-t-xl"
            style={{ backgroundColor: category.color }}
          />
        )}

        <div className="pt-2">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{goal.name}</h3>
              {category && (
                <p className="text-sm text-gray-500">{category.name}</p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
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

          {/* Deadline and progress */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {deadlineDate ? (
                  <span className={cn(
                    calculatedStatus === 'overdue' && 'text-red-600 font-medium'
                  )}>
                    До: {formatDate(deadlineDate)}
                  </span>
                ) : (
                  <span>Без срока</span>
                )}
              </div>
              <div className="text-sm font-medium text-gray-700">
                {progressText}
              </div>
            </div>
            
          </div>

          {/* Progress bar */}
          <ProgressBar
            progress={progress}
            size="sm"
            showLabel={false}
            color={category?.color}
          />

          {/* Footer */}
          <div className="flex items-center gap-2 mt-3">
            <StatusBadge status={calculatedStatus} />
            <PriorityBadge priority={goal.priority} />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Редактировать цель"
      >
        <GoalForm
          initialData={goal}
          onSubmit={() => setShowEditModal(false)}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => deleteGoal(goal.id)}
        title="Удалить цель?"
        message={`Вы уверены, что хотите удалить цель "${goal.name}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        variant="danger"
      />
    </>
  )
}
