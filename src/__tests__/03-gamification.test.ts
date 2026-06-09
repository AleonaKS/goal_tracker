import { describe, it, expect } from 'vitest'
import {
  calculateLevel,
  calculateTaskScore,
  calculateGamificationAnalytics,
  LEVEL_THRESHOLDS,
  POINTS_CONFIG,
} from '@/lib/gamification'

describe('3. Gamification (points, levels, scoring)', () => {
  describe('calculateLevel', () => {
    it('returns level 1 for 0 points', () => {
      const result = calculateLevel(0)
      expect(result.level).toBe(1)
      expect(result.title).toBe('Новичок')
    })

    it('returns correct level based on points', () => {
      const result = calculateLevel(500)
      expect(result.level).toBe(5)
      expect(result.title).toBe('Продуктивный')
    })

    it('returns max level for very high points', () => {
      const maxLevel = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
      const result = calculateLevel(10000)
      expect(result.level).toBe(maxLevel.level)
    })

    it('calculates points to next level', () => {
      const result = calculateLevel(50)
      expect(result.pointsToNext).toBe(100)
    })
  })

  describe('POINTS_CONFIG', () => {
    it('has all required action types', () => {
      expect(POINTS_CONFIG.CREATE_GOAL).toBe(10)
      expect(POINTS_CONFIG.COMPLETE_GOAL).toBe(50)
      expect(POINTS_CONFIG.COMPLETE_TASK).toBe(10)
      expect(POINTS_CONFIG.METRIC_ENTRY).toBe(2)
      expect(POINTS_CONFIG.HABIT_ENTRY).toBe(3)
    })
  })

  describe('calculateTaskScore', () => {
    it('calculates base score correctly', () => {
      const result = calculateTaskScore({ complexity: 2, weight: 1, priority: 3 })
      expect(result.basePoints).toBe(10)
      expect(result.complexityBonus).toBe(4)
      expect(result.weightBonus).toBe(2)
    })

    it('applies priority bonus (inverse)', () => {
      const high = calculateTaskScore({ complexity: 2, weight: 1, priority: 1 })
      const low = calculateTaskScore({ complexity: 2, weight: 1, priority: 5 })
      expect(high.totalPoints).toBeGreaterThan(low.totalPoints)
    })

    it('applies deadline bonus for early completion', () => {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 7)
      const completedAt = new Date()
      const result = calculateTaskScore({ complexity: 2, weight: 1, priority: 3, dueDate, completedAt })
      expect(result.deadlineBonus).toBeGreaterThan(0)
    })

    it('applies deadline penalty for late completion', () => {
      const dueDate = new Date('2020-01-01')
      const completedAt = new Date()
      const result = calculateTaskScore({ complexity: 2, weight: 1, priority: 3, dueDate, completedAt })
      expect(result.deadlinePenalty).toBeGreaterThan(0)
    })

    it('total is at least 1', () => {
      const result = calculateTaskScore({ complexity: 1, weight: 0.1, priority: 5 })
      expect(result.totalPoints).toBeGreaterThanOrEqual(1)
    })
  })

  describe('calculateGamificationAnalytics', () => {
    it('returns default values for no data', () => {
      const result = calculateGamificationAnalytics([], 0)
      expect(result.totalPoints).toBe(0)
      expect(result.currentLevel).toBe(1)
      expect(result.completionRate).toBe(0)
    })

    it('calculates task stats correctly', () => {
      const tasks = [
        { completed: true, completedAt: new Date(), dueDate: new Date(), complexity: 2, weight: 1, priority: 3, createdAt: new Date() },
        { completed: true, completedAt: new Date(), dueDate: new Date(), complexity: 3, weight: 2, priority: 2, createdAt: new Date() },
      ]
      const result = calculateGamificationAnalytics(tasks, 100)
      expect(result.taskStats.totalCompleted).toBe(2)
      expect(result.taskStats.averageComplexity).toBe(2.5)
    })
  })
})
