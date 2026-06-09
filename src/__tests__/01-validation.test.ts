import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  goalSchema,
  taskSchema,
  metricSchema,
  categorySchema,
  stageSchema,
} from '@/lib/validation'

describe('1. Forms validation (Zod schemas)', () => {
  describe('loginSchema', () => {
    it('validates correct login data', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com', password: '123456' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({ email: 'not-email', password: '123456' })
      expect(result.success).toBe(false)
    })

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com', password: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('goalSchema', () => {
    const validGoal = {
      name: 'Test Goal',
      categoryId: 'cat-1',
      deadlineType: 'none' as const,
      priority: 2,
      progressCalculation: 'by_tasks' as const,
    }

    it('validates correct goal data', () => {
      const result = goalSchema.safeParse(validGoal)
      expect(result.success).toBe(true)
    })

    it('rejects empty name', () => {
      const result = goalSchema.safeParse({ ...validGoal, name: '' })
      expect(result.success).toBe(false)
    })

    it('rejects name over 100 chars', () => {
      const result = goalSchema.safeParse({ ...validGoal, name: 'x'.repeat(101) })
      expect(result.success).toBe(false)
    })

    it('rejects missing category', () => {
      const result = goalSchema.safeParse({ ...validGoal, categoryId: '' })
      expect(result.success).toBe(false)
    })

    it('accepts optional description', () => {
      const result = goalSchema.safeParse({ ...validGoal, description: 'Some description' })
      expect(result.success).toBe(true)
    })

    it('rejects description over 500 chars', () => {
      const result = goalSchema.safeParse({ ...validGoal, description: 'x'.repeat(501) })
      expect(result.success).toBe(false)
    })
  })

  describe('taskSchema', () => {
    const validTask = {
      name: 'Test Task',
      priority: 3,
      weight: 1,
    }

    it('validates correct task data', () => {
      const result = taskSchema.safeParse(validTask)
      expect(result.success).toBe(true)
    })

    it('rejects empty name', () => {
      const result = taskSchema.safeParse({ ...validTask, name: '' })
      expect(result.success).toBe(false)
    })

    it('rejects priority out of range', () => {
      const result = taskSchema.safeParse({ ...validTask, priority: 6 })
      expect(result.success).toBe(false)
    })

    it('rejects weight below minimum', () => {
      const result = taskSchema.safeParse({ ...validTask, weight: 0 })
      expect(result.success).toBe(false)
    })

    it('validates time format', () => {
      const result = taskSchema.safeParse({ ...validTask, startTime: '25:00' })
      expect(result.success).toBe(false)
    })

    it('accepts valid time format', () => {
      const result = taskSchema.safeParse({ ...validTask, startTime: '14:30' })
      expect(result.success).toBe(true)
    })
  })

  describe('categorySchema', () => {
    it('validates correct category', () => {
      const result = categorySchema.safeParse({
        name: 'Health',
        icon: 'heart',
        color: '#FF0000',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid hex color', () => {
      const result = categorySchema.safeParse({
        name: 'Health',
        icon: 'heart',
        color: 'red',
      })
      expect(result.success).toBe(false)
    })

    it('rejects name over 50 chars', () => {
      const result = categorySchema.safeParse({
        name: 'x'.repeat(51),
        icon: 'heart',
        color: '#FF0000',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('metricSchema', () => {
    const validMetric = {
      name: 'Water intake',
      type: 'counter' as const,
      categoryId: 'cat-1',
      initialValue: 0,
      targetValue: 8,
      unit: 'glass',
      inputMode: 'fixed_step' as const,
      stepValue: 1,
      periodicity: 'daily' as const,
      color: '#00FF00',
    }

    it('validates correct metric', () => {
      const result = metricSchema.safeParse(validMetric)
      expect(result.success).toBe(true)
    })

    it('requires stepValue for fixed_step mode', () => {
      const result = metricSchema.safeParse({ ...validMetric, stepValue: undefined })
      expect(result.success).toBe(false)
    })

    it('requires nDays for every_n_days periodicity', () => {
      const result = metricSchema.safeParse({ ...validMetric, periodicity: 'every_n_days', nDays: undefined })
      expect(result.success).toBe(false)
    })

    it('accepts manual input mode without stepValue', () => {
      const result = metricSchema.safeParse({ ...validMetric, inputMode: 'manual', stepValue: undefined })
      expect(result.success).toBe(true)
    })
  })

  describe('stageSchema', () => {
    it('validates correct stage', () => {
      const result = stageSchema.safeParse({ name: 'Phase 1', goalId: 'goal-1' })
      expect(result.success).toBe(true)
    })

    it('rejects endDate before startDate', () => {
      const startDate = new Date('2024-06-01')
      const endDate = new Date('2024-05-01')
      const result = stageSchema.safeParse({ name: 'Phase 1', goalId: 'goal-1', startDate, endDate })
      expect(result.success).toBe(false)
    })

    it('accepts endDate after startDate', () => {
      const startDate = new Date('2024-05-01')
      const endDate = new Date('2024-06-01')
      const result = stageSchema.safeParse({ name: 'Phase 1', goalId: 'goal-1', startDate, endDate })
      expect(result.success).toBe(true)
    })
  })
})
