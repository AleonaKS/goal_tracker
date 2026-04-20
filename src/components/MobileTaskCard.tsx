import { useState } from 'react'
import { MoreVertical, Calendar, CheckCircle, Clock, AlertCircle, Edit, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApiDataStore } from '@/stores/apiDataStore'
import { ProgressBar } from './ProgressBar'
import { StatusBadge, PriorityBadge } from './StatusBadge'
import { cn, formatDate } from '@/lib/utils'
import type { Task, Category } from '@/types'

interface MobileTaskCardProps {
  task: Task
  category?: Category
  className?: string
  onEdit?: (task: Task) => void
}

export function MobileTaskCard({ task, category, className, onEdit }: MobileTaskCardProps) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const { deleteTask } = useApiDataStore()

  const handleCardClick = () => {
    // Open task details modal
    console.log('Open task details:', task.id)
  }

  const getDueStatus = () => {
    if (!task.dueDate) return null
    const now = new Date()
    const due = new Date(task.dueDate)
    const isOverdue = due < now
    const isToday = due.toDateString() === now.toDateString()
    
    if (isOverdue) return 'overdue'
    if (isToday) return 'today'
    return 'upcoming'
  }

  const dueStatus = getDueStatus()

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-all duration-200 relative',
        className
      )}
    >
      {/* Category indicator */}
      {category && (
        <div
          className="absolute top-0 left-4 right-4 h-1 rounded-t-xl"
          style={{ backgroundColor: category.color }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">{task.name}</h3>
          {category && (
            <p className="text-sm text-gray-500">{category.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority} />
          {task.completed && (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Progress</span>
          <span className="text-sm font-medium text-gray-900">{task.progress}%</span>
        </div>
        <ProgressBar progress={task.progress} size="sm" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dueStatus && (
            <div className={cn(
              'flex items-center gap-1 text-xs px-2 py-1 rounded-full',
              dueStatus === 'overdue' && 'bg-red-100 text-red-700',
              dueStatus === 'today' && 'bg-yellow-100 text-yellow-700',
              dueStatus === 'upcoming' && 'bg-blue-100 text-blue-700'
            )}>
              {dueStatus === 'overdue' && <AlertCircle className="w-3 h-3" />}
              {dueStatus === 'today' && <Clock className="w-3 h-3" />}
              {dueStatus === 'upcoming' && <Calendar className="w-3 h-3" />}
              <span className="font-medium">
                {dueStatus === 'overdue' && 'Overdue'}
                {dueStatus === 'today' && 'Today'}
                {dueStatus === 'upcoming' && formatDate(task.dueDate!)}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute top-2 right-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10 min-w-[120px]">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.(task)
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
              if (window.confirm(`Delete task "${task.name}"?`)) {
                deleteTask(task.id)
              }
              setShowMenu(false)
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
