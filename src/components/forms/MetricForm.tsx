import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { metricSchema, type MetricFormData } from '@/lib/validation'
import { useApiDataStore } from '@/stores/apiDataStore'
import { predefinedUnits, cn } from '@/lib/utils'
import type { Metric, Periodicity } from '@/types'
import { Modal } from '../Modal'
import { useFieldErrorModal } from '@/hooks/useFieldErrorModal'
import { FieldErrorModal } from '@/components/FieldErrorModal'

interface MetricFormProps {
  initialData?: Partial<Metric>
  goalId?: string
  onSubmit: () => void
  onCancel: () => void
}

const periodicityOptions: { value: Periodicity; label: string }[] = [
  { value: 'none', label: 'Нет' },
  { value: 'daily', label: 'Каждый день' },
  { value: 'weekly', label: 'Каждую неделю' },
  { value: 'monthly', label: 'Каждый месяц' },
  { value: 'yearly', label: 'Каждый год' },
  { value: 'every_n_days', label: 'Каждые N дней' },
  { value: 'weekdays', label: 'По дням недели' },
]

const colors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6b7280', // gray
  '#f97316', // orange
  '#84cc16', // lime
  '#14b8a6', // teal
  '#a855f7', // violet
  '#e11d48', // rose
  '#0ea5e9', // sky
  '#22c55e', // emerald
  '#f43f5e', // fuchsia
  '#6366f1', // indigo
  '#0891b2', // cyan-dark
  '#eab308', // yellow-dark
  '#dc2626', // red-dark
  '#7c3aed', // purple-dark
  '#db2777', // pink-dark
  '#059669', // emerald-dark
  '#2563eb', // blue-dark
]

export function MetricForm({ initialData, goalId, onSubmit, onCancel }: MetricFormProps) {
  const { goals, categories, createMetric, updateMetric } = useApiDataStore()
  const [showUnitModal, setShowUnitModal] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MetricFormData>({
    resolver: zodResolver(metricSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'habit',
      description: initialData?.description || '',
      categoryId: initialData?.categoryId || '',
      goalId: goalId || initialData?.goalId,
      initialValue: initialData?.initialValue || 0,
      targetValue: initialData?.targetValue || (initialData?.type === 'simple_habit' ? undefined : 100),
      unit: initialData?.customUnit || initialData?.unit || 'раз',
      inputMode: initialData?.inputMode || 'fixed_step',
      stepValue: initialData?.stepValue ?? 1,
      periodicity: (initialData?.periodicity || initialData?.resetPeriodicity || (!initialData ? 'none' : 'daily')) as any,
      nDays: initialData?.nDays || initialData?.resetCustomDays || 7,
      weekdays: initialData?.weekdays || initialData?.resetWeekdays || [1, 2, 3, 4, 5],
      autoResetEnabled: initialData?.autoResetEnabled ?? false,
      resetPeriodicity: initialData?.resetPeriodicity || undefined,
      color: initialData?.color || colors[0],
    },
  })

  const { errorMessage, clearError } = useFieldErrorModal(errors)
  const periodicity = watch('periodicity')
  const inputMode = watch('inputMode')
  const selectedColor = watch('color')
  const selectedUnit = watch('unit')
  const type = watch('type')
  const autoResetEnabled = watch('autoResetEnabled')
  const resetPeriodicity = watch('resetPeriodicity')
  const targetIncreaseEnabled = watch('targetIncreaseEnabled')

  const handleFormSubmit = (data: MetricFormData) => {
    const metricData = {
      ...data,
      ...(data.autoResetEnabled && data.resetPeriodicity === 'weekdays' && data.weekdays
        ? { resetWeekdays: data.weekdays }
        : {}),
      ...(data.autoResetEnabled && data.resetPeriodicity === 'every_n_days' && data.nDays
        ? { resetCustomDays: data.nDays }
        : {}),
      ...(data.autoResetEnabled && !initialData?.id
        ? { lastResetAt: new Date() }
        : {}),
    }
    if (initialData?.id) {
      updateMetric(initialData.id, metricData)
    } else {
      createMetric(metricData as Omit<Metric, 'id' | 'createdAt'>)
    }
    onSubmit()
  }

  const handleColorSelect = (color: string) => {
    setValue('color', color)
  }

  const handleUnitSelect = (unit: string) => {
    setValue('unit', unit)
    setShowUnitModal(false)
  }

  return (
    <>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
        {/* Type Selection - Moved to top */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Тип метрики *
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                setValue('type', 'simple_habit')
                // Автоматическая установка значений по умолчанию для простой привычки
                setValue('targetValue', 1)
                setValue('inputMode', 'fixed_step')
                setValue('stepValue', 1)
                setValue('unit', 'раз')
              }}
              className={cn(
                "p-3 rounded-lg border-2 transition-all text-center",
                type === 'simple_habit'
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              )}
            >
              <div className="font-medium">Простая привычка</div>
            </button>
            <button
              type="button"
              onClick={() => setValue('type', 'habit')}
              className={cn(
                "p-3 rounded-lg border-2 transition-all text-center",
                type === 'habit'
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              )}
            >
              <div className="font-medium">Сложная привычка</div>
            </button>
            <button
              type="button"
              onClick={() => setValue('type', 'counter')}
              className={cn(
                "p-3 rounded-lg border-2 transition-all text-center",
                type === 'counter'
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              )}
            >
              <div className="font-medium">Счётчик</div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название *
            </label>
            <input
              {...register('name')}
              className="input"
              placeholder={type === 'simple_habit' ? "Например: Утренняя зарядка" : "Например: Чтение книг"}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Категория *
            </label>
            <select {...register('categoryId')} className="input">
              <option value="">Выберите категорию</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
            )}
          </div>
        </div>

        {/* Description and Goal - always shown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Описание
          </label>
          <textarea
            {...register('description')}
            rows={2}
            className="input resize-none"
            placeholder="Описание..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Привязка к цели (опционально)
          </label>
          <select {...register('goalId')} className="input">
            <option value="">Без привязки</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.name}
              </option>
            ))}
          </select>
        </div>

        {/* Show value inputs only for counter and habit, hide for simple_habit */}
        {type !== 'simple_habit' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Начальное значение
              </label>
              <input
                type="number"
                {...register('initialValue', { valueAsNumber: true })}
                className="input"
                min={0}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Целевое значение *
              </label>
              <input
                type="number"
                {...register('targetValue', { valueAsNumber: true })}
                className="input"
                min={1}
              />
              {errors.targetValue && (
                <p className="mt-1 text-sm text-red-600">{errors.targetValue.message}</p>
              )}
            </div>
          </div>
        )}

        {/* For simple habit, no info block needed */}
        {/* Hide unit selection for simple habit */}
        {type !== 'simple_habit' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Единица измерения *
            </label>
            <div className="flex gap-2">
              <input
                {...register('unit')}
                className="input flex-1"
                placeholder="стр, мин, км..."
                readOnly
              />
              <button
                type="button"
                onClick={() => setShowUnitModal(true)}
                className="btn-secondary"
              >
                Выбрать
              </button>
            </div>
            {errors.unit && (
              <p className="mt-1 text-sm text-red-600">{errors.unit.message}</p>
            )}
          </div>
        )}

        {/* Hide input mode for simple habit */}
        {type !== 'simple_habit' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Режим ввода
            </label>
            <select {...register('inputMode')} className="input">
              <option value="fixed_step">Фиксированный шаг</option>
              <option value="manual">Ручной ввод</option>
            </select>
          </div>
        )}

        {/* Hide periodicity for simple habit */}
        {type !== 'simple_habit' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Периодичность
            </label>
            <select
              value={periodicity}
              onChange={(e) => {
                const val = e.target.value as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'every_n_days' | 'weekdays'
                setValue('periodicity', val, { shouldDirty: true, shouldValidate: true })
                if (val === 'none') {
                  setValue('autoResetEnabled', false)
                  setValue('resetPeriodicity', 'none' as any)
                  setValue('resetWeekdays', undefined as any)
                  setValue('resetCustomDays', undefined as any)
                } else if (val !== 'daily') {
                  setValue('autoResetEnabled', true)
                  setValue('resetPeriodicity', val as any)
                  if (val === 'weekdays') {
                    setValue('resetWeekdays', watch('weekdays'))
                  } else if (val === 'every_n_days') {
                    setValue('resetCustomDays', watch('nDays'))
                  } else {
                    setValue('resetWeekdays', undefined as any)
                    setValue('resetCustomDays', undefined as any)
                  }
                } else {
                  setValue('autoResetEnabled', false)
                  setValue('resetPeriodicity', 'daily' as any)
                  setValue('resetWeekdays', undefined as any)
                  setValue('resetCustomDays', undefined as any)
                }
              }}
              className="input"
            >
              {periodicityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {periodicity === 'every_n_days' && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Каждые N дней
                </label>
                <input
                  type="number"
                  {...register('nDays', { valueAsNumber: true })}
                  className="input"
                  min={1}
                  max={365}
                  placeholder="Например: 7"
                />
                {errors.nDays && (
                  <p className="mt-1 text-sm text-red-600">{errors.nDays.message}</p>
                )}
              </div>
            )}

            {periodicity === 'weekdays' && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дни недели
                </label>
                <div className="flex gap-1">
                  {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((dayName, index) => {
                    const weekdayValue = index + 1 // 1=Пн, ..., 7=Вс
                    const currentWeekdays = watch('weekdays') || []
                    const isSelected = currentWeekdays.includes(weekdayValue)
                    return (
                      <button
                        key={weekdayValue}
                        type="button"
                        onClick={() => {
                          const current = currentWeekdays
                          const updated = isSelected
                            ? current.filter(d => d !== weekdayValue)
                            : [...current, weekdayValue].sort()
                          setValue('weekdays', updated)
                          if (periodicity === 'weekdays') {
                            setValue('resetWeekdays', updated)
                          }
                        }}
                        className={cn(
                          'w-10 h-10 rounded-full text-sm font-medium transition-all',
                          isSelected
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {dayName}
                      </button>
                    )
                  })}
                </div>
                {errors.weekdays && (
                  <p className="mt-1 text-sm text-red-600">{errors.weekdays.message}</p>
                )}
              </div>
            )}
          </div>
        )}

        {inputMode === 'fixed_step' && type !== 'simple_habit' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Значение шага
            </label>
            <input
              type="number"
              {...register('stepValue', { valueAsNumber: true })}
              className="input"
              min={0.1}
              step={0.1}
            />
            {errors.stepValue && (
              <p className="mt-1 text-sm text-red-600">{errors.stepValue.message}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Цвет
          </label>
          <div className="flex gap-2 flex-wrap">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorSelect(color)}
                className={cn(
                  'w-8 h-8 rounded-full border-2 transition-all',
                  selectedColor === color ? 'border-gray-900 scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <FieldErrorModal isOpen={!!errorMessage} message={errorMessage || ''} onClose={clearError} />

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onCancel} className="btn-secondary flex-1">
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex-1"
          >
            {isSubmitting ? 'Сохранение...' : initialData?.id ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </form>

      {/* Unit Selection Modal */}
      <Modal
        isOpen={showUnitModal}
        onClose={() => setShowUnitModal(false)}
        title="Выберите единицу измерения"
      >
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {predefinedUnits.map((unit) => (
            <button
              key={unit.symbol}
              onClick={() => handleUnitSelect(unit.symbol)}
              className={cn(
                'p-3 rounded-lg text-left border transition-colors',
                selectedUnit === unit.symbol
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="font-medium text-gray-900">{unit.name}</div>
              <div className="text-sm text-gray-500">{unit.symbol}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Своя единица
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Введите обозначение"
              className="input flex-1"
              onChange={(e) => handleUnitSelect(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
