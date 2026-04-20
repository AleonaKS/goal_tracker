import { useEffect, useCallback } from 'react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { calculateGoalProgressByMetric, shouldResetMetric } from '@/lib/calculations'
import { calculateGoalStatus, getDeadlineDate } from '@/lib/utils'
import type { Goal, Metric, MetricEntry } from '@/types'

/**
 * Hook for automatic progress calculation and metric resets
 */
export function useAutoProgress() {
  const { 
    goals, 
    metrics, 
    metricEntries, 
    tasks,
    updateGoal, 
    updateMetric,
    fetchGoals,
    fetchMetrics,
    fetchMetricEntries
  } = useApiDataStore()

  /**
   * Calculate and update goal progress
   */
  const calculateGoalProgress = useCallback((goal: Goal): number => {
    if (goal.progressCalculation === 'by_metric' && goal.progressMetricId) {
      // Progress by linked metric
      const metric = metrics.find(m => m.id === goal.progressMetricId)
      if (metric) {
        const entries = metricEntries.filter(e => e.metricId === metric.id)
        return calculateGoalProgressByMetric(metric, entries)
      }
    } else {
      // Progress by tasks (weighted)
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
    
    // Calculate status based on progress and deadline
    let newStatus = goal.status
    if (goal.dueDate) {
      const deadline = new Date(goal.dueDate)
      newStatus = calculateGoalStatus(deadline, calculatedProgress)
    }
    
    // Only update if changed
    if (calculatedProgress !== goal.progress || newStatus !== goal.status) {
      await updateGoal(goal.id, {
        progress: calculatedProgress,
        status: newStatus
      })
    }
  }, [calculateGoalProgress, updateGoal])

  /**
   * Check and reset metrics if needed
   */
  const checkAndResetMetrics = useCallback(async () => {
    const now = new Date()
    
    for (const metric of metrics) {
      if (!metric.autoResetEnabled || !metric.resetPeriodicity) continue
      
      const shouldReset = shouldResetMetric(metric, now)
      
      if (shouldReset) {
        // Reset metric progress to start value
        await updateMetric(metric.id, {
          progress: 0,
          totalValue: 0,
          lastResetAt: now
        })
        
        // If target increase is enabled, update target
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
  }, [metrics, updateMetric])

  /**
   * Calculate metric statistics
   */
  const calculateMetricStats = useCallback((metric: Metric, entries: MetricEntry[]) => {
    if (entries.length === 0) return null
    
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
    )
    
    // Calculate current value
    const currentValue = entries.reduce(
      (sum, e) => sum + (e.isAddition ? e.value : -e.value),
      metric.startValue
    )
    
    // Calculate progress percentage
    const progress = metric.targetValue > 0 
      ? Math.min(100, Math.round((currentValue / metric.targetValue) * 100))
      : 0
    
    // Calculate streak
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
    
    // Calculate max streak
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
    
    // Find record value
    const recordValue = Math.max(...entries.map(e => e.value))
    
    return {
      progress,
      currentValue,
      currentStreak,
      maxStreak,
      recordValue,
      totalEntries: entries.length,
      totalValue: entries.reduce((sum, e) => sum + e.value, 0)
    }
  }, [])

  /**
   * Update all metrics statistics
   */
  const updateAllMetricsStats = useCallback(async () => {
    for (const metric of metrics) {
      const entries = metricEntries.filter(e => e.metricId === metric.id)
      const stats = calculateMetricStats(metric, entries)
      
      if (stats && (
        stats.progress !== metric.progress ||
        stats.currentStreak !== metric.currentStreak ||
        stats.maxStreak !== metric.maxStreak
      )) {
        await updateMetric(metric.id, {
          progress: stats.progress,
          currentStreak: stats.currentStreak,
          maxStreak: stats.maxStreak,
          recordValue: stats.recordValue,
          totalEntries: stats.totalEntries,
          totalValue: stats.totalValue
        })
      }
    }
  }, [metrics, metricEntries, calculateMetricStats, updateMetric])

  /**
   * Update all goals progress
   */
  const updateAllGoalsProgress = useCallback(async () => {
    for (const goal of goals) {
      await updateGoalProgress(goal)
    }
  }, [goals, updateGoalProgress])

  /**
   * Run all automatic calculations
   */
  const runAutoCalculations = useCallback(async () => {
    await checkAndResetMetrics()
    await updateAllMetricsStats()
    await updateAllGoalsProgress()
  }, [checkAndResetMetrics, updateAllMetricsStats, updateAllGoalsProgress])

  // Run calculations on mount and periodically
  useEffect(() => {
    // Initial calculation
    runAutoCalculations()
    
    // Set up interval for periodic checks (every 5 minutes)
    const interval = setInterval(runAutoCalculations, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [runAutoCalculations])

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
