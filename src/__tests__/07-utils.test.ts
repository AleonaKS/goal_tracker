import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateRelative,
  calculateGoalStatus,
  calculateProgress,
  calculateWeightedProgress,
  calculateTaskProgress,
  getStatusLabel,
  getDeadlineDate,
  generateId,
  calculateStreak,
  calculateMaxStreak,
} from '@/lib/utils'

describe('Utils (dates, progress, IDs)', () => {
  describe('formatDate', () => {
    it('returns "No date" for undefined', () => {
      expect(formatDate(undefined)).toBe('No date')
    })

    it('formats a valid date', () => {
      const date = new Date('2024-03-15')
      const result = formatDate(date)
      expect(result).toContain('03.2024')
    })

    it('returns "Invalid date" for bad date string', () => {
      expect(formatDate('not-a-date')).toBe('Invalid date')
    })
  })

  describe('formatDateRelative', () => {
    it('returns "Сегодня" for today', () => {
      expect(formatDateRelative(new Date())).toBe('Сегодня')
    })

    it('returns "No date" for undefined', () => {
      expect(formatDateRelative(undefined)).toBe('No date')
    })
  })

  describe('calculateGoalStatus', () => {
    it('returns completed when progress >= 100', () => {
      expect(calculateGoalStatus(null, 100)).toBe('completed')
    })

    it('returns overdue when deadline passed', () => {
      const past = new Date('2020-01-01')
      expect(calculateGoalStatus(past, 50)).toBe('overdue')
    })

    it('returns in_progress for active goals', () => {
      const future = new Date()
      future.setFullYear(future.getFullYear() + 1)
      expect(calculateGoalStatus(future, 50)).toBe('in_progress')
    })
  })

  describe('calculateProgress', () => {
    it('returns 0 when target is 0', () => {
      expect(calculateProgress(10, 0)).toBe(0)
    })

    it('calculates percentage correctly', () => {
      expect(calculateProgress(25, 100)).toBe(25)
    })

    it('caps at 100', () => {
      expect(calculateProgress(200, 100)).toBe(100)
    })
  })

  describe('calculateWeightedProgress', () => {
    it('returns 0 for empty tasks', () => {
      expect(calculateWeightedProgress([])).toBe(0)
    })

    it('calculates weighted progress', () => {
      const tasks = [
        { completed: true, weight: 1 },
        { completed: false, weight: 3 },
      ]
      expect(calculateWeightedProgress(tasks)).toBe(25)
    })
  })

  describe('calculateTaskProgress', () => {
    it('returns 100 for completed tasks', () => {
      expect(calculateTaskProgress({ completed: true })).toBe(100)
    })

    it('returns 0 for incomplete tasks without subtasks', () => {
      expect(calculateTaskProgress({ completed: false })).toBe(0)
    })

    it('calculates subtask progress', () => {
      const task = {
        completed: false,
        subtasks: [
          { isCompleted: true },
          { isCompleted: false },
          { isCompleted: true },
        ],
      }
      expect(calculateTaskProgress(task)).toBe(67)
    })
  })

  describe('getStatusLabel', () => {
    it('returns correct Russian labels', () => {
      expect(getStatusLabel('in_progress')).toBe('В процессе')
      expect(getStatusLabel('completed')).toBe('Завершено')
      expect(getStatusLabel('overdue')).toBe('Просрочено')
      expect(getStatusLabel('planned')).toBe('Запланировано')
      expect(getStatusLabel('frozen')).toBe('Заморожено')
    })
  })

  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })

    it('generates non-empty string', () => {
      expect(generateId().length).toBeGreaterThan(0)
    })
  })

  describe('calculateStreak', () => {
    it('returns 0 for empty entries', () => {
      expect(calculateStreak([])).toBe(0)
    })

    it('returns 1 for a single entry today', () => {
      const entries = [{ entryDate: new Date(), value: 1 }]
      expect(calculateStreak(entries)).toBe(1)
    })
  })

  describe('calculateMaxStreak', () => {
    it('returns 0 for empty entries', () => {
      const result = calculateMaxStreak([])
      expect(result.value).toBe(0)
    })

    it('finds longest streak', () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const entries = [
        { entryDate: yesterday, value: 1 },
        { entryDate: today, value: 1 },
      ]
      const result = calculateMaxStreak(entries)
      expect(result.value).toBe(2)
    })
  })
})
