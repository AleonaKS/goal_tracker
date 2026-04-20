import { useMemo } from 'react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { isPast, isToday, isFuture } from 'date-fns'
import type { Task } from '@/types'

export interface TaskWithStatus extends Task {
  isOverdue: boolean
  isDueToday: boolean
  isUpcoming: boolean
  progress: number
}

export function useTasks(goalId?: string, stageId?: string) {
  const { tasks } = useApiDataStore()

  return useMemo(() => {
    let filtered = tasks

    if (goalId) {
      filtered = filtered.filter(t => t.goalId === goalId)
    }

    if (stageId) {
      filtered = filtered.filter(t => t.stageId === stageId)
    }

    return filtered.map((task): TaskWithStatus => {
      const isOverdue = task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate) && !task.completed
      const isDueToday = task.dueDate ? isToday(task.dueDate) : false
      const isUpcoming = task.dueDate ? isFuture(task.dueDate) : false
      const progress = task.completed ? 100 : task.progress

      return {
        ...task,
        isOverdue,
        isDueToday,
        isUpcoming,
        progress,
      }
    })
  }, [tasks, goalId, stageId])
}

export function useTaskDeadlines(limit?: number) {
  const { tasks } = useApiDataStore()

  return useMemo(() => {
    const withDueDates = tasks
      .filter(t => t.dueDate && !t.completed)
      .map(task => {
        return {
          ...task,
          isOverdue: task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate) ? true : false,
          isDueToday: task.dueDate ? isToday(task.dueDate) : false,
          progress: task.completed ? 100 : task.progress,
        }
      })
      .sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.getTime() - b.dueDate.getTime()
      })

    return limit ? withDueDates.slice(0, limit) : withDueDates
  }, [tasks, limit])
}

export function useRecentCompletedTasks(limit: number = 10) {
  const { tasks } = useApiDataStore()

  return useMemo(() => {
    return tasks
      .filter(t => t.completed)
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return b.dueDate.getTime() - a.dueDate.getTime()
      })
      .slice(0, limit)
  }, [tasks, limit])
}
