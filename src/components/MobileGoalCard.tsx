import { useState } from 'react'
import { MoreVertical, Calendar, Target, TrendingUp, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ProgressBar } from './ProgressBar'
import { StatusBadge, PriorityBadge } from './StatusBadge'
import { cn, formatDate } from '@/lib/utils'
import type { Goal, Category } from '@/types'

interface MobileGoalCardProps {
  goal: Goal
  category?: Category
  className?: string
}

export function MobileGoalCard({ goal, category, className }: MobileGoalCardProps) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  const handleCardClick = () => {
    navigate(`/goals/${goal.id}`)
  }

  const getProgressText = () => {
    if (goal.progressCalculation === 'by_tasks') {
      const completedTasks = goal.tasks?.filter(t => t.completed).length || 0
      const totalTasks = goal.tasks?.length || 0
      return `${completedTasks} of ${totalTasks} tasks`
    } else {
      return `${goal.progress || 0}%`
    }
  }

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
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-lg mb-1">{goal.name}</h3>
          {category && (
            <p className="text-sm text-gray-500">{category.name}</p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <MoreVertical className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Progress</span>
          <span className="text-sm font-medium text-gray-900">{goal.progress}%</span>
        </div>
        <ProgressBar progress={goal.progress} size="sm" showLabel={false} />
        <div className="text-xs text-gray-500 mt-1">{getProgressText()}</div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={goal.status} />
          <PriorityBadge priority={goal.priority} />
        </div>
        {goal.dueDate && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            {formatDate(goal.dueDate)}
          </div>
        )}
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute top-2 right-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10 min-w-[140px]">
          <button
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Add edit functionality
              setShowMenu(false)
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Add delete functionality
              setShowMenu(false)
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
