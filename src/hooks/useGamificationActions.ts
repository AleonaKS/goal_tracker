import { useCallback } from 'react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { awardPoints, checkAchievements, POINTS_CONFIG, calculateLevel } from '@/lib/gamification'
import { getUserById } from '@/lib/supabase-api'
import type { Task, Goal, Metric } from '@/types'

// Use Omit for input types since CreateInput types were removed
type CreateGoalInput = Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>
type CreateTaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
type CreateMetricInput = Omit<Metric, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Hook that wraps store actions with gamification point awarding
 */
export function useGamificationActions() {
  const { user, refreshUser } = useAuthStore()
  const { 
    createGoal: originalCreateGoal,
    updateTask: originalUpdateTask,
    createTask: originalCreateTask,
    createMetric: originalCreateMetric,
    createMetricEntry: originalCreateMetricEntry,
    tasks,
    goals,
    metrics,
    metricEntries
  } = useApiDataStore()

  const actionLabels: Record<string, string> = {
    CREATE_GOAL: 'Создание цели',
    COMPLETE_GOAL: 'Цель выполнена',
    GOAL_STAGE_COMPLETED: 'Этап цели пройден',
    CREATE_TASK: 'Создание задачи',
    COMPLETE_TASK: 'Задача выполнена',
    COMPLETE_SUBTASK: 'Подзадача выполнена',
    CREATE_METRIC: 'Создание метрики',
    METRIC_ENTRY: 'Запись в метрике',
    REACH_METRIC_TARGET: 'Цель метрики достигнута',
    HABIT_ENTRY: 'Привычка отмечена',
    HABIT_STREAK_7: 'Серия 7 дней',
    HABIT_STREAK_30: 'Серия 30 дней',
    HABIT_STREAK_100: 'Серия 100 дней',
    CREATE_CATEGORY: 'Создание категории',
    FIRST_GOAL: 'Первая цель!',
    FIRST_TASK: 'Первая задача!',
    FIRST_METRIC: 'Первая метрика!',
    ACHIEVEMENT_UNLOCKED: 'Достижение',
    WEEKLY_REPORT_VIEW: 'Просмотр отчёта',
  }

  const { addToast } = useToastStore()

  const awardPointsAsync = useCallback(async (actionType: keyof typeof POINTS_CONFIG, metadata?: Record<string, any>) => {
    if (!user?.id) return null
    try {
      const result = await awardPoints(user.id, actionType, metadata)
      if (result.success) {
        const label = actionLabels[actionType] || actionType
        addToast({
          type: 'points',
          title: 'Получены очки!',
          message: label,
          points: result.pointsAwarded,
          duration: 3000
        })
        
        if (result.leveledUp) {
          const levelInfo = calculateLevel(result.newTotal)
          addToast({
            type: 'level',
            title: 'Новый уровень!',
            message: `${levelInfo.level}: ${levelInfo.title}`,
            duration: 5000
          })
        }
        return result
      }
    } catch (error) {
      console.error('[Gamification] Failed to award points:', error)
    }
    return null
  }, [user?.id, addToast])

  const checkAchievementsAsync = useCallback(async () => {
    if (!user?.id) return
    try {
      const stats = {
        goalsCreated: goals.length,
        goalsCompleted: goals.filter(g => g.status === 'completed').length,
        tasksCompleted: tasks.filter(t => t.completed).length,
        metricsCount: metrics.length,
        metricsTargetsReached: 0, // Calculate based on metric progress
        habitsStreak: 0, // Calculate from streak data
        categoriesCount: useApiDataStore.getState().categories.length,
        activeDays: 0 // Track from user activity
      }
      
      const newAchievements = await checkAchievements(user.id, stats)
      for (const ach of newAchievements) {
        addToast({
          type: 'achievement',
          title: `Достижение разблокировано: ${ach.title}`,
          message: ach.description,
          icon: ach.icon,
          points: ach.points,
          duration: 5000
        })
      }
    } catch (error) {
      console.error('[Gamification] Failed to check achievements:', error) 
    }
  }, [user?.id, goals, tasks, metrics])

  // Wrapped createGoal with gamification
  const createGoal = useCallback(async (data: CreateGoalInput) => {
    await originalCreateGoal(data)
    await awardPointsAsync('CREATE_GOAL', { }) 
    if (goals.length === 0) {
      await awardPointsAsync('FIRST_GOAL' as any, { })
    }
    await checkAchievementsAsync()
  }, [originalCreateGoal, awardPointsAsync, checkAchievementsAsync, goals.length])

  // Wrapped complete goal (via updateGoal)
  const completeGoal = useCallback(async (goalId: string) => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    
    // Update goal status
    const result = await useApiDataStore.getState().updateGoal(goalId, { 
      status: 'completed',
      completedAt: new Date()
    })
    
    if (result) {
      await awardPointsAsync('COMPLETE_GOAL', { goalId, progress: goal.progress })
      await checkAchievementsAsync()
    }
    return result
  }, [goals, awardPointsAsync, checkAchievementsAsync])

  // Wrapped createTask with gamification
  const createTask = useCallback(async (data: CreateTaskInput) => {
    await originalCreateTask(data)
    await awardPointsAsync('CREATE_TASK', { goalId: data.goalId })
    // Check for first task
    if (tasks.length === 0) {
      await awardPointsAsync('FIRST_TASK' as any, { })
    }
    await checkAchievementsAsync()
  }, [originalCreateTask, awardPointsAsync, checkAchievementsAsync, tasks.length])

  // Wrapped updateTask (for completion) with gamification
  const completeTask = useCallback(async (taskId: string, taskData: Partial<Task> = {}) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.completed) {
      // Task doesn't exist or already completed
      await originalUpdateTask(taskId, taskData)
      return
    }
    
    const updates: Partial<Task> = {
      ...taskData,
      completed: true,
      completedAt: new Date()
    }
    
    await originalUpdateTask(taskId, updates)
    // Calculate points based on priority and weight
    const basePoints = POINTS_CONFIG.COMPLETE_TASK
    const priorityBonus = (task.priority || 3) * 2
    const weightBonus = Math.round((task.weight || 1) * 5)
    const totalPoints = basePoints + priorityBonus + weightBonus
    
    await awardPointsAsync('COMPLETE_TASK', { 
      taskId, 
      basePoints,
      priorityBonus,
      weightBonus,
      totalPoints
    })
    
    // Check if goal stage completed
    if (task.stageId) {
      const stageTasks = tasks.filter(t => t.stageId === task.stageId)
      const allCompleted = stageTasks.every(t => t.completed || t.id === taskId)
      if (allCompleted && stageTasks.length > 0) {
        await awardPointsAsync('GOAL_STAGE_COMPLETED', { stageId: task.stageId })
      }
    }
    
    await checkAchievementsAsync()
  }, [tasks, originalUpdateTask, awardPointsAsync, checkAchievementsAsync])

  // Wrapped createMetric with gamification
  const createMetric = useCallback(async (data: CreateMetricInput) => {
    await originalCreateMetric(data)
    await awardPointsAsync('CREATE_METRIC', { type: data.type })
    // Check for first metric
    if (metrics.length === 0) {
      await awardPointsAsync('FIRST_METRIC' as any, { })
    }
    await checkAchievementsAsync()
  }, [originalCreateMetric, awardPointsAsync, checkAchievementsAsync, metrics.length])

  // Wrapped createMetricEntry with gamification
  const createMetricEntry = useCallback(async (metricId: string, value: number, note?: string, entryDate?: Date) => {
    const metric = metrics.find(m => m.id === metricId)
    if (!metric) return
    
    // Create the entry object for the original function
    await originalCreateMetricEntry({
      metricId,
      entryDate: entryDate || new Date(),
      value,
      finalValue: value, // Will be calculated by the API
      note,
      isAddition: value >= 0,
      isOverachievement: false,
      overachievementValue: 0
    })
    
    // Award points based on metric type
    if (metric.type === 'habit' || metric.type === 'simple_habit') {
      await awardPointsAsync('HABIT_ENTRY', { metricId, value })
    } else {
      await awardPointsAsync('METRIC_ENTRY', { metricId, value })
    }
    
    // Check if target reached
    const entries = metricEntries.filter(e => e.metricId === metricId)
    const totalValue = entries.reduce((sum, e) => sum + e.value, 0) + value
    
    if (metric.targetValue && totalValue >= metric.targetValue) {
      const previousTotal = totalValue - value
      if (previousTotal < metric.targetValue) {
        // Just reached target
        await awardPointsAsync('REACH_METRIC_TARGET', { metricId, targetValue: metric.targetValue })
      }
    }
    
    await checkAchievementsAsync()
  }, [metrics, metricEntries, originalCreateMetricEntry, awardPointsAsync, checkAchievementsAsync])

  return {
    createGoal,
    completeGoal,
    createTask,
    completeTask,
    createMetric,
    createMetricEntry,
    awardPointsAsync,
    checkAchievementsAsync
  }
}

export default useGamificationActions
