import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { metricSchema, type MetricFormData } from '@/lib/validation'
import { useApiDataStore } from '@/stores/apiDataStore'
import { predefinedUnits, cn } from '@/lib/utils'
import type { Metric, Periodicity } from '@/types'
import { Modal } from '../Modal'

interface MetricFormProps {
  initialData?: Partial<Metric>
  onSubmit: () => void
  onCancel: () => void
}

const periodicityOptions: { value: Periodicity; label: string }[] = [
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
]

export function MetricForm({ initialData, onSubmit, onCancel }: MetricFormProps) {
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
      goalId: initialData?.goalId,
      initialValue: initialData?.startValue || 0,
      targetValue: initialData?.targetValue || 100,
      unit: initialData?.unitId || '',
      inputMode: initialData?.inputMode || 'fixed_step',
      stepValue: initialData?.stepValue || 1,
      periodicity: initialData?.periodicity || 'daily',
      nDays: initialData?.nDays || 7,
      weekdays: initialData?.weekdays || [1, 2, 3, 4, 5],
      color: initialData?.color || colors[0],
    },
  })

  const periodicity = watch('periodicity')
  const inputMode = watch('inputMode')
  const selectedColor = watch('color')
  const selectedUnit = watch('unit')
  const type = watch('type')
  const autoResetEnabled = watch('autoResetEnabled')
  const resetPeriodicity = watch('resetPeriodicity')
  const targetIncreaseEnabled = watch('targetIncreaseEnabled')

  const handleFormSubmit = (data: MetricFormData) => {
    if (initialData?.id) {
      updateMetric(initialData.id, data)
    } else {
      createMetric(data as Omit<Metric, 'id' | 'createdAt'>)
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
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название *
            </label>
            <input
              {...register('name')}
              className="input"
              placeholder="Например: Чтение книг"
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип
            </label>
            <select {...register('type')} className="input">
              <option value="habit">Привычка</option>
              <option value="counter">Счётчик</option>
            </select>
          </div>
        </div>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Режим ввода
          </label>
          <select {...register('inputMode')} className="input">
            <option value="fixed_step">Фиксированный шаг</option>
            <option value="manual">Ручной ввод</option>
          </select>
        </div>

        {inputMode === 'fixed_step' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Шаг изменения
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
            Периодичность
          </label>
          <select {...register('periodicity')} className="input">
            {periodicityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {periodicity === 'every_n_days' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Количество дней
            </label>
            <input
              type="number"
              {...register('nDays', { valueAsNumber: true })}
              className="input"
              min={1}
            />
            {errors.nDays && (
              <p className="mt-1 text-sm text-red-600">{errors.nDays.message}</p>
            )}
          </div>
        )}

        {periodicity === 'weekdays' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Дни недели
            </label>
            <div className="flex gap-2 flex-wrap">
              {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map((day, index) => (
                <label key={index} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    value={index}
                    {...register('weekdays')}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{day}</span>
                </label>
              ))}
            </div>
            {errors.weekdays && (
              <p className="mt-1 text-sm text-red-600">{errors.weekdays.message}</p>
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

        {/* Auto-Reset Settings */}
        <div className="border-t pt-4 mt-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Автоматический сброс</h4>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('autoResetEnabled')}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Включить автоматический сброс значений
            </span>
          </label>
          
          {autoResetEnabled && (
            <div className="space-y-3 pl-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Периодичность сброса
                </label>
                <select {...register('resetPeriodicity')} className="input">
                  <option value="daily">Ежедневно</option>
                  <option value="weekly">Еженедельно</option>
                  <option value="monthly">Ежемесячно</option>
                  <option value="yearly">Ежегодно</option>
                </select>
              </div>
              
              {resetPeriodicity === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    День недели сброса
                  </label>
                  <select {...register('resetDayOfWeek')} className="input">
                    <option value={0}>Воскресенье</option>
                    <option value={1}>Понедельник</option>
                    <option value={2}>Вторник</option>
                    <option value={3}>Среда</option>
                    <option value={4}>Четверг</option>
                    <option value={5}>Пятница</option>
                    <option value={6}>Суббота</option>
                  </select>
                </div>
              )}
              
              {resetPeriodicity === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    День месяца сброса
                  </label>
                  <input
                    type="number"
                    {...register('resetDayOfMonth', { valueAsNumber: true })}
                    className="input"
                    min={1}
                    max={31}
                    placeholder="1-31"
                  />
                </div>
              )}
              
              {resetPeriodicity === 'yearly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Месяц сброса
                  </label>
                  <select {...register('resetMonthOfYear')} className="input">
                    <option value={1}>Январь</option>
                    <option value={2}>Февраль</option>
                    <option value={3}>Март</option>
                    <option value={4}>Апрель</option>
                    <option value={5}>Май</option>
                    <option value={6}>Июнь</option>
                    <option value={7}>Июль</option>
                    <option value={8}>Август</option>
                    <option value={9}>Сентябрь</option>
                    <option value={10}>Октябрь</option>
                    <option value={11}>Ноябрь</option>
                    <option value={12}>Декабрь</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Target Increase Settings */}
        <div className="border-t pt-4 mt-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Автоматическое увеличение цели</h4>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('targetIncreaseEnabled')}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Автоматически увеличивать целевое значение
            </span>
          </label>
          
          {targetIncreaseEnabled && (
            <div className="space-y-3 pl-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  На сколько увеличивать
                </label>
                <input
                  type="number"
                  {...register('targetIncreaseValue', { valueAsNumber: true })}
                  className="input"
                  min={0}
                  step={0.1}
                  placeholder="Например: 1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Периодичность увеличения
                </label>
                <select {...register('targetIncreasePeriodicity')} className="input">
                  <option value="daily">Ежедневно</option>
                  <option value="weekly">Еженедельно</option>
                  <option value="monthly">Ежемесячно</option>
                  <option value="yearly">Ежегодно</option>
                </select>
              </div>
            </div>
          )}
        </div>

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
