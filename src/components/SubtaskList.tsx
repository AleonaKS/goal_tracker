import { useState } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import type { Subtask } from '@/types'

interface SubtaskListProps {
  taskId: string
  subtasks: Subtask[]
  onSubtaskChange?: () => void
}

export function SubtaskList({ taskId, subtasks, onSubtaskChange }: SubtaskListProps) {
  const { createSubtask, updateSubtask, deleteSubtask } = useApiDataStore()
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubtaskTitle.trim()) return

    try {
      await createSubtask({
        taskId,
        title: newSubtaskTitle.trim(),
        isCompleted: false,
        orderIndex: subtasks.length
      })
      setNewSubtaskTitle('')
      setIsAdding(false)
      onSubtaskChange?.()
    } catch (error) {
      console.error('Failed to create subtask:', error)
    }
  }

  const handleToggleSubtask = async (subtask: Subtask) => {
    try {
      await updateSubtask(subtask.id, {
        isCompleted: !subtask.isCompleted
      })
      onSubtaskChange?.()
    } catch (error) {
      console.error('Failed to update subtask:', error)
    }
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await deleteSubtask(subtaskId)
      onSubtaskChange?.()
    } catch (error) {
      console.error('Failed to delete subtask:', error)
    }
  }

  const completedCount = subtasks.filter(s => s.isCompleted).length
  const totalCount = subtasks.length

  return (
    <div className="space-y-2">
      {/* Progress indicator */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <span>{completedCount}/{totalCount}</span>
        </div>
      )}

      {/* Subtask list */}
      <div className="space-y-1">
        {subtasks.map((subtask) => (
          <div 
            key={subtask.id} 
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <button
              onClick={() => handleToggleSubtask(subtask)}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                subtask.isCompleted
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-green-500'
              }`}
            >
              {subtask.isCompleted && <Check className="w-3 h-3" />}
            </button>
            
            <span 
              className={`flex-1 text-sm ${
                subtask.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'
              }`}
            >
              {subtask.title}
            </span>
            
            <button
              onClick={() => handleDeleteSubtask(subtask.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add new subtask */}
      {isAdding ? (
        <form onSubmit={handleAddSubtask} className="flex gap-2">
          <input
            type="text"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            placeholder="Add subtask..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false)
              setNewSubtaskTitle('')
            }}
            className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 w-full p-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add subtask
        </button>
      )}
    </div>
  )
}
