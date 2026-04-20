import { useMemo } from 'react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { getDeadlineDate, calculateProgress, calculateGoalStatus, calculateStreak, getMetricTotalValue, getMetricRecordDay, calculateWeightedProgress, calculateTaskProgress } from '@/lib/utils'
import type { Goal, GoalFilter, GoalSort, GoalStatus, MetricEntry } from '@/types'

export interface GoalWithProgress extends Goal {
  progress: number
  totalTasks: number
  completedTasks: number
  deadlineDate: Date | null
  calculatedStatus: GoalStatus
}

export function useGoals(filter?: GoalFilter, sort?: GoalSort) {
  const { goals, tasks, metrics, metricEntries, subtasks } = useApiDataStore()
  const { user } = useApiDataStore()

  const goalsWithProgress = useMemo(() => {
    return goals.map((goal): GoalWithProgress => {
      const goalTasks = tasks.filter(t => t.goalId === goal.id)
      const totalTasks = goalTasks.length
      const completedTasks = goalTasks.filter(t => t.completed).length

      let progress = 0
      if (goal.progressCalculation === 'by_tasks') {
        // Use weighted progress calculation
        const tasksWithSubtasks = goalTasks.map(task => {
          const taskSubtasks = subtasks.filter(st => st.taskId === task.id)
          const taskProgress = calculateTaskProgress({
            completed: task.completed,
            subtasks: taskSubtasks
          })
          
          return {
            completed: task.completed || taskProgress === 100,
            weight: task.weight
          }
        })
        
        progress = calculateWeightedProgress(tasksWithSubtasks)
      } else if (goal.progressCalculation === 'by_metric' && goal.progressMetricId) {
        const metric = metrics.find(m => m.id === goal.progressMetricId)
        if (metric) {
          const entries = metricEntries.filter(e => e.metricId === metric.id)
          const currentValue = getMetricTotalValue(entries)
          progress = calculateProgress(currentValue, metric.targetValue)
        }
      }

      const deadlineDate = user ? getDeadlineDate(goal.deadlineType, goal.deadlineValue, user.settings) : null
      const calculatedStatus = calculateGoalStatus(deadlineDate, progress)

      return {
        ...goal,
        progress,
        totalTasks,
        completedTasks,
        deadlineDate,
        calculatedStatus: goal.status === 'frozen' ? 'frozen' : calculatedStatus,
      }
    })
  }, [goals, tasks, metrics, metricEntries, subtasks, user])

  const filteredGoals = useMemo(() => {
    let result = goalsWithProgress

    if (filter) {
      if (filter.categoryId) {
        result = result.filter(g => g.categoryId === filter.categoryId)
      }
      if (filter.status) {
        result = result.filter(g => g.calculatedStatus === filter.status)
      }
      if (filter.priority) {
        result = result.filter(g => g.priority >= filter.priority)
      }
      if (filter.deadlineFrom) {
        result = result.filter(g => g.deadlineDate && g.deadlineDate >= filter.deadlineFrom!)
      }
      if (filter.deadlineTo) {
        result = result.filter(g => g.deadlineDate && g.deadlineDate <= filter.deadlineTo!)
      }
    }

    return result
  }, [goalsWithProgress, filter])

  const sortedGoals = useMemo(() => {
    if (!sort) return filteredGoals

    return [...filteredGoals].sort((a, b) => {
      let comparison = 0
      switch (sort.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'deadline':
          if (!a.deadlineDate && !b.deadlineDate) comparison = 0
          else if (!a.deadlineDate) comparison = 1
          else if (!b.deadlineDate) comparison = -1
          else comparison = a.deadlineDate.getTime() - b.deadlineDate.getTime()
          break
        case 'priority':
          comparison = b.priority - a.priority
          break
        case 'progress':
          comparison = b.progress - a.progress
          break
        case 'createdAt':
          comparison = b.createdAt.getTime() - a.createdAt.getTime()
          break
      }
      return sort.order === 'asc' ? comparison : -comparison
    })
  }, [filteredGoals, sort])

  const stats = useMemo(() => {
    return {
      total: goalsWithProgress.length,
      inProgress: goalsWithProgress.filter(g => g.calculatedStatus === 'in_progress').length,
      completed: goalsWithProgress.filter(g => g.calculatedStatus === 'completed').length,
      overdue: goalsWithProgress.filter(g => g.calculatedStatus === 'overdue').length,
      planned: goalsWithProgress.filter(g => g.calculatedStatus === 'planned').length,
    }
  }, [goalsWithProgress])

  return {
    goals: sortedGoals,
    allGoals: goalsWithProgress,
    stats,
  }
}

export function useGoal(goalId: string) {
  const { goals, stages, tasks, metrics, metricEntries, categories } = useApiDataStore()
  const { user } = useApiDataStore()

  return useMemo(() => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return null

    const goalStages = stages.filter(s => s.goalId === goalId)
    const goalTasks = tasks.filter(t => t.goalId === goalId && !t.stageId)
    const goalMetrics = metrics.filter(m => m.goalId === goalId)
    const category = categories.find(c => c.id === goal.categoryId)

    const totalTasks = tasks.filter(t => t.goalId === goalId).length
    const completedTasks = tasks.filter(t => t.goalId === goalId && t.completed).length

    let progress = 0
    let currentMetricValue = 0
    let targetMetricValue = 0

    if (goal.progressCalculation === 'by_tasks') {
      progress = totalTasks > 0 ? calculateProgress(completedTasks, totalTasks) : 0
    } else if (goal.progressCalculation === 'by_metric' && goal.progressMetricId) {
      const metric = metrics.find(m => m.id === goal.progressMetricId)
      if (metric) {
        const entries = metricEntries.filter(e => e.metricId === metric.id)
        currentMetricValue = getMetricTotalValue(entries)
        targetMetricValue = metric.targetValue
        progress = calculateProgress(currentMetricValue, metric.targetValue)
      }
    }

    const deadlineDate = user ? getDeadlineDate(goal.deadlineType, goal.deadlineValue, user.settings) : null

    return {
      goal,
      stages: goalStages,
      tasks: goalTasks,
      metrics: goalMetrics,
      category,
      progress,
      totalTasks,
      completedTasks,
      deadlineDate,
      currentMetricValue,
      targetMetricValue,
    }
  }, [goals, stages, tasks, metrics, metricEntries, categories, goalId, user])
}

export function useGoalDeadlines(limit?: number) {
  const { allGoals } = useGoals()

  return useMemo(() => {
    const withDeadlines = allGoals
      .filter(g => g.deadlineDate !== null && g.calculatedStatus !== 'completed')
      .sort((a, b) => {
        if (!a.deadlineDate) return 1
        if (!b.deadlineDate) return -1
        return a.deadlineDate.getTime() - b.deadlineDate.getTime()
      })

    return limit ? withDeadlines.slice(0, limit) : withDeadlines
  }, [allGoals, limit])
}
