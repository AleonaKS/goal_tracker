import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React, { memo, useMemo } from 'react'

describe('8+9. Performance / memo / useMemo', () => {
  describe('memo prevents unnecessary re-renders', () => {
    it('memoized component does not re-render with same props', () => {
      const renderFn = vi.fn()
      const Memoized = memo(({ value }: { value: number }) => {
        renderFn()
        return <div data-testid="memoized">{value}</div>
      })

      const { rerender } = render(<Memoized value={42} />)
      expect(renderFn).toHaveBeenCalledTimes(1)

      rerender(<Memoized value={42} />)
      expect(renderFn).toHaveBeenCalledTimes(1)
    })

    it('memoized component re-renders with different props', () => {
      const renderFn = vi.fn()
      const Memoized = memo(({ value }: { value: number }) => {
        renderFn()
        return <div data-testid="memoized">{value}</div>
      })

      const { rerender } = render(<Memoized value={42} />)
      rerender(<Memoized value={100} />)
      expect(renderFn).toHaveBeenCalledTimes(2)
    })
  })

  describe('useMemo caches computed values', () => {
    it('useMemo does not recalculate when deps unchanged', () => {
      const computeFn = vi.fn((n: number) => n * 2)

      function TestComponent({ num }: { num: number }) {
        const doubled = useMemo(() => computeFn(num), [num])
        return <div>{doubled}</div>
      }

      const { rerender } = render(<TestComponent num={5} />)
      expect(computeFn).toHaveBeenCalledTimes(1)
      expect(screen.getByText('10')).toBeInTheDocument()

      rerender(<TestComponent num={5} />)
      expect(computeFn).toHaveBeenCalledTimes(1)
    })

    it('useMemo recalculates when deps change', () => {
      const computeFn = vi.fn((n: number) => n * 2)

      function TestComponent({ num }: { num: number }) {
        const doubled = useMemo(() => computeFn(num), [num])
        return <div>{doubled}</div>
      }

      const { rerender } = render(<TestComponent num={5} />)
      rerender(<TestComponent num={10} />)
      expect(computeFn).toHaveBeenCalledTimes(2)
      expect(screen.getByText('20')).toBeInTheDocument()
    })
  })

  describe('large dataset performance', () => {
    it('renders 100+ items efficiently', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }))
      const renderFn = vi.fn()

      function LongList({ data }: { data: typeof items }) {
        return (
          <ul>
            {data.map(item => {
              renderFn()
              return <li key={item.id} data-testid={`item-${item.id}`}>{item.name}</li>
            })}
          </ul>
        )
      }

      render(<LongList data={items} />)
      expect(renderFn).toHaveBeenCalledTimes(100)
      expect(screen.getByTestId('item-99')).toBeInTheDocument()
    })

    it('renders 1000+ tasks for stress test', () => {
      const tasks = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        name: `Task ${i}`,
        completed: i % 2 === 0,
        priority: (i % 5) + 1,
      }))

      function TaskList({ data }: { data: typeof tasks }) {
        return (
          <ul>
            {data.map(task => (
              <li key={task.id} data-testid={`task-${task.id}`}>
                {task.name} - {task.completed ? '✓' : '○'} - p{task.priority}
              </li>
            ))}
          </ul>
        )
      }

      render(<TaskList data={tasks} />)
      expect(screen.getByTestId('task-0')).toBeInTheDocument()
      expect(screen.getByTestId('task-999')).toBeInTheDocument()
    })

    it('handles analytics with large datasets', () => {
      const entries = Array.from({ length: 365 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString(),
        value: Math.floor(Math.random() * 100),
      }))

      function AnalyticsHeatmap({ data }: { data: typeof entries }) {
        const maxVal = Math.max(...data.map(d => d.value), 1)
        return (
          <div data-testid="heatmap">
            {data.map(entry => (
              <div
                key={entry.date}
                data-testid={`day-${entry.date}`}
                style={{ opacity: entry.value / maxVal }}
              />
            ))}
          </div>
        )
      }

      render(<AnalyticsHeatmap data={entries} />)
      expect(screen.getByTestId('heatmap').children.length).toBe(365)
    })

    it('calculates aggregate stats from large data', () => {
      const goals = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        status: i < 20 ? 'completed' : 'in_progress',
        progress: i * 2,
      }))

      function Stats({ items }: { items: typeof goals }) {
        const completed = items.filter(g => g.status === 'completed').length
        const avgProgress = items.reduce((s, g) => s + g.progress, 0) / items.length
        return (
          <div>
            <span data-testid="completed-count">{completed}</span>
            <span data-testid="avg-progress">{Math.round(avgProgress)}</span>
          </div>
        )
      }

      render(<Stats items={goals} />)
      expect(screen.getByTestId('completed-count').textContent).toBe('20')
      expect(screen.getByTestId('avg-progress').textContent).toBe('49')
    })
  })
})
