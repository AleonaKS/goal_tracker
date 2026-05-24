import { useState, useMemo } from 'react'
import { Minus, Plus, X, Calendar, MessageSquare } from 'lucide-react'
import { Modal } from '../Modal'
import type { Metric, MetricEntry } from '@/types'
import { formatDate, calculateMetricProgress } from '@/lib/utils'

interface QuickEntryFormProps {
  isOpen: boolean
  onClose: () => void
  metric: Metric
  entries: MetricEntry[]
  onSave: (data: {
    value: number
    finalValue: number
    note: string
    entryDate: Date
    isAddition: boolean
  }) => void
  mode?: 'add' | 'subtract'
}

export function QuickEntryForm({ isOpen, onClose, metric, entries, onSave, mode: initialMode = 'add' }: QuickEntryFormProps) {
  const [mode, setMode] = useState<'add' | 'subtract'>(initialMode)
  const [inputValue, setInputValue] = useState('')
  const [note, setNote] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [entryTime, setEntryTime] = useState(new Date().toTimeString().slice(0, 5))

  const metricProgress = useMemo(() => {
    return calculateMetricProgress(metric, entries.filter(e => !e.id.startsWith('temp-')))
  }, [metric, entries])

  const currentTotal = metricProgress.isPeriodBased ? metricProgress.periodValue : metricProgress.totalValue
  const currentTotalAll = metricProgress.totalValue

  // Calculate final value based on input
  const inputNumber = parseFloat(inputValue) || 0
  const finalValue = mode === 'add' 
    ? currentTotal + inputNumber 
    : Math.max(0, currentTotal - inputNumber)

  const handleSave = () => {
    if (!inputValue || isNaN(parseFloat(inputValue))) return

    const dateTime = new Date(`${entryDate}T${entryTime}`)

    onSave({
      value: inputNumber,
      finalValue,
      note,
      entryDate: dateTime,
      isAddition: mode === 'add'
    })

    // ИСПРАВЛЕНИЕ: Убрали onClose() чтобы окно не закрывалось
    // Теперь можно быстро добавлять несколько значений подряд

    // Reset form для следующего ввода
    setInputValue('')
    setNote('')
    // mode оставляем как есть для удобства
  }

  const remaining = Math.max(0, (metric.targetValue || 100) - finalValue)

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Запись: ${metric.name}`}
      className="max-w-md"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div className="text-center flex-1">
            <p className="text-sm text-gray-500 mb-1">
              {metricProgress.isPeriodBased ? 'За период' : 'Текущее'}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {currentTotal.toFixed(1)}
            </p>
            {metricProgress.isPeriodBased && (
              <p className="text-xs text-gray-400">всего: {currentTotalAll.toFixed(1)}</p>
            )}
          </div>
          
          <div className="flex items-center px-4">
            <button
              onClick={() => setMode('subtract')}
              className={`p-2 rounded-full transition-colors ${
                mode === 'subtract' 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="mx-3 text-lg font-medium text-gray-400">
              {mode === 'add' ? '+' : '-'}
            </span>
            <button
              onClick={() => setMode('add')}
              className={`p-2 rounded-full transition-colors ${
                mode === 'add' 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-center flex-1">
            <p className="text-sm text-gray-500 mb-1">Итоговое</p>
            <p className={`text-2xl font-bold ${
              finalValue > currentTotal ? 'text-green-600' : 
              finalValue < currentTotal ? 'text-red-600' : 'text-gray-900'
            }`}>
              {finalValue.toFixed(1)}
            </p>
            <p className="text-xs text-gray-400">{metric.customUnit || ''}</p>
          </div>
        </div>

        {/* Input Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Значение {mode === 'add' ? 'добавления' : 'вычитания'}
          </label>
          <div className="relative">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="0"
              autoFocus
              className="w-full text-center text-4xl font-bold py-4 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 transition-colors"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              {metric.customUnit || ''}
            </span>
          </div>
          
          {/* Quick step buttons */}
          <div className="flex gap-2 mt-3 justify-center">
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600">Шаг:</span>
              <button
                onClick={() => {
                  const currentValue = parseFloat(inputValue) || 0
                  const step = metric.stepValue ?? 1
                  const newValue = Math.max(0, currentValue - step)
                  setInputValue(String(newValue))
                }}
                className="px-2 py-1 text-sm bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-lg font-medium text-gray-700 px-2">
                {parseFloat(inputValue) || 0}
              </span>
              <button
                onClick={() => {
                  const currentValue = parseFloat(inputValue) || 0
                  const step = metric.stepValue ?? 1
                  const newValue = currentValue + step
                  setInputValue(String(newValue))
                }}
                className="px-2 py-1 text-sm bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Quick preset buttons */}
          <div className="flex gap-2 mt-3 justify-center">
            {[1, 5, 10, 25, 50, 100].map(preset => (
              <button
                key={preset}
                onClick={() => setInputValue(String(preset))}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                +{preset}
              </button>
            ))}
          </div>
        </div>

        {/* Target Progress */}
        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Прогресс к цели</span>
            <span className="font-medium">
              {Math.round((finalValue / (metric.targetValue || 100)) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${Math.min(100, (finalValue / (metric.targetValue || 100)) * 100)}%`,
                backgroundColor: metric.color
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {remaining > 0 
              ? `Осталось: ${remaining.toFixed(1)} ${metric.customUnit || ''} до цели`
              : 'Цель достигнута! 🎉'
            }
          </p>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Дата
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Время
            </label>
            <input
              type="time"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <MessageSquare className="w-4 h-4 inline mr-1" />
            Заметка (необязательно)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Добавьте комментарий..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!inputValue || isNaN(parseFloat(inputValue))}
            className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === 'add' ? 'Добавить' : 'Вычесть'} {inputValue || 0} {metric.customUnit || ''}
          </button>
        </div>
      </div>
    </Modal>
  )
}
