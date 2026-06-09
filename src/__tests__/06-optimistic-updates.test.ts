import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOptimisticOperation, useBatchOptimisticOperations, createOperationId } from '@/lib/optimistic-updates'

describe('10. Optimistic updates', () => {
  describe('useOptimisticOperation', () => {
    it('initializes with provided data', () => {
      const { result } = renderHook(() =>
        useOptimisticOperation(
          { name: 'test', value: 0 },
          async (data) => data
        )
      )
      expect(result.current.data.name).toBe('test')
      expect(result.current.isPending).toBe(false)
      expect(result.current.isError).toBe(false)
    })

    it('immediately updates data optimistically on execute', async () => {
      const operation = vi.fn().mockResolvedValue({ name: 'updated', value: 42 })
      const { result } = renderHook(() =>
        useOptimisticOperation(
          { name: 'test', value: 0 },
          operation
        )
      )

      await act(async () => {
        result.current.execute({ name: 'optimistic', value: 99 })
      })

      expect(result.current.data.name).toBe('updated')
    })

    it('rolls back on error', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network error'))
      const { result } = renderHook(() =>
        useOptimisticOperation(
          { name: 'test', value: 0 },
          operation
        )
      )

      await act(async () => {
        await result.current.execute({ name: 'optimistic', value: 99 })
      })

      expect(result.current.data.name).toBe('test')
      expect(result.current.isError).toBe(true)
    })

    it('calls onSuccess callback', async () => {
      const onSuccess = vi.fn()
      const { result } = renderHook(() =>
        useOptimisticOperation(
          { name: 'test', value: 0 },
          async (data) => data,
          { onSuccess }
        )
      )

      await act(async () => {
        await result.current.execute({ name: 'updated', value: 42 })
      })

      expect(onSuccess).toHaveBeenCalled()
    })

    it('calls onError callback', async () => {
      const onError = vi.fn()
      const { result } = renderHook(() =>
        useOptimisticOperation(
          { name: 'test', value: 0 },
          async () => { throw new Error('Fail') },
          { onError }
        )
      )

      await act(async () => {
        await result.current.execute({ name: 'updated', value: 42 })
      })

      expect(onError).toHaveBeenCalled()
    })

    it('manually rolls back with rollback function', () => {
      const { result, rerender } = renderHook(() =>
        useOptimisticOperation(
          { name: 'test', value: 0 },
          async (data) => data
        )
      )

      act(() => {
        result.current.rollback()
      })

      expect(result.current.error).toBeNull()
    })

    it('clears error with clearError', () => {
      const { result } = renderHook(() =>
        useOptimisticOperation(
          { name: 'test', value: 0 },
          async (data) => data
        )
      )

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('useBatchOptimisticOperations', () => {
    it('executes batch of operations', async () => {
      const { result } = renderHook(() => useBatchOptimisticOperations())

      await act(async () => {
        const results = await result.current.executeBatch([
          { id: '1', optimisticData: 'data1', operation: async () => 'result1' },
          { id: '2', optimisticData: 'data2', operation: async () => 'result2' },
        ])
        expect(results).toEqual(['result1', 'result2'])
      })
    })

    it('skips duplicate pending operations', async () => {
      const { result } = renderHook(() => useBatchOptimisticOperations())

      let resolveOp: (v: string) => void
      const op = new Promise<string>(resolve => { resolveOp = resolve })

      let p1: Promise<string[]>
      act(() => {
        p1 = result.current.executeBatch([
          { id: '1', optimisticData: 'd', operation: () => op },
        ])
      })

      await act(async () => {
        const p2 = result.current.executeBatch([
          { id: '1', optimisticData: 'd', operation: async () => 'result2' },
        ])
        const p2Result = await p2
        expect(p2Result).toEqual([])
        resolveOp!('result1')
        const p1Result = await p1
        expect(p1Result).toEqual(['result1'])
      })
    })
  })

  describe('createOperationId', () => {
    it('creates unique operation IDs', async () => {
      const id1 = createOperationId('task', '123')
      await new Promise(r => setTimeout(r, 1))
      const id2 = createOperationId('task', '123')
      expect(id1).not.toBe(id2)
    })
  })
})
