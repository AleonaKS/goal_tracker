import { useState } from 'react'
import { Plus, Minus, Calendar, Clock } from 'lucide-react'
import { Modal } from './Modal'
import { useApiDataStore } from '@/stores/apiDataStore'
import type { Metric } from '@/types'

interface MetricEntryModalProps {
  isOpen: boolean
  onClose: () => void
  metric: Metric
  mode?: 'quick' | 'manual'
}

export function MetricEntryModal({ isOpen, onClose, metric, mode = 'quick' }: MetricEntryModalProps) {
  const { createMetricEntry } = useApiDataStore()
  const [isAddition, setIsAddition] = useState(true)
  const [value, setValue] = useState('')
  const [finalValue, setFinalValue] = useState('')
  const [note, setNote] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [entryTime, setEntryTime] = useState(new Date().toTimeString().slice(0, 5))

  const stepValue = metric.stepValue || 1

  const handleQuickChange = (add: boolean) => {
    setIsAddition(add)
    const newValue = add ? stepValue : -stepValue
    setValue(String(newValue))
    setFinalValue(String(newValue))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const entryValue = parseFloat(value) || 0
    const finalEntryValue = parseFloat(finalValue) || 0

    try {
      await createMetricEntry({
        metricId: metric.id,
        entryDate: new Date(`${entryDate}T${entryTime}`),
        value: entryValue,
        finalValue: finalEntryValue,
        note: note.trim() || undefined,
        isAddition,
        isOverachievement: finalEntryValue > metric.targetValue,
        overachievementValue: Math.max(0, finalEntryValue - metric.targetValue)
      })

      // Reset form
      setValue('')
      setFinalValue('')
      setNote('')
      setIsAddition(true)
      onClose()
    } catch (error) {
      console.error('Failed to create metric entry:', error)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Entry - ${metric.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick Mode */}
        {mode === 'quick' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleQuickChange(true)}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                isAddition
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>+{stepValue} {metric.customUnit || 'unit'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickChange(false)}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                !isAddition
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Minus className="w-5 h-5" />
              <span>-{stepValue} {metric.customUnit || 'unit'}</span>
            </button>
          </div>
        )}

        {/* Manual Entry */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Change Value
            </label>
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={isAddition ? `+${stepValue}` : `-${stepValue}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Final Value
            </label>
            <input
              type="number"
              step="0.01"
              value={finalValue}
              onChange={(e) => setFinalValue(e.target.value)}
              placeholder="Total value"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              Time
            </label>
            <input
              type="time"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about this entry..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Progress indicator */}
        {finalValue && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">
                {Math.min(Math.round((parseFloat(finalValue) / metric.targetValue) * 100), 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(Math.round((parseFloat(finalValue) / metric.targetValue) * 100), 100)}%`
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{parseFloat(finalValue) || 0}</span>
              <span>{metric.targetValue}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Record Entry
          </button>
        </div>
      </form>
    </Modal>
  )
}
