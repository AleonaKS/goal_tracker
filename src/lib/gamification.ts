import { getUserById, updateUserGamificationStats, createUserAchievement, getUserAchievements, addPointsHistoryEntry, getPointsHistory } from './supabase-api'

// Конфигурация очков
export const POINTS_CONFIG = {
  // Цели
  CREATE_GOAL: 10,
  COMPLETE_GOAL: 50,
  GOAL_STAGE_COMPLETED: 15,
  
  // Задачи
  CREATE_TASK: 5,
  COMPLETE_TASK: 10,
  COMPLETE_SUBTASK: 3,
  
  // Metrics/Counters
  CREATE_METRIC: 5,
  METRIC_ENTRY: 2,
  REACH_METRIC_TARGET: 25,
  
  // Habits
  HABIT_ENTRY: 3,
  HABIT_STREAK_7: 20,
  HABIT_STREAK_30: 100,
  HABIT_STREAK_100: 300,
  
  // Categories
  CREATE_CATEGORY: 3,
  
  // Special
  DAILY_LOGIN: 1,
  FIRST_GOAL: 25,
  FIRST_TASK: 15,
  FIRST_METRIC: 15,
  ACHIEVEMENT_UNLOCKED: 0,
  WEEKLY_REPORT_VIEW: 5,
} as const

// Achievement templates
export const DEFAULT_ACHIEVEMENTS = [
  { id: 'first_goal', title: 'Первая цель', description: 'Создайте свою первую цель', points: 25, icon: '🎯' },
  { id: 'first_task', title: 'Первый шаг', description: 'Создайте свою первую задачу', points: 15, icon: '✅' },
  { id: 'first_metric', title: 'Начало отсчёта', description: 'Создайте первый счётчик', points: 15, icon: '📊' },
  { id: 'goal_master', title: 'Мастер целей', description: 'Завершите 10 целей', points: 100, icon: '🏆', condition: { type: 'goals_completed', value: 10 } },
  { id: 'task_warrior', title: 'Воин задач', description: 'Выполните 50 задач', points: 150, icon: '⚔️', condition: { type: 'tasks_completed', value: 50 } },
  { id: 'habit_guru', title: 'Гуру привычек', description: 'Поддержите серию привычки 30 дней', points: 200, icon: '🔥', condition: { type: 'habit_streak', value: 30 } },
  { id: 'metric_champion', title: 'Чемпион метрик', description: 'Достигните цели в 5 счётчиках', points: 125, icon: '📈', condition: { type: 'metrics_targets', value: 5 } },
  { id: 'consistent', title: 'Последовательный', description: 'Активны 7 дней подряд', points: 50, icon: '📅', condition: { type: 'daily_streak', value: 7 } },
  { id: 'overachiever', title: 'Перфекционист', description: 'Превысите цель на 150%', points: 75, icon: '⭐', condition: { type: 'overachieve', value: 150 } },
  { id: 'organizer', title: 'Организатор', description: 'Создайте 5 категорий', points: 30, icon: '📁', condition: { type: 'categories', value: 5 } },
]

// Level thresholds
export const LEVEL_THRESHOLDS = [
  { level: 1, points: 0, title: 'Новичок' },
  { level: 2, points: 50, title: 'Стажёр' },
  { level: 3, points: 150, title: 'Организатор' },
  { level: 4, points: 300, title: 'Мотивированный' },
  { level: 5, points: 500, title: 'Продуктивный' },
  { level: 6, points: 750, title: 'Достигатор' },
  { level: 7, points: 1000, title: 'Мастер целей' },
  { level: 8, points: 1500, title: 'Эксперт' },
  { level: 9, points: 2000, title: 'Легенда' },
  { level: 10, points: 3000, title: 'Гуру продуктивности' },
]

export interface GamificationAction {
  type: keyof typeof POINTS_CONFIG
  userId: string
  metadata?: Record<string, any>
}

export interface UserGamificationStats {
  totalPoints: number
  level: number
  levelTitle: string
  pointsToNextLevel: number
  achievements: UserAchievement[]
  recentActions: GamificationAction[]
}

export interface UserAchievement {
  id: string
  title: string
  description: string
  points: number
  icon: string
  unlockedAt: Date
  isCustom: boolean
}

// Calculate level based on points
export function calculateLevel(points: number): { level: number; title: string; pointsToNext: number } {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i].points) {
      const nextLevel = LEVEL_THRESHOLDS[i + 1]
      return {
        level: LEVEL_THRESHOLDS[i].level,
        title: LEVEL_THRESHOLDS[i].title,
        pointsToNext: nextLevel ? nextLevel.points - points : 0
      }
    }
  }
  return { level: 1, title: 'Новичок', pointsToNext: 50 }
}

// Award points to user
export async function awardPoints(
  userId: string, 
  actionType: keyof typeof POINTS_CONFIG,
  metadata?: Record<string, any>
): Promise<{ success: boolean; pointsAwarded: number; newTotal: number; leveledUp?: boolean }> {
  try {
    const points = POINTS_CONFIG[actionType]
    console.log(`[Gamification] awardPoints called: ${actionType}, points from config: ${points}`)
    
    // Get current user stats
    const user = await getUserById(userId)
    console.log(`[Gamification] getUserById returned:`, user?.totalPoints)
    if (!user) {
      throw new Error('User not found')
    }

    const currentPoints = user.totalPoints || 0
    const newTotal = currentPoints + points
    
    // Calculate levels
    const oldLevel = calculateLevel(currentPoints)
    const newLevel = calculateLevel(newTotal)
    const leveledUp = newLevel.level > oldLevel.level

    // Update user's total points in database
    console.log(`[Gamification] Checking if should update DB: points=${points}, currentPoints=${currentPoints}, newTotal=${newTotal}`)
    if (points > 0) {
      console.log(`[Gamification] Updating DB with newTotal: ${newTotal}`)
      await updateUserGamificationStats(userId, { totalPoints: newTotal })
      console.log(`[Gamification] DB update completed`)
    } else {
      console.log(`[Gamification] Skipping DB update because points <= 0`)
    }
    
    // Add to points history
    console.log('[Gamification] Adding to points history:', {
      userId,
      action: `${actionType}: ${metadata?.goalId || metadata?.taskId || metadata?.metricId || ''}`,
      points,
      date: new Date().toISOString()
    })
    
    await addPointsHistoryEntry(userId, {
      action: `${actionType}: ${metadata?.goalId || metadata?.taskId || metadata?.metricId || ''}`,
      points: points,
      date: new Date().toISOString()
    })
    
    // Log the action
    console.log(`[Gamification] User ${userId} earned ${points} points for ${actionType}`, metadata)

    return { success: true, pointsAwarded: points, newTotal, leveledUp }
  } catch (error) {
    console.error('Failed to award points:', error)
    return { success: false, pointsAwarded: 0, newTotal: 0 }
  }
}

// Check and award achievements
export async function checkAchievements(userId: string, stats: {
  goalsCreated: number
  goalsCompleted: number
  tasksCompleted: number
  metricsCount: number
  metricsTargetsReached: number
  habitsStreak: number
  categoriesCount: number
  activeDays: number
}): Promise<UserAchievement[]> {
  const newAchievements: UserAchievement[] = []
   
  const existingAchievements = await getUserAchievements(userId)
  const unlockedIds = new Set(existingAchievements.map(a => a.achievementId))
  
  for (const achievement of DEFAULT_ACHIEVEMENTS) {
    if (!achievement.condition) continue
     
    if (unlockedIds.has(achievement.id)) continue
    
    let shouldAward = false
    
    switch (achievement.condition.type) {
      case 'goals_completed':
        shouldAward = stats.goalsCompleted >= achievement.condition.value
        break
      case 'tasks_completed':
        shouldAward = stats.tasksCompleted >= achievement.condition.value
        break
      case 'habit_streak':
        shouldAward = stats.habitsStreak >= achievement.condition.value
        break
      case 'metrics_targets':
        shouldAward = stats.metricsTargetsReached >= achievement.condition.value
        break
      case 'daily_streak':
        shouldAward = stats.activeDays >= achievement.condition.value
        break
      case 'categories':
        shouldAward = stats.categoriesCount >= achievement.condition.value
        break
    }
    
    if (shouldAward) {
      newAchievements.push({
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        points: achievement.points,
        icon: achievement.icon,
        unlockedAt: new Date(),
        isCustom: false
      })
       
      try {
        await createUserAchievement({
          userId,
          achievementId: achievement.id,
          pointsAwarded: achievement.points
        })
        console.log(`[Gamification] Saved achievement ${achievement.id} to database`)
      } catch (err) {
        console.error('[Gamification] Failed to save achievement:', err)
      }
       
      await awardPoints(userId, 'ACHIEVEMENT_UNLOCKED' as any, { achievementId: achievement.id })
    }
  }
  
  return newAchievements
}
 
export async function createCustomAchievement(
  userId: string,
  achievement: Omit<UserAchievement, 'id' | 'unlockedAt' | 'isCustom'>
): Promise<UserAchievement | null> {
  try { 
    const achievementData = await createUserAchievement({
      userId,
      achievementId: `custom_${Date.now()}`,
      pointsAwarded: achievement.points
    })
    
    if (!achievementData) throw new Error('Failed to create achievement')
    
    return {
      ...achievement,
      id: achievementData.id,
      unlockedAt: new Date(),
      isCustom: true
    }
  } catch (error) {
    console.error('Failed to create custom achievement:', error)
    return null
  }
}


export interface TaskScoringParams {
  complexity: number       
  weight: number        
  priority: number       
  dueDate?: Date
  completedAt?: Date
  basePoints?: number    
}

export interface TaskScoreResult {
  basePoints: number
  complexityBonus: number
  weightBonus: number
  priorityBonus: number
  deadlineBonus: number      
  deadlinePenalty: number  
  totalPoints: number
  breakdown: {
    complexity: { input: number; multiplier: number; points: number }
    weight: { input: number; multiplier: number; points: number }
    priority: { input: number; inverse: number; points: number }
    deadline: { daysDiff: number; coefficient: number; points: number }
  }
}
 
export function calculateTaskScore(params: TaskScoringParams): TaskScoreResult {
  const { complexity, weight, priority, dueDate, completedAt, basePoints = 10 } = params
   
  const inversePriority = 6 - priority
   
  const complexityBonus = complexity * 2
  const weightBonus = Math.round(weight * 1.5)
  const priorityBonus = inversePriority * 3
  
  let deadlineBonus = 0
  let deadlinePenalty = 0
  let deadlineCoefficient = 1
  let daysDiff = 0
   
  if (dueDate && completedAt) {
    const due = new Date(dueDate)
    const completed = new Date(completedAt) 

    due.setHours(0, 0, 0, 0)
    completed.setHours(0, 0, 0, 0)
    
    daysDiff = Math.floor((completed.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff < 0) { 
      const earlyDays = Math.abs(daysDiff)
      const bonusPercent = Math.min(earlyDays * 0.2, 1.0)
      deadlineBonus = Math.round(basePoints * bonusPercent)
      deadlineCoefficient = 1 + bonusPercent
    } else if (daysDiff > 0) { 
      const penaltyPercent = Math.min(daysDiff * 0.1, 0.5)
      deadlinePenalty = Math.round(basePoints * penaltyPercent)
      deadlineCoefficient = 1 - penaltyPercent
    } 
  }
  
  const subtotal = basePoints + complexityBonus + weightBonus + priorityBonus
  const totalPoints = Math.max(1, subtotal + deadlineBonus - deadlinePenalty)
  
  return {
    basePoints,
    complexityBonus,
    weightBonus,
    priorityBonus,
    deadlineBonus,
    deadlinePenalty,
    totalPoints,
    breakdown: {
      complexity: { input: complexity, multiplier: 2, points: complexityBonus },
      weight: { input: weight, multiplier: 1.5, points: weightBonus },
      priority: { input: priority, inverse: inversePriority, points: priorityBonus },
      deadline: { daysDiff, coefficient: deadlineCoefficient, points: deadlineBonus - deadlinePenalty }
    }
  }
}
 
export async function awardTaskCompletionPoints(
  userId: string,
  taskParams: TaskScoringParams
): Promise<{ success: boolean; score: TaskScoreResult }> {
  const score = calculateTaskScore(taskParams)
  
  const result = await awardPoints(userId, 'COMPLETE_TASK', {
    ...taskParams,
    score
  })
  
  return {
    success: result.success,
    score
  }
}
 
export interface GamificationAnalytics {
  totalPoints: number
  pointsThisWeek: number
  pointsThisMonth: number
  currentLevel: number
  levelTitle: string
  pointsToNextLevel: number
  completionRate: number
  
  // Breakdown by source
  pointsBySource: {
    tasks: number
    goals: number
    habits: number
    achievements: number
    other: number
  }
  
  // Task scoring stats
  taskStats: {
    totalCompleted: number
    earlyCompletions: number
    onTimeCompletions: number
    lateCompletions: number
    averageComplexity: number
    averagePriority: number
    averagePointsPerTask: number
  }
  
  // Trends
  dailyPointsTrend: { date: string; points: number }[]
  weeklyComparison: {
    thisWeek: number
    lastWeek: number
    change: number
    changePercent: number
  }
}

/**
 * Calculate comprehensive gamification analytics
 */
export function calculateGamificationAnalytics(
  tasks: Array<{
    completed: boolean
    completedAt?: Date
    dueDate?: Date
    complexity: number
    weight: number
    priority: number
    createdAt: Date
  }>,
  totalPoints: number,
  recentActions: Array<{ type: string; points: number; date: Date }> = []
): GamificationAnalytics {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const lastWeekStart = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  // Calculate points from tasks
  let pointsThisWeek = 0
  let pointsThisMonth = 0
  let pointsLastWeek = 0
  
  let taskPointsTotal = 0
  let earlyCount = 0
  let onTimeCount = 0
  let lateCount = 0
  let totalComplexity = 0
  let totalPriority = 0
  let completedCount = 0
  
  const dailyPoints: Record<string, number> = {}
  
  tasks.forEach(task => {
    if (!task.completed) return
    
    completedCount++
    totalComplexity += task.complexity || 2
    totalPriority += task.priority || 3
    
    const score = calculateTaskScore({
      complexity: task.complexity || 2,
      weight: task.weight || 1,
      priority: task.priority || 3,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      basePoints: POINTS_CONFIG.COMPLETE_TASK
    })
    
    taskPointsTotal += score.totalPoints
    
    // Track deadline performance
    if (task.dueDate && task.completedAt) {
      const due = new Date(task.dueDate)
      const completed = new Date(task.completedAt)
      due.setHours(0, 0, 0, 0)
      completed.setHours(0, 0, 0, 0)
      
      const daysDiff = Math.floor((completed.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff < 0) earlyCount++
      else if (daysDiff > 0) lateCount++
      else onTimeCount++
    } else {
      onTimeCount++
    }
    
    // Track points by time period
    if (task.completedAt) {
      const completedDate = new Date(task.completedAt)
      const dateKey = completedDate.toISOString().split('T')[0]
      dailyPoints[dateKey] = (dailyPoints[dateKey] || 0) + score.totalPoints
      
      if (completedDate >= weekAgo) pointsThisWeek += score.totalPoints
      if (completedDate >= monthAgo) pointsThisMonth += score.totalPoints
      if (completedDate >= lastWeekStart && completedDate < weekAgo) {
        pointsLastWeek += score.totalPoints
      }
    }
  })
  
  // Convert daily points to array
  const dailyPointsTrend = Object.entries(dailyPoints)
    .map(([date, points]) => ({ date, points }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30) // Last 30 days
  
  const level = calculateLevel(totalPoints)
  
  return {
    totalPoints,
    pointsThisWeek,
    pointsThisMonth,
    currentLevel: level.level,
    levelTitle: level.title,
    pointsToNextLevel: level.pointsToNext,
    completionRate: completedCount > 0 ? (earlyCount + onTimeCount) / completedCount : 0,
    
    pointsBySource: {
      tasks: taskPointsTotal,
      goals: recentActions.filter(a => a.type.includes('GOAL')).reduce((s, a) => s + a.points, 0),
      habits: recentActions.filter(a => a.type.includes('HABIT')).reduce((s, a) => s + a.points, 0),
      achievements: recentActions.filter(a => a.type.includes('ACHIEVEMENT')).reduce((s, a) => s + a.points, 0),
      other: recentActions.filter(a => 
        !a.type.includes('TASK') && 
        !a.type.includes('GOAL') && 
        !a.type.includes('HABIT') && 
        !a.type.includes('ACHIEVEMENT')
      ).reduce((s, a) => s + a.points, 0)
    },
    
    taskStats: {
      totalCompleted: completedCount,
      earlyCompletions: earlyCount,
      onTimeCompletions: onTimeCount,
      lateCompletions: lateCount,
      averageComplexity: completedCount > 0 ? totalComplexity / completedCount : 0,
      averagePriority: completedCount > 0 ? totalPriority / completedCount : 0,
      averagePointsPerTask: completedCount > 0 ? taskPointsTotal / completedCount : 0
    },
    
    dailyPointsTrend,
    weeklyComparison: {
      thisWeek: pointsThisWeek,
      lastWeek: pointsLastWeek,
      change: pointsThisWeek - pointsLastWeek,
      changePercent: pointsLastWeek > 0 ? ((pointsThisWeek - pointsLastWeek) / pointsLastWeek) * 100 : 0
    }
  }
}
