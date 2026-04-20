import React from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  closestCenter,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Goal } from '@/types'
import { HierarchicalGoals } from './HierarchicalGoals'

interface DragDropProviderProps {
  goals: Goal[]
  children: React.ReactNode
  onGoalReorder?: (activeId: string, overId: string) => void
  onGoalHierarchyChange?: (draggedId: string, newParentId: string | null) => void
}

export function DragDropProvider({
  goals,
  children,
  onGoalReorder,
  onGoalHierarchyChange
}: DragDropProviderProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [draggedGoal, setDraggedGoal] = React.useState<Goal | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    const goal = goals.find(g => g.id === event.active.id)
    setDraggedGoal(goal || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      setDraggedGoal(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // Find the goals
    const activeGoal = goals.find(g => g.id === activeId)
    const overGoal = goals.find(g => g.id === overId)

    if (!activeGoal || !overGoal) return

    // Check if we're changing hierarchy (dragging to different parent)
    if (activeGoal.parentGoalId !== overGoal.parentGoalId) {
      // Don't allow dragging a goal into its own descendant
      if (isDescendant(activeId, overId, goals)) {
        setActiveId(null)
        setDraggedGoal(null)
        return
      }

      // New parent is the over goal's parent
      const newParentId = overGoal.parentGoalId
      onGoalHierarchyChange?.(activeId, newParentId)
    } else if (activeGoal.parentGoalId === overGoal.parentGoalId) {
      // Same level - just reorder
      onGoalReorder?.(activeId, overId)
    }

    setActiveId(null)
    setDraggedGoal(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeGoal = goals.find(g => g.id === activeId)
    const overGoal = goals.find(g => g.id === overId)

    if (!activeGoal || !overGoal) return

    // Prevent dragging a parent into its own child
    if (isDescendant(activeId, overId, goals)) {
      event.over.id = overGoal.parentGoalId || 'root'
    }
  }

  // Check if goalA is a descendant of goalB
  const isDescendant = (goalAId: string, goalBId: string, allGoals: Goal[]): boolean => {
    const goalB = allGoals.find(g => g.id === goalBId)
    if (!goalB) return false

    // Find all children of goalB
    const children = allGoals.filter(g => g.parentGoalId === goalBId)
    
    // Check if goalA is in the children
    if (children.some(child => child.id === goalAId)) {
      return true
    }

    // Recursively check children
    for (const child of children) {
      if (isDescendant(goalAId, child.id, allGoals)) {
        return true
      }
    }

    return false
  }

  // Get all goal IDs for SortableContext
  const goalIds = goals.map(goal => goal.id)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <SortableContext items={goalIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>

      <DragOverlay>
        {draggedGoal ? (
          <div className="bg-white p-3 rounded-lg border-2 border-blue-500 shadow-lg opacity-90">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full" />
              <span className="font-medium">{draggedGoal.name}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
