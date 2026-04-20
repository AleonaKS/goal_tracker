import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Goal, GoalStatus } from '@/types'

interface HierarchicalGoalProps {
  goal: Goal
  level: number
  isExpanded: boolean
  onToggleExpand: (goalId: string) => void
  onEdit: (goal: Goal) => void
  onDelete: (goalId: string) => void
  onAddSubgoal: (parentGoalId: string) => void
  children?: React.ReactNode
}

function SortableGoalItem({ 
  goal, 
  level, 
  isExpanded, 
  onToggleExpand, 
  onEdit, 
  onDelete, 
  onAddSubgoal,
  children 
}: HierarchicalGoalProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getStatusIcon = (status: GoalStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'in_progress': return <Target className="w-4 h-4 text-blue-500" />
      case 'overdue': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'planned': return <Calendar className="w-4 h-4 text-gray-400" />
      case 'frozen': return <Clock className="w-4 h-4 text-yellow-500" />
      default: return <Target className="w-4 h-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 5) return 'border-red-500'
    if (priority >= 4) return 'border-orange-500'
    if (priority >= 3) return 'border-yellow-500'
    return 'border-gray-300'
  }

  return (
    <div style={style} className="w-full">
      <div
        ref={setNodeRef}
        className={cn(
          "group flex items-center gap-2 p-3 rounded-lg border-l-4 bg-white hover:bg-gray-50 transition-colors cursor-pointer",
          getPriorityColor(goal.priority)
        )}
        {...attributes}
        {...listeners}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand(goal.id)
          }}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          {children ? (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Status icon */}
        <div className="flex-shrink-0">
          {getStatusIcon(goal.status)}
        </div>

        {/* Goal info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate">{goal.name}</h3>
            <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
              {goal.progress}%
            </span>
          </div>
          {goal.description && (
            <p className="text-sm text-gray-600 truncate mt-1">{goal.description}</p>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-24">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddSubgoal(goal.id)
            }}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Add subgoal"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(goal)
            }}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(goal.id)
            }}
            className="p-1 hover:bg-red-100 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* Children */}
      {children && (
        <div
          className={cn(
            "ml-6 border-l-2 border-gray-200 pl-2 mt-2 space-y-2",
            !isExpanded && "hidden"
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface HierarchicalGoalsProps {
  goals: Goal[]
  onEdit: (goal: Goal) => void
  onDelete: (goalId: string) => void
  onAddSubgoal: (parentGoalId: string) => void
  onGoalUpdate?: (goalId: string, updates: Partial<Goal>) => void
}

export function HierarchicalGoals({
  goals,
  onEdit,
  onDelete,
  onAddSubgoal,
  onGoalUpdate
}: HierarchicalGoalsProps) {
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())

  // Build hierarchy tree
  const buildGoalTree = (goals: Goal[], parentId: string | null = null): Goal[] => {
    return goals
      .filter(goal => goal.parentGoalId === parentId)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(goal => ({
        ...goal,
        children: buildGoalTree(goals, goal.id)
      }))
  }

  const goalTree = buildGoalTree(goals)

  const toggleExpand = (goalId: string) => {
    setExpandedGoals(prev => {
      const newSet = new Set(prev)
      if (newSet.has(goalId)) {
        newSet.delete(goalId)
      } else {
        newSet.add(goalId)
      }
      return newSet
    })
  }

  const renderGoal = (goal: Goal & { children?: Goal[] }) => {
    const isExpanded = expandedGoals.has(goal.id)
    const hasChildren = goal.children && goal.children.length > 0

    return (
      <SortableGoalItem
        key={goal.id}
        goal={goal}
        level={goal.level}
        isExpanded={isExpanded}
        onToggleExpand={toggleExpand}
        onEdit={onEdit}
        onDelete={onDelete}
        onAddSubgoal={onAddSubgoal}
      >
        {hasChildren && goal.children?.map(child => renderGoal(child))}
      </SortableGoalItem>
    )
  }

  return (
    <div className="space-y-2">
      {goalTree.map(goal => renderGoal(goal))}
    </div>
  )
}
