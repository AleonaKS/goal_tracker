import { useCallback } from 'react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { useAuthStore } from '@/stores/authStore'
import { awardPoints, checkAchievements, POINTS_CONFIG } from '@/lib/gamification'
import { getUserById } from '@/lib/supabase-api'
import type { Task, Goal, Metric } from '@/types'

// Использование Omit для типов ввода, т.к. CreateInput типы удалены
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

  // Колбэк для toast-уведомлений
  const onPointsAwarded = useCallback((points: number, action: string, metadata?: Record<string, any>) => {
    // Будет вызван компонентом, использующим этот хук
    console.log(`[Gamification] Awarded ${points} points for ${action}`, metadata)
  }, [])

  const awardPointsAsync = useCallback(async (actionType: keyof typeof POINTS_CONFIG, metadata?: Record<string, any>) => {
    if (!user?.id) return null
    try {
      const result = await awardPoints(user.id, actionType, metadata)
      if (result.success) {
        console.log(`[Gamification] Awarded ${result.pointsAwarded} points for ${actionType}`)
        onPointsAwarded(result.pointsAwarded, actionType, metadata)
        
        if (result.leveledUp) {
          console.log(`[Gamification] User leveled up! New total: ${result.newTotal}`)
        }
        return result
      }
    } catch (error) {
      console.error('[Gamification] Failed to award points:', error)
    }
    return null
  }, [user?.id, onPointsAwarded])

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
      if (newAchievements.length > 0) {
        console.log(`[Gamification] Unlocked ${newAchievements.length} new achievements!`)
      }
    } catch (error) {
      console.error('[Gamification] Failed to check achievements:', error) 
    }
  }, [user?.id, goals, tasks, metrics])

  // Обёртка createGoal с геймификацией
  const createGoal = useCallback(async (data: CreateGoalInput) => {
    await originalCreateGoal(data)
    await awardPointsAsync('CREATE_GOAL', { }) 
    if (goals.length === 0) {
      await awardPointsAsync('FIRST_GOAL' as any, { })
    }
    await checkAchievementsAsync()
  }, [originalCreateGoal, awardPointsAsync, checkAchievementsAsync, goals.length])

  // Обёртка завершения цели (через updateGoal)
  const completeGoal = useCallback(async (goalId: string) => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    
    // Обновление статуса цели
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

  // Обёртка createTask с геймификацией
  const createTask = useCallback(async (data: CreateTaskInput) => {
    await originalCreateTask(data)
    await awardPointsAsync('CREATE_TASK', { goalId: data.goalId })
    // Проверка на первую задачу
    if (tasks.length === 0) {
      await awardPointsAsync('FIRST_TASK' as any, { })
    }
    await checkAchievementsAsync()
  }, [originalCreateTask, awardPointsAsync, checkAchievementsAsync, tasks.length])

  // Обёртка updateTask (для завершения) с геймификацией
  const completeTask = useCallback(async (taskId: string, taskData: Partial<Task> = {}) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.completed) {
      // Задача не существует или уже завершена
      await originalUpdateTask(taskId, taskData)
      return
    }
    
    const updates: Partial<Task> = {
      ...taskData,
      completed: true,
      completedAt: new Date()
    }
    
    await originalUpdateTask(taskId, updates)
    // Расчёт очков на основе приоритета и веса
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
    
    // Проверка завершения этапа цели
    if (task.stageId) {
      const stageTasks = tasks.filter(t => t.stageId === task.stageId)
      const allCompleted = stageTasks.every(t => t.completed || t.id === taskId)
      if (allCompleted && stageTasks.length > 0) {
        await awardPointsAsync('GOAL_STAGE_COMPLETED', { stageId: task.stageId })
      }
    }
    
    await checkAchievementsAsync()
  }, [tasks, originalUpdateTask, awardPointsAsync, checkAchievementsAsync])

  // Обёртка createMetric с геймификацией
  const createMetric = useCallback(async (data: CreateMetricInput) => {
    await originalCreateMetric(data)
    await awardPointsAsync('CREATE_METRIC', { type: data.type })
    // Проверка на первую метрику
    if (metrics.length === 0) {
      await awardPointsAsync('FIRST_METRIC' as any, { })
    }
    await checkAchievementsAsync()
  }, [originalCreateMetric, awardPointsAsync, checkAchievementsAsync, metrics.length])

  // Обёртка createMetricEntry с геймификацией
  const createMetricEntry = useCallback(async (metricId: string, value: number, note?: string, entryDate?: Date) => {
    const metric = metrics.find(m => m.id === metricId)
    if (!metric) return
    
    // Создание объекта записи для оригинальной функции
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
    
    // Начисление очков на основе типа метрики
    if (metric.type === 'habit' || metric.type === 'simple_habit') {
      await awardPointsAsync('HABIT_ENTRY', { metricId, value })
    } else {
      await awardPointsAsync('METRIC_ENTRY', { metricId, value })
    }
    
    // Проверка достижения цели
    const entries = metricEntries.filter(e => e.metricId === metricId)
    const totalValue = entries.reduce((sum, e) => sum + e.value, 0) + value
    
    if (metric.targetValue && totalValue >= metric.targetValue) {
      const previousTotal = totalValue - value
      if (previousTotal < metric.targetValue) {
        // Только что достигли цели
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
