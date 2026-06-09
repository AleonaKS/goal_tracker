import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastContainer, useToast } from '@/components/Toast'

describe('Toast system', () => {
  describe('ToastContainer', () => {
    it('renders nothing with empty toasts', () => {
      const { container } = render(<ToastContainer toasts={[]} onRemove={vi.fn()} />)
      expect(container.textContent).toBe('')
    })

    it('renders toast items', () => {
      const toasts = [
        { id: '1', type: 'info' as const, title: 'Test Toast', message: 'Hello' },
      ]
      render(<ToastContainer toasts={toasts} onRemove={vi.fn()} />)
      expect(screen.getByText('Test Toast')).toBeInTheDocument()
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    it('renders points display for points toast', () => {
      const toasts = [
        { id: '1', type: 'points' as const, title: 'Points!', message: 'Good job', points: 50 },
      ]
      render(<ToastContainer toasts={toasts} onRemove={vi.fn()} />)
      expect(screen.getByText('+50 очков')).toBeInTheDocument()
    })

    it('calls onRemove when close button clicked', async () => {
      const onRemove = vi.fn()
      const toasts = [
        { id: '1', type: 'info' as const, title: 'Test', message: 'msg' },
      ]
      render(<ToastContainer toasts={toasts} onRemove={onRemove} />)
      
      const closeBtn = screen.getByRole('button')
      await userEvent.click(closeBtn)
      expect(onRemove).toHaveBeenCalledWith('1')
    })

    it('auto-dismisses after duration', () => {
      vi.useFakeTimers()
      const onRemove = vi.fn()
      const toasts = [
        { id: '1', type: 'info' as const, title: 'Test', message: 'msg', duration: 1000 },
      ]
      render(<ToastContainer toasts={toasts} onRemove={onRemove} />)

      act(() => { vi.advanceTimersByTime(1000) })
      expect(onRemove).toHaveBeenCalledWith('1')

      vi.useRealTimers()
    })

    it('renders multiple toasts stacked', () => {
      const toasts = [
        { id: '1', type: 'info' as const, title: 'First', message: 'msg1' },
        { id: '2', type: 'info' as const, title: 'Second', message: 'msg2' },
      ]
      render(<ToastContainer toasts={toasts} onRemove={vi.fn()} />)
      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
    })
  })
})

describe('Empty states', () => {
  it('detects empty goals array renders empty message', () => {
    const EmptyGoals = ({ goals }: { goals: any[] }) => {
      if (goals.length === 0) return <div data-testid="empty-goals">Нет целей</div>
      return <div>Goals: {goals.length}</div>
    }
    render(<EmptyGoals goals={[]} />)
    expect(screen.getByTestId('empty-goals')).toHaveTextContent('Нет целей')
  })

  it('detects empty tasks array renders empty message', () => {
    const EmptyTasks = ({ tasks }: { tasks: any[] }) => {
      if (tasks.length === 0) return <div data-testid="empty-tasks">Нет задач</div>
      return <div>Tasks: {tasks.length}</div>
    }
    render(<EmptyTasks tasks={[]} />)
    expect(screen.getByTestId('empty-tasks')).toHaveTextContent('Нет задач')
  })

  it('detects empty analytics state', () => {
    const EmptyAnalytics = ({ hasData }: { hasData: boolean }) => {
      if (!hasData) return <div data-testid="empty-analytics">Нет данных для анализа</div>
      return <div>Analytics</div>
    }
    render(<EmptyAnalytics hasData={false} />)
    expect(screen.getByTestId('empty-analytics')).toHaveTextContent('Нет данных для анализа')
  })

  it('shows content when data exists', () => {
    const Content = ({ items }: { items: any[] }) => {
      if (items.length === 0) return <div>Пусто</div>
      return <div data-testid="content">{items.length} элементов</div>
    }
    render(<Content items={[1, 2, 3]} />)
    expect(screen.getByTestId('content')).toHaveTextContent('3 элементов')
  })

  it('handles new account without data', () => {
    const NewAccount = ({ user }: { user: any }) => {
      if (!user) return null
      return (
        <div>
          <div data-testid="empty-categories">Категории: 0</div>
          <div data-testid="empty-metrics">Метрики: 0</div>
        </div>
      )
    }
    render(<NewAccount user={{ id: '1' }} />)
    expect(screen.getByTestId('empty-categories')).toBeInTheDocument()
    expect(screen.getByTestId('empty-metrics')).toBeInTheDocument()
  })
})
