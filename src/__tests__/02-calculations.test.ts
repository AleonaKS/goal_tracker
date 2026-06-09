import { describe, it, expect } from 'vitest'
import {
  calculateGoalStatusFromGoal,
  calculateGoalProgressByTasks,
  calculateGoalProgressByMetric,
  calculateCurrentStreak,
  calculateMaxStreak,
  findRecordDay,
  calculateHeatmapData,
  generateHeatmapData,
} from '@/lib/calculations'
import type { Goal, Task, Metric, MetricEntry } from '@/types'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date()
  return {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Test Goal',
    status: 'in_progress',
    priority: 3,
    progress: 0,
    progressCalculation: 'by_tasks',
    deadlineType: 'none',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeTask(overrides: Partial<Task> = {}): Task {
  const now = new Date()
  return {
    id: `task-${Math.random()}`,
    userId: 'user-1',
    name: 'Test Task',
    priority: 3,
    complexity: 2,
    weight: 1,
    progress: 0,
    completed: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeEntry(overrides: Partial<MetricEntry> = {}): MetricEntry {
  return {
    id: `entry-${Math.random()}`,
    metricId: 'metric-1',
    value: 1,
    finalValue: 1,
    isAddition: true,
    entryDate: new Date(),
    createdAt: new Date(),
    ...overrides,
  }
}

describe('2. Calculations (progress, streak, heatmap)', () => {
  describe('calculateGoalStatusFromGoal', () => {
    it('returns frozen for frozen goals', () => {
      expect(calculateGoalStatusFromGoal(makeGoal({ isFrozen: true }))).toBe('frozen')
    })

    it('returns completed when progress is 100', () => {
      expect(calculateGoalStatusFromGoal(makeGoal({ progress: 100 }))).toBe('completed')
    })

    it('returns completed when status is completed', () => {
      expect(calculateGoalStatusFromGoal(makeGoal({ status: 'completed' }))).toBe('completed')
    })

    it('returns planned for future goals', () => {
      const future = new Date()
      future.setFullYear(future.getFullYear() + 1)
      expect(calculateGoalStatusFromGoal(makeGoal({ startDate: future }))).toBe('planned')
    })

    it('returns overdue when deadline passed', () => {
      const past = new Date('2020-01-01')
      expect(calculateGoalStatusFromGoal(makeGoal({ deadlineValue: past }))).toBe('overdue')
    })

    it('returns in_progress for active goals', () => {
      expect(calculateGoalStatusFromGoal(makeGoal())).toBe('in_progress')
    })
  })

  describe('calculateGoalProgressByTasks', () => {
    it('returns 0 for empty tasks', () => {
      expect(calculateGoalProgressByTasks([])).toBe(0)
    })

    it('returns 0 when no tasks completed', () => {
      const tasks = [makeTask(), makeTask()]
      expect(calculateGoalProgressByTasks(tasks)).toBe(0)
    })

    it('calculates weighted progress correctly', () => {
      const tasks = [
        makeTask({ completed: true, weight: 1 }),
        makeTask({ completed: false, weight: 3 }),
      ]
      expect(calculateGoalProgressByTasks(tasks)).toBe(25)
    })

    it('returns 100 when all tasks completed', () => {
      const tasks = [makeTask({ completed: true }), makeTask({ completed: true })]
      expect(calculateGoalProgressByTasks(tasks)).toBe(100)
    })
  })

  describe('calculateGoalProgressByMetric', () => {
    const metric: Metric = {
      id: 'metric-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      name: 'Test',
      type: 'counter',
      unit: 'x',
      inputMode: 'fixed_step',
      initialValue: 0,
      startValue: 0,
      targetValue: 100,
      color: '#000',
      createdAt: new Date(),
      updatedAt: new Date(),
      stepValue: 1,
    }

    it('returns 0 for target value of 0', () => {
      expect(calculateGoalProgressByMetric({ ...metric, targetValue: 0 }, [])).toBe(0)
    })

    it('calculates progress from entries', () => {
      const entries = [
        makeEntry({ value: 25, isAddition: true }),
        makeEntry({ value: 25, isAddition: true }),
      ]
      expect(calculateGoalProgressByMetric(metric, entries)).toBe(50)
    })

    it('handles subtraction entries', () => {
      const entries = [
        makeEntry({ value: 50, isAddition: true }),
        makeEntry({ value: 10, isAddition: false }),
      ]
      expect(calculateGoalProgressByMetric(metric, entries)).toBe(40)
    })
  })

  describe('calculateCurrentStreak', () => {
    it('returns 0 for empty entries', () => {
      expect(calculateCurrentStreak([], 'daily')).toBe(0)
    })

    it('returns 1 for single entry today', () => {
      const entries = [makeEntry({ entryDate: new Date() })]
      expect(calculateCurrentStreak(entries, 'daily')).toBe(1)
    })
  })

  describe('calculateMaxStreak', () => {
    it('returns 0 for empty entries', () => {
      expect(calculateMaxStreak([])).toBe(0)
    })

    it('returns 1 for single entry', () => {
      const entries = [makeEntry({ entryDate: new Date() })]
      expect(calculateMaxStreak(entries)).toBe(1)
    })

    it('calculates streak across consecutive days', () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const twoDaysAgo = new Date(today)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      const entries = [
        makeEntry({ entryDate: twoDaysAgo }),
        makeEntry({ entryDate: yesterday }),
        makeEntry({ entryDate: today }),
      ]
      expect(calculateMaxStreak(entries)).toBe(3)
    })
  })

  describe('findRecordDay', () => {
    it('returns null for empty entries', () => {
      expect(findRecordDay([])).toBeNull()
    })

    it('finds entry with max value', () => {
      const entries = [
        makeEntry({ value: 5 }),
        makeEntry({ value: 10 }),
        makeEntry({ value: 3 }),
      ]
      const record = findRecordDay(entries)
      expect(record?.value).toBe(10)
    })
  })

  describe('calculateHeatmapData', () => {
    it('returns empty map for no entries', () => {
      const heatmap = calculateHeatmapData([], 2024)
      expect(heatmap.size).toBe(0)
    })

    it('groups entries by date with normalized levels', () => {
      const entries = [
        makeEntry({ value: 10, entryDate: new Date('2024-06-01') }),
        makeEntry({ value: 20, entryDate: new Date('2024-06-01') }),
      ]
      const heatmap = calculateHeatmapData(entries, 2024, 5)
      expect(heatmap.size).toBe(1)
    })
  })

  describe('generateHeatmapData', () => {
    it('generates data for specified number of days', () => {
      const entries = [makeEntry({ value: 5, entryDate: new Date() })]
      const data = generateHeatmapData(entries, 7)
      expect(data.length).toBe(7)
    })
  })
})
