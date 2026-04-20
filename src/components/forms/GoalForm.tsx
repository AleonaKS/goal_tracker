import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { goalSchema, type GoalFormData } from '@/lib/validation'
import type { GoalStatus } from '@/types'
import { useApiDataStore } from '@/stores/apiDataStore'
import { useAuthStore } from '@/stores/authStore'
import { demoUser, isDemoMode } from '@/lib/demo'

interface GoalFormProps {
  initialData?: Partial<GoalFormData> & { _id?: string }
  onSubmit: () => void
  onCancel: () => void
}

const statusOptions: { value: GoalStatus; label: string }[] = [
  { value: 'in_progress', label: 'В процессе' },
  { value: 'completed', label: 'Завершено' },
  { value: 'overdue', label: 'Просрочено' },
  { value: 'planned', label: 'Запланировано' },
  { value: 'frozen', label: 'Заморожено' },
]

export function GoalForm({ initialData, onSubmit, onCancel }: GoalFormProps) {
  const { categories, metrics, createGoal, updateGoal } = useApiDataStore()
  const { user } = useAuthStore()
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: initialData?.name || '',
      categoryId: initialData?.categoryId || '',
      description: initialData?.description || '',
      startDate: initialData?.startDate,
      deadlineType: initialData?.deadlineType || 'none',
      deadlineValue: initialData?.deadlineValue || '',
      status: initialData?.status ?? 'in_progress',
      priority: initialData?.priority || 3,
      progressCalculation: initialData?.progressCalculation || 'by_tasks',
      progressMetricId: initialData?.progressMetricId || '',
      isFrozen: initialData?.isFrozen || false,
      autoCalculateStatus: initialData?.autoCalculateStatus ?? true,
    },
  })

  const deadlineType = watch('deadlineType')
  const progressCalculation = watch('progressCalculation')

  const handleFormSubmit = async (data: GoalFormData) => {
    try {
      // Use demo user ID in demo mode, otherwise use authenticated user
      const effectiveUserId = isDemoMode() ? demoUser.id : (user?.id || '')
      
      console.log('GoalForm submit - userId:', effectiveUserId, 'isDemo:', isDemoMode())
      
      const submitData: any = {
        name: data.name,
        categoryId: data.categoryId,
        description: data.description,
        deadlineType: data.deadlineType,
        priority: data.priority,
        progressCalculation: data.progressCalculation,
        progressMetricId: data.progressMetricId,
        status: data.status || 'in_progress',
        isFrozen: data.isFrozen,
        autoCalculateStatus: data.autoCalculateStatus,
        userId: effectiveUserId,
        ...(data.deadlineValue ? { deadlineValue: data.deadlineValue } : {})
      }
      
      // Only include startDate if it's provided
      if (data.startDate) {
        submitData.startDate = data.startDate
      }
      
      if (initialData?._id) {
        await updateGoal(initialData._id, submitData)
        console.log('Goal updated successfully')
      } else {
        await createGoal(submitData)
        console.log('Goal created successfully')
      } 
      
      onSubmit()
    } catch (error) {
      console.error('Error saving goal:', error)
      // Error will be shown through form state
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Название цели *
        </label>
        <input
          {...register('name')}
          className="input"
          placeholder="Например: Найти работу"
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
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Описание
        </label>
        <textarea
          {...register('description')}
          rows={3}
          className="input resize-none"
          placeholder="Описание цели..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Дата начала
          </label>
          <input
            type="date"
            {...register('startDate', { valueAsDate: true })}
            className="input"
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Тип срока
          </label>
          <select {...register('deadlineType')} className="input">
            <option value="none">Нет срока</option>
            <option value="month_year">Месяц-год</option>
            <option value="year">Год</option>
            <option value="specific_date">Конкретная дата</option>
          </select>
        </div>
      </div>

      {deadlineType === 'specific_date' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Дата завершения
          </label>
          <input
            type="date"
            {...register('deadlineValue', { valueAsDate: true })}
            className="input"
          />
        </div>
      )}

      {deadlineType === 'month_year' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Месяц и год
          </label>
          <input
            type="month"
            {...register('deadlineValue')}
            className="input"
          />
        </div>
      )}

      {deadlineType === 'year' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Год
          </label>
          <input
            type="number"
            {...register('deadlineValue')}
            className="input"
            min="2024"
            max="2100"
            placeholder="2024"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Приоритет (1-5)
          </label>
          <input
            type="number"
            {...register('priority', { valueAsNumber: true })}
            className="input"
            min={1}
            max={5}
          />
          {errors.priority && (
            <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Статус
          </label>
          <select {...register('status')} className="input">
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Расчёт прогресса
        </label>
        <select {...register('progressCalculation')} className="input">
          <option value="by_tasks">By tasks</option>
          <option value="by_metric">By metric/counter</option>
        </select>
      </div>

      {progressCalculation === 'by_metric' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Метрика для отслеживания
          </label>
          <select {...register('progressMetricId')} className="input">
            <option value="">Выберите метрику</option>
            {metrics.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Advanced Options */}
      <div className="border-t pt-4 mt-4 space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Дополнительные настройки</h4>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('autoCalculateStatus')}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">
            Автоматически рассчитывать статус по датам
          </span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('isFrozen')}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">
            Заморозить цель (поставить на паузу)
          </span>
        </label>
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
          {isSubmitting ? 'Сохранение...' : initialData?._id ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </form>
  )
}
