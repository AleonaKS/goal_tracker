import { describe, it, expect } from 'vitest'
import {
  exportToJSON,
  parseImportData,
  validateImportData,
  prepareImportData,
} from '@/lib/exportData'
import type { User, Goal, Task, Metric, MetricEntry, Category, Stage, Subtask } from '@/types'

function makeUser(overrides: Partial<User> = {}): User {
  const now = new Date()
  return {
    id: 'user-1',
    login: 'testuser',
    email: 'test@example.com',
    settings: { theme: 'light', language: 'ru', monthYearHandling: 'end', yearHandling: 'end' },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1', userId: 'user-1', name: 'Goal', status: 'in_progress',
    priority: 3, progress: 50, progressCalculation: 'by_tasks', deadlineType: 'none',
    createdAt: new Date(), updatedAt: new Date(), ...overrides,
  }
}

describe('6. Export/Import', () => {
  describe('exportToJSON', () => {
    it('produces valid JSON string', () => {
      const json = exportToJSON(makeUser(), [], [], [], [], [], [], [])
      const parsed = JSON.parse(json)
      expect(parsed.version).toBe('1.0.0')
      expect(parsed.exportedAt).toBeDefined()
      expect(parsed.user).toBeDefined()
    })

    it('includes all data sections', () => {
      const goals = [makeGoal()]
      const json = exportToJSON(makeUser(), [], goals, [], [], [], [], [])
      const parsed = JSON.parse(json)
      expect(parsed.goals).toHaveLength(1)
    })

    it('excludes passwordHash from user data', () => {
      const user = makeUser({ passwordHash: 'secret' } as any)
      const json = exportToJSON(user, [], [], [], [], [], [], [])
      const parsed = JSON.parse(json)
      expect(parsed.user.passwordHash).toBeUndefined()
    })
  })

  describe('parseImportData', () => {
    it('parses valid JSON correctly', () => {
      const data = {
        user: makeUser(),
        categories: [],
        goals: [],
        stages: [],
        tasks: [],
        subtasks: [],
        metrics: [],
        metricEntries: [],
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      }
      const result = parseImportData(JSON.stringify(data))
      expect(result.data).toBeTruthy()
      expect(result.errors).toHaveLength(0)
    })

    it('returns error for invalid JSON', () => {
      const result = parseImportData('invalid json')
      expect(result.data).toBeNull()
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('returns error for missing required fields', () => {
      const result = parseImportData(JSON.stringify({}))
      expect(result.data).toBeNull()
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('validateImportData', () => {
    it('validates complete data', () => {
      const data = {
        user: makeUser(),
        categories: [{ id: 'cat-1', name: 'Health', userId: 'user-1', icon: 'heart', color: '#ff0000', isDefault: false, createdAt: new Date(), updatedAt: new Date() }],
        goals: [{ ...makeGoal(), categoryId: 'cat-1' }],
        stages: [],
        tasks: [],
        subtasks: [],
        metrics: [],
        metricEntries: [],
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      }
      const result = validateImportData(data)
      expect(result.isValid).toBe(true)
    })

    it('flags missing user fields', () => {
      const data = {
        user: { id: '', email: '' } as any,
        categories: [], goals: [], stages: [], tasks: [], subtasks: [], metrics: [],
        metricEntries: [], exportedAt: '', version: '',
      }
      const result = validateImportData(data)
      expect(result.isValid).toBe(false)
    })

    it('warns about broken references', () => {
      const data = {
        user: makeUser(),
        categories: [],
        goals: [{ ...makeGoal(), categoryId: 'nonexistent' }],
        stages: [], tasks: [], subtasks: [], metrics: [], metricEntries: [],
        exportedAt: '', version: '',
      }
      const result = validateImportData(data)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('prepareImportData', () => {
    it('reassigns all IDs to new user', () => {
      const data = {
        user: makeUser({ id: 'old-id' }),
        categories: [{ id: 'cat-1', name: 'Health', userId: 'old-id', icon: 'heart', color: '#ff0000', isDefault: false, createdAt: new Date(), updatedAt: new Date() }],
        goals: [makeGoal({ id: 'goal-1', userId: 'old-id', categoryId: 'cat-1' })],
        stages: [], tasks: [], subtasks: [], metrics: [], metricEntries: [],
        exportedAt: '', version: '',
      }
      const prepared = prepareImportData(data, 'new-user-id')
      expect(prepared.user.id).toBe('new-user-id')
      expect(prepared.categories[0].userId).toBe('new-user-id')
      expect(prepared.categories[0].id).not.toBe('cat-1')
      expect(prepared.goals[0].userId).toBe('new-user-id')
      expect(prepared.goals[0].categoryId).not.toBe('cat-1')
    })
  })
})
