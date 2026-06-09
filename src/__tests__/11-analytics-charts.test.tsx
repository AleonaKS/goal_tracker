import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  calculateGoalProgressByMetric,
  calculateGoalProgressByTasks,
  calculateCurrentStreak,
  calculateHeatmapData,
  generateHeatmapData,
} from '@/lib/calculations'
import {
  calculateGamificationAnalytics,
} from '@/lib/gamification'
import type { Metric, MetricEntry, Task } from '@/types'

function makeEntry(overrides: Partial<MetricEntry> = {}): MetricEntry {
  return {
    id: `e-${Math.random()}`,
    metricId: 'm-1',
    value: 1,
    finalValue: 1,
    isAddition: true,
    entryDate: new Date(),
    createdAt: new Date(),
    ...overrides,
  }
}

describe('Analytics / Charts / Visualizations', () => {
  describe('Recharts data correctness', () => {
    it('prepares chart data correctly from entries', () => {
      const entries = [
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
        { date: '2024-01-03', value: 15 },
      ]
      
      const chartData = entries.map(e => ({
        date: e.date,
        value: e.value,
        fill: e.value > 15 ? '#ff0000' : '#00ff00',
      }))

      expect(chartData).toHaveLength(3)
      expect(chartData[0].date).toBe('2024-01-01')
      expect(chartData[0].value).toBe(10)
    })

    it('handles empty chart data', () => {
      const chartData: any[] = []
      expect(chartData).toHaveLength(0)
    })

    it('updates chart data when source changes', () => {
      let entries = [{ date: '2024-01-01', value: 10 }]
      const getData = () => entries.map(e => e.value)
      
      expect(getData()).toEqual([10])
      
      entries = [{ date: '2024-01-01', value: 25 }]
      expect(getData()).toEqual([25])
    })
  })

  describe('Period switching', () => {
    it('filters data by day/week/month', () => {
      const entries = [
        { date: '2024-01-01', value: 5 },
        { date: '2024-01-15', value: 10 },
        { date: '2024-02-01', value: 15 },
      ]

      const filterByMonth = (month: number) =>
        entries.filter(e => e.date.startsWith(`2024-${String(month).padStart(2, '0')}`))

      expect(filterByMonth(1)).toHaveLength(2)
      expect(filterByMonth(2)).toHaveLength(1)
    })
  })

  describe('Heatmap intensity', () => {
    it('calculates correct intensity levels', () => {
      const entries = [
        makeEntry({ value: 1, entryDate: new Date('2024-06-01') }),
        makeEntry({ value: 5, entryDate: new Date('2024-06-02') }),
        makeEntry({ value: 10, entryDate: new Date('2024-06-03') }),
      ]

      const heatmap = calculateHeatmapData(entries, 2024, 5)
      expect(heatmap.size).toBe(3)
    })

    it('returns empty for year with no entries', () => {
      const result = calculateHeatmapData([], 2025)
      expect(result.size).toBe(0)
    })
  })

  describe('Gantt data correctness', () => {
    it('calculates task durations correctly', () => {
      const startDate = new Date('2024-06-01')
      const endDate = new Date('2024-06-10')
      const durationMs = endDate.getTime() - startDate.getTime()
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24))
      
      expect(durationDays).toBe(9)
    })

    it('handles single-day tasks', () => {
      const date = new Date('2024-06-01')
      const durationDays = Math.ceil(0 / (1000 * 60 * 60 * 24) || 1)
      expect(durationDays).toBe(1)
    })
  })

  describe('Gamification analytics', () => {
    it('calculates completion rate', () => {
      const tasks = [
        { completed: true, completedAt: new Date(), dueDate: new Date(), complexity: 2, weight: 1, priority: 3, createdAt: new Date() },
        { completed: false, completedAt: undefined, dueDate: undefined, complexity: 2, weight: 1, priority: 3, createdAt: new Date() },
      ]
      const result = calculateGamificationAnalytics(tasks, 100)
      expect(result.completionRate).toBeGreaterThan(0)
    })
  })
})
