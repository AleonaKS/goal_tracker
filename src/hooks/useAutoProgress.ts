import { useEffect, useCallback, useRef } from 'react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { calculateGoalProgressByMetric, shouldResetMetric, calculateExpectedCompletionDate, calculateCurrentStreak } from '@/lib/calculations'
import { calculateGoalStatus, getDeadlineDate, calculateMetricProgress } from '@/lib/utils'
import { checkAchievements } from '@/lib/gamification'
import { upsertMetricAnalytics } from '@/lib/api'
import type { Goal, Metric, MetricEntry } from '@/types'

/**
 * Hook for automatic progress calculation and metric resets
 */
export function useAutoProgress() {
  const isRunningRef = useRef(false)
  
  const { 
    goals, 
    metrics, 
    metricEntries, 
    tasks,
    user,
    updateGoal, 
    updateMetric,
    createAchievement,
    fetchGoals,
    fetchMetrics,
    fetchMetricEntries
  } = useApiDataStore()

  /**
   * Calculate and update goal progress
   */
  const calculateGoalProgress = useCallback((goal: Goal): number => {
    if (goal.progressCalculation === 'by_metric' && goal.progressMetricId) {

      const metric = metrics.find(m => m.id === goal.progressMetricId)
      if (metric) {
        const entries = metricEntries.filter(e => e.metricId === metric.id)
        return calculateGoalProgressByMetric(metric, entries)
      }
    } else { 
      const goalTasks = tasks.filter(t => t.goalId === goal.id)
      if (goalTasks.length === 0) return 0
      
      const totalWeight = goalTasks.reduce((sum, t) => sum + (t.weight || 1), 0)
      const completedWeight = goalTasks
        .filter(t => t.completed)
        .reduce((sum, t) => sum + (t.weight || 1), 0)
      
      return Math.round((completedWeight / totalWeight) * 100)
    }
    
    return goal.progress || 0
  }, [metrics, metricEntries, tasks])

  /**
   * Update goal progress automatically
   */
  const updateGoalProgress = useCallback(async (goal: Goal) => {
    if (goal.autoCalculateStatus === false) return
    
    const calculatedProgress = calculateGoalProgress(goal)
    
    // Calculate expected completion date
    let expectedCompletionDate: Date | null = null
    if (goal.progressCalculation === 'by_metric' && goal.progressMetricId) {
      const metric = metrics.find(m => m.id === goal.progressMetricId)
      if (metric) {
        const entries = metricEntries.filter(e => e.metricId === metric.id)
        expectedCompletionDate = calculateExpectedCompletionDate(goal, entries, metric)
      }
    } else {
      expectedCompletionDate = calculateExpectedCompletionDate(goal, metricEntries)
    }
    
    // Calculate status based on progress and deadline
    let newStatus = goal.status
    if (goal.dueDate) {
      const deadline = new Date(goal.dueDate)
      newStatus = calculateGoalStatus(deadline, calculatedProgress)
    }
    
    // Only update if changed
    const hasChanges = (
      calculatedProgress !== goal.progress || 
      newStatus !== goal.status ||
      (expectedCompletionDate?.getTime() !== goal.expectedCompletionDate?.getTime())
    )
    
    if (hasChanges) {
      await updateGoal(goal.id, {
        progress: calculatedProgress,
        status: newStatus,
        expectedCompletionDate
      })
    }
  }, [calculateGoalProgress, updateGoal, metrics, metricEntries])

  /**
   * Check and reset metrics if needed
   */
  const checkAndResetMetrics = useCallback(async () => {
    const now = new Date()
    
    for (const metric of metrics) {
      if (!metric.autoResetEnabled || !metric.resetPeriodicity) continue
      
      const shouldReset = shouldResetMetric(metric)
      
      if (shouldReset) {
        const entries = metricEntries.filter(e => e.metricId === metric.id)
        const values = calculateMetricProgress(metric, entries)
        
        await updateMetric(metric.id, {
          progress: values.progress,
          periodValue: values.isPeriodBased ? values.periodValue : undefined,
          lastResetAt: now
        })
        
        if (metric.targetIncreaseEnabled && metric.targetIncreaseValue) {
          const increase = metric.targetIncreaseType === 'percentage'
            ? metric.targetValue * (metric.targetIncreaseValue / 100)
            : metric.targetIncreaseValue
            
          await updateMetric(metric.id, {
            targetValue: metric.targetValue + increase
          })
        }
      }
    }
  }, [metrics, metricEntries, updateMetric])

  /**
   * Calculate metric statistics
   */
  const calculateMetricStats = useCallback((metric: Metric, entries: MetricEntry[]) => {
    if (entries.length === 0) return null
    
    const values = calculateMetricProgress(metric, entries)
    
    const sortedEntries = [...entries].sort((a, b) =>
      new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
    )
    
    let currentStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < sortedEntries.length; i++) {
      const entryDate = new Date(sortedEntries[i].entryDate)
      entryDate.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays === i || (i === 0 && diffDays <= 1)) {
        currentStreak++
      } else {
        break
      }
    }
    
    let maxStreak = 0
    let tempStreak = 1
    
    for (let i = 1; i < sortedEntries.length; i++) {
      const prevDate = new Date(sortedEntries[i - 1].entryDate)
      const currDate = new Date(sortedEntries[i].entryDate)
      const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diff === 1) {
        tempStreak++
        maxStreak = Math.max(maxStreak, tempStreak)
      } else {
        tempStreak = 1
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak, currentStreak)
    
    const recordValue = entries.length > 0 ? Math.max(...entries.map(e => e.value)) : 0
    
    return {
      progress: values.progress,
      currentValue: values.isPeriodBased ? values.periodValue : values.totalValue,
      currentStreak,
      maxStreak,
      recordValue,
      totalEntries: entries.length,
      totalValue: values.totalValue
    }
  }, [])

  /**
   * Update all metrics statistics
   */
  const updateAllMetricsStats = useCallback(async () => {
    if (!user) return
    for (const metric of metrics) {
      const entries = metricEntries.filter(e => e.metricId === metric.id)
      const stats = calculateMetricStats(metric, entries)
      
      if (stats) {
        // Update progress in metrics table (only progress field)
        if (stats.progress !== metric.progress) {
          await updateMetric(metric.id, { progress: stats.progress })
        }
        
        // Update analytics in metric_analytics_cache table
        if (
          stats.currentStreak !== metric.currentStreak ||
          stats.maxStreak !== metric.maxStreak
        ) {
          await upsertMetricAnalytics({
            metricId: metric.id,
            userId: user.id,
            currentStreak: stats.currentStreak,
            maxStreak: stats.maxStreak,
            recordValue: stats.recordValue,
            totalEntries: stats.totalEntries,
            totalValue: stats.totalValue
          })
        }
      }
    }
  }, [metrics, metricEntries, calculateMetricStats, updateMetric, user])

  /**
   * Update all goals progress
   */
  const updateAllGoalsProgress = useCallback(async () => {
    for (const goal of goals) {
      await updateGoalProgress(goal)
    }
  }, [goals, updateGoalProgress])

  /**
   * Check and award achievements based on current stats
   */
  const checkAndAwardAchievements = useCallback(async () => {
    if (!user) return
    
    // Calculate current stats for achievement checking
    const goalsCompleted = goals.filter(g => g.status === 'completed').length
    const tasksCompleted = tasks.filter(t => t.completed).length
    const metricsTargetsReached = metrics.filter(m => {
      const entries = metricEntries.filter(e => e.metricId === m.id)
      const totalValue = entries.reduce((sum, e) => sum + e.value, m.startValue)
      return totalValue >= m.targetValue
    }).length
    
    // Calculate max habit streak across all metrics
    let maxHabitStreak = 0
    for (const metric of metrics) {
      if (metric.type === 'habit') {
        const entries = metricEntries.filter(e => e.metricId === metric.id)
        if (entries.length > 0) {
          const streak = calculateCurrentStreak(entries, metric.periodicity)
          maxHabitStreak = Math.max(maxHabitStreak, streak)
        }
      }
    }
    
    const stats = {
      goalsCreated: goals.length,
      goalsCompleted,
      tasksCompleted,
      metricsCount: metrics.length,
      metricsTargetsReached,
      habitsStreak: maxHabitStreak,
      categoriesCount: 0, // TODO: Get from categories
      activeDays: 0 // TODO: Calculate from activity
    }
    
    try {
      const newAchievements = await checkAchievements(user.id, stats)
      
      // Create new achievements in the store
      for (const achievement of newAchievements) {
        await createAchievement({
          userId: user.id,
          type: achievement.id.includes('goal') ? 'goal_completed' : 
                achievement.id.includes('habit') ? 'habit_streak' : 
                achievement.id.includes('task') ? 'completed_task' : 'milestone',
          title: achievement.title,
          description: achievement.description,
          value: achievement.points,
          referenceId: user.id
        })
      }
    } catch (error) {
      console.error('Error checking achievements:', error)
    }
  }, [user, goals, tasks, metrics, metricEntries, createAchievement])

 
  const runAutoCalculations = useCallback(async () => {
    await checkAndResetMetrics()
    await updateAllMetricsStats()
    await updateAllGoalsProgress()
    await checkAndAwardAchievements()
  }, [checkAndResetMetrics, updateAllMetricsStats, updateAllGoalsProgress, checkAndAwardAchievements])

  // Keep latest run function in ref so interval always uses current data
  const runRef = useRef(runAutoCalculations)
  runRef.current = runAutoCalculations

  // Run calculations on mount (once user data is available) and periodically
  useEffect(() => {
    if (isRunningRef.current) return

    const executeCalculations = async () => {
      isRunningRef.current = true
      try {
        await runRef.current()
      } finally {
        isRunningRef.current = false
      }
    }

    // Initial calculation on mount
    if (user) {
      executeCalculations()
    }

    // Set up interval for periodic checks (every 5 minutes)
    const interval = setInterval(() => {
      if (!isRunningRef.current) {
        executeCalculations()
      }
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [user])

  return {
    calculateGoalProgress,
    updateGoalProgress,
    checkAndResetMetrics,
    calculateMetricStats,
    updateAllMetricsStats,
    updateAllGoalsProgress,
    runAutoCalculations
  }
}
