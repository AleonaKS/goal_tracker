import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from './Modal'
import { TaskForm } from './forms/TaskForm'
import { useApiDataStore } from '@/stores/apiDataStore'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  task?: any
  goalId?: string
  stageId?: string
}

export function TaskModal({ isOpen, onClose, task, goalId, stageId }: TaskModalProps) {
  const navigate = useNavigate()
  const { updateTask } = useApiDataStore()
  const [isEditing, setIsEditing] = useState(false)

  const handleTaskClick = () => {
    if (task?.goalId) {
      navigate(`/goals/${task.goalId}`)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Редактировать задачу' : 'Создать задачу'}
    >
      {task && goalId && stageId && !isEditing ? (
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="font-medium text-gray-900">{task.name}</p>
            {task.description && (
              <p className="text-sm text-gray-600 mt-2">{task.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Статус: {task.completed ? '✅ Выполнено' : '⏳ Не выполнено'}
            </p>
            {task.dueDate && (
              <p className="text-sm text-gray-500">
                Срок: {new Date(task.dueDate).toLocaleDateString('ru-RU')}
              </p>
            )}
            {/* Time blocking info */}
            {(task.duration || task.startTime || task.endTime) && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700">⏱️ Время:</p>
                {task.duration && (
                  <p className="text-sm text-gray-600">Длительность: {task.duration} мин</p>
                )}
                {task.startTime && (
                  <p className="text-sm text-gray-600">Начало: {task.startTime}</p>
                )}
                {task.endTime && (
                  <p className="text-sm text-gray-600">Окончание: {task.endTime}</p>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/goals/${task.goalId}`)}
              className="btn-primary flex-1"
            >
              Перейти к цели
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary flex-1"
            >
              Редактировать
            </button>
          </div>
        </div>
      ) : (
        <TaskForm
          goalId={goalId || ''}
          stageId={stageId}
          initialData={task}
          onSubmit={() => {
            setIsEditing(false)
            onClose()
          }}
          onCancel={() => {
            setIsEditing(false)
            if (!task) onClose()
          }}
        />
      )}
    </Modal>
  )
}
