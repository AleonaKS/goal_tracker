import { useState, useEffect } from 'react'
import { Calendar, Flag, MoreHorizontal, Edit, Trash2, CheckCircle, Clock } from 'lucide-react'
import { SubtaskList } from './SubtaskList'
import { useApiDataStore } from '@/stores/apiDataStore'
import type { Task, Subtask } from '@/types'

interface TaskCardProps {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
  onToggleComplete?: (taskId: string, completed: boolean) => void
  showSubtasks?: boolean
}

const priorityColors = {
  1: 'bg-gray-100 text-gray-600',
  2: 'bg-blue-100 text-blue-600', 
  3: 'bg-yellow-100 text-yellow-600',
  4: 'bg-orange-100 text-orange-600',
  5: 'bg-red-100 text-red-600'
}

const priorityLabels = {
  1: 'Very Low',
  2: 'Low',
  3: 'Medium', 
  4: 'High',
  5: 'Critical'
}

export function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onToggleComplete,
  showSubtasks = true 
}: TaskCardProps) {
  const { subtasks, fetchSubtasks, updateTask } = useApiDataStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showSubtaskList, setShowSubtaskList] = useState(false)
  const [taskSubtasks, setTaskSubtasks] = useState<Subtask[]>([])

  useEffect(() => {
    if (showSubtasks && task.id) {
      fetchSubtasks(task.id)
    }
  }, [task.id, showSubtasks, fetchSubtasks])

  useEffect(() => {
    const filtered = subtasks.filter(s => s.taskId === task.id)
    setTaskSubtasks(filtered)
  }, [subtasks, task.id])

  const handleToggleComplete = async () => {
    const newCompleted = !task.completed
    await updateTask(task.id, { 
      completed: newCompleted,
      completedAt: newCompleted ? new Date() : undefined
    })
    onToggleComplete?.(task.id, newCompleted)
  }

  const handleSubtaskChange = () => {
    // Re-fetch subtasks when they change
    if (task.id) {
      fetchSubtasks(task.id)
    }
  }

  const completedSubtasks = taskSubtasks.filter(s => s.isCompleted).length
  const totalSubtasks = taskSubtasks.length
  const hasSubtasks = totalSubtasks > 0

  return (
    <div className={`bg-white rounded-lg border ${task.completed ? 'border-gray-200 opacity-75' : 'border-gray-300'} p-4 hover:shadow-md transition-all`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={handleToggleComplete}
          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            task.completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 hover:border-green-500'
          }`}
        >
          {task.completed && <CheckCircle className="w-3 h-3" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium text-gray-900 ${task.completed ? 'line-through' : ''}`}>
            {task.name}
          </h3>
          
          {task.description && (
            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
            {/* Priority */}
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
              <Flag className="w-3 h-3" />
              {priorityLabels[task.priority as keyof typeof priorityLabels]}
            </span>

            {/* Due date */}
            {task.dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}

            {/* Scheduled time */}
            {task.startTime && task.endTime && (
              <span className="flex items-center gap-1 text-blue-600">
                <Clock className="w-3 h-3" />
                {task.startTime} - {task.endTime}
                {task.duration && ` (${task.duration} мин)`}
              </span>
            )}

            {/* Subtask progress */}
            {hasSubtasks && (
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {completedSubtasks}/{totalSubtasks}
              </span>
            )}
          </div>
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
              <button
                onClick={() => {
                  onEdit?.(task)
                  setIsMenuOpen(false)
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => {
                  onDelete?.(task.id)
                  setIsMenuOpen(false)
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subtasks section */}
      {showSubtasks && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowSubtaskList(!showSubtaskList)}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            {showSubtaskList ? 'Hide' : 'Show'} subtasks {hasSubtasks && `(${completedSubtasks}/${totalSubtasks})`}
          </button>
          
          {showSubtaskList && (
            <SubtaskList
              taskId={task.id}
              subtasks={taskSubtasks}
              onSubtaskChange={handleSubtaskChange}
            />
          )}
        </div>
      )}
    </div>
  )
}
