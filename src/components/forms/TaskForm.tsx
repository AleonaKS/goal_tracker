import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { taskSchema, type TaskFormData } from '@/lib/validation'
import { useApiDataStore } from '@/stores/apiDataStore'
import { useAuthStore } from '@/stores/authStore'
import type { Task, Goal } from '@/types'
import React from 'react'
import { useFieldErrorModal } from '@/hooks/useFieldErrorModal'
import { FieldErrorModal } from '@/components/FieldErrorModal'

// Вспомогательная функция для форматирования даты (ГГГГ-ММ-ДД)
const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

interface TaskFormProps {
  goalId?: string
  stageId?: string
  initialData?: Partial<Task>
  onSubmit: () => void
  onCancel: () => void
  goals?: Goal[] // Optional goals list for dropdown selection
  allowGoalSelection?: boolean // Enable goal dropdown selection
}

export function TaskForm({ goalId, stageId, initialData, onSubmit, onCancel, goals, allowGoalSelection }: TaskFormProps) {
  const { stages, createTask, updateTask, error: apiError, isLoading, goals: allGoals } = useApiDataStore()
  const { user } = useAuthStore()

  const [selectedGoalId, setSelectedGoalId] = React.useState<string | undefined>(goalId || initialData?.goalId)
  const availableGoals = goals || allGoals
  const goalStages = stages.filter(s => s.goalId === selectedGoalId)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: initialData?.name || '',
      goalId: goalId || initialData?.goalId || null,
      stageId: stageId || initialData?.stageId || null,
      priority: initialData?.priority || 3,
      weight: initialData?.weight || 1,
      startDate: initialData?.startDate ? formatDateForInput(initialData.startDate) as any : undefined,
      dueDate: initialData?.dueDate ? formatDateForInput(initialData.dueDate) as any : undefined,
      duration: initialData?.duration,
      startTime: initialData?.startTime,
      endTime: initialData?.endTime,
    },
  })

  const { errorMessage, clearError } = useFieldErrorModal(errors)

  // Обновление формы при изменении выбранной цели
  React.useEffect(() => {
    if (selectedGoalId) {
      setValue('goalId', selectedGoalId)
    }
  }, [selectedGoalId, setValue])

  // Установка значений даты при изменении initialData
  React.useEffect(() => {
    if (initialData?.startDate) {
      setValue('startDate', formatDateForInput(initialData.startDate) as any)
    } else {
      setValue('startDate', undefined)
    }
    if (initialData?.dueDate) {
      setValue('dueDate', formatDateForInput(initialData.dueDate) as any)
    } else {
      setValue('dueDate', undefined)
    }
  }, [initialData, setValue])

  const duration = watch('duration')
  const startTime = watch('startTime')

  // Автоматический расчёт endTime при изменении startTime или duration
  React.useEffect(() => {
    if (startTime && duration) {
      const [hours, minutes] = startTime.split(':').map(Number)
      const totalMinutes = hours * 60 + minutes + duration
      const endHours = Math.floor(totalMinutes / 60) % 24
      const endMinutes = totalMinutes % 60
      const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
      setValue('endTime', endTimeStr)
    } else if (!startTime) {
      setValue('endTime', undefined)
    }
  }, [startTime, duration, setValue])

  const handleFormSubmit = async (data: TaskFormData) => {
    console.log('=== FORM SUBMIT TRIGGERED ===')
    console.log('Form raw data:', data)
    console.log('dueDate type:', typeof data.dueDate, data.dueDate)
    console.log('priority:', data.priority, 'weight:', data.weight)
    
    const taskData = {
      name: data.name,
      goalId: data.goalId || null, // Convert empty string to null
      stageId: data.stageId || null, // Convert null/undefined properly
      startDate: data.startDate,
      dueDate: data.dueDate,
      priority: data.priority,
      weight: data.weight,
      completed: initialData?.completed || false,
      progress: 0,
      updatedAt: new Date(),
      userId: user?.id || '',
      periodType: undefined,
      // Поля временных блоков
      duration: data.duration,
      startTime: data.startTime,
      endTime: data.endTime,
    }

    try {
      console.log('Submitting taskData:', taskData)
      console.log('User ID:', user?.id)
      
      if (!user?.id) {
        console.error('No user ID available!')
        return
      }
      
      if (initialData?.id) {
        await updateTask(initialData.id, taskData)
      } else {
        await createTask(taskData)
      }
      onSubmit()
    } catch (error) {
      console.error('Failed to save task:', error)
      console.error('Error details:', error.response?.data || error.message)
    }
  }

  // Логирование ошибок формы для отладки
  console.log('Current form errors:', errors)
  console.log('Form isSubmitting:', isSubmitting)
  console.log('Form values:', watch())

  return (
    <form 
      onSubmit={handleSubmit(handleFormSubmit)} 
      noValidate
      className="space-y-4"
      onInvalid={(e) => {
        console.log('Form validation failed:', e)
        e.preventDefault()
      }}
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Название задачи *
        </label>
        <input
          {...register('name')}
          className="input"
          placeholder="Например: Обновить резюме"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Goal Selection Dropdown - shown when allowGoalSelection is true */}
      {allowGoalSelection && availableGoals.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Цель *
          </label>
          <select 
            value={selectedGoalId || ''} 
            onChange={(e) => setSelectedGoalId(e.target.value)}
            className="input"
            required
          >
            <option value="">Выберите цель</option>
            {availableGoals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Hidden goalId field for form submission */}
      <input type="hidden" {...register('goalId')} />

      {goalStages.length > 0 && !stageId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Этап (опционально)
          </label>
          <select {...register('stageId')} className="input">
            <option value="">Без этапа</option>
            {goalStages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Дата начала
          </label>
          <input
            type="date"
            {...register('startDate')}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Крайний срок
          </label>
          <input
            type="date"
            {...register('dueDate')}
            className="input"
          />
        </div>
      </div>

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
            Вес (вклад)
          </label>
          <input
            type="number"
            step={0.1}
            {...register('weight', { valueAsNumber: true })}
            className="input"
            min={0.1}
            max={10}
          />
          {errors.weight && (
            <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
          )}
        </div>
      </div>

      {/* Time Blocking Section */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!watch('duration') || !!watch('startTime')}
            onChange={(e) => {
              if (!e.target.checked) {
                setValue('duration', undefined)
                setValue('startTime', undefined)
                setValue('endTime', undefined)
              } else {
                setValue('duration', 30)
              }
            }}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Запланировать время</span>
        </label>

        {(watch('duration') || watch('startTime')) && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Длительность (мин)</label>
              <input
                type="number"
                {...register('duration', { 
                  valueAsNumber: true,
                  min: { value: 1, message: 'Минимум 1 минута' },
                  max: { value: 480, message: 'Максимум 8 часов' }
                })}
                className="input text-sm"
                min={1}
                max={480}
                placeholder="30"
              />
              {errors.duration && (
                <p className="mt-1 text-xs text-red-600">{errors.duration.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Начало</label>
              <input
                type="time"
                {...register('startTime', {
                  validate: (value) => {
                    if (!value || !watch('endTime')) return true
                    return value <= watch('endTime') || 'Начало должно быть раньше окончания'
                  }
                })}
                className="input text-sm"
              />
              {errors.startTime && (
                <p className="mt-1 text-xs text-red-600">{errors.startTime.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Окончание</label>
              <input
                type="time"
                {...register('endTime')}
                className="input text-sm"
                readOnly
              />
              <p className="mt-1 text-xs text-gray-400">Автоматически</p>
            </div>
          </div>
        )}
      </div>

      {/* Global form errors */}
      {(errors.startDate || errors.dueDate) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            {errors.startDate?.message || errors.dueDate?.message}
          </p>
        </div>
      )}

      {/* API Error */}
      {apiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">Ошибка сохранения:</p>
          <p className="text-sm text-red-600">{apiError}</p>
        </div>
      )}

      <FieldErrorModal isOpen={!!errorMessage} message={errorMessage || ''} onClose={clearError} />

      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Отмена
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="btn-primary flex-1"
        >
          {isSubmitting || isLoading ? 'Сохранение...' : initialData?.id ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </form>
  )
}
