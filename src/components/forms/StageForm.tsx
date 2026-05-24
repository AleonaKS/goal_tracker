import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { stageSchema, type StageFormData } from '@/lib/validation'
import { useApiDataStore } from '@/stores/apiDataStore'
import type { Stage } from '@/types'
import { useFieldErrorModal } from '@/hooks/useFieldErrorModal'
import { FieldErrorModal } from '@/components/FieldErrorModal'

interface StageFormProps {
  goalId: string
  initialData?: Partial<Stage>
  onSubmit: () => void
  onCancel: () => void
}

export function StageForm({ goalId, initialData, onSubmit, onCancel }: StageFormProps) {
  const { createStage, updateStage } = useApiDataStore()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StageFormData>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      name: initialData?.name || '',
      goalId,
      startDate: initialData?.startDate ? new Date(initialData.startDate) : new Date(),
      endDate: initialData?.dueDate ? new Date(initialData.dueDate) : new Date(),
    },
  })

  const { errorMessage, clearError } = useFieldErrorModal(errors)

  const handleFormSubmit = (data: StageFormData) => {
    if (initialData?.id) {
      updateStage(initialData.id, data)
    } else {
      createStage(data as Omit<Stage, 'id' | 'createdAt' | 'updatedAt'>)
    }
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Название этапа *
        </label>
        <input
          {...register('name')}
          className="input"
          placeholder="Например: Подготовка"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Дата начала *
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
            Дата завершения *
          </label>
          <input
            type="date"
            {...register('endDate', { valueAsDate: true })}
            className="input"
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      {errors.endDate?.type === 'custom' && (
        <p className="text-sm text-red-600">{errors.endDate.message}</p>
      )}

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
  )
}
