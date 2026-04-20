import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { metricEntrySchema, type MetricEntryFormData } from '@/lib/validation'
import { useApiDataStore } from '@/stores/apiDataStore'
import type { Metric } from '@/types'

interface MetricEntryFormProps {
  metric: Metric
  mode: 'add' | 'subtract'
  onSubmit: () => void
  onCancel: () => void
}

export function MetricEntryForm({ metric, mode: initialMode, onSubmit, onCancel }: MetricEntryFormProps) {
  const { metricEntries, createMetricEntry } = useApiDataStore()
  const [mode, setMode] = useState<'add' | 'subtract'>(initialMode)

  // Get current total value
  const entries = metricEntries.filter(e => e.metricId === metric.id)
  const currentTotal = entries.reduce((sum, e) => sum + (e.isAddition ? e.value : -e.value), metric.startValue || 0)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MetricEntryFormData>({
    resolver: zodResolver(metricEntrySchema),
    defaultValues: {
      metricId: metric.id,
      value: metric.stepValue || 0,
      finalValue: currentTotal,
      note: '',
      timestamp: new Date(),
      isAddition: mode === 'add',
    },
  })

  const value = watch('value') || 0
  const finalValue = mode === 'add' ? currentTotal + value : Math.max(0, currentTotal - value)

  const handleFormSubmit = (data: MetricEntryFormData) => {
    createMetricEntry({
      metricId: metric.id,
      value: data.value,
      finalValue,
      note: data.note,
      entryDate: new Date(),
      isAddition: mode === 'add',
    })
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-gray-500">Текущее значение</p>
          <p className="text-2xl font-bold text-gray-900">
            {currentTotal} {metric.unitId || ''}
          </p>
        </div>
        <div className="text-2xl text-gray-400">
          {mode === 'add' ? '+' : '-'}
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Новое значение</p>
          <p className="text-2xl font-bold text-primary-600">
            {finalValue} {metric.unitId || ''}
          </p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('add')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            mode === 'add'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          + Добавить
        </button>
        <button
          type="button"
          onClick={() => setMode('subtract')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            mode === 'subtract'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          - Уменьшить
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {mode === 'add' ? 'Добавить' : 'Уменьшить на'}
        </label>
        <input
          type="number"
          step={metric.inputMode === 'fixed_step' ? metric.stepValue : 0.01}
          {...register('value', { valueAsNumber: true })}
          className="input"
          autoFocus
        />
        {errors.value && (
          <p className="mt-1 text-sm text-red-600">{errors.value.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Дата и время
        </label>
        <input
          type="datetime-local"
          {...register('timestamp', { valueAsDate: true })}
          className="input"
        />
        {errors.timestamp && (
          <p className="mt-1 text-sm text-red-600">{errors.timestamp.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Примечание
        </label>
        <textarea
          {...register('note')}
          rows={2}
          className="input resize-none"
          placeholder="Необязательно..."
        />
        {errors.note && (
          <p className="mt-1 text-sm text-red-600">{errors.note.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Отмена
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={mode === 'add' ? 'btn-primary flex-1' : 'btn-danger flex-1'}
        >
          {isSubmitting ? 'Сохранение...' : mode === 'add' ? 'Добавить' : 'Уменьшить'}
        </button>
      </div>
    </form>
  )
}
